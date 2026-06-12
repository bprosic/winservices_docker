module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            //console.log("usao u auth! is auth");
            return next();
        }
        req.flash('error', 'Please log in to view this resource.');
        res.redirect('/login');
        
    },
    forwardAuthenticated: function(req, res, next) {
        if (!req.isAuthenticated()) {
          return next();
        }
        res.redirect('/status');      
    }
};