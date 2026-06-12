const { UPLOADS_DIR } = require("../config/uploadDir");

const express = require("express"),
  router = express.Router(),
  db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  { check, validationResult } = require("express-validator"),
  log4js = require("log4js"),
  mkdirp = require("mkdirp"),
  { ensureAuthenticated } = require("../config/auth"),
  path = require("path"),
  ExecuteQuery = require("../config/ExecuteQuery");

const log = log4js.getLogger("add.js"); // using default to save to log file and console

let getAllUsers = async () => {
  return await ExecuteQuery(dbQueries.qryAllUsers, []);
};

//#region List all groupname (1 menu)
router.get("/", ensureAuthenticated, async function (req, res) {
  //192.168.162.18:50123/view/L010
  //var username = req.params.id; // L010
  //var userId = await getUserId(username); // 1
  const result = await getAllUsers();
  res.render("createGroupname", {
    title: "Manage users",
    csrfToken: req.csrfToken(),
    result,
  });
});
//#endregion

//#region VALIDATION_RULES
const VALIDATION_RULES = {
  username: {
    minLength: 2,
    message: "Must be at least 2 chars long",
  },
  email: {
    message: "This aint email!",
  },
};
//#endregion

//#region checkUserExists
const checkUserExists = (users, username, email) => {
  const errors = [];

  for (const user of users) {
    if (user.uUsername === username) {
      errors.push({
        msg: "This group already exists!",
        param: "username",
        value: username,
      });
    }
    if (user.uEmail === email) {
      errors.push({
        msg: "This email already exists!",
        param: "email",
        value: email,
      });
    }
  }

  return errors;
};
//#endregion

//#region createUserFolder - Helper function to create user folder
const createUserFolder = async (userId) => {
  const folderName = userId.toString();
  const baseDir = UPLOADS_DIR;
  const userFolderPath = path.join(baseDir, folderName);

  await mkdirp(userFolderPath);
  return userFolderPath;
};
//#endregion

//#region renderErrorPage - Helper function to render error page
const renderErrorPage = (res, result, errors, username, email, csrfToken) => {
  return res.render("createGroupname", {
    title: "Manage users - error adding user",
    result,
    errors,
    csrfToken,
  });
};
//#endregion

//#region updateUserFilePath - Helper function to update user file path in database
const updateUserFilePath = async (userId, filePath) => {
  return await ExecuteQuery(dbQueries.qryModifyUserFilePath, [
    filePath,
    userId,
  ]);
};
//#endregion

//#region Execute INSERT new Groupname (1 menu and click on btn add)
router.post(
  "/insert",
  ensureAuthenticated,
  [
    check("username")
      .isLength({ min: VALIDATION_RULES.username.minLength })
      .withMessage(VALIDATION_RULES.username.message),
    check("email").isEmail().withMessage(VALIDATION_RULES.email.message),
  ],
  async function (req, res) {
    try {
      const { username, email } = req.body;

      // Get all users from database
      const existingUsers = await getAllUsers();

      // Check validation errors
      let validationErrors = validationResult(req);

      if (!validationErrors.isEmpty()) {
        // Preserve form values in error messages
        const enhancedErrors = enhanceValidationErrors(
          validationErrors,
          username,
          email,
        );
        log.error(enhancedErrors);

        return renderErrorPage(
          res,
          existingUsers,
          enhancedErrors,
          username,
          email,
          req.csrfToken(),
        );
      }

      // Check for existing user in database
      const existingUserErrors = checkUserExists(
        existingUsers,
        username,
        email,
      );

      if (existingUserErrors.length > 0) {
        const errorResponse = { errors: existingUserErrors };
        return renderErrorPage(
          res,
          existingUsers,
          errorResponse,
          username,
          email,
          req.csrfToken(),
        );
      }

      // Create new user
      const insertResult = await ExecuteQuery(dbQueries.qryInsertUser, [
        username,
        email,
        "n/a",
      ]);

      // Create folder for the new user
      const userFolderPath = await createUserFolder(insertResult.insertId);

      // Update database with folder path
      await updateUserFilePath(insertResult.insertId, userFolderPath);

      // Success - redirect to add page
      return res.redirect("/add");
    } catch (error) {
      log.error("Error in /insert route:", error);

      // Handle specific error types
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(409).render("createGroupname", {
          title: "Manage users - duplicate entry",
          result: await getAllUsers(),
          errors: {
            errors: [
              {
                msg: "User already exists in database",
                param: "username",
                value: req.body.username,
              },
            ],
          },
          csrfToken: req.csrfToken(),
        });
      }

      // Generic error response
      return res.status(500).render("error", {
        title: "Server Error",
        message: "An error occurred while processing your request",
        error: process.env.NODE_ENV === "development" ? error : {},
      });
    }
  },
);
//#endregion

module.exports = router;
