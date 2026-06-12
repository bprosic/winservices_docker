const express = require("express"),
  router = express.Router(),
  db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  util = require("../tools/common"),
  mkdirp = require("mkdirp"),
  fs = require("fs").promises, // Use promises version for better async handling
  log4js = require("log4js"),
  mv = require("mv"),
  fileupload = require("./fileUpload"),
  { ensureAuthenticated } = require("../config/auth"),
  path = require("path"),
  tools = require("../tools/common"),
  ExecuteQuery = require("../config/ExecuteQuery");

const log = log4js.getLogger("addHost.js");

// Promisify mv for use with async/await
const mvPromise = (source, destination) => {
  return new Promise((resolve, reject) => {
    mv(source, destination, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

//#region Database Queries Helpers
let getAllUsers = async () => {
  return await ExecuteQuery(dbQueries.qryAllUsers, []);
};

let getIdUser = async (username) => {
  return await ExecuteQuery(dbQueries.qryUsrId, [username]);
};

let getUserUploadFolder = async (userId) => {
  return await ExecuteQuery(dbQueries.qryGetGroupFilesFolderPath, [userId]);
};

let checkIfMacExists = async (userId, macAddress) => {
  return await ExecuteQuery(dbQueries.qryHostIpByUserIdMacAddr, [
    userId,
    macAddress,
  ]);
};

let insertNewHost = async (
  userId,
  publicId,
  clientIp,
  macAddress,
  hostName,
  description,
) => {
  return await ExecuteQuery(dbQueries.qryInsertHost, [
    userId,
    publicId,
    clientIp,
    macAddress,
    hostName,
    description,
  ]);
};

let updateHostFilePath = async (filePath, hostId) => {
  return await ExecuteQuery(dbQueries.qryModifyHostFilePath, [
    filePath,
    hostId,
  ]);
};
//#endregion

//#region Helper Functions
const validateMacAddress = (macAddress) => {
  if (!util.isMacAddrValid(macAddress)) {
    throw new Error("invalid-mac-address");
  }
  return macAddress.replace(/:/g, "");
};

const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress
  );
};

const ensureTempFolderExists = async (uploadFolderPath) => {
  if (!uploadFolderPath) return null;

  const tempFolderPath = path.join(uploadFolderPath, "temp");
  if (!tools.ifFolderExist(tempFolderPath)) {
    mkdirp.sync(tempFolderPath);
  }
  return tempFolderPath;
};

const createHostFolder = async (baseUploadPath, folderName) => {
  const hostFolderPath = path.join(baseUploadPath, folderName);
  await mkdirp(hostFolderPath);
  return hostFolderPath;
};

const moveFilesFromTempToHost = async (tempFolderPath, hostFolderPath) => {
  if (!tempFolderPath || util.ifFolderIsEmpty(tempFolderPath)) {
    return false;
  }

  const files = await fs.readdir(tempFolderPath);

  for (const file of files) {
    const source = path.join(tempFolderPath, file);
    const destination = path.join(hostFolderPath, file);
    await mvPromise(source, destination);
  }

  return true;
};

const handleHostCreation = async (
  userId,
  hostData,
  clientIp,
  tempFolderPath,
) => {
  const { hostName, hostDescription, hostMacAddr } = hostData;
  const nakedMac = validateMacAddress(hostMacAddr);

  // Check if MAC already exists
  const existingMac = await checkIfMacExists(userId, nakedMac);
  if (existingMac.length) {
    throw new Error("mac-already-exists");
  }

  // Insert host
  const insertResult = await insertNewHost(
    userId,
    tools.GenerateRandomHostId(),
    clientIp,
    nakedMac,
    hostName,
    hostDescription,
  );

  if (!insertResult || !insertResult.insertId) {
    throw new Error("host-not-inserted");
  }

  const hostId = insertResult.insertId;
  const folderName = hostId.toString();

  // Get upload folder path
  const uploadFolderResult = await getUserUploadFolder(userId);

  if (uploadFolderResult.length > 0 && uploadFolderResult[0].files) {
    const baseUploadPath = uploadFolderResult[0].files;
    const hostFolderPath = await createHostFolder(baseUploadPath, folderName);

    // Update database with file path
    await updateHostFilePath(hostFolderPath, hostId);

    // Move files from temp to host folder
    await moveFilesFromTempToHost(tempFolderPath, hostFolderPath);
  }

  return { success: true, hostId };
};
//#endregion

//#region Route: List all groupnames (2 menu)
router.get("/", ensureAuthenticated, async function (req, res) {
  try {
    const result = await getAllUsers();
    res.render("groupManager", {
      title: "Manage hosts",
      result,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    log.error("Error fetching users:", error);
    res.status(500).render("error", {
      message: "Failed to load group manager",
      csrfToken: req.csrfToken(),
    });
  }
});
//#endregion

//#region Route: Upload image for HOST (2 menu - add/view - Image upload after browsing)
router.post(
  "/upload",
  ensureAuthenticated,
  fileupload,
  async function (req, res, next) {
    const file = req.file;

    if (!file) {
      const error = new Error("Please choose files");
      error.httpStatusCode = 400;
      return next(error);
    }

    res.send(file);
  },
);
//#endregion

//#region Route: Insert new HOST (2 menu - add/view - btn Add)
router.post("/insert", ensureAuthenticated, async function (req, res) {
  const { user, hostName, hostDescription, hostMacAddr } = req.body;
  const clientIp = getClientIp(req);

  // Validate required fields
  if (!user || !hostName || !hostMacAddr) {
    log.warn("Missing required fields:", { user, hostName, hostMacAddr });
    return res.status(400).send("error-missing-fields");
  }

  try {
    // Get user ID
    const userIdResult = await getIdUser(user);
    if (!userIdResult || !userIdResult.length) {
      return res.status(404).send("error-user-not-found");
    }

    const userId = userIdResult[0].uIdUser;

    // Get user's upload folder and setup temp folder
    const uploadFolderResult = await getUserUploadFolder(userId);
    const uploadFolder = uploadFolderResult[0]?.files;
    const tempFolderPath = await ensureTempFolderExists(uploadFolder);

    // Create host and move files
    const result = await handleHostCreation(
      userId,
      req.body,
      clientIp,
      tempFolderPath,
    );

    if (result.success) {
      const hostId = result.hostId;
      // then here save token into db

      res.send("saved");
    } else {
      res.status(500).send("error-unknown");
    }
  } catch (error) {
    log.error("Error in /insert route:", error);

    // Send appropriate error message based on error type
    if (error.message === "invalid-mac-address") {
      res.status(400).send("error-invalid-mac");
    } else if (error.message === "mac-already-exists") {
      res.status(409).send("error-mac-already-exists");
    } else if (error.message === "host-not-inserted") {
      res.status(500).send("error-host-not-inserted");
    } else {
      res.status(500).send("error-inserting-host");
    }
  }
});
//#endregion

module.exports = router;
