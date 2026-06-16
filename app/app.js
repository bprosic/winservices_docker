const { importConfig, isDevelopment, isRunningInDocker } = require("./config");

importConfig();

const compression = require("compression"),
  app = require("express")(),
  passport = require("passport"),
  httpPort = process.env.NODE_PORT || 80, // this is actually websocket port
  // httpsPort = process.env.HTTPSPORT || 443, // https port
  http = require("node:http"),
  fs = require("node:fs"),
  { setupWebSocketServer } = require("./services/ws"),
  VALID_TOKENS = {
    exe: "csharp-client",
    sh: "linux-client",
    web: "web-client",
  },
  { DAY_IN_MILLIS } = require("./config/expiration"),
  path = require("path"),
  express = require("express"),
  bodyParser = require("body-parser"),
  db = require("./config/dbcred"),
  dbQueries = require("./config/dbqry"),
  session = require("express-session"),
  routes = require("./routes/index"),
  hbs = require("express-handlebars"),
  tools = require("./tools/common"),
  flash = require("connect-flash"),
  cors = require("cors"),
  csurf = require("csurf"),
  cookieParser = require("cookie-parser"),
  helmet = require("helmet"),
  csp = require("helmet-csp"),
  crypto = require("crypto"),
  log4js = require("log4js"),
  json = require("body-parser"),
  Utils = require("handlebars"),
  UPLOADS_DIR = require("./config/uploadDir"),
  logDir = process.env.NODE_LOG_DIR,
  uploadsDir = process.env.NODE_UPLOAD_DIR;

console.log("Checking logDir: ", logDir);
console.log("Checking uploadsDir: ", uploadsDir);
if (!fs.existsSync(logDir) || !fs.existsSync(uploadsDir)) {
  // this will try to create a folder /test_logs_ext
  // but I get permission denied.
  // I get this error upon running docker in windows OS, but i think docker runs linux vm
  // and then dockerfile

  console.log("Run initdb.js First!!!");
  process.exit(1);
}

// If using node.js like: Internet → HTTPS → nginx → HTTP → Node
// then I need to set trust proxy:
if (!isDevelopment && isRunningInDocker) {
  console.log("Using trust proxy!");
  app.set("trust proxy", 1);
}

log4js.configure({
  appenders: {
    appLogs: {
      type: "file",
      filename: path.join(`${logDir}`, "test.log"),
      maxLogSize: 10485760,
      backups: 3,
    },
    consoleLogs: { type: "console" },
  },
  categories: {
    justConsole: { appenders: ["consoleLogs"], level: "info" },
    default: { appenders: ["appLogs", "consoleLogs"], level: "info" },
  },
});
const log = log4js.getLogger("app.js"); // using default to save to log file and console

app.use(compression());
app.use(helmet());

/*

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    }
}));

*/
/* this is new!! */

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString("hex");
  next();
});
/* this is new!! */
app.use((req, res, next) => {
  csp({
    directives: {
      /*defaultSrc: ["'self'", "https://localhost", "http://localhost", "https://localhost:50123", `'nonce-${res.locals.nonce}'`],*/
      /*defaultSrc: ["'self'", `'nonce-${res.locals.nonce}'`,`"https://${req.hostname}:${port}"` ],*/
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", `'nonce-${res.locals.nonce}'`],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", `'nonce-${res.locals.nonce}'`],
      upgradeInsecureRequests: [],
    },
  })(req, res, next);
});

var mysocket = 0;

app.use(cors());

app.use(cookieParser(process.env.CSRF_SALT));
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  }),
);

app.use(
  session({
    // name: 'winsrvcook',
    name: process.env.DB_NAME,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 1 * DAY_IN_MILLIS, //24 hours
    },
    secret: process.env.SESSION_SECRET,
    resave: false, // should be set to false!!
    saveUninitialized: false,
    store: db.sessionStore,
    rolling: true,
  }),
);

// passport config
require("./config/passport")(passport);

// after Session import passport
app.use(passport.initialize());
app.use(passport.session());

// limit login creds
// goto expressrate.js and login.js

app.use(flash());
// this time we are using global vars?

// csurf
app.use(
  csurf({
    cookie: {
      path: "/",
      maxAge: 1000 * 60 * 24 * 60, // 24hrs
      secure: process.env.NODE_ENV === "production", //process.env.USING_SSL // true when using ssl
      httpOnly: true, // only use http protocol
    },
  }),
); // store into cookie, not in session*/

app.use(function (req, res, next) {
  // this two is for register and login flash messages
  res.locals.sessionFlash = req.session.sessionFlash;
  delete req.session.sessionFlash;
  next();
});

app.use("/", routes);

//view engine setup
app.set("view engine", "handlebars");

app.use(express.static(path.join(__dirname, "/public")));
// app.use(
//   "/groupfiles/",
//   express.static(path.join(__dirname, "/public/groupfiles")),
// );

app.engine(
  "handlebars",
  hbs({
    defaultLayout: "main", // this is a folder view
    partialsDir: path.join(__dirname, "/views/partials"),
    helpers: {
      divideString: function (inputString) {
        var arr =
          inputString !== undefined ? inputString.split(";") : inputString;
        var returnString = "";
        if (Array.isArray(arr)) {
          arr.forEach((el) => {
            if (
              el.toLowerCase() === "running" ||
              el.toLowerCase().includes("running") ||
              el.toLowerCase().includes("exited") ||
              el.toLowerCase().includes("waiting")
            ) {
              returnString += "<div class='bg-success'>" + el + "</div>";
            } else if (
              el.toLowerCase() === "stopped" ||
              el.toLowerCase().includes("inactive")
            ) {
              returnString += "<div class='bg-error'>" + el + "</div>";
            } else if (el.toLowerCase() === "stoppending") {
              returnString += "<div class='bg-warning'>" + el + "</div>";
            } else if (el.toLowerCase() === "server-down") {
              returnString += "<div class='bg-error'>" + el + "</div>";
            } else {
              returnString += "<div class='bg-gray'>" + el + "</div>";
            }
          });
        }
        return returnString;
      },
      macHelper: function (inputMac) {
        var stringToReturn;
        if (inputMac === "000000000000" || inputMac == null) {
          stringToReturn = "-";
        } else stringToReturn = inputMac;
        return stringToReturn;
      },
      ipHelper: function (inputIp) {
        var stringToReturn;
        if (inputIp === "0.0.0.0" || inputIp == null) {
          stringToReturn = "-";
        } else stringToReturn = inputIp;
        return stringToReturn;
      },
      formatDate: function (postDateModified) {
        var dateToShow = "";
        if (postDateModified !== "undefined") {
          //log.info(postDateModified);
          //created 2018-09-30 00:00:00
          //modified 2019-03-21 12:35:12
          var monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];

          if (tools.isValidDate(postDateModified)) {
            var dd = new Date(postDateModified);
            //log.info(dd);  //2016-12-07T23:00:00.000Z 8 undefined 16
            var day = dd.getDate(); // get timestamp from DB
            //log.info("day = " + day);
            var monthIndex = dd.getMonth();
            //log.info("monthIndex = " + monthIndex);
            var year = dd.getFullYear().toString();
            //log.info("year = " + year);
            year = year.substring(2);
            //log.info("year Substring = " + year);
            var hour = dd.getHours() + ":";
            //log.info("hour = " + hour);
            var minute =
              (dd.getMinutes() < 10 ? "0" : "") + dd.getMinutes() + ":";
            //log.info("minute = " + minute);
            var second = (dd.getSeconds() < 10 ? "0" : "") + dd.getSeconds();
            dateToShow =
              day +
              " " +
              monthNames[monthIndex] +
              " " +
              year +
              ", " +
              hour +
              minute +
              second;
          } else {
            dateToShow = "not yet updated";
          }
        } else {
          dateToShow = "not date format";
        }
        return tools.htmlEntities(dateToShow);
      },
      showJson: function (input) {
        return log.info(JSON.stringify(input));
      },
      toJSON: function (input) {
        return JSON.stringify(input);
      },
      cond: function (v1, operator, v2, options) {
        switch (operator) {
          case "==":
            return v1 == v2 ? options.fn(this) : options.inverse(this);
          case "===":
            return v1 === v2 ? options.fn(this) : options.inverse(this);
          case "!=":
            return v1 != v2 ? options.fn(this) : options.inverse(this);
          case "!==":
            return v1 !== v2 ? options.fn(this) : options.inverse(this);
          case "<":
            return v1 < v2 ? options.fn(this) : options.inverse(this);
          case "<=":
            return v1 <= v2 ? options.fn(this) : options.inverse(this);
          case ">":
            return v1 > v2 ? options.fn(this) : options.inverse(this);
          case ">=":
            return v1 >= v2 ? options.fn(this) : options.inverse(this);
          case "&&":
            return v1 && v2 ? options.fn(this) : options.inverse(this);
          case "||":
            return v1 || v2 ? options.fn(this) : options.inverse(this);
          default:
            return options.inverse(this);
        }
      },
      isStringLength: function (v1, v2, options) {
        // #isStringLength property 0 ... #else ...
        if (v1 === undefined) return;
        if (v1.length > v2) {
          return options.fn(this);
        }
        return options.inverse(this);
      },
      formatFileSize: function (bytes) {
        if (typeof bytes !== "number") {
          return "";
        }
        if (bytes >= 1000000000) {
          return (bytes / 1000000000).toFixed(2) + " GB";
        }
        if (bytes >= 1000000) {
          return (bytes / 1000000).toFixed(2) + " MB";
        }
        return (bytes / 1000).toFixed(2) + " KB";
      },
    }, //end of helper
  }),
);

app.get("/", (req, res) => {
  //res.sendFile(path.join(__dirname, '/index.html'));
  res.redirect("/login");
});

// error handler csrf
app.use(function (err, req, res, next) {
  if (err.code !== "EBADCSRFTOKEN") return next(err);
  // handle CSRF token errors here
  res.status(403);
  res.send("wrong csrf token");
});

app.use((req, res, next) => {
  const err = new Error("wrong route - page missing");
  err.status = 404;
  //res.status('404').send(err);
  res.send("404 - Page missing");
});
// node.js uses TLS 1.2 or TLS 1.3
// in c# - it uses TLS 1.0 / SSL 3.0 - disabled

const httpServer = http.createServer(app).listen(3000);
const wsServer = setupWebSocketServer(httpServer, httpPort, mysocket);

// httpServer.listen(httpPort);
