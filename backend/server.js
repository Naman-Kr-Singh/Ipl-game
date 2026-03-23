// imports
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import dns from 'dns';
import User from './models/User.js'; // ✅ here

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const app = express();

// ✅ ADD HERE (after app init, before routes)
let todaysMatch = {
  teamA: "",
  teamB: "",
  date: ""
};
const PORT = process.env.PORT || 5000;


// middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());


// routes
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// ✅ ADD YOUR JOIN API HERE
app.post('/join', async (req, res) => {
  try {
    const { name, favoriteTeam } = req.body;

    const user = new User({
      name,
      favoriteTeam
    });

    await user.save();

    res.json({ message: 'User joined successfully', user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find().select('-__v').sort({ points: -1 });

    res.json(users);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/update-points', async (req, res) => {
  try {
    const { userId, points, adminKey } = req.body;

    if (adminKey !== "naman123") {
      return res.status(403).send("Unauthorized");
    }

    const user = await User.findById(userId);

    if (!user) return res.status(404).send("User not found");

    user.points += points;

    await user.save();

    res.json({ message: "Points updated", user });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.post('/set-match', (req, res) => {
  const { teamA, teamB, date, adminKey } = req.body;

  if (adminKey !== "naman123") {
    return res.status(403).send("Unauthorized");
  }

  todaysMatch = { teamA, teamB, date };

  res.json({ message: "Today's match set", todaysMatch });
});
app.get('/today-match', (req, res) => {
  res.json(todaysMatch);
});

// DB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✔'))
  .catch((err) => console.error('DB Error:', err.message));


// server start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});