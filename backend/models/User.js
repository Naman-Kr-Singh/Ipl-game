import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true
  },
  password: String,
  favoriteTeam: String,
  points: {
    type: Number,
    default: 0
  },
  streak: {
    type: Number,
    default: 0
  },
  achievements: [String],
  isAdmin: {
    type: Boolean,
    default: false
  },
    // 🆕 ADD THIS HERE
  prediction: {
    team: String,
    matchId: String
  }

}, { timestamps: true });

export default mongoose.model('User', userSchema);