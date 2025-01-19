const mongoose = require("mongoose");
const { MONGO_URI } = require("./index");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.error(`Error: ${error}`.red.bold);
  }
};

module.exports = connectDB;
