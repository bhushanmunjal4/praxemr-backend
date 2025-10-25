const express = require("express");
const router = express.Router();
const {
  login,
  logout,
  getAuthStatus,
} = require("../../controllers/authController.js");

router.post("/login", login);
router.post("/logout", logout);
router.get("/status", getAuthStatus);

module.exports = router;
