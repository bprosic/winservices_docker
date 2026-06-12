const isDevelopment = require("../config/isDevelopment");

const express = require("express"),
  router = express.Router(),
  db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  log4js = require("log4js"),
  tools = require("../tools/common"),
  fs = require("fs"),
  path = require("path"),
  { ensureAuthenticated } = require("../config/auth"),
  ExecuteQuery = require("../config/ExecuteQuery");

const log = log4js.getLogger("delete.js"); // using default to save to log file and console;

let getAllUsers = async () => {
  return await ExecuteQuery(dbQueries.qryAllUsers, []);
};
let getIdUser = async (username) => {
  return await ExecuteQuery(dbQueries.qryUsrId, [username]);
};
let getUserUploadTempFolder = async (username) => {
  return await ExecuteQuery(dbQueries.qryGetGroupFilesFolderPath, [username]);
};
let getHostUploadFolder = async (hostid, username) => {
  return await ExecuteQuery(dbQueries.qryGetHostFilesFolderPath, [
    hostid,
    username,
  ]);
};
//#region Execute delete a host belonging to groupname (2 menu - add/view - delete)
router.post("/host", ensureAuthenticated, async function (req, res) {
  // this is to delete a host
  // log.warn("Enetered route /delete/host");
  const { user, hostId } = req.body;
  // console.log(req.body);
  // return res.send("deleted");

  var userId = await getIdUser(user);
  if (userId) {
    ExecuteQuery(dbQueries.qryGetHostFilesFolderPath, [
      hostId,
      userId[0].uIdUser,
    ])
      .then((r0) => {
        if (r0.length > 0) {
          //tools.deleteFolderRecursive(r0[0].files);
          var path = r0[0].files;
          tools.deleteFolderRecursive(path);
        }
        ExecuteQuery(dbQueries.qryDeleteTokenByHostId, [hostId])
          .then((r) => {
            ExecuteQuery(dbQueries.qryDeleteHostByUserHostId, [
              userId[0].uIdUser,
              hostId,
            ])
              .then((r) => {
                res.send("deleted");
              })
              .catch((err) => {
                log.error("err deleting host in table client");
                log.error(err);
              });
          })
          .catch((err) => {
            log.error("Error deleting token, error: ", err);
          });
      })
      .catch((errorr) => {
        log.error("error gettin files folder of host");
        log.error(errorr);
      });
  } else {
    res.send("error");
  }
});
//#endregion

//#region Execute delete group and all belonging hosts (1 menu - delete)
router.post("/", ensureAuthenticated, async function (req, res) {
  // this is to delete a user and belongig hosts
  //var result = await getAllUsers();
  //var errors = validationResult(req);
  var result = await getAllUsers();
  var idUsernameToDelete = req.body.idUser;
  var userId = await getIdUser(idUsernameToDelete);

  if (userId) {
    // delete first folder
    ExecuteQuery(dbQueries.qryGetGroupFilesFolderPath, [userId[0].uIdUser])
      .then((pathFromDb) => {
        // here we have double backslash and throws an error on - method emptyFolderRecursive - says here is problem
        // actually problem is in using double backslash or problem is not using path function
        if (!pathFromDb) {
          log.error("Path is missing in DB");
        }
        if (pathFromDb.length > 0) {
          const areFilesThere = pathFromDb[0].files;
          if (areFilesThere !== null) {
            const usingPathFunction = path.join(areFilesThere, ""); // if you leave "" - it will still work
            tools.deleteFolderRecursive(usingPathFunction);
          }
        }
        // folder doesnt exist, continue to delete user
        ExecuteQuery(dbQueries.qryDeleteAllHostByUser, [userId[0].uIdUser])
          .then((r1) => {
            ExecuteQuery(dbQueries.qryDeleteUser, [userId[0].uIdUser])
              .then((r2) => {
                res.send("deleted");
              })
              .catch((err) => {
                log.error("err deleting user in tblusers");
                log.error(err);
              });
          })
          .catch((err) => {
            log.error("err deleting user in table client");
            log.error(err);
          });
      })
      .catch((err) => {
        /*
            here is error triggered, it says error getting files path from DB
            its because pathFromDb - look up
            */
        log.error(
          "Error getting files path from dB from user id " + userId[0].uIdUser,
        );
        log.error(err);
      });
  } else {
    res.send("error");
  }
});
//#endregion

//#region Exec delete image in temp folder
router.post("/file/temp/image", ensureAuthenticated, async function (req, res) {
  // this is for deleting when inserting new file upload, file is in temp folder
  log.warn("Entered delete image");
  const { user, imageFile } = req.body;
  var userId = await getIdUser(user);
  var uploadFolder = await getUserUploadTempFolder(userId[0].uIdUser);

  if (uploadFolder !== null) {
    var imageFilePath = path.join(uploadFolder[0].files, "temp", imageFile);
    fs.unlink(imageFilePath, function (err) {
      log.warn("DELETING: " + imageFilePath);
      if (err) {
        log.error(err);
        res.send("Error-deleting-file");
      } else {
        res.send("File-deleted");
      }
    });
  } else {
    res.send("temp folder doesnt exist, nothing to delete");
  }
});
//#endregion

//#region Exec delete image in temp folder2
router.post("/file/host/image", ensureAuthenticated, async function (req, res) {
  // this is for deleting when inserting new file upload, file is in temp folder
  if (isDevelopment) {
    log.warn("Entered route /file/host/image - delete image on existing host");
  }
  const { user, hostId, imageFile } = req.body;
  if (hostId === undefined || hostId == null || hostId.length == 0) {
    return res.send("host-id-empty").end();
  }
  if (user === undefined || user == null || user.length == 0) {
    return res.send("user-empty").end();
  }
  const userId = await getIdUser(user);
  const uploadFolder = await getHostUploadFolder(hostId, userId[0].uIdUser); //
  // console.log("uploadFolder", uploadFolder);
  if (uploadFolder[0].files === undefined) {
    // do nothing
    return res.send("file-doesnt-exist").end();
  }

  if (uploadFolder !== null) {
    const imageFilePath = path.join(uploadFolder[0].files, imageFile);
    console.log("imageFilePath:", imageFilePath);
    fs.unlink(imageFilePath, function (err) {
      // log.warn("DELETING: " + imageFilePath);
      if (err) {
        log.error("Error deleting image file, error:", err);
        return res.send("Error-deleting-file");
      } else {
        res.send("File-deleted");
      }
    });
  } else {
    res.send("HOST upload folder doesnt exist, nothing to delete");
  }
});
//#endregion

module.exports = router;
