const bcrypt = require("bcrypt");
const { getDatabase } = require("../utils/database");
const { saveLicense, loadLicense, deleteLicense } = require("../utils/license");

const TRIAL_DAYS = 30;

const login = async (req, res) => {
  const { username, password, trial, clinicInfo, deviceId } = req.body || {};
  const db = getDatabase();

  if (!deviceId) {
    return res.status(400).json({ success: false, error: "Missing device id" });
  }

  // === TRIAL SIGNUP FLOW ===
  if (trial) {
    if (!username || !clinicInfo) {
      return res.status(400).json({
        success: false,
        error: "Doctor and clinic details required",
      });
    }

    // 1) Block re-trial on same device
    db.get(
      "SELECT id, expiry_date FROM users WHERE device_id = ? AND license_type = 'trial' LIMIT 1",
      [deviceId],
      (err, row) => {
        if (err) {
          console.error("DB error on trial check:", err);
          return res
            .status(500)
            .json({ success: false, error: "Database error" });
        }

        if (row) {
          // Device already consumed a trial
          return res.status(403).json({
            success: false,
            error: "Trial already used on this device",
          });
        }

        // 2) Create trial user (no password needed)
        const now = new Date();
        const expiry = new Date(
          now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
        );

        const {
          doctorName,
          doctorPhone,
          speciality,
          language,
          clinicName,
          clinicPhone,
          clinicAddress,
        } = clinicInfo;

        db.run(
          `INSERT INTO users
             (username, password_hash, language, doctor_name, speciality, clinic_name, clinic_phone, clinic_address,
              license_type, is_paid, device_id, activation_date, expiry_date)
           VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'trial', 0, ?, ?, ?)`,
          [
            username,
            language || "en",
            doctorName,
            speciality,
            clinicName,
            clinicPhone,
            clinicAddress,
            deviceId,
            now.toISOString(),
            expiry.toISOString(),
          ],
          (insertErr) => {
            if (insertErr) {
              console.error("❌ Error creating trial user:", insertErr.message);
              return res.status(500).json({
                success: false,
                error: "Failed to create trial user",
              });
            }

            // Save local license (bind to device)
            saveLicense({
              username,
              deviceId,
              license_type: "trial",
              activationDate: now.toISOString(),
              expiryDate: expiry.toISOString(),
            });

            res.json({
              success: true,
              trial: true,
              message: "Trial started successfully",
              user: {
                username,
                doctorName,
                clinicName,
                expiryDate: expiry.toISOString(),
              },
            });
          }
        );
      }
    );

    return;
  }

  // === PAID / NORMAL LOGIN ===
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "Username and password required",
    });
  }

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, row) => {
      if (err) {
        console.error("DB error:", err);
        return res
          .status(500)
          .json({ success: false, error: "Database error" });
      }
      if (!row || !row.password_hash) {
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      }

      const ok = await bcrypt.compare(password, row.password_hash);
      if (!ok) {
        return res
          .status(401)
          .json({ success: false, error: "Invalid credentials" });
      }

      const now = new Date();
      if (row.expiry_date && now > new Date(row.expiry_date)) {
        return res
          .status(403)
          .json({ success: false, error: "License expired" });
      }

      // OK: save license locally
      saveLicense({
        username: row.username,
        deviceId,
        license_type: row.license_type,
        activationDate: row.activation_date,
        expiryDate: row.expiry_date,
      });

      res.json({
        success: true,
        user: {
          username: row.username,
          doctorName: row.doctor_name,
          speciality: row.speciality,
          clinicName: row.clinic_name,
          clinicPhone: row.clinic_phone,
          clinicAddress: row.clinic_address,
          licenseType: row.license_type,
          expiryDate: row.expiry_date,
        },
      });
    }
  );
};

const logout = (_req, res) => {
  deleteLicense();
  res.json({ success: true });
};

const getAuthStatus = (req, res) => {
  const lic = loadLicense();
  if (!lic) return res.json({ loggedIn: false });

  const now = new Date();
  const expiry = lic.expiryDate ? new Date(lic.expiryDate) : null;

  // loggedIn if paid without expiry OR now <= expiry for trial/paid
  const loggedIn = expiry ? now <= expiry : true;

  res.json({
    loggedIn,
    username: lic.username,
    activationDate: lic.activationDate,
    expiryDate: lic.expiryDate,
  });
};

module.exports = { login, logout, getAuthStatus };
