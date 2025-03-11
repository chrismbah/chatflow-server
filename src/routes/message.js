const express = require("express");
const validateToken = require("../middlewares/validateToken");
const {
  sendMessage,
  getMessagesByChatId,
  deleteMessage,
} = require("../controllers/message");

const router = express.Router();
router.post("/", validateToken, sendMessage);
router.get("/", validateToken, getMessagesByChatId);
router.delete("/:messageId", validateToken, deleteMessage);
module.exports = router;
