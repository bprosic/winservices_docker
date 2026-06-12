const { rmSync } = require("fs");

let isDevelopment;
const isRunningInDocker = process.env.RUNNING_IN_DOCKER;

if (!process.env.DOCKER_IN_PRODUCTION && !process.env.RUNNING_IN_DOCKER) {
  isDevelopment = true;
} else {
  isDevelopment =
    process.env.DOCKER_IN_PRODUCTION === "development" &&
    process.env.RUNNING_IN_DOCKER === "true";
}

// windows
// running_in_docker = true
// docker_in_production = development
// true

console.log(
  `process.env.DOCKER_IN_PRODUCTION: ${process.env.DOCKER_IN_PRODUCTION}\nprocess.env.RUNNING_IN_DOCKER: ${process.env.RUNNING_IN_DOCKER}, isDevelopment: ${isDevelopment}`,
);

const importConfig = () => {
  console.log(
    `${isDevelopment ? "DEVELOPMENT" : "----[ PRODUCTION ]----"} config is being loaded...`,
  );
  if (isDevelopment) {
    require("dotenv").config({ path: "c:/winservicesserverdocker/.env" });
  } else {
    require("dotenv").config();
  }
  if (!process.env.DB_HOST) {
    console.log("ENV not loaded.");
    process.exit(1);
  }

  console.log(
    `Config VARS:
    DB_HOST: ${process.env.DB_HOST}, 
    DB_NAME: ${process.env.DB_NAME}, 
    INTERNAL_LOG_DIR* (for Docker): ${process.env.INTERNAL_LOG_DIR}, 
    NODE_LOG_DIR: ${process.env.NODE_LOG_DIR}
    EXTERNAL_LOG_DIR (for Docker): ${process.env.EXTERNAL_LOG_DIR}`,
  );
};
module.exports = { isDevelopment, isRunningInDocker, importConfig };
