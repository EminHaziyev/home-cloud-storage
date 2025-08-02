import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server as SocketIO } from "socket.io";
import path from "path";
import cors from "cors";
import ejs from "ejs";

import { authMiddleware } from "./middlewares/authMiddleware.js";
import { generalLimiter } from "./middlewares/rateLimiter.js";

import filesRouter from "./routes/files.js";
import terminalRouter from "./routes/terminal.js";
import statsRouter from "./routes/stats.js";
import logsRouter from "./routes/logs.js";
import indexRouter from "./routes/index.js";

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

app.set("view engine", "ejs");
app.set("trust proxy", true);
app.use(cors());
app.use(express.json());

// Mount routes
app.use("/", authMiddleware, indexRouter);
app.use("/", authMiddleware, generalLimiter, filesRouter);
app.use("/terminal", authMiddleware, generalLimiter, terminalRouter(io));
app.use("/stats", authMiddleware, generalLimiter, statsRouter);
app.use("/logs", authMiddleware, generalLimiter, logsRouter);

// 404 fallback
// app.use((req, res) => {
//   res.redirect("/storage/home");
// });

const PORT = process.env.PORT || 3000;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
