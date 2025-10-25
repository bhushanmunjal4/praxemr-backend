const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const os = require("os");

/**
 * Determine database path based on environment
 * Render uses an ephemeral filesystem, but /opt/render/project/data
 * persists between deploys.
 */
function getDatabasePath() {
  const isRender = process.env.RENDER === "true";

  if (isRender) {
    // ✅ Persistent directory on Render
    const renderDbDir = "/opt/render/project/data";
    if (!fs.existsSync(renderDbDir)) {
      fs.mkdirSync(renderDbDir, { recursive: true });
    }
    return path.join(renderDbDir, "praxemr.db");
  }

  // 🧩 Local development
  const localDbDir = path.join(__dirname, "../../data");
  if (!fs.existsSync(localDbDir)) {
    fs.mkdirSync(localDbDir, { recursive: true });
  }
  return path.join(localDbDir, "praxemr.db");
}

const DB_PATH = getDatabasePath();

let db = null;
let isInitialized = false;

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    if (isInitialized && db) {
      return resolve(db);
    }

    console.log(`📊 Using database: ${DB_PATH}`);

    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("❌ Failed to open database:", err);
        return reject(err);
      }

      console.log("✅ Connected to SQLite database");
      createTables()
        .then(() => {
          isInitialized = true;
          resolve(db);
        })
        .catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    const tables = [
      // ==========================
      //  USERS (Login & License)
      // ==========================
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        doctor_name TEXT,
        speciality TEXT,
        clinic_name TEXT,
        clinic_phone TEXT,
        clinic_address TEXT,
        language TEXT DEFAULT 'en',
        license_type TEXT DEFAULT 'trial', -- 'trial' or 'paid'
        is_paid INTEGER DEFAULT 0,
        device_id TEXT,
        activation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiry_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_id, license_type)
      )`,

      // ==========================
      //  LICENSES (Optional separate table)
      // ==========================
      `CREATE TABLE IF NOT EXISTS licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        license_type TEXT NOT NULL,
        device_id TEXT,
        activation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiry_date DATETIME,
        status TEXT DEFAULT 'active', -- 'active' | 'expired' | 'revoked'
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
      )`,
    ];

    let completed = 0;

    tables.forEach((sql) => {
      db.run(sql, (err) => {
        if (err) {
          console.error("❌ Table creation error:", err.message);
          reject(err);
        } else {
          completed++;
          if (completed === tables.length) {
            console.log("✅ All tables created successfully");
            resolve();
          }
        }
      });
    });
  });
};

const getDatabase = () => {
  if (!db || !isInitialized) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first."
    );
  }
  return db;
};

const closeDatabase = () => {
  if (db) {
    db.close();
    isInitialized = false;
  }
};

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase,
};
