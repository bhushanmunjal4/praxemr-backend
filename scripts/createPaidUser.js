const bcrypt = require("bcrypt");
const { initializeDatabase, getDatabase } = require("../utils/database");

(async () => {
  await initializeDatabase();
  const db = getDatabase();

  const username = process.argv[2];
  const password = process.argv[3];
  const doctorName = process.argv[4] || "";
  const speciality = process.argv[5] || "";
  const clinicName = process.argv[6] || "";

  if (!username || !password) {
    console.error(
      "❌ Usage: node scripts/createPaidUser.js <username> <password> [doctorName] [speciality] [clinicName]"
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const now = new Date();
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1); // 1-year license

  db.run(
    `INSERT INTO users
     (username, password_hash, doctor_name, speciality, clinic_name, license_type, is_paid, activation_date, expiry_date)
     VALUES (?, ?, ?, ?, ?, 'paid', 1, ?, ?)`,
    [
      username,
      hash,
      doctorName,
      speciality,
      clinicName,
      now.toISOString(),
      expiry.toISOString(),
    ],
    (err) => {
      if (err) {
        console.error("❌ Error creating paid user:", err.message);
      } else {
        console.log("✅ Paid user created successfully!");
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
      }
      process.exit();
    }
  );
})();
