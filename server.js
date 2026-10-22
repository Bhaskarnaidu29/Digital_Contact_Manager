require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const contactRoutes = require("./routes/contacts");

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/digital_contact_manager";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files from the 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// API Health Check
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  res.json({
    status: "ok",
    app: "Digital Contact Manager",
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Mount Contact Routes
app.use("/api/contacts", contactRoutes);

// Catch-all route to serve the Single Page Application index.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ success: false, message: "API endpoint not found" });
  }
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({
    success: false,
    message: "An internal server error occurred",
    error: process.env.NODE_ENV === "production" ? undefined : err.message
  });
});

// Start Express Server and Connect Database
async function startServer() {
  try {
    console.log("--------------------------------------------------");
    console.log(" Starting Digital Contact Manager Server...");
    console.log("--------------------------------------------------");

    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000 // 5 seconds timeout for quick feedback
      });
      console.log(" Connected to MongoDB successfully!");
    } catch (dbError) {
      console.warn(" Warning: Could not connect to MongoDB at: " + MONGODB_URI);
      console.warn("  Reason: " + dbError.message);
      console.warn("  Tip: Make sure MongoDB is running locally (mongod) or provide a valid MongoDB Atlas URI in your .env file.");
      console.warn("  The web server will still start so you can review the UI!");
    }

    app.listen(PORT, () => {
      console.log(` Server is running on: http://localhost:${PORT}`);
      console.log(` Health check URL:     http://localhost:${PORT}/api/health`);
      console.log("--------------------------------------------------");
    });
  } catch (error) {
    console.error(" Fatal Server Startup Error:", error.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
