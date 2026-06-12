const log4js = require("log4js"),
  ExecuteQuery = require("../config/ExecuteQuery"),
  dbQueries = require("../config/dbqry"),
  tools = require("../tools/common"),
  log = log4js.getLogger("ws.js"),
  NodeCache = require("node-cache"),
  tokenCacheDuration = 120,
  tokenCache = new NodeCache({ stdTTL: tokenCacheDuration }),
  WebSocket = require("ws"),
  clients = new Map(); // token -> ws

const clearCache = (token) => {
  try {
    tokenCache.del(token);
  } catch (error) {}
};

function setupWebSocketServer(server, httpsPort, mysocket) {
  const ws = new WebSocket.Server({ server }); // you cannot write here httpServer or blabla. Just server,port,noServer

  ws.on("connection", (ws, req) => {
    const clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
    console.log(`Client (IP: ${clientIP}) tries to connect...`);
    ws.isAuthenticated = false;
    ws.clientId = null;

    ws.on("message", async (msg) => {
      let data;
      try {
        data = JSON.parse(msg.toString());
      } catch (error) {
        log.error(
          `Wrong JSON MSG Format, received from ip: [${clientIP}], msg: [${msg}], error: `,
          error,
        );
        return;
      }
      console.log(data);

      // auth step
      if (data.type === "auth") {
        await handleAuthentication(ws, data, clientIP);
        return;
      }

      // 🚫 Block everything if not authenticated
      if (!ws.isAuthenticated) {
        console.log("Unauthorized client tried to send message");
        ws.close();
        return;
      }

      // ✅ Handle messages
      if (data.type === "response") {
        console.log("Response from", ws.clientId, ":", data.payload);
      }

      await handleDataMessage(ws, msg, clientIP, mysocket);
    });

    ws.on("close", () => {
      console.log("Client disconnected:", ws.clientId);
    });
  });

  ws.on("listening", function () {
    var address = ws.address();
    log.info("Socket server listening on port " + address.port);
    log.info("Https server listening on port " + httpsPort);
  });

  return ws;
}

async function handleAuthentication(ws, data, clientIP) {
  let payload;
  try {
    payload = JSON.parse(data.data);
  } catch (error) {
    log.error(
      `Wrong JSON PAYLOAD Format, received from ip: [${clientIP}], data.data: [${data.data}], error: `,
      error,
    );
    return;
  }

  if (!payload.AccessToken) {
    log.warn("There is no property AccessToken in payload object");
    ws.close();
    return;
  }

  const payloadToken = payload.AccessToken;

  const isTokenInDb = await ExecuteQuery(dbQueries.qryHostTokenByToken, [
    payloadToken,
  ]);

  if (isTokenInDb.length === 0 || isTokenInDb.length > 1) {
    log.error(
      `Token in DB not found, client not authenticated. Token search was: ${payloadToken}`,
    );
    ws.close();
    return;
  }

  const { host_mac_addr, token } = isTokenInDb[0];
  if (token !== payloadToken) {
    log.error(
      `Token in DB and token in Payload differs, client not authenticated.`,
    );
    ws.close();
    return;
  }

  if (
    payload.Mac.toString().toLowerCase() !==
    host_mac_addr.toString().toLowerCase()
  ) {
    log.error(
      `MAC in DB and mac in Payload differs, client not authenticated.`,
    );
    ws.close();
    return;
  }

  console.log("payload", payload);

  clients.set(token, ws);
  ws.token = token;
  ws.isAuthenticated = true;
  ws.clientId = token;

  console.log("Authenticated:", ws.clientId);

  ws.send(JSON.stringify({ type: "auth", status: "ok" }));

  await ExecuteQuery(dbQueries.qryUpdateHostsStatusByIp, ["n", "a", clientIP]);

  await ExecuteQuery(dbQueries.qryInsertHosts, [
    token,
    clientIP,
    null,
    payload.Hostname,
    payload.IpAddress,
    payload.Mac,
    payload.ServiceName,
    payload.ServiceStatus,
    "a",
  ]);
}

async function sendToToken(token, message) {
  //   log.info("sendToToken: ", token);
  log.info(`sendToToken fn called: token: ${token} with message: ${message}`);
  const ws = clients.get(token);
  if (ws && ws.readyState === WebSocket.OPEN) {
    log.warn("Sending message!!");
    ws.send(JSON.stringify(message));
  } else {
    console.log(`Client ${token} not connected.`);
  }
}

async function handleDataMessage(ws, msg, clientIP, mysocket) {
  var decodedJson =
    msg.length != 0
      ? JSON.parse(String.fromCharCode.apply(null, new Uint16Array(msg)))
      : "data read error";

  if (decodedJson != "data read error" && decodedJson.length != 0) {
    // check if json has all keys + values
    for (var i = 0; i < tools.arrayJsonKeys().length; i++) {
      var key = tools.arrayJsonKeys()[i];
      if (!decodedJson.hasOwnProperty(key)) {
        log.error("Key '" + key + "' missing in JSON (decodedJson) object.");
        log.info(
          "Wrong JSON format. Message was:\n" +
            msg +
            " RECEIVED from IP:" +
            clientIP,
        );
        return;
      }
    }

    log.info("Data received from WS, payload:\n", decodedJson);

    if (decodedJson.Mac.length == 0 || decodedJson.IpAddress.length == 0) {
      log.error("MAC Address or IP Address is empty, data not inserted to db");
      log.info("MAC in payload was: " + decodedJson.Mac);
      log.info("IP in payload was: " + decodedJson.IpAddress);
      log.info("RECEIVED from IP:" + clientIP);
      return;
    }

    // trim whitespace in IP Address
    decodedJson.IpAddress =
      decodedJson.IpAddress.length > 0
        ? decodedJson.IpAddress.replace(/(\s)/g, "")
        : "0.0.0.0";

    // if IP has ; at the end, delete it
    if (decodedJson.IpAddress.lastIndexOf(";") != -1) {
      decodedJson.IpAddress = decodedJson.IpAddress.substring(
        0,
        decodedJson.IpAddress.lastIndexOf(";"),
      );
    }

    // remove symbols in MAC address
    let mac = decodedJson.Mac;
    if (!tools.isMacAddrValid(mac)) {
      log.error(
        "MAC Address is not valid:" + mac + " RECEIVED from IP:" + clientIP,
      );
    } else {
      mac = mac.replace(/[-:.x]/gi, "");
    }

    let receivedJsonFrom = clientIP;

    log.info("receivedJsonFrom", receivedJsonFrom);

    // save json data to DB
    executeQuery(dbQueries.qryUpdateHostsStatusByIp, [
      "n",
      "a",
      receivedJsonFrom,
    ])
      .then(() => {
        executeQuery(dbQueries.qryInsertHosts, [
          receivedJsonFrom,
          decodedJson.Port,
          decodedJson.Hostname,
          decodedJson.IpAddress,
          mac,
          decodedJson.ServiceName,
          decodedJson.ServiceStatus,
          "a",
        ])
          .then((r) => {
            log.info("Data received and saved to database!");
          })
          .catch((err) => {
            log.error("Err inserting data to database");
            log.error(err);
          });
      })
      .catch((err) => {
        log.error(err);
      });
  } else {
    log.error("Not valid message");
  }

  if (mysocket != 0) {
    mysocket.emit("field", "" + msg);
  }
}

module.exports = { setupWebSocketServer, sendToToken };
