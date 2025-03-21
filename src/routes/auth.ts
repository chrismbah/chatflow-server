import { Response, Router } from "express";
import passport from "passport";
import "../config";

import { registerUser, loginUser } from "../controllers/auth";
import { generateToken, setTokenCookie } from "../utils/token";
import { AuthenticatedRequest } from "../types";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login",
    session: false,
  }),
  (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      return res.redirect("/auth/login");
    }

    const token = generateToken(req.user.id);
    setTokenCookie(res, token);

    // Redirect to chat page with the authenticated session
    res.redirect(`${process.env.CLIENT_URL ?? "localhost:3000"}/chat`);
  }
);

export default router;
