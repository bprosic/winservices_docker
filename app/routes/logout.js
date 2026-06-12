const ExecuteQuery = require('../config/ExecuteQuery');

const express = require('express'),
  router = express.Router(),
  { ensureAuthenticated } = require('../config/auth');

router.get('/', ensureAuthenticated, async function (req, res) {
  // user is not fully logged out, it's being repopulated.
  // req.logout doesnt work
  // req.session.destroy works 50%
  // https://medium.com/@caroline.e.okun/read-this-if-youre-using-passport-for-authentication-188d00968f1b
  // so set in APP.js resave to false, and saveUninitialized to false
  //console.log("node.js: Triggered logout");
  // console.log(req.session);
  console.log('req.sessionID', req.sessionID);

  // res.status(200).send('ok');
  // return;
  if (req.session && req.sessionID) {
    // ? delete first info in DB?
    req.logout();
    // delete session object
    req.session.destroy(function (err) {
      //res.clearCookie('connect.sid');
      if (err) {
        console.log('error destroying session');
        return next(err);
      } else {
        console.log('req.sessionID 2: ', req.sessionID);

        ExecuteQuery('DELETE FROM sessions WHERE session_id = ?', [
          req.sessionID,
        ])
          .then((x) => {
            console.log('Deleted??? ', x);
          })
          .catch((error) => {
            console.log('Error deleting sessionID in DB:');
            console.log(error);
          });

        res.clearCookie(process.env.DB_NAME); // Default session cookie
        return res.redirect('/');
      }
    });
  }
});

module.exports = router;
