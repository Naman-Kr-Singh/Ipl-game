import mongoose from "mongoose";

const pollSchema = new mongoose.Schema({
  question: String,
  options: [
    {
      text: String,
      votes: { type: Number, default: 0 }
    }
  ],
  expiresAt: Date,
  voters: [
    {
      userId: String
    }
  ]
});

export default mongoose.model("Poll", pollSchema);