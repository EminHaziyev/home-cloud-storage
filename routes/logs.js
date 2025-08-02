import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

function getUserFromAuthHeader(req) {
  try {
    const authHeader = req.headers["authorization"];
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    return credentials.split(":")[0];
  } catch {
    return null;
  }
}

router.get("/", (req, res) => {
  const filePath = path.join(process.cwd(), "logs.txt");
  const user = getUserFromAuthHeader(req);
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Failed to read logs.txt" });
    console.log(`User:${user} watched logs`);
    return res.render("logs", { logs: data });
  });
});

export default router;
