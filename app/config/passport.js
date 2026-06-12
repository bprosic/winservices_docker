const ExecuteQuery = require("./ExecuteQuery"),
  dbQueries = require("./dbqry"),
  bcrypt = require("bcryptjs"),
  LocalStrategy = require("passport-local").Strategy;

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      (username, password, done) => {
        // Match user
        ExecuteQuery(dbQueries.qryFindUsername, [username])
          .then((user) => {
            // console.log('user', user);
            if (user.length > 0) {
              if (!user[0].id) {
                return done(null, false, {
                  message: "Username not registered.",
                });
              }

              bcrypt.compare(password, user[0].psw, (err, isMatch) => {
                if (err) {
                  console.log(err);
                  return done(err);
                }
                if (isMatch) {
                  // Return FULL user object, not just username
                  return done(null, {
                    id: user[0].id,
                    username: user[0].username,
                  });
                } else {
                  return done(null, false, {
                    message: "Wrong credentials!",
                  });
                }
              });
            } else {
              return done(null, false, {
                message: "Wrong credentials!",
              });
            }
          })
          .catch((errrors) => {
            console.log("error in execQry1:");
            console.log(errrors);
            return done(errrors);
          });
      },
    ),
  );

  passport.serializeUser(function (user, done) {
    // console.log('serialize: ' + user.id);
    done(null, user.id); // Serialize by user ID, not username
  });

  passport.deserializeUser(function (id, done) {
    // Fetch user by ID, not username
    ExecuteQuery(dbQueries.qryFindUserIdById, [id])
      .then((r) => {
        if (r && r.length > 0) {
          // console.log('Deserialize user: ' + r[0].username);
          done(null, {
            id: r[0].id,
            username: r[0].username,
          });
        } else {
          done(null, null);
        }
      })
      .catch((err) => {
        done(err, null);
      });
  });
};
