const express = require("express");
const passport = require("passport");
require("../config");
const { registerUser, loginUser } = require("../controllers/auth");
const { generateToken, setTokenCookie } = require("../utils/token");

const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/login", session: false }),
  (req, res) => {
    // Successful authentication
    const token = generateToken(req.user._id); // Generate JWT
    setTokenCookie(res, token);
    res.redirect(`${process.env.CLIENT_URL}/chat`); // Redirect with token (can be used on the client side)
  }
);

module.exports = router;
