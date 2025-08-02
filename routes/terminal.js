import express from "express";
import pty from "node-pty";

const router = express.Router();

export default function terminalRouter(io) {
  io.on("connection", (socket) => {
    const shell = "bash";
    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: process.env,
    });

    ptyProcess.on("data", (data) => socket.emit("output", data));
    socket.on("input", (data) => ptyProcess.write(data));
    socket.on("resize", ({ cols, rows }) => ptyProcess.resize(cols, rows));
    socket.on("disconnect", () => ptyProcess.kill());
  });

  router.get("/", (req, res) => {
    res.render("terminal");
  });

  return router;
}
