const express = require("express");
const router = express.Router();

const {
  login,
  callback,
  status,
  logout,
} = require("../controllers/authController");

router.get("/login", login);
router.get("/oauth/callback", callback);
router.get("/auth/status", status);
router.post("/logout", logout);

module.exports = router;