const express = require("express"),
  router = express.Router(),
  db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  util = require("../tools/common"),
  mkdirp = require("mkdirp"),
  multer = require("multer"),
  log4js = require("log4js"),
  { ensureAuthenticated } = require("../config/auth"),
  path = require("path"),
  ExecuteQuery = require("../config/ExecuteQuery"),
  crypto = require("crypto");

const log = log4js.getLogger("fileUpload.js");

//#region Async Functions
let getIdUser = async (username) => {
  return await ExecuteQuery(dbQueries.qryUsrId, [username]);
};

let getUserUploadFolder = async (username) => {
  return await ExecuteQuery(dbQueries.qryGetGroupFilesFolderPath, [username]);
};

//#endregion

//#region Globalvar storage
const storage = multer.diskStorage({
  //file upload destination
  destination: async function (req, file, callback) {
    const user = req.body.user;
    const userId = await getIdUser(user);
    const uploadFolder = await getUserUploadFolder(userId[0].uIdUser);
    // log.info("Upload folder:", uploadFolder);
    if (uploadFolder[0].files === null) {
      log.error(
        "Error - there is no temp folder for this username - fileupload.js, line 40",
      );
      //callback(null, null);
      log.error("uploadFolder var value is:");
      log.error(uploadFolder);
      return null;
    }
    const tempUploadFolder = path.join(uploadFolder[0].files, "temp");
    // execute send file to destination tempFolderName path
    callback(null, tempUploadFolder);
  },
  filename: function (req, file, callback) {
    // Generate safe filename
    const safeName = crypto.randomBytes(16).toString("hex");
    const ext = path.extname(file.originalname).toLowerCase();
    // const fileName = file.originalname;
    callback(null, `${safeName}${ext}`);
  },
  onError: function (err, next) {
    log.error("some error with multer", err);
    next(err);
  },
});
//#endregion

//#region Function FilterFiles
function FilterFiles(req, file, callback) {
  const allowedFileTypes = [
    "jpg",
    "png",
    "gif",
    "bmp",
    "jpeg",
    "tiff",
    "tif",
    "raw",
    "jif",
    "jfif",
    "jp2",
    "jpx",
    "j2k",
    "j2c",
    "fpx",
    "pcd",
  ];
  const extensionArray = file.originalname.split(".");
  const extension =
    extensionArray.length > 0
      ? extensionArray[extensionArray.length - 1].toLowerCase()
      : "";
  const isAllowed = allowedFileTypes.includes(extension);
  if (isAllowed) {
    return callback(null, true);
  } else {
    callback("Error: File type not allowed!!");
  }
}
//#endregion

// just for single file
// var upload = multer({storage:storage}).single('upl');
// this is to upload multiplefiles but with limit 1gb

module.exports = (req, res, next) => {
  multer({
    storage: storage,
    limits: {
      /*fileSize: , //3MB limit,*/
      fileSize: 3 * 1024 * 1024,
      files: 1,
    },
    fileFilter: function (req, file, callback) {
      FilterFiles(req, file, callback);
    },
  }).single("someBild")(req, res, function (err) {
    // log.warn("USAO U UPLOAD");
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.send("upload-file-size");
      } else {
        res.send("upload-multer-error");
      }
      log.error("Other error using multer:");
      log.error(err);
    } else if (err) {
      res.send("error-file-type");
      log.error(err);
    }
    // handle when user aborts upload
    req.on("close", () => {
      log.warn("Request aborted by client");
    });
    //Everything is ok
    next();
  });
};
