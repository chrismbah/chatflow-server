const express = require("express");
const validateToken = require("../middlewares/validateToken");
const {
  createMessage,
  getMessagesByChatId,
  updateMessageReadStatus,
  deleteMessage,
} = require("../controllers/message");

const router = express.Router();
router.post("/", validateToken, createMessage);
router.get("/", validateToken, getMessagesByChatId);
router.patch("/:messageId/read", validateToken, updateMessageReadStatus);
router.delete("/:messageId", validateToken, deleteMessage);
module.exports = router;
