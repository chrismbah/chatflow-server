const express = require("express");
const passport = require("passport");

const { registerUser, loginUser } = require("../controllers/auth");

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
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication
    const token = generateToken(req.user._id); // Generate JWT
    res.redirect(`/?token=${token}`); // Redirect with token (can be used on the client side)
  }
);

module.exports = router;
