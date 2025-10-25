const express = require("express");
const bcrypt = require("bcrypt");
const { getDatabase } = require("../utils/database");

const router = express.Router();

// ⚠️ Simple admin secret to protect this route
const ADMIN_SECRET = process.env.ADMIN_SECRET || "dev-secret-key";

router.post("/create-user", async (req, res) => {
  const { secret, username, password, doctor_name, speciality, clinic_name } =
    req.body;
  const db = getDatabase();

  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: "Unauthorized" });
  }

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Username and password required" });
  }

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date();

    db.run(
      `INSERT INTO users (username, password_hash, doctor_name, speciality, clinic_name, license_type, is_paid, activation_date)
       VALUES (?, ?, ?, ?, ?, 'paid', 1, ?)`,
      [
        username,
        password_hash,
        doctor_name,
        speciality,
        clinic_name,
        now.toISOString(),
      ],
      (err) => {
        if (err) {
          console.error("❌ Error creating paid user:", err);
          return res
            .status(500)
            .json({ success: false, error: "Failed to create user" });
        }

        res.json({
          success: true,
          message: `User ${username} created successfully`,
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

module.exports = router;
