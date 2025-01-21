const express = require("express");
const validateToken = require("../middlewares/validateToken");
const {
  accessChat,
  getAllChats,
  createGroupChat,
  renameGroupChat,
  removeUserFromGroupChat,
  addUserToGroupChat,
  getAllGroupChats, getGroupChat
} = require("../controllers/chat");
const checkGroupAdmin = require("../middlewares/checkGroupAdmin");
const router = express.Router();

router.post("/", validateToken, accessChat);
router.get("/", validateToken, getAllChats);
router.get("/groups", validateToken, getAllGroupChats);
router.post("/group-create", validateToken, createGroupChat);
router.get("/group/:groupId", validateToken, getGroupChat);
router.put(
  "/group-rename/:groupId",
  validateToken,
  checkGroupAdmin,
  renameGroupChat
);
router.delete(
  "/group-remove/:groupId",
  validateToken,
  checkGroupAdmin,
  removeUserFromGroupChat
);
router.put(
  "/group-add/:groupId",
  validateToken,
  checkGroupAdmin,
  addUserToGroupChat
);

module.exports = router;
