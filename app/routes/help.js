const express = require('express'),
    router = express.Router(),
    os = require('os'),
    ifaces = os.networkInterfaces(),
    { ensureAuthenticated } = require('../config/auth');


function getAllNetworkInterface() {
    var network = [];
    Object.keys(ifaces).forEach(function (ifname) {
        var alias = 0;
        ifaces[ifname].forEach(function(iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip internal 127.0.0.1
                return;
            }
            if (alias >= 1) {
                //console.log(ifname + ':' + alias, iface.address);
                let jsonObj = { "interface": ifname, "alias": alias, "address": iface.address};
                network.push(jsonObj);
            } else {
                // this interface has only one ip
                let jsonObj = { "interface": ifname, "address": iface.address};
                //console.log(ifname, iface.address);
                network.push(jsonObj);
            }
            ++alias;
        });
    });
    return network;

}
router.get('/', ensureAuthenticated, async function(req,res) {
    res.render('help', {
        title: "Help"
    });
});
router.get('/web', ensureAuthenticated, async function(req,res) {
    res.render('help-web', {
        title: "Help wit web interface"
    });
});
router.get('/client', ensureAuthenticated, async function(req,res) {
    var networkData = getAllNetworkInterface();
    res.render('help-client', {
        title: "Help with client program",
        networkData
    });
});

module.exports = router;