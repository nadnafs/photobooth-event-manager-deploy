const http = require("http");
const { Server } = require("socket.io");

const app = require("./src/app");
const env = require("./src/config/env");
const socketHandler = require("./src/sockets/socketHandler");

const server = http.createServer(app);

const allowedOrigins = env.CLIENT_URL
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.error("Socket.IO menolak origin:", origin);

      return callback(
        new Error(`Origin ${origin} tidak diizinkan oleh Socket.IO`)
      );
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },

  transports: ["polling", "websocket"],
});

app.set("io", io);

socketHandler.init(io);

const PORT = env.PORT;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server berjalan pada port ${PORT}`);
  console.log("Allowed origins:", allowedOrigins);
});

server.on("error", (error) => {
  console.error("Server error:", error);
});