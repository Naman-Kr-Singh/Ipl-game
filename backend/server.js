import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import dns from 'dns';

import User from './models/User.js';

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


// ================= MIDDLEWARE =================
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());


// ================= TEMP MATCH STORAGE =================
let todaysMatch = {
  teamA: "",
  teamB: "",
  date: ""
};


// ================= ROUTES =================

// 🔹 Test route
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});


// ================= AUTH =================

// 🔹 Signup (default user)
app.post('/signup', async (req, res) => {
  try {
    const { name, password, favoriteTeam } = req.body;

    // ✅ Validation
    if (!name || !password || !favoriteTeam) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const existingUser = await User.findOne({ name });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    const user = new User({
      name,
      password,
      favoriteTeam,
      isAdmin: false
    });

    await user.save();

    res.json({
      success: true,
      message: "Signup successful",
      data: {
        _id: user._id,
        name: user.name
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// 🔹 Login (normal + admin both)
app.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    // ✅ Validation
    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing credentials"
      });
    }

    const user = await User.findOne({ name });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Wrong password"
      });
    }

    res.json({
      success: true,
      message: "Login successful",
      data: {
        _id: user._id,
        name: user.name,
        isAdmin: user.isAdmin
      }
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ================= LEADERBOARD =================
app.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -__v')
      .sort({ points: -1 });

    res.json({
      success: true,
      data: users
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ================= ADMIN: UPDATE POINTS =================
app.post('/update-points', async (req, res) => {
  try {
    const { userId, targetUserId, points } = req.body;

    // ✅ Validation
    if (!userId || !targetUserId || points === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing fields"
      });
    }

    if (points > 5 || points < -5) {
      return res.status(400).json({
        success: false,
        message: "Invalid points range"
      });
    }

    console.log("Updating points:", userId, targetUserId, points);

    const admin = await User.findById(userId);

    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    const user = await User.findById(targetUserId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.points += points;
    await user.save();

    res.json({
      success: true,
      message: "Points updated",
      data: user
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ================= ADMIN: SET MATCH =================

app.post('/set-match', async (req, res) => {
  try {
    const { userId, teamA, teamB, date } = req.body;

    // ✅ Validation
    if (!teamA || !teamB || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing match details"
      });
    }

    const admin = await User.findById(userId);

    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    await Match.deleteMany({}); // only 1 active match

    const match = new Match({ teamA, teamB, date });
    await match.save();

    res.json({
      success: true,
      message: "Match set",
      data: match
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ================= GET TODAY MATCH =================
app.get('/today-match', async (req, res) => {
  try {
    const match = await Match.findOne();

    if (!match) {
      return res.json({
        success: false,
        message: "No match set"
      });
    }

    res.json({
      success: true,
      data: match
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ================= DB CONNECTION =================

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected ✔'))
  .catch((err) => console.error('DB Error:', err.message));


// ================= SERVER START =================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});