const express = require("express");
const validateToken = require("../middlewares/validateToken");
const {
  sendMessage,
  getMessagesByChatId,
  deleteMessage,
  markMessagesAsRead,
} = require("../controllers/message");

const router = express.Router();
router.post("/", validateToken, sendMessage);
router.get("/", validateToken, getMessagesByChatId);
router.delete("/:messageId", validateToken, deleteMessage);
router.patch("/read", validateToken, markMessagesAsRead);
module.exports = router;
