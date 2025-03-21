import express from "express";
import validateToken from "../middlewares/validateToken";
import {
  sendMessage,
  getMessagesByChatId,
  deleteMessage,
} from "../controllers/message";

const router = express.Router();

router.post("/", validateToken, sendMessage);
router.get("/", validateToken, getMessagesByChatId);
router.delete("/:messageId", validateToken, deleteMessage);

export default router;
