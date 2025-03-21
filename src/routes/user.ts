import {Router} from "express";
import { getAllUsers, getUserProfile } from "../controllers/user";
import validateToken from "../middlewares/validateToken";

const router = Router();

router.get("/", validateToken, getAllUsers);
router.get("/profile", validateToken, getUserProfile);

export default router;
