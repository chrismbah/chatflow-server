import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

// Define TypeScript interface for User
export interface IUser extends Document {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  password?: string; // Optional since Google users don't have one
  googleId?: string;
  provider: "local" | "google";
  avatar: string;
  isAdmin: boolean;
  isOnline: boolean;
  lastActive: Date | null;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function (this: IUser) {
        return this.provider === "local"; // Fix TypeScript issue
      },
    },
    googleId: { type: String, unique: true, sparse: true },
    provider: { type: String, enum: ["local", "google"], default: "local" },
    avatar: { type: String, default: "" },
    isAdmin: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    lastActive: { type: Date, default: null },
  },
  { timestamps: true }
);

// Pre-save hook to set default avatar if not provided
UserSchema.pre("save", function (next) {
  if (!this.avatar) {
    this.avatar = `https://avatar.iran.liara.run/public/${
      Math.floor(Math.random() * 100) + 1
    }`;
  }
  next();
});

// Method to compare entered password with hashed password
UserSchema.methods.matchPassword = async function (enteredPassword: string) {
  if (!this.password) return false; // Prevent comparing undefined
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save hook to hash password before saving
UserSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next(); // Fix TypeScript issue by ensuring `password` exists
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const User = model<IUser>("User", UserSchema);
export default User;
