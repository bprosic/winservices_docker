const express = require("express"),
  router = express.Router(),
  viewhost = require("./viewhost"),
  add = require("./add"),
  del = require("./delete"),
  edit = require("./edit"),
  addHost = require("./addHost"),
  help = require("./help"),
  login = require("./login"),
  logout = require("./logout"),
  status = require("./status"),
  fileServe = require("./fileServe");

router.use(function (req, res, next) {
  const tokenFrontEnd = req.csrfToken();
  res.cookie("xsrf-token", tokenFrontEnd); // do not change def names
  res.locals._csrf = tokenFrontEnd; // make the token available to all views. Do not change _csrf name
  //console.log(tokenFrontEnd);
  next();
});

router.use("/view", viewhost);
router.use("/add", add);
router.use("/delete", del);
router.use("/edit", edit);
router.use("/status", status);
router.use("/addhost", addHost);
router.use("/help", help);
router.use("/login", login);
router.use("/logout", logout);
router.use("/files", fileServe);
module.exports = router;
