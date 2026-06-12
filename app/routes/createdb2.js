require("dotenv").config();
const db = require("../config/dbcred");

async function query(q, params = []) {
  return db.query(q, params);
}

// -----------------------------
// WAIT FOR DB (Docker safe)
// -----------------------------
async function waitForDb(retries = 10) {
  while (retries) {
    try {
      await query("SELECT 1");
      console.log("✅ MySQL ready");
      return;
    } catch (err) {
      console.log("⏳ Waiting for MySQL...");
      await new Promise((r) => setTimeout(r, 3000));
      retries--;
    }
  }
  throw new Error("❌ MySQL not reachable");
}

// -----------------------------
// DATABASE
// -----------------------------
async function createDatabase(dbName) {
  await query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  console.log(`✔ Database ensured: ${dbName}`);
}

// -----------------------------
// USER (SAFE)
// -----------------------------
async function ensureUser(username, password) {
  await query(`CREATE USER IF NOT EXISTS '${username}'@'%' IDENTIFIED BY ?`, [
    password,
  ]);

  await query(`
    GRANT SELECT, INSERT, UPDATE, DELETE 
    ON \`${process.env.DB_NAME}\`.* 
    TO '${username}'@'%'
  `);

  await query("FLUSH PRIVILEGES");

  console.log(`✔ User ensured: ${username}`);
}

// -----------------------------
// TABLES
// -----------------------------
async function createTables(dbName) {
  await query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.tblusers (
      uIdUser INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      uUsername VARCHAR(200) UNIQUE,
      uEmail VARCHAR(255) NOT NULL UNIQUE,
      uPassword VARCHAR(250) NOT NULL,
      uRole ENUM('Author','Admin') DEFAULT NULL,
      files LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NULL
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.client (
      idHost INT AUTO_INCREMENT PRIMARY KEY,
      idPublic VARCHAR(100) NOT NULL UNIQUE,
      uIdUser INT NOT NULL,
      hostIp VARCHAR(30) NOT NULL,
      host_mac_addr VARCHAR(12),
      hostName VARCHAR(30),
      hostDescription VARCHAR(200),
      files LONGTEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NULL,
      KEY fk_idUser (uIdUser),
      FULLTEXT KEY hostIp (hostIp),
      FULLTEXT KEY hostName (hostName)
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.tbltokens (
      idHost INT UNIQUE,
      token VARCHAR(60) UNIQUE,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NULL,
      CONSTRAINT FK_Host FOREIGN KEY (idHost) 
        REFERENCES \`${dbName}\`.client(idHost)
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.sessions (
      session_id VARCHAR(128) PRIMARY KEY,
      expires INT UNSIGNED NOT NULL,
      data MEDIUMTEXT
    ) ENGINE=InnoDB;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS \`${dbName}\`.received_data (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(60) NOT NULL,
      jsonReceivedFrom VARCHAR(200) NOT NULL,
      portReceivedFrom INT,
      hostsName VARCHAR(30),
      hostsIpAddr VARCHAR(200) NOT NULL,
      host_mac_addr VARCHAR(12),
      hostsServiceName LONGTEXT,
      hostsServiceStatus LONGTEXT,
      isActive VARCHAR(2),
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FULLTEXT KEY token (token)
    ) ENGINE=InnoDB;
  `);

  console.log("✔ Tables ensured");
}

// -----------------------------
// MAIN EXEC
// -----------------------------
async function exec() {
  try {
    await waitForDb();

    const dbName = process.env.DB_NAME;
    const user = process.env.DB_USER2;
    const pass = process.env.DB_PSW2;

    await createDatabase(dbName);
    await ensureUser(user, pass);
    await createTables(dbName);

    console.log("🎉 DB setup complete (safe)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Setup failed:", err);
    process.exit(1);
  }
}

exec();
