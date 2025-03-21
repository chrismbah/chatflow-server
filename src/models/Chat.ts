import { Schema, model, Document, Types } from "mongoose";

// Define an interface for TypeScript type safety
export interface IChat extends Document {
  chatName: string;
  isGroupChat: boolean;
  users: Types.ObjectId[];
  latestMessage?: Types.ObjectId;
  groupAdmins?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema with proper TypeScript annotations
const ChatSchema = new Schema<IChat>(
  {
    chatName: {
      type: String,
      trim: true,
      required: true,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    latestMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    groupAdmins: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Chat = model<IChat>("Chat", ChatSchema);
export default Chat;
