const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  getAuthStatus,
} = require("../controllers/authController");

router.post("/login", login);
router.post("/logout", logout);
router.get("/status", getAuthStatus);

module.exports = router;
