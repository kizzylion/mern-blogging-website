import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import cors from "cors";
import admin from "firebase-admin";
import serviceAccountKey from "./serviceAccountKey.json" with { type: "json" };
import { getAuth } from "firebase-admin/auth";

// schema below
import User from "./Schema/User.js";

const server = express();

let PORT = process.env.PORT || 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

server.use(express.json());
server.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://192.168.4.227:5173',
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  preflightContinue: false,
  optionsSuccessStatus: 200
};
server.use(cors(corsOptions));

// Handle preflight requests explicitly
server.options('*', cors(corsOptions));

// Database connection
const connectDB = async () => {
  try {
    console.log("Attempting to connect to: Database");
    mongoose.connect(process.env.DB_LOCATION, {
      autoIndex: true,
    });
    console.log("📦 Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Add connection event listeners
mongoose.connection.on("connected", () => {
  console.log("✅ Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ Mongoose disconnected");
});

// Connect to database before starting server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log("Listening on port -> " + PORT);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  });

const formatDataToSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id },
    process.env.SECRET_ACCESS_KEY
  );
  return {
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
    access_token,
  };
};

// Helper function to generate username
const generateUsername = async (email) => {
  let username = email.split("@")[0];

  let isUsernameNotUnique = await User.exists({
    "personal_info.username": username,
  }).then((result) => result);

  isUsernameNotUnique ? (username += nanoid().substring(0, 5)) : "";

  return username;
};

server.post("/signup", async (req, res) => {
  let { fullName, email, password } = req.body;

  // validating the data from frontend

  if (fullName.length < 3) {
    return res
      .status(403)
      .json({ error: "Fullname must be at least 3 letters long" });
  }

  if (!email.length) {
    return res.status(403).json({ status: "Enter email" });
  }

  if (!emailRegex.test(email)) {
    return res.status(403).json("Email is invalid");
  }

  if (!passwordRegex.test(password)) {
    return res.status(403).json({
      error:
        "Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letter",
    });
  }

  try {
    // if user already exists
    const existingUser = await User.findOne({ "personal_info.email": email });
    if (existingUser) {
      return res.status(403).json({ error: "Email already exist" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique username
    let username = await generateUsername(email);

    // Create new user
    const newUser = new User({
      personal_info: {
        fullname: fullName,
        email,
        password: hashedPassword,
        username,
      },
    });

    // Save user to database
    const savedUser = await newUser.save();

    return res.status(200).json({
      message: "User created successfully",
      user: formatDataToSend(savedUser),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      error: "Internal server error. Please try again.",
    });
  }
});

server.post("/signin", async (req, res) => {
  let { email, password } = req.body;

  try {
    let user = await User.findOne({ "personal_info.email": email });

    if (!user) {
      return res.status(403).json({ error: "Email not found" });
    }

    const isCorrectPassword = await bcrypt.compare(
      password,
      user.personal_info.password
    );

    if (!isCorrectPassword) {
      return res.status(403).json({ error: "Incorrect password" });
    }

    return res.status(200).json(formatDataToSend(user));
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: err.message });
  }
});

server.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;

  getAuth().verifyIdToken(access_token).then(async (decodedUser)=>{
    let {email,name, picture} = decodedUser

    picture = picture.replace("s96-c", "s384-c")

    let user = await User.findOne({"personal_info.email": email}).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u)=>{
      return u || null
    }).catch(err =>{
      return res.status(500).json({error: err.message})
    })

    if(user){
      console.log("user exist")
      // if(!user.google_auth)
      //   return res.status(403).json({error: "This email was signed up without google. please login with password to access account"})
    }else{
      let username = await generateUsername(email)

      user = new User({
        personal_info: {fullname: name, email, username}, google_auth:true
      })

      await user.save().then(u=>{
        user = u
      })
      .catch(err => {
        return res.status(500).json({error: err.message})
      })
    }

    return res.status(200).json(formatDataToSend(user))
    
  }).catch(err => {
    return res.status(500).json({error: "failed to authenticate you with google. try another google account"})
  })
});
