const jwt = require("jsonwebtoken");
const { PORT } = require("../config");
const generateToken = (id) => {
  return jwt.sign({ id }, PORT, {
    expiresIn: "30d",
  });
};

module.exports = generateToken;
