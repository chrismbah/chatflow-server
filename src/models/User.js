const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        // Password is required only for local provider
        return this.provider === "local";
      },
    },
    googleId: { type: String, unique: true, sparse: true }, // `sparse` allows multiple null values
    provider: { type: String, default: "local" },
    avatar: {
      type: String,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to set the avatar if it's not already set
UserSchema.pre('save', function (next) {
  if (!this.avatar) {
    this.avatar = `https://avatar.iran.liara.run/public/${Math.floor(Math.random() * 100) + 1}`;
  }
  next();
});

// Method to check password match
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // If no password is provided, return false
  if (!enteredPassword) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  } else {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  }
});

const User = mongoose.model("User", UserSchema);
module.exports = User;
