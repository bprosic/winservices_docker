require("dotenv").config();
const db = require("../config/dbcred"); // config db
const dbQueries = require("../config/dbqry");

async function ExecuteQuery(qry, arrayParams) {
  return await db.query(qry, arrayParams);
}
//
const databaseName = process.env.DB_NAME;
const tblCred =
  "CREATE TABLE " +
  databaseName +
  ".tblcred (" +
  "id int(10) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY," +
  "username varchar(200) COLLATE utf8mb4_bin UNIQUE," +
  "psw varchar(255) COLLATE utf8mb4_bin NOT NULL," +
  "createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP," +
  "updatedAt datetime DEFAULT NULL" +
  ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// just table group actually
const tblUsers =
  "CREATE TABLE " +
  databaseName +
  ".tblusers (" +
  "uIdUser int(10) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY," +
  "uUsername varchar(200) COLLATE utf8mb4_bin UNIQUE," +
  "uEmail varchar(255) COLLATE utf8mb4_bin NOT NULL UNIQUE," +
  "uPassword varchar(250) COLLATE utf8mb4_bin NOT NULL," +
  "uRole enum('Author','Admin') COLLATE utf8mb4_bin DEFAULT NULL," +
  "createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP," +
  "updatedAt datetime DEFAULT NULL" +
  ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

// like relation table - one group has the same/different ip hosts
const tblClient = `CREATE TABLE ${databaseName}.client (
  idHost int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  idPublic varchar(100) NOT NULL UNIQUE,
  uIdUser int(11) NOT NULL,
  hostIp varchar(30) COLLATE utf8mb4_bin NOT NULL,
  hostName varchar(30) COLLATE utf8mb4_bin,
  hostDescription varchar(200) COLLATE utf8mb4_bin,
  createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt datetime DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

const tblTokens = `CREATE TABLE ${databaseName}.tbltokens (
      idHost int(11) NOT NULL UNIQUE,
      token VARCHAR(60) NOT NULL UNIQUE,
      createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt datetime DEFAULT NULL,
      CONSTRAINT FK_Host FOREIGN KEY (idHost) REFERENCES ${databaseName}.client(idHost)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

// Session tables
const tblSessions = `CREATE TABLE ${databaseName}.sessions (
      session_id varchar(128) COLLATE utf8mb4_bin NOT NULL,
      expires int(11) unsigned NOT NULL,
      data mediumtext COLLATE utf8mb4_bin,
      PRIMARY KEY (session_id)
      ) ENGINE=InnoDB `;

const addFulltext =
  "ALTER TABLE " + databaseName + ".client ADD FULLTEXT KEY hostIp (hostIp);";

const addFulltext2 =
  "ALTER TABLE " +
  databaseName +
  ".client ADD FULLTEXT KEY hostName (hostName);";

const addFulltextReceivedData =
  "ALTER TABLE " +
  databaseName +
  ".received_data ADD FULLTEXT KEY token (token);";

// imported data from computers
const tblReceivedData =
  "CREATE TABLE " +
  databaseName +
  ".received_data (" +
  "id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY," +
  "token VARCHAR(60) NOT NULL," +
  "jsonReceivedFrom varchar(200) NOT NULL," +
  "portReceivedFrom int(11)," +
  "hostsName varchar(30) COLLATE utf8mb4_bin," +
  "hostsIpAddr varchar(200) NOT NULL," +
  "hostsServiceName longtext COLLATE utf8mb4_bin," +
  "hostsServiceStatus longtext COLLATE utf8mb4_bin," +
  "createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP," +
  "isActive varchar(2)" +
  ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

const alternateTblClient =
  "ALTER TABLE " + databaseName + ".client " + " ADD KEY fk_idUser (uIdUser)";

const modifyTblClientMacColumn =
  "ALTER TABLE " +
  databaseName +
  ".client " +
  "add host_mac_addr varchar(12) after hostIp;";

const modifyTblClientFileColumn =
  "ALTER TABLE " +
  databaseName +
  ".client " +
  "add files longtext after hostDescription;";

const modifyTblUsersFileColumn =
  "ALTER TABLE " +
  databaseName +
  ".tblusers " +
  "add files longtext after uRole;";

const modifyTblReceivedDataMacColumn =
  "ALTER TABLE " +
  databaseName +
  ".received_data " +
  "add host_mac_addr varchar(12) after hostsIpAddr;";

async function createTable(tblName, sqlQry) {
  return await ExecuteQuery(sqlQry, [])
    .then((r) => {
      if (r) {
        console.log("Table " + tblName + " created");
      }
    })
    .catch((err) => {
      if (err) {
        if (err.code === "ER_TABLE_EXISTS_ERROR") {
          console.log("Table " + tblName + " exists");
        } else console.log(err);
      }
    });
}

//#region CreateDatabase
async function CreateDatabase(database) {
  const doesExist = await ExecuteQuery(
    `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
    [database],
  );
  // console.log('doesExist', doesExist.length);
  if (doesExist && doesExist.length > 0) {
    console.log(`Dropping database ${database}...`);
    await ExecuteQuery(`DROP DATABASE ${database}`, []).catch((err) => {
      console.log(`Error dropping database ${database}, error:`);
      throw new Error(err);
    });
    CreateDatabase(database);
  } else {
    console.log(`Creating database ${database}...`);
    await ExecuteQuery(`CREATE DATABASE ${database}`, [])
      .then((r) => {
        if (r) {
          console.log(`Database '${database}' created.`);
        }
      })
      .catch((err) => {
        console.log(err);
        if (err) {
          if (err.code === "ER_DB_CREATE_EXISTS") {
            console.log(`Database '${database}' already exists.`);
          }
          console.log(`error creating database ${database} .. err:`, err);
          // process.exit(0);
          throw new Error(err);
        }
      });
  }
}
//#endregion

//#region Database USERS functions
async function DropAndCreateUser(username, password) {
  await ExecuteQuery(`DROP USER IF EXISTS ${username}`, []);
  await ExecuteQuery(`CREATE USER ${username} IDENTIFIED BY ?`, [password]);
}

// Grant functions with different patterns
async function GrantDatabasePrivileges(username, database, privileges) {
  const query = `GRANT ${privileges} ON \`${database}\`.* TO ${username}`;
  await ExecuteQuery(query, []);
}

async function GrantTablePrivileges(username, database, table, privileges) {
  const query = `GRANT ${privileges} ON \`${database}\`.\`${table}\` TO ${username}`;
  await ExecuteQuery(query, []);
}
//#endregion

async function exec() {
  try {
    await ExecuteQuery("START TRANSACTION", []);

    // await executeQuery('CREATE DATABASE ' + databaseName + '', []);
    await CreateDatabase(databaseName);

    const username = process.env.DB_USER2;
    const psw = process.env.DB_PSW2;

    await DropAndCreateUser(`'${username}'@'localhost'`, psw);

    await GrantDatabasePrivileges(
      `'${username}'@'localhost'`,
      "winservices",
      "SELECT, INSERT, UPDATE, DELETE",
    );

    await ExecuteQuery("FLUSH PRIVILEGES", []);
    await ExecuteQuery("COMMIT", []);

    console.log(`Db user [${username}] added`);
    await createTable("users", tblUsers);
    await createTable("host", tblClient);
    await createTable("hosts", tblReceivedData);
    await createTable("cred", tblCred);
    await createTable("sessions", tblSessions);
    await createTable("tbltokens", tblTokens);

    await createTable("alter tbl client", addFulltext);
    await createTable("alter tbl client", addFulltext2);
    await createTable("alter tbl received_data", addFulltextReceivedData);
    await createTable("alter tbl received_data", alternateTblClient);

    /* execute only once */
    await createTable("tbl client", modifyTblClientMacColumn);
    await createTable("tbl received_data", modifyTblReceivedDataMacColumn);
    await createTable("tbl user add field files", modifyTblClientFileColumn);
    await createTable("tbl user add field files", modifyTblUsersFileColumn);
  } catch (error) {
    await ExecuteQuery("ROLLBACK", []);
    console.error("Error setting up database Winservices, error:", error);
  }
}

exec()
  .then(() => {
    console.log("Finished");
    console.log("Dont forget to execute: npm run createcred");
    process.exit(0);
  })
  .catch((err) => {
    if (err) {
      console.log("Error:");
      console.log(err);
      process.exit(0);
    }
  });
