const rateLimit = require('express-rate-limit');
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, //15 min
  max: 100,
});
// here you have tu use
// app.use("/route/", apiLimiter);

const loginAttemptLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, //1 hour window
  max: 10, // start blocking after 5 requests
  message: 'Too many requests, try after 1 hour again.',
});

module.exports = loginAttemptLimiter;
