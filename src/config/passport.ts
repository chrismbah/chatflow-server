import passport from "passport";
import {
  Strategy as GoogleStrategy,
  Profile,
  VerifyCallback,
} from "passport-google-oauth20";
import User from "../models/User";
import "../app";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "http://localhost:5000/api/auth/google/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        // Ensure `emails` array exists before accessing
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found in Google profile"), false);
        }

        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // Create a new user if not found
          user = await User.create({
            fullName: profile.displayName,
            email,
            googleId: profile.id,
            avatar: profile.photos?.[0]?.value || "",
            provider: "google",
          });
        }

        return done(null, user);
      } catch (error) {
        console.error("Error in Google Strategy:", error);
        return done(error as Error, false);
      }
    }
  )
);

export default passport;
