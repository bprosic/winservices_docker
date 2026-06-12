require("dotenv").config();
const db = require("../config/dbcred"); // config db
const dbQueries = require("../config/dbqry");
async function executeQuery(qry, arrayParams) {
  return await db.query(qry, arrayParams);
}
//
const databaseName = process.env.DB_NAME;

var modifyTblHostMacColumn =
  "ALTER TABLE " +
  databaseName +
  ".tblhost " +
  "add host_mac_addr varchar(12) after hostIp;";

var modifyTblHostFileColumn =
  "ALTER TABLE " +
  databaseName +
  ".tblhost " +
  "add files longtext after hostDescription;";
var modifyTblUsersFileColumn =
  "ALTER TABLE " +
  databaseName +
  ".tblusers " +
  "add files longtext after uRole;";

var modifyTblHostsMacColumn =
  "ALTER TABLE " +
  databaseName +
  ".received_data " +
  "add host_mac_addr varchar(12) after hostsIpAddr;";

async function modifTable(tblName, sqlQry) {
  return await executeQuery(sqlQry, [])
    .then((r) => {
      if (r) {
        console.log("Table " + tblName + " modified");
      }
    })
    .catch((err) => {
      if (err) {
        console.log(err);
      }
    });
}
async function exec() {
  /* execute only once */
  await modifTable("tbl host", modifyTblHostMacColumn);
  await modifTable("tbl hosts", modifyTblHostsMacColumn);
  await modifTable("tbl user add field files", modifyTblHostFileColumn);
  await modifTable("tbl user add field files", modifyTblUsersFileColumn);
}

exec().then(() => {
  console.log("Finished");
  process.exit(0);
});
