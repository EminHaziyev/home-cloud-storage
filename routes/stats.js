import express from "express";
import os from "os";
import osu from "os-utils";
import { getFolderSize } from "../services/fileUtils.js";
import path from "path";

const router = express.Router();

router.get("/", (req, res) => {
  osu.cpuUsage(async (cpuPercent) => {
    const uploadsPath = path.join(process.cwd(), "uploads");
    const usedUploadsBytes = await getFolderSize(uploadsPath);
    let usedUploads = (usedUploadsBytes / 1024 / 1024).toFixed(2);
    if (usedUploads > 1024) {
      usedUploads = (usedUploads / 1024).toFixed(2) + "GB";
    } else {
      usedUploads += "MB";
    }

    const stats = {
      uptime: os.uptime(),
      totalMemGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
      freeMemGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
      usedMemGB: ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2),
      usedStorage: usedUploads,
      cpuUsagePercent: (cpuPercent * 100).toFixed(2),
      loadAverage: os.loadavg(),
      platform: os.platform(),
      cpuCores: os.cpus().length,
    };

    res.json(stats);
  });
});

export default router;
