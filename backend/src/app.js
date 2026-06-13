const express = require("express");
const cors = require("cors");

const env = require("./config/env");

// Sesuaikan dengan file database kamu.
// Gunakan salah satu saja.
const { pool } = require("./config/database");

const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const masterDataRoutes = require("./routes/masterDataRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const queueRoutes = require("./routes/queueRoutes");
const orderRoutes = require("./routes/orderRoutes");
const reportRoutes = require("./routes/reportRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();

const allowedOrigins = env.CLIENT_URL
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Mengizinkan Bruno, Postman, health check,
    // dan request yang tidak membawa header Origin.
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = origin.replace(/\/+$/, "");

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error("CORS menolak origin:", origin);

    return callback(
      new Error(`Origin ${origin} tidak diizinkan oleh CORS`)
    );
  },

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],

  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "API Sistem Manajemen Event Photobooth berjalan.",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Backend berjalan dengan benar.",
    timestamp: new Date().toISOString(),
  });
});

// Database test
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.status(200).json({
      status: "success",
      message: "Koneksi database berhasil.",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    res.status(500).json({
      status: "error",
      message: "Koneksi database gagal.",
      error: error.message,
    });
  }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);
app.use("/api", masterDataRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/users", userRoutes);

// Route tidak ditemukan
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.method} ${req.originalUrl} tidak ditemukan.`,
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error("Application error:", error);

  if (error.message?.includes("tidak diizinkan")) {
    return res.status(403).json({
      status: "error",
      message: error.message,
    });
  }

  return res.status(error.status || 500).json({
    status: "error",
    message: error.message || "Terjadi kesalahan pada server.",
  });
});

module.exports = app;