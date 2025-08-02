import fs from 'fs';
import path from 'path';

export const getFolderView = (req, res) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).send("Missing or invalid Authorization header");
  }

  const base64Credentials = authHeader.split(' ')[1];
  let credentials, user;

  try {
    credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    user = credentials.split(':')[0];
  } catch (err) {
    return res.status(400).send("Invalid Authorization format");
  }

  const folder = req.params.folderPathUrl || "";

  if (folder.includes("..")) return res.status(400).send("Invalid path");

  const folderPath = path.join(process.cwd(), "uploads/storage", folder.join("/"));
  console.log(folderPath)
  if (!folderPath.startsWith(path.join(process.cwd(), "uploads/storage"))) {
    return res.status(400).send("Invalid path");
  }

  fs.readFile("folders.json", 'utf8', (err, data) => {
    if (err) {
      console.log(`User: ${user} ERROR:`, err);
      return res.status(500).send("Internal server error");
    }

    let folders;
    try {
      folders = JSON.parse(data);
    } catch (e) {
      console.log(`User: ${user} ERROR parsing folders.json`, e);
      return res.status(500).send("Internal server error");
    }

    if (folders[folderPath]?.locked === true) {
      if (folders[folderPath].owner !== user && user !== "root") {
        console.log(`User: ${user} tried to open locked folder ${folderPath}`);
        return res.render('error', { error: "You don't have permission to do it" });
      }
    }

    if (!fs.existsSync(folderPath)) {
      console.log(`User: ${user} tried to access non-existent folder: ${folderPath}`);
      return res.status(404).send("Folder not found");
    }

    console.log(`User: ${user} accessed folder: ${folderPath}`);

    fs.readdir(folderPath, (err, items) => {
      if (err) return res.status(500).send("Error reading folder");

      const files = items.map((item) => {
        const fullPath = path.join(folderPath, item);
        const stats = fs.statSync(fullPath);
        return {
          name: item,
          type: stats.isDirectory() ? "directory" : "file",
        };
      });

      return res.render("folder", { folder, files });
    });
  });
};
