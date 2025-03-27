import { Schema, model, Document, Types } from "mongoose";

// Define an interface for TypeScript type safety
export interface IMessage extends Document {
  sender: Types.ObjectId;
  content: string; 
  chat: Types.ObjectId;
  readBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Define the schema with proper TypeScript annotations
const MessageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      trim: true,
      required: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Message = model<IMessage>("Message", MessageSchema);
export default Message;
