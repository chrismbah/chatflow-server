import express from "express";
import validateToken from "../middlewares/validateToken";
import checkGroupAdmin from "../middlewares/checkGroupAdmin";

import {
  accessChat,
  getAllChats,
  createGroupChat,
  renameGroupChat,
  removeUserFromGroupChat,
  addUserToGroupChat,
  getAllGroupChats,
  getGroupChat,
} from "../controllers/chat";

const router = express.Router();

// Private chat routes
router.post("/", validateToken, accessChat);
router.get("/", validateToken, getAllChats);

// Group chat routes
router.get("/groups", validateToken, getAllGroupChats);
router.get("/group/:groupId", validateToken, getGroupChat);
router.post("/group-create", validateToken, createGroupChat);
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

export default router;
