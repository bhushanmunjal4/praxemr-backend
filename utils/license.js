const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { machineIdSync } = require("node-machine-id");

const APP_ENC_SECRET =
  "628870dcf0296a300a16f333681dcfcb1bd9391cb51b8ab856490faec94918fc";

// ====== Paths ======
function getUserDataDir() {
  return process.env.EMR_USER_DATA || path.join(os.homedir(), ".emr-app");
}
const LICENSE_DIR = path.join(getUserDataDir(), "license");
const LICENSE_FILE = path.join(LICENSE_DIR, "license.dat");

// ====== Crypto helpers ======
function getKey() {
  const mid = machineIdSync({ original: true });
  return crypto
    .createHash("sha256")
    .update(APP_ENC_SECRET + "|" + mid)
    .digest();
}

function encryptJSON(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([
    cipher.update(JSON.stringify(obj)),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decryptJSON(b64) {
  const raw = Buffer.from(b64, "base64");
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const enc = raw.slice(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(dec.toString("utf8"));
}

function loadLicense() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    return decryptJSON(fs.readFileSync(LICENSE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveLicense(license) {
  if (!fs.existsSync(LICENSE_DIR))
    fs.mkdirSync(LICENSE_DIR, { recursive: true });
  fs.writeFileSync(LICENSE_FILE, encryptJSON(license), "utf8");
}

function deleteLicense() {
  try {
    if (fs.existsSync(LICENSE_FILE)) fs.unlinkSync(LICENSE_FILE);
  } catch {}
}

module.exports = {
  loadLicense,
  saveLicense,
  deleteLicense,
};
