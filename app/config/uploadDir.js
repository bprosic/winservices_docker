const path = require("path"),
  fs = require("fs");

// Use environment variable with fallback
const UPLOADS_DIR = path.join(process.env.NODE_UPLOAD_DIR);

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
module.exports = { UPLOADS_DIR };
