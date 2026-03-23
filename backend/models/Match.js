import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema({
  teamA: String,
  teamB: String,
  date: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Match', matchSchema);