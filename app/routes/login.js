const express = require('express'),
  router = express.Router(),
  passport = require('passport'),
  loginLimit = require('../routes/expressrate'),
  log4js = require('log4js'),
  log = log4js.getLogger('login.js');

router.get('/', loginLimit, (req, res) => {
  res.render('login', {
    title: 'Login',
    layout: 'landing',
    csrfToken: req.csrfToken(),
    expressFlash: req.flash('success'), //this two is for registering
    sessionFlash: res.locals.sessionFlash, //this is for registering
    loginError: req.flash('error'), // this is for login error
  });
});

router.post('/', (req, res, next) => {
  passport.authenticate('local', function (err, user, info) {
    // console.log('Auth callback - err:', err);
    // console.log('Auth callback - user:', user);
    // console.log('Auth callback - info:', info);

    if (err) {
      // console.error('Authentication error:', err);
      req.flash('error', 'Authentication error');
      return res.redirect('/login');
    }

    if (!user) {
      // console.log('No user returned');
      req.flash('error', info?.message || 'Login failed');
      return res.redirect('/login');
    }

    req.logIn(user, function (err) {
      if (err) {
        // console.error('Login error:', err);
        req.flash('error', 'Login failed');
        return res.redirect('/login');
      }

      // FORCE SAVE THE SESSION before redirect.
      // if you login, then data is not saved in DB in session table.
      // it is actually saved, but async saved
      // then sometimes passport throws an error about user not logged in
      // so force first to save data to session table, then redirect
      req.session.save(function (err) {
        if (err) {
          // console.error('Session save error:', err);
          req.flash('error', 'Session error');
          return res.redirect('/login');
        }

        log.warn('Login successful for user:', user.username);

        return res.redirect('/add');
      });
    });
  })(req, res, next);
});

module.exports = router;
