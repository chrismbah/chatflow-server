const express = require("express");
const { getAllUsers, getUserProfile } = require("../controllers/user");
const validateToken = require('../middlewares/validateToken')
const router = express.Router();


router.get("/", validateToken, getAllUsers);
router.get("/profile", validateToken, getUserProfile);

module.exports = router;
