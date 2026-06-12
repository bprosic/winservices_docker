const redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

const redisClient = redis.createClient({
  host: process.env.DB_HOST,
  port: 6379,
  enable_offline_queue: false,
});

const rateLimiter = new RateLimiterRedis({
  redis: redisClient,
  keyPrefix: 'middleware',
  points: 300, // 10 requests
  duration: 60, // per 1 second by IP
  blockDuration: 2,
});

const rateLimiterMiddleware = (req, res, next) => {
  const key = req.userId ? req.userId : req.ip;
  const pointsToConsume = req.userId ? 1 : 30;
  console.log(key);

  rateLimiter
    .consume(key, pointsToConsume)
    .then(() => {
      next();
    })
    .catch(() => {
      res.status(429).send('Too Many Requests');
    });
};

module.exports = rateLimiterMiddleware;
