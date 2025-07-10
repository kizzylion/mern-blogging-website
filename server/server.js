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
import aws from "aws-sdk"

// schema below
import User from "./Schema/User.js";
import Blog from "./Schema/Blog.js"

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

  // setting up s3 bucket
  const s3 = new aws.S3({
    region: 'us-east-2',
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })

  const generateUploadURL = async() =>{
    const date = new Date()
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`

    return await s3.getSignedUrlPromise('putObject', {
      Bucket: 'kizito-blog-website',
      Key: imageName,
      Expires: 1000,
      ContentType: "image/jpeg"
    })



  }

  const verifyJWT = (req, res, next)=>{
    const authHeader = req.headers['authorization']

    const token = authHeader && authHeader.split(" ")[1];

    if(token == null){
      return res.status(401).json({error: "No access token"})
    }

    jwt.verify(token,process.env.SECRET_ACCESS_KEY,(err, user)=>{
      if(err) return res.status(403).json({error: "Access token is invalid"})
        
        
      req.user = user.id
      
      next()
    })
  }

const formatDataToSend = (user) => {
  const access_token = jwt.sign(
    { id: user._id },
    process.env.SECRET_ACCESS_KEY
  );
  return {
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
    access_token
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

// upload image url route
server.get('/get-upload-url', (req,res)=>{
  generateUploadURL().then(url=>res.status(200).json({uploadUrl:url})).catch(err=>{
    console.log(err.message)
    return res.status(500).json({error: err.message})
  })
})

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

server.get("/latest-blogs", (req, res)=>{

  let maxLimit = 5;

  Blog.find({draft:false})
  .populate("author", "personal_info.profile_img personal_info.username, personal_info.fullname -_id ")
  .sort({"publishedAt": -1})
  .select("blog_id title des activity tags publishedAt -_id ")
  .limit(maxLimit)
  .then(blogs =>{
    return res.status(200).json({blogs})
  })
  .catch(err =>{
    return res.status(500).json({error: err.message})
  })
})

server.post("/create-blog", verifyJWT,(req, res)=>{
  let authorId = req.user

  let { title, banner, content, tags, des, draft} = req.body;

  
  if(!title.length) return res.status(403).json({error: "You must provide a title"});

  if(!draft){
    if(!des.length || des.length > 200) return res.status(403).json({error: "You must provide blog description under 200 characters"});

    if(!banner.length) return res.status(403).json({error : "You must provide blog banner to publish it"})

    if(!content.blocks.length) return res.status(403).json({error: "There must be some blog content to publish it"})

    if(!tags.length || tags.length > 10) return res.status(403).json({error: "Provide tags in order to publish the blog, maximum 10"})

  }

  
  tags = tags.map(tag => tag.toLowerCase())

  let blog_id = title.replace(/[^a-zA-Z0-9]/g, " ").replace(/\s+/g, "-").trim() + nanoid()

  let blog = new Blog({
    title, banner,des, content,author: authorId, blog_id, draft: Boolean(draft)
  })

  blog.save().then(blog =>{
    let incrementVal = draft ? 0 : 1;

    User.findOneAndUpdate({_id: authorId}, {$inc : {"account_info.total_posts" : incrementVal}, $push:{"blogs": blog._id}}).then(user=>{
      return res.status(200).json({id: blog.blog_id})
    }).catch(err => {
      return res.status(500).json({error:"Failed to update total posts number"})
    })
  }).catch(err => {
    return res.status(500).json({error:err.message})
  })

  

      
})
