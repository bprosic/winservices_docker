const query = {
  showAllHost: "select * from client",
  showAllHosts: "select * from received_data",
  showAllUsers: "select * from tbluser",
  countAllHost: "select count(*) as count from client",
  countAllHosts: "select count(*) as count from received_data",

  qryAllUsers:
    "select u.uIdUser, u.uUsername, u.uEmail from winservices.tblusers as u",

  qryUsrId:
    "SELECT u.uIdUser FROM winservices.tblusers as u WHERE u.uUsername = ?",
  qryUsrIdByEmail:
    "SELECT u.uIdUser FROM winservices.tblusers as u WHERE u.uEmail = ?",
  qryUpdateUser:
    "UPDATE winservices.tblusers SET uEmail = ?, uUsername = ?, updatedAt = now() where uIdUser = ?",
  qryHostIpByUserId: `SELECT t.token, p.idPublic, p.hostIp, p.host_mac_addr, p.files 
  FROM winservices.client AS p 
  LEFT JOIN winservices.tbltokens AS t
  ON p.idHost = t.idHost
  WHERE p.uIdUser = ?`,
  qryHostIpByUserIdHostIp:
    "SELECT p.hostIp from winservices.client as p WHERE p.uIdUser = ? and p.hostip = ?", //192.168.161.76, 192.168.161.115, 192.168.162.18
  qryHostIpByUserIdMacAddr:
    "SELECT p.hostIp from winservices.client as p WHERE p.uIdUser = ? and p.host_mac_addr = ?",
  qryAllHosts: `SELECT c.idPublic, p.jsonReceivedFrom, p.portReceivedFrom, p.id, p.hostsName, p.hostsIpAddr, p.host_mac_addr, p.hostsServiceName, p.hostsServiceStatus, p.createdAt, p.isActive 
    FROM winservices.received_data AS p 
    LEFT JOIN winservices.client AS c
    ON p.
    WHERE p.hostsIpAddr = ?
    ORDER BY p.id DESC, p.createdAt DESC limit 1`,
  // qryAllHostsByMAC deprecated
  qryAllHostsByMAC:
    "select p.jsonReceivedFrom, p.portReceivedFrom, p.id, p.hostsName, p.hostsIpAddr, p.host_mac_addr, p.hostsServiceName, p.hostsServiceStatus, p.createdAt, p.isActive from winservices.received_data as p " +
    "WHERE p.host_mac_addr = ? " +
    "order by p.id DESC, p.createdAt DESC limit 1",
  qryAllReceivedDataByToken: `SELECT c.idPublic, p.token, p.id, p.jsonReceivedFrom, p.portReceivedFrom, p.hostsName, p.hostsIpAddr, p.host_mac_addr, p.hostsServiceName, p.hostsServiceStatus, p.createdAt, p.isActive
    FROM winservices.received_data AS p
    LEFT JOIN winservices.tbltokens AS t
    ON t.token = p.token
    LEFT JOIN winservices.client AS c
    ON c.idHost = t.idHost
    WHERE p.token = ?
    ORDER BY p.id DESC, p.createdAt DESC limit 1
    `,
  qryGetHostByPublicId: `SELECT c.idHost, c.uIdUser, c.host_mac_addr, t.token 
    FROM winservices.client AS c
    LEFT JOIN winservices.tbltokens AS t
    ON c.idHost = t.idHost
    WHERE c.idPublic = ?
    `,
  qryInsertUser:
    "INSERT INTO winservices.tblusers (uUsername, uEmail, uPassword, createdAt) VALUES (?,?,?,now())",
  qryModifyUserFilePath:
    "UPDATE winservices.tblusers SET files = ? where uIdUser = ?",
  qryGetGroupFilesFolderPath:
    "SELECT files FROM winservices.tblusers where uIdUser = ?",
  qryInsertHost:
    "INSERT INTO winservices.client (uIdUser, idPublic, hostIp, host_mac_addr, hostName, hostDescription, createdAt) VALUES (?,?,?,?,?,?,now())",
  qryInsertHosts:
    "INSERT INTO winservices.received_data (token, jsonReceivedFrom, portReceivedFrom, hostsName, hostsIpAddr, host_mac_addr, hostsServiceName, hostsServiceStatus, createdAt, isActive) VALUES (?,?,?,?,?,?,?,?,now(),?)",
  qryGetHostFilesFolderPath:
    "SELECT files FROM winservices.client where idHost = ? and uIdUser = ?",
  qryModifyHostFilePath:
    "UPDATE winservices.client SET files = ? where idHost = ?",
  qryUpdateHostsStatusByIp:
    "UPDATE winservices.received_data as p set p.isActive = ? WHERE p.id in " +
    "(SELECT s.id from (select * from winservices.received_data) as s WHERE s.isActive = ? and s.jsonReceivedFrom = ?)",
  qryDeleteUser: "DELETE FROM winservices.tblusers WHERE uIdUser = ?",
  qryDeleteHostByUserHostId:
    "DELETE FROM winservices.client WHERE uIdUser = ? and idHost = ?",
  qryDeleteTokenByHostId: "DELETE FROM winservices.tbltokens WHERE idHost = ?",
  qryDeleteAllHostByUser: "DELETE FROM winservices.client WHERE uIdUser = ?",
  qryDeleteHost: "DELETE FROM winservices.client WHERE uIdUser = ?",
  qryUser:
    "select u.uIdUser, u.uPassword, u.uUsername, u.uEmail, u.files as uploadfolder from winservices.tblusers as u where u.uIdUser = ?",
  qryHostIdByUserAndMac:
    "select h.idHost from winservices.client as h where h.uIdUser = ? and h.host_mac_addr = ?",
  qryHostByHostId:
    "select h.uIdUser, h.idHost, h.host_mac_addr, h.hostIp, h.hostName, h.hostDescription, h.files from winservices.client as h " +
    "where h.uIdUser = ? and h.idHost = ?",
  qryHostTokenByHostId: `SELECT h.uIdUser, h.idHost, h.host_mac_addr, t.token FROM winservices.client AS h 
  LEFT JOIN winservices.tbltokens AS t on h.idHost = t.idHost WHERE h.uIdUser = ? and h.idHost = ?`,
  qryHostTokenByToken: `SELECT h.uIdUser, h.idHost, h.host_mac_addr, t.token FROM winservices.client AS h 
  LEFT JOIN winservices.tbltokens AS t on h.idHost = t.idHost WHERE t.token = ?`,
  insertToken: `INSERT INTO winservices.tbltokens (idHost, token, createdAt) VALUES (?, ?, now()) `,
  qryUpdateHost:
    "UPDATE winservices.client SET hostName = ?, hostDescription = ?, updatedAt = now() where idHost = ? and uIdUser = ?",
  qryUserHost:
    "select h.idHost, h.hostIp, h.host_mac_addr, h.hostName, h.hostDescription " +
    "from winservices.client as h " +
    "where h.uIdUser = ?",
  /* credentials for webiste administration */
  qryInsertCredentials:
    "INSERT INTO winservices.tblcred (username, psw, createdAt) VALUES (?,?,now())",
  qryFindUsername:
    "SELECT id, username, psw FROM winservices.tblcred WHERE username = ?",
  qryFindUserIdById:
    "SELECT id, username FROM winservices.tblcred WHERE id = ?",
};

module.exports = query;
