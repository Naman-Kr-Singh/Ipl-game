import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import dns from 'dns';
import Match from './models/Match.js';
import User from './models/User.js';
import Poll from './models/Polls.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

dns.setServers(["1.1.1.1", "8.8.8.8"]);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;


// ================= MIDDLEWARE =================
app.use(cors());   // 🔥 allow everything (for now)

app.use(cookieParser());
app.use(express.json());

// ================= AUTH MIDDLEWARE =================
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { userId, isAdmin }

    next();

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    });
  }
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

   
const hashedPassword = await bcrypt.hash(password, 10);

const user = new User({
  name,
  password: hashedPassword,
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

    const isMatch = await bcrypt.compare(password, user.password);

if (!isMatch) {
  return res.status(401).json({
    success: false,
    message: "Wrong password"
  });
}

    // 🔐 Generate token
const token = jwt.sign(
  { userId: user._id, isAdmin: user.isAdmin },
  process.env.JWT_SECRET,
  { expiresIn: '1d' }
);

res.json({
  success: true,
  message: "Login successful",
  token,
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
app.post('/update-points', authMiddleware, async (req, res) => {
  try {
    const { targetUserId, points } = req.body;

    const userId = req.user.userId;

    // ✅ Validation
    if (!userId || !targetUserId || points === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing fields"
      });
    }

    if (points > 15 || points < -15) {
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
app.post('/set-match', authMiddleware, async (req, res) => {
  try {
    const { teamA, teamB, date } = req.body;
    const userId = req.user.userId;

    // ✅ Validation
    if (!teamA || !teamB || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing match details"
      });
    }

    if (teamA === teamB) {
      return res.status(400).json({
        success: false,
        message: "Teams must be different"
      });
    }

    // 🔒 Admin check
    const admin = await User.findById(userId);

    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    // 🧹 Only one active match
    await Match.deleteMany({});

    const match = new Match({
      teamA: teamA.trim(),
      teamB: teamB.trim(),
      date
    });

    await match.save();

    console.log(`Match set by ${admin.name}`);

    res.json({
      success: true,
      message: "Match set successfully",
      data: match
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ================= ADMIN: CREATE POLL =================
app.post('/create-poll', authMiddleware, async (req, res) => {
  try {
    const { question, options, durationHours, durationSeconds } = req.body;
    const userId = req.user.userId;

    const admin = await User.findById(userId);

    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    // ✅ Validation
    if (!question || !options || (!durationHours && !durationSeconds)) {
      return res.status(400).json({
        success: false,
        message: "Missing fields"
      });
    }

    if (!Array.isArray(options)) {
      return res.status(400).json({
        success: false,
        message: "Options must be array"
      });
    }

    if (options.length < 2 || options.length > 5) {
      return res.status(400).json({
        success: false,
        message: "2–5 options required"
      });
    }

    const cleanOptions = options.filter(opt => opt.trim() !== "");

    if (cleanOptions.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Invalid options"
      });
    }

    // durationSeconds for testing (e.g. 30s), durationHours for production
    const durationMs = durationSeconds
      ? Number(durationSeconds) * 1000
      : Number(durationHours) * 60 * 60 * 1000;

    const expiresAt = new Date(Date.now() + durationMs);

    // 🧹 Only one active poll
    await Poll.deleteMany({});

    const poll = new Poll({
      question,
      options: cleanOptions.map(opt => ({ text: opt })),
      expiresAt,
      voters: []
    });

    await poll.save();

    console.log(`Poll created by ${admin.name}`);

    res.json({
      success: true,
      message: "Poll created",
      data: poll
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ================= GET CURRENT POLL =================
app.get('/poll', async (req, res) => {
  try {
    const poll = await Poll.findOne();

    if (!poll) {
      return res.json({
        success: false,
        message: "No poll available"
      });
    }

    // ⛔ expired
    if (new Date() > poll.expiresAt) {
      return res.json({
        success: false,
        message: "Poll expired"
      });
    }

    res.json({
      success: true,
      data: poll
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ================= VOTE =================
app.post('/vote', authMiddleware, async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const userId = req.user.userId;

    const poll = await Poll.findOne();

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: "No active poll"
      });
    }

    // ⛔ expired
    if (new Date() > poll.expiresAt) {
      return res.status(400).json({
        success: false,
        message: "Poll expired"
      });
    }

    // ⛔ already voted — use String() on both sides to avoid ObjectId vs string mismatch
    const alreadyVoted = poll.voters.find(v => String(v.userId) === String(userId));

    if (alreadyVoted) {
      return res.status(400).json({
        success: false,
        message: "Already voted"
      });
    }

    // ⛔ invalid option
    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid option"
      });
    }

    // ✅ vote
    poll.options[optionIndex].votes += 1;
    poll.voters.push({ userId });

    await poll.save();

    res.json({
      success: true,
      message: "Vote recorded",
      data: poll
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

// ================= USER: MAKE PREDICTION =================
app.post('/predict', authMiddleware, async (req, res) => {
  try {
    const { team } = req.body;
    const userId = req.user.userId;

    const match = await Match.findOne();

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "No active match"
      });
    }

    // rule: must choose fav team if playing
    const user = await User.findById(userId);

    if (
      (match.teamA === user.favoriteTeam || match.teamB === user.favoriteTeam) &&
      team !== user.favoriteTeam
    ) {
      return res.status(400).json({
        success: false,
        message: "You must pick your favorite team"
      });
    }
    if (user.prediction && String(user.prediction.matchId) === String(match._id)) {
      return res.status(400).json({
      success: false,
      message: "Already predicted"
      });
    }

    user.prediction = {
      team,
      matchId: match._id
    };

    await user.save();

    res.json({
      success: true,
      message: "Prediction saved"
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

// ================= ADMIN: DECLARE RESULT =================
app.post('/declare-result', authMiddleware, async (req, res) => {
  try {
    const { winner } = req.body;
    const userId = req.user.userId;

    const admin = await User.findById(userId);

    if (!admin || !admin.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized"
      });
    }

    const match = await Match.findOne();

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "No active match"
      });
    }

    // validate winner
    if (winner !== match.teamA && winner !== match.teamB) {
      return res.status(400).json({
        success: false,
        message: "Invalid winner"
      });
    }

    const users = await User.find();

    let winnersCount = 0;

    for (let user of users) {
      const hasPrediction = user.prediction && String(user.prediction.matchId) === String(match._id);
      const predictedCorrectly = hasPrediction && user.prediction.team === winner;

      if (predictedCorrectly) {
        user.points += 1;
        winnersCount++;
        // Extend win streak (positive), or reset from losing streak
        user.streak = (user.streak > 0) ? user.streak + 1 : 1;
      } else if (hasPrediction) {
        // Wrong prediction — extend lose streak (negative), or reset from win streak
        user.streak = (user.streak < 0) ? user.streak - 1 : -1;
      }

      // Clear prediction for next match — set BEFORE the single save below
      user.prediction = null;

      // ✅ KEY FIX: ONE save only. The original code had two saves —
      // the second one (prediction=null) was overwriting the points update,
      // which is why winners always got 0 points.
      await user.save();
    }

    res.json({
      success: true,
      message: `Result declared. ${winnersCount} users got +1 point`
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