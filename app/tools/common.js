const path = require("path"),
  fs = require("fs"),
  multer = require("multer"),
  log4js = require("log4js"),
  rimraf = require("rimraf"),
  crypto = require("crypto");

module.exports.isValidDate = function (inputText) {
  var isDate = false;
  if (Object.prototype.toString.call(inputText) === "[object Date]") {
    // it is a date
    if (!isNaN(inputText.getTime())) {
      isDate = true;
    }
  }
  return isDate;
};
module.exports.htmlEntities = function (str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};
module.exports.breakLines = function (inputText) {
  // if text has \n, then replace to \\n
  return inputText
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
};

module.exports.timestamp = function () {
  return new Date().valueOf();
};

module.exports.isDebug = function () {
  // for developer, to show info in console
  return true;
};

module.exports.validateIPaddress = function (ipaddress) {
  var regexp =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return regexp.test(ipaddress) ? true : false;
};

module.exports.validateEmail = function (email) {
  var re =
    /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
};

module.exports.isMacAddrValid = function (mac) {
  var regexp = /^([0-9A-F]{2}[:-]?){5}([0-9A-F]{2})$/i;
  return regexp.test(mac) ? true : false;
};
module.exports.GenerateWebsocketToken = function () {
  return crypto.randomBytes(16).toString("hex"); // 32-char token
};
module.exports.GenerateRandomHostId = function () {
  return crypto.randomBytes(4).toString("hex");
};

module.exports.isJsonObj = function (input) {
  try {
    JSON.parse(input);
  } catch (e) {
    return false;
  }
  return true;
};

module.exports.arrayJsonKeys = function () {
  return [
    "Hostname",
    "IpAddress",
    "Mac",
    "ServiceName",
    "ServiceStatus",
    "Port",
  ];
};

module.exports.deleteFolderRecursive = function (folderPath) {
  if (fs.existsSync(folderPath)) {
    try {
      rimraf.sync(folderPath);
    } catch (error) {
      console.log("HERE IS INFO:");
      console.log(error);
    }
  }
};
module.exports.emptyFolderRecursive = function (folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file, index) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
  }
};

module.exports.readDirectoryFiles = function (destination, includeFullPath) {
  var returnArray;
  if (fs.existsSync(destination)) {
    returnArray = fs.readdirSync(destination);
  }
  return returnArray;
};
module.exports.getFileSizeInBytes = function (targetFile) {
  var fileInBytes;
  if (fs.existsSync(targetFile)) {
    var stats = fs.statSync(targetFile);
    fileInBytes = stats["size"];
  }
  return fileInBytes;
};

module.exports.ifFolderIsEmpty = function (folderPath) {
  if (fs.existsSync(folderPath)) {
    var howManyFiles = fs.readdirSync(folderPath);
    if (howManyFiles.length == 0) return true;
    else return false;
  } else {
    return true;
  }
};

module.exports.ifFolderExist = function (path) {
  if (fs.existsSync(path)) {
    return true;
  } else return false;
};

module.exports.uploadFile = function (directoryName) {
  try {
    var storage = multer.diskStorage({
      // absolute path
      destination: function (req, res, callback) {
        callback(null, "./uploads/" + directoryName);
      },
      // Match the field name in the request body
      filename: function (req, file, callback) {
        callback(null, file.fieldname + "-" + Date.now());
      },
    });
    return storage;
  } catch (ex) {
    log.error("Error uploading file:");
    log.error(ex);
  }
};
