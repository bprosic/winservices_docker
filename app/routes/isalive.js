const express = require('express'),
  router = express.Router();

router.get('/:ip', async function (req, res) {
  //192.168.162.18:50123/checkdata/L010
  var username = req.params.id; // destination ip and port
});

module.exports = router;
