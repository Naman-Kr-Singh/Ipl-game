import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  points: {
    type: Number,
    default: 0
  },
  favoriteTeam: String,
  streak: {
    type: Number,
    default: 0
  },
  achievements: [String],
  isAdmin: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model('User', userSchema);