require("dotenv").config();
const db = require("../config/dbcred"),
  dbQueries = require("../config/dbqry"),
  bcrypt = require("bcrypt");

async function ExecuteQuery(qry, arrayParams) {
  return await db.query(qry, arrayParams);
}
// process.env.DB_NAME
const databaseName = process.env.DB_NAME;
const tblCred =
  "CREATE TABLE " +
  databaseName +
  ".tblcred (" +
  "id int(10) UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY," +
  "username varchar(200) COLLATE utf8_unicode_ci UNIQUE," +
  "psw varchar(255) COLLATE utf8_unicode_ci NOT NULL," +
  "createdAt datetime NOT NULL DEFAULT CURRENT_TIMESTAMP," +
  "updatedAt datetime DEFAULT NULL" +
  ") ENGINE=MyISAM DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;";

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
async function insertUsername(user, password) {
  console.log("Trying to insert user in db:", user);

  try {
    const salt = await bcrypt.genSalt(10);
    const psw = await bcrypt.hash(password, salt).catch((err) => {
      console.log("Err with hasing:");
      console.log(err);
    });

    await ExecuteQuery(dbQueries.qryInsertCredentials, [user, psw]);
  } catch (error) {
    console.log("error inserting new user, error:", error);
  }
}

async function exec() {
  // await createTable('cred', tblCred);
  /* insert just one user for now and corresponding host */
  await insertUsername(process.env.LOGIN_USER, process.env.LOGIN_PSW);
}

exec()
  .then(() => {
    console.log("Finished");
    process.exit(0);
  })
  .catch((err) => {
    if (err) {
      console.log("Error:");
      console.log(err);
      process.exit(0);
    }
  });
