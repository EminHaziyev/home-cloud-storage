import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { checkPermission } from "../middlewares/permissionChecker.js";
const router = express.Router();

// Multer setup for dynamic folder destination
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.params.folder ? req.params.folder.split("/").filter(Boolean).join("/") : "";
    const dest = path.join(process.cwd(), "uploads", folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

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







router.post("/upload/{*folder}", checkPermission("upload"), upload.array("files"), (req, res) => {
  const user = getUserFromAuthHeader(req);
  console.log(`User ${user} uploaded files to ${req.params.folder}`);
  res.json({ message: "Uploaded to " + (req.params.folder || "") });
});

router.get("/download/{*folderPath}", checkPermission("download"), (req, res) => {
  const user = getUserFromAuthHeader(req);
  const filePath = path.join(process.cwd(), "uploads/storage", req.params.filePath);
  if (filePath.includes("..")) return res.status(400).send("Invalid path");

  console.log(`User ${user} downloaded ${filePath}`);
  res.download(filePath);
});

router.delete("/delete/:filename", checkPermission("delete"), (req, res) => {
  const user = getUserFromAuthHeader(req);
  const filePath = path.join(process.cwd(), "uploads", req.params.filename);
  if (filePath.includes("..")) return res.status(400).send("Invalid path");

  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(`User ${user} couldnt delete ${filePath}`);
      return res.status(500).send("Error deleting file");
    }
    console.log(`User ${user} deleted ${filePath}`);
    res.send("File deleted");
  });
});

router.post("/mkdir", checkPermission("mkdir"), (req, res) => {
    console.log("Creating folder");
  const user = getUserFromAuthHeader(req);
  let { currentFolder, newFolderName, locked } = req.body;

  if (!newFolderName) return res.status(400).json({ error: "newFolderName is required" });

  if (locked === true) {
    newFolderName = `[locked][${user}]${newFolderName}`;
  }

  const targetPath = path.join(process.cwd(), "uploads/storage", currentFolder || "", newFolderName);

  if (!targetPath.startsWith(path.join(process.cwd(), "uploads/storage")) || targetPath.includes("..")) {
    return res.status(400).send("Invalid path");
  }

  fs.readFile("folders.json", "utf8", (err, data) => {
    if (err) {
      console.log(`ERROR reading folders.json:`, err);
      return res.status(500).json({ error: "Failed to read metadata file" });
    }

    let folders;
    try {
      folders = JSON.parse(data);
    } catch (e) {
      console.log("ERROR parsing folders.json:", e);
      return res.status(500).json({ error: "Invalid folders.json" });
    }

    if (folders[targetPath]) {
      console.log(`Folder already exists in folders.json: ${targetPath}`);
      return res.status(400).json({ error: "Folder metadata already exists" });
    }

    folders[targetPath] = {
      owner: user,
      locked: locked,
    };

    fs.writeFile("folders.json", JSON.stringify(folders, null, 2), (err) => {
      if (err) {
        console.log("Error writing folders.json:", err);
        return res.status(500).json({ error: "Failed to update metadata" });
      }

      try {
        fs.mkdirSync(targetPath, { recursive: true });
        console.log(`Folder ${targetPath} created and added to folders.json.`);
        return res.json({ message: "Folder created", path: targetPath });
      } catch (err) {
        console.log("Error creating folder:", err);
        return res.status(500).json({ error: "Failed to create directory" });
      }
    });
  });
});

// More routes like /preview, /storage (folder listing), recursive delete can be added similarly...

export default router;
