require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initializeDatabase } = require("./utils/database");

const app = express();
app.use(cors());
app.use(express.json());

// Import routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// Simple health check
app.get("/api/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

// Initialize database, then start server
initializeDatabase()
  .then(() => {
    app.listen(PORT, () =>
      console.log(`✅ PraxEMR backend running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });
