const express = require("express"),
  router = express.Router(),
  db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  tools = require("../tools/common"),
  fs = require("fs"),
  log4js = require("log4js"),
  mv = require("mv"),
  path = require("path"),
  mkdirp = require("mkdirp"),
  { ensureAuthenticated } = require("../config/auth"),
  ExecuteQuery = require("../config/ExecuteQuery");

const log = log4js.getLogger("edit.js");

let getIdUser = async (username) => {
  return await ExecuteQuery(dbQueries.qryUsrId, [username]);
};

let getIdUserByEmail = async (usernameEmail) => {
  return await ExecuteQuery(dbQueries.qryUsrIdByEmail, usernameEmail);
};

let getUserData = async (idUser) => {
  return await ExecuteQuery(dbQueries.qryUser, [idUser]);
};

let getUserUploadFolder = async (username) => {
  return await ExecuteQuery(dbQueries.qryGetGroupFilesFolderPath, [username]);
};

//#region Executing update to DB for GROUPNAME
router.post("/usr/execedit", ensureAuthenticated, async function (req, res) {
  /* EDITING GROUPNAME */
  const { inputUsername, inputEmail, currUsername } = req.body;
  var errors = [];
  var userId = await getIdUser(currUsername);

  if (!inputUsername.length) {
    errors.push(
      {
        param: "inputUsername",
        msg: "Not allowed empty record!",
      },
      {
        param: "inputEmail",
        value: inputEmail,
      },
    );
  } else if (!inputEmail.length) {
    errors.push(
      {
        param: "inputEmail",
        msg: "Not allowed empty email!",
      },
      {
        param: "inputUsername",
        value: inputUsername,
      },
    );
  } else if (inputUsername.length <= 2) {
    errors.push(
      {
        param: "inputUsername",
        msg: "Min three characters for groupname!",
        value: inputUsername,
      },
      {
        param: "inputEmail",
        value: inputEmail,
      },
    );
  } else if (!tools.validateEmail(inputEmail)) {
    errors.push(
      {
        param: "inputEmail",
        msg: "Not allowed invalid email!",
        value: inputEmail,
      },
      {
        param: "inputUsername",
        value: inputUsername,
      },
    );
  }
  var userData = await getUserData(userId[0].uIdUser);
  if (!userData) {
    res.send("Some error occured!");
  }

  if (errors.length) {
    res.render("editUsr", {
      title: "Error editing current group",
      userData,
      errors,
      csrfToken: req.csrfToken(),
    });
  } else {
    var getIdUserByMail = await getIdUserByEmail(inputEmail); // if there is number and that number is not the same as userId, then email exists
    var getIdUserByUsername = await getIdUser(inputUsername);
    if (getIdUserByMail.length > 0) {
      if (getIdUserByMail[0].uIdUser !== userId[0].uIdUser) {
        errors.push(
          {
            param: "inputEmail",
            msg: "This Email already exists!",
            value: inputEmail,
          },
          {
            param: "inputUsername",
            value: inputUsername,
          },
        );
        res.render("editUsr", {
          title: "Error editing current group",
          userData,
          errors,
          csrfToken: req.csrfToken(),
        });
        return;
      }
    }
    if (getIdUserByUsername.length > 0) {
      if (getIdUserByUsername[0].uIdUser !== userId[0].uIdUser) {
        errors.push(
          {
            param: "inputUsername",
            msg: "This groupname already exists!",
            value: inputUsername,
          },
          {
            param: "inputEmail",
            value: inputEmail,
          },
        );
        res.render("editUsr", {
          title: "Error editing current groupname",
          userData,
          errors,
          csrfToken: req.csrfToken(),
        });
        return;
      }
    }

    // perform update
    ExecuteQuery(dbQueries.qryUpdateUser, [
      inputEmail,
      inputUsername,
      userId[0].uIdUser,
    ])
      .then((r) => {
        res.redirect("/add");
      })
      .catch((err) => {
        log.error("Err updating user: ");
        log.error(err);
      });
  }
});
//#endregion

//#region Executing UPDATE for HOST belonging to GROUPNAME
router.post("/host/execedit", ensureAuthenticated, async function (req, res) {
  /* EDITING HOST INFORMATION BELONGING GROUPNAME */
  const {
    userName, // here you have to change, oldwinhref doesnt exists anymore.
    currHostMac,
    inputHostname,
    inputHostdescription,
  } = req.body;

  var userId = await getIdUser(userName);
  // we are here
  // save information - name, description and update image
  var uploadFolder = await getUserUploadFolder(userId[0].uIdUser);
  // if this temp folder doesnt exists, then create one
  var tempUploadFolder;
  if (uploadFolder[0].files !== null) {
    tempUploadFolder = path.join(uploadFolder[0].files, "temp");
    if (!tools.ifFolderExist(tempUploadFolder)) {
      mkdirp.sync(tempUploadFolder);
    }
  }

  if (userId) {
    // get host id
    ExecuteQuery(dbQueries.qryHostIdByUserAndMac, [
      userId[0].uIdUser,
      currHostMac,
    ])
      .then((r) => {
        var idFromHost = r[0].idHost; // 39
        // move image files from temp folder to host folder
        ExecuteQuery(dbQueries.qryGetGroupFilesFolderPath, [userId[0].uIdUser])
          .then((resultFiles) => {
            if (resultFiles.length > 0) {
              // move files from temp folder to host folder + update db
              if (resultFiles[0].files !== null) {
                // console.log(resultFiles[0].files);
                // console.log(idFromHost);
                var uploadFolderPath = path.join(
                  resultFiles[0].files,
                  idFromHost.toString(),
                ); // this is upload path
                if (!tools.ifFolderIsEmpty(tempUploadFolder)) {
                  //log.info("Move from temp folder everything to new upload folder");
                  // get files from TEMP folder, example c:\folder\file.jpg
                  var getFiles = fs.readdirSync(tempUploadFolder); // get files is array, ['slika.jpg']
                  for (var i = 0; i < getFiles.length; i++) {
                    var source = path.join(tempUploadFolder, getFiles[i]);
                    var destination = path.join(uploadFolderPath, getFiles[i]);
                    mv(source, destination, function (err) {
                      if (err) {
                        log.error(err);
                        res.send("error-moving-upload");
                      }
                    });
                  } // end for
                  // then update DB
                  ExecuteQuery(dbQueries.qryUpdateHost, [
                    inputHostname,
                    inputHostdescription,
                    idFromHost,
                    userId[0].uIdUser,
                  ])
                    .then((r) => {
                      res.redirect("/edit/byid/" + userName);
                    })
                    .catch((err) => {
                      log.error("Err in qryUpdateHost: ");
                      log.error(err);
                    });
                } else {
                  // just update DB without moving files from temp to host folder
                  ExecuteQuery(dbQueries.qryUpdateHost, [
                    inputHostname,
                    inputHostdescription,
                    idFromHost,
                    userId[0].uIdUser,
                  ])
                    .then((r) => {
                      res.redirect("/edit/byid/" + userName);
                    })
                    .catch((err) => {
                      log.error("Err in qryUpdateHost: ");
                      log.error(err);
                    });
                }
              }
            } // end if
          })
          .catch((err) => {
            log.error("Error fetching user! files folder path");
            log.error(err);
          });
      })
      .catch((err) => {
        log.error("Err gettin host id");
        log.error(err);
      });
  }
});
//#endregion

//#region List all information of GROUPNAME
router.get("/usr/byid/:id", ensureAuthenticated, async function (req, res) {
  /* EDITING GROUPNAME INFORMATION (1 menu -> edit) */
  var idUsernameToEdit = req.params.id;
  var userId = await getIdUser(idUsernameToEdit);
  if (userId.length > 0) {
    ExecuteQuery(dbQueries.qryUser, [userId[0].uIdUser])
      .then((userData) => {
        if (userData) {
          res.render("editGroup", {
            csrfToken: req.csrfToken(),
            title: "Edit current user",
            userData,
          });
        } else {
          res.send("error-getting-userdata");
        }
      })
      .catch((rr) => {
        log.error(rr);
      });
  } else {
    res.send("error");
  }
});
//#endregion

//#region List HOST information belonging to GROUP for EDITING (2 menu - add/view - edit)
router.get(
  "/host/byid/:userid/:hostid",
  ensureAuthenticated,
  async function (req, res) {
    /* CHANGE HOST (MAC) INFORMATION BELONGING TO GROUPNAME - (2 menu - add host - edit)*/
    const hostId = req.params.hostid; //35
    const username = req.params.userid; // Cham
    var oldusr = [
      {
        user: username,
      },
    ]; // Cham
    const userId = await getIdUser(username); //

    if (userId) {
      ExecuteQuery(dbQueries.qryHostByHostId, [userId[0].uIdUser, hostId])
        .then((hostData) => {
          if (hostData) {
            const uploadDirectory = hostData[0].files; //  'c:\\winservices_uploads\\1\\1'
            var imageFiles = [];
            if (uploadDirectory != null) {
              imageFiles = tools.readDirectoryFiles(uploadDirectory);
            }
            // log.info("imageFiles in Edit.js:", imageFiles);

            if (imageFiles.length > 0) {
              hostData[0].files = imageFiles[0];
              hostData[0].filePath = `/files/${hostData[0].idHost}/`; // href, route
              hostData[0].fileSize = tools.getFileSizeInBytes(
                path.join(uploadDirectory, imageFiles[0]),
              );
            } else {
              hostData[0].files = "";
            }
            res.render("groupManagerEditHost", {
              title: "Editin host",
              hostData,
              csrfToken: req.csrfToken(),
              oldusr,
              hostId,
            });
          } else {
            res.send("error-getting-hostdata, empty");
          }
        })
        .catch((rr) => {
          log.error(rr);
        });
    }
  },
);
//#endregion

//#region List all hosts belonging to group - (2 menu - add/view)
router.get("/byid/:id", ensureAuthenticated, async function (req, res) {
  const usernameParameter = req.params.id;

  try {
    const userId = await getIdUser(usernameParameter);

    if (!userId?.length) {
      console.log("No user found:", usernameParameter);
      return res.render("groupManagerListHost", {
        title: "Manage groups - error",
        csrfToken: req.csrfToken(),
        errors: { errors: ["User not found"] },
      });
    }

    const userIdValue = userId[0].uIdUser;
    const userData = await ExecuteQuery(dbQueries.qryUser, [userIdValue]);

    if (!userData?.length) {
      return res.render("groupManagerListHost", {
        title: "Manage groups - error",
        csrfToken: req.csrfToken(),
        errors: { errors: ["User data not found"] },
      });
    }

    // Handle temp folder cleanup
    const uploadFolder = userData[0].uploadfolder;
    if (uploadFolder) {
      const tempPath = path.join(uploadFolder, "temp");
      tools.ifFolderExist(tempPath)
        ? tools.emptyFolderRecursive(tempPath)
        : mkdirp.sync(tempPath);
    }

    const hosts = await ExecuteQuery(dbQueries.qryUserHost, [userIdValue]);

    res.render("groupManagerListHost", {
      title: "Edit current group",
      userData,
      hosts: hosts || [],
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    log.error("Error in /byid/:id:", error);
    res.render("groupManagerListHost", {
      title: "Manage groups - error",
      csrfToken: req.csrfToken(),
      errors: { errors: ["Internal server error"] },
    });
  }
});
//#endregion

router.post("/generate/token/host", async (req, res) => {
  // log.warn("Enetered route /edit/generate/token/host");
  try {
    // console.log(req.body);
    const { user, hostId, hostMacAddr } = req.body;
    const hostIdNr = Number.parseInt(hostId);
    if (!user || !hostIdNr || !hostMacAddr) {
      log.error("Not all parameters included: ", {
        user,
        hostIdNr,
        hostMacAddr,
      });
      return res.send("Error with token");
    }
    // check for user
    const userId = await ExecuteQuery(dbQueries.qryUsrId, [user]);
    // console.log("userId", userId);
    if (!userId || userId.length == 0) {
      return res.send("no user found");
    }
    const userIdDb = userId[0].uIdUser; // 1

    const getMacFromDb = await ExecuteQuery(dbQueries.qryHostTokenByHostId, [
      userIdDb,
      hostIdNr,
    ]);

    if (!getMacFromDb || getMacFromDb.length == 0) {
      log.error(
        `No host found in DB, given from frontend: hostId: ${hostId}, userIdDb: ${userIdDb}`,
      );
      return res.send("error");
    }

    const { host_mac_addr, token } = getMacFromDb[0];
    if (host_mac_addr !== hostMacAddr) {
      log.error(
        `MAC frontend is different from MAC backend. Frontend MAC: ${hostMacAddr}, Backend MAC: ${host_mac_addr}`,
      );
      return res.send("error");
    }

    if (!token) {
      const generateToken = `${userIdDb}_${tools.GenerateWebsocketToken()}`;
      // insert token and send back to frontend
      const isInserted = await ExecuteQuery(dbQueries.insertToken, [
        hostId,
        generateToken,
      ]);
      if (!isInserted) {
        log.error("Error inserting new token in DB.");
        return res.send("error");
      }
      return res.send(`token-${generateToken}`);
    } else {
      return res.send(`token-${token}`);
    }

    //   {
    //   uIdUser: 1,
    //   idHost: 1,
    //   host_mac_addr: 'a8a159a222e6',
    //   hostIp: '::ffff:127.0.0.1',
    //   hostName: 'n/a',
    //   hostDescription: 'n/a',
    //   files: 'C:\\winServicesServer\\public\\groupfiles\\1\\1'
    // }

    // console.log(getMacFromDb);

    // console.log(generateToken);
    // res.send(generateToken);
  } catch (error) {
    log.error("Error in route /generate/token/host: ", error);
  }
});
module.exports = router;
