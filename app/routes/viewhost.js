const { sendToToken } = require("../services/ws");

const express = require("express"),
  router = express.Router(),
  db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  dgram = require("dgram"),
  WebSocket = require("ws"),
  util = require("../tools/common"),
  log4js = require("log4js"),
  path = require("path"),
  ExecuteQuery = require("../config/ExecuteQuery");

const log = log4js.getLogger("viewhost.js");
//#region getUserId
let getUserId = async (inputUsername) => {
  const usr = await ExecuteQuery(dbQueries.qryUsrId, inputUsername); // uIdUser:2
  if (usr[0]?.uIdUser) {
    return usr[0].uIdUser;
  } else {
    return false;
  } // here correct user, whatif uid doesnt exist
};
//#endregion

//#region getHostIpBasedOnUser
let getAllHostsByUsername = async (userid) => {
  return await ExecuteQuery(dbQueries.qryHostIpByUserId, userid); // uIdUser:2
};
//#endregion

//#region getHostInformationByMac
let getHostInformationByMac = async (inputMac) => {
  return await ExecuteQuery(dbQueries.qryAllHostsByMAC, [inputMac]);
};
//#endregion
//#region getHostInformationByToken
let getHostInformationByToken = async (token) => {
  return await ExecuteQuery(dbQueries.qryAllReceivedDataByToken, [token]);
};
//#endregion

//#region getResultFromDB
let getResultFromDB = async (req, res) => {
  let username;
  try {
    username = decodeURI(req.params.id);
  } catch (error) {
    return false;
  }

  const userId = await getUserId(username); // 1

  // console.log(userId); // 8, 2 = id from user
  if (userId) {
    const getAllHosts = await getAllHostsByUsername(userId);
    // console.log("ipArray", ipArray);
    // token
    // idPublic: 'c90bf297',
    // hostIp: '::ffff:127.0.0.1',
    // host_mac_addr: 'a8a159a222e6',
    // files:

    var dataFromDB = [];
    var uploadDirectory = [];
    var imageFiles = [];
    // console.log("getAllHosts", getAllHosts);
    // I have to use two for loops :(
    for (var i = 0; i < getAllHosts.length; i++) {
      // start search query only by MAC address. Not this shit.
      var getReceivedInfoByToken = await getHostInformationByToken(
        getAllHosts[i].token,
      );
      // sometimes there is no data in DB for MAC Addre (getInfo), so we need to exclude reading images
      // log.warn(getInfo);
      if (getReceivedInfoByToken[0] == undefined) {
        // if field is empty do nothing
        dataFromDB.push("empty-field");
        uploadDirectory.push("empty-field");
      } else {
        // log.warn("NOT EMPTY");
        // get images
        // we have excluded empty row in db with iparray[i].files
        dataFromDB.push(getReceivedInfoByToken[0]);
        uploadDirectory.push(getAllHosts[i].files); // this will have data
      }

      // get directory path for each mac
      if (uploadDirectory != null) {
        if (uploadDirectory[i] != "empty-field")
          imageFiles.push(util.readDirectoryFiles(uploadDirectory[i]));
        else imageFiles.push("empty-field");
      }

      if (imageFiles.length > 0) {
        if (imageFiles[i] != "empty-field") {
          // read file size
          var uploadDirectoryPath = uploadDirectory[i];
          if (uploadDirectoryPath != null) {
            uploadDirectoryPath = uploadDirectoryPath
              .substr(
                uploadDirectoryPath.indexOf("public") + 6,
                uploadDirectoryPath.length,
              )
              .replace(/\\/g, "/");

            dataFromDB[i].files = imageFiles[i];
            dataFromDB[i].filePath = uploadDirectoryPath + "/";
            dataFromDB[i].fileSize = util.getFileSizeInBytes(
              path.join(uploadDirectoryPath),
            );
          }
        }
      }
    }
    // filter array
    var result = dataFromDB.filter((e) => e !== "empty-field");
    // console.log("result:", result);
    // log.warn(result);
    return result;
  }
};
//#endregion

//#region Route GET /:id (get all hosts and render it)
router.get("/:id", async (req, res) => {
  //192.168.162.18:50123/view/L010
  const result = await getResultFromDB(req, res);

  res.render("viewhost", {
    layout: "mainJustView",
    title: "View status of all hosts",
    result: result || [],
  });
});
//#endregion

router.get("/checkdata/:id", async (req, res) => {
  //192.168.162.18:50123/checkdata/L010
  var result = await getResultFromDB(req, res);
  res.status("200").send(result);
});

//#region Route GET /requirerefresh/:idPublic - to send request to C# to get info
router.get("/requirerefresh/:idPublic", async (req, res) => {
  log.info("Entered route /requirerefresh/:idPublic");
  var idPublicHost = req.params.idPublic;
  // var userId = await getUserId(idPublicHost);
  // var ipPort = req.params.ipport;

  // console.log(`Username: ${idPublicHost}, userId: ${userId}, ipPort: ${ipPort}`);
  console.log(`idPublicHost: ${idPublicHost}`);

  const getTokenByPublicId = await ExecuteQuery(
    dbQueries.qryGetHostByPublicId,
    [idPublicHost],
  );
  const { idHost, uIdUser, host_mac_addr, token } = getTokenByPublicId[0];
  sendToToken(token, "please refresh");

  // console.log(getTokenByPublicId);

  return res.status(200).send("sent");
  // ipPort: ::ffff:127.0.0.1;50121);

  if (ipPort.length) {
    if (ipPort.indexOf(";") != -1) {
      var arrayHostNetworkData = ipPort.split(";");
      // var client = dgram.createSocket('udp4');
      const buffMessage = new Buffer.from("please refresh");
      // we set isActive column in received_data to N for specified jsonReceivedFrom
      ExecuteQuery(dbQueries.qryUpdateHostsStatusByIp, [
        "n",
        "a",
        arrayHostNetworkData[0],
      ]).catch((err) => {
        log.info(err);
      });

      // client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
      // TODO: prije nego posaljes poruku, napravi jos jedan column u mysql-u
      // postavi ga kao a = active, o = old
      // i kada kliknes ovdje, postavi ga na o
      // zatim ce se renderirat taj o
      // i ako dojde do refresha tj ako server (c#) doista radi, poslat ce nove podatke s atributom a
      // te ce se kako treba renderirat!

      // console.log(arrayHostNetworkData[0]);
      const ipV4 = arrayHostNetworkData[0].substring(
        arrayHostNetworkData[0].lastIndexOf(":") + 1,
        arrayHostNetworkData[0].length,
      );
      // console.log('Second ip is:', ipV4);
      const clientWs = new WebSocket(`ws://${ipV4}`);

      clientWs.on("open", () => {
        clientWs.send(buffMessage);
        log.info("Refresh request sent to ip " + ipV4);
        res.status(200).send("sent");
      });
      clientWs.on("message", (clientData) => {
        console.log("Clients says:", clientData);
      });

      // client.send(
      //   buffMessage,
      //   0,
      //   buffMessage.length,
      //   arrayHostNetworkData[1],
      //   arrayHostNetworkData[0],
      //   function (err, bytes) {
      //     if (err) log.info(err);
      //     else {
      //       log.info(
      //         'Refresh request sent to ip ' +
      //           arrayHostNetworkData[0] +
      //           ':' +
      //           arrayHostNetworkData[1],
      //       );
      //       client.close();
      //       res.status(200).send('sent');
      //     }
      //   },
      // );
    } else {
      res.status(400).send("In destination ip address is missing IP or PORT");
    }
  } else {
    res.status(400).send("There is no ip address of server to ask to refresh.");
  }
});
//#endregion

module.exports = router;
