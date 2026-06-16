const mysql = require("mysql2"),
  util = require("util"),
  { MINUTE_IN_MILLIS, SESSION_EXPIRY } = require("./expiration"),
  session = require("express-session"),
  { isRunningInDocker } = require("../config"),
  MySQLStore = require("express-mysql-session")(session),
  DB_HOST = isRunningInDocker ? process.env.DB_HOST : "localhost";

const pool = mysql.createPool({
  host: DB_HOST,
  user: process.env.INIT_DB_USER,
  password: process.env.INIT_DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  debug: false,
});

if (!pool) {
  console.error("Database pool is not initialized");
  return;
}

pool.getConnection(function (err, connection) {
  if (err) {
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.error("Database connection was closed.");
    }
    if (err.code === "ER_CON_COUNT_ERROR") {
      console.error("Database has too many connections.");
    }
    if (err.code === "ECONNREFUSED") {
      console.error("Database connection was refused.");
    }
  }
  if (connection) connection.release();
  return;
});

// uncomment if you want to see here sql queries
pool.on("connection", function (connection) {
  connection.on("enqueue", function (sequence) {
    if ("Query" === sequence.constructor.name) {
      console.log(sequence.sql);
    }
  });
});

const query = async (sql, binding) => {
  try {
    return await new Promise((resolve, reject) => {
      pool.query(sql, binding, (err, result, fields) => {
        if (err) reject(err);
        resolve(result);
      });
    });
  } catch (err) {
    console.log("Database Query Failed:", err);
    throw err; // Ensure it's caught in route handlers
  }
};

pool.query = util.promisify(pool.query);
// MySQL session store configuration
const sessionStoreOptions = {
  expiration: SESSION_EXPIRY, // 7 days
  createDatabaseTable: false,
  checkExpirationInterval: MINUTE_IN_MILLIS * 15, // 15 minutes
  clearExpired: true,
  schema: {
    tableName: "sessions",
    columnNames: {
      session_id: "session_id",
      expires: "expires",
      data: "data",
    },
  },
};

const sessionStore = new MySQLStore(sessionStoreOptions, pool);
sessionStore.on("error", (err) => {
  console.log("Session store error (index.js file in config folder): ", err);
});
module.exports = { pool, query, sessionStore };
