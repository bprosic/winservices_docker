const express = require("express"),
  router = express.Router(),
  db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  { check, validationResult } = require("express-validator"),
  log4js = require("log4js"),
  mkdirp = require("mkdirp"),
  { ensureAuthenticated } = require("../config/auth"),
  path = require("path"),
  ExecuteQuery = require("../config/ExecuteQuery"),
  { UPLOADS_DIR } = require("../config/uploadDir"),
  fs = require("fs");

const log = log4js.getLogger("fileServe.js"); // using default to save to log file and console

let getAllUsers = async () => {
  return await ExecuteQuery(dbQueries.qryAllUsers, []);
};

//#region Get Image
router.get(
  "/:idHost/:idImage",
  ensureAuthenticated,

  async function (req, res) {
    try {
      const hostId = req.params.idHost;
      //   console.log("hostId: ", hostId);
      const imageId = req.params.idImage;
      //   console.log("imageId", imageId);
      const userId = req.user.id.toString();

      //   console.log("userId", userId);
      const filePath = path.join(UPLOADS_DIR, userId, hostId, imageId);

      //   console.log("filePath", filePath);

      // Find matching file (you'd query database in real app)
      //   fs.readdir(filePath, (err, files) => {
      //     console.log(files);
      //     const file = files.find((f) => f.startsWith(imageId));
      //     if (file) {
      //       // Set security headers
      //       res.setHeader("X-Content-Type-Options", "nosniff");
      //       res.setHeader("Content-Disposition", "inline");
      //       res.sendFile(path.join(UPLOADS_DIR, file));
      //     } else {
      //       res.status(404).send("File not found");
      //     }
      //   });

      fs.readFile(filePath, (err, file) => {
        if (err) {
          if (err.code === "ENOENT") {
            return res.status(404).send("File not found");
          }
          return res.status(500).send("Server error");
        }

        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Content-Type", getContentType(filePath));
        res.send(file);
      });
    } catch (error) {
      log.error("error in route /files/idHost/idImage:", error);
    }
  },
);
//#endregion

// Helper function to get content type
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };
  return contentTypes[ext] || "application/octet-stream";
}

module.exports = router;
