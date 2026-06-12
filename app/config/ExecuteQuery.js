const { query } = require("./dbcred");

module.exports = async function (qry, arrayParams) {
  try {
    return await query(qry, arrayParams);
  } catch (error) {
    console.log("DB down?");
    console.log(error);
  }
};
