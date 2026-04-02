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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    optionIndex: Number
  }
]
});

export default mongoose.model("Poll", pollSchema);