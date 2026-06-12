const express = require('express'),
  router = express.Router(),
  db = require('../config/dbcred'),
  dbQueries = require('../config/dbqry'),
  { ensureAuthenticated } = require('../config/auth'),
  ExecuteQuery = require('../config/ExecuteQuery');

let getAllUsers = async () => {
  return await ExecuteQuery(dbQueries.qryAllUsers, []);
};

router.get('/', ensureAuthenticated, async function (req, res) {
  var result = await getAllUsers();
  res.render('status', {
    title: 'Status',
    result,
  });
});

module.exports = router;
