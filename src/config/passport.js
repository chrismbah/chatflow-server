const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const passport = require("passport");
require(".");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // If user does not exist, create a new one
          user = await User.create({
            fullName: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
            avatar: profile.photos[0]?.value,
            provider: "google",
          });
        }
        return done(null, user);
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error, null);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => done(null, user.id));

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});
