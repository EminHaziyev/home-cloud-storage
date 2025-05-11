require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const fsp = require('fs').promises;  
const path = require("path");
const cors = require("cors");
const basicAuth = require("basic-auth");
const rateLimit = require("express-rate-limit");
const ejs = require("ejs");
const os = require("os");
const osu = require("os-utils");

const http = require('http');
const socketIO = require('socket.io');
const pty = require('node-pty');




const logFile = fs.createWriteStream("logs.txt", { flags: "a" });

console.log = function (...args) {
  const options = {
    timeZone: "Asia/Baku",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  const formatter = new Intl.DateTimeFormat("en-GB", options);
  const dateInAZT = formatter.format(new Date());
  const message = args.join(" ") + "\n";
  logFile.write("[LOG] TIME:" + dateInAZT + "--" + message);
  process.stdout.write(message);
};






const PORT = process.env.PORT || 3000;





const app = express();
const server = http.createServer(app);
const io = socketIO(server);
app.set("view engine", "ejs");
// app.set('trust proxy', 1);





const generalLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 30,
  keyGenerator: (req) => req.connection.remoteAddress,         
  message: "So many requests. You are suspicious 0_0",
})





io.on('connection', (socket) => {
  const shell = 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME,
    env: process.env,
  });

  ptyProcess.on('data', (data) => socket.emit('output', data));
  socket.on('input', (data) => ptyProcess.write(data));
  socket.on('resize', ({ cols, rows }) => ptyProcess.resize(cols, rows));
  socket.on('disconnect', () => ptyProcess.kill());
});



function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'users.json'), 'utf-8'));

  if (user && user.name && user.pass && users[user.name] && users[user.name].password === user.pass) {
    req.user = {
      name: user.name,
      permissions: users[user.name].permissions
    };
    console.log(`Username: ${user.name} logged in successfully`);
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Admin Area"');
  return res.status(401).send("Authentication required.");
}





function checkPermission(permission){
  return function check(req,res,next){
    if(req.user.permissions.includes(permission)){
      return next();
    }
    else{
      console.log(`${req.user.name} tried to ${permission} something, but does't have permission to do it`);
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ error: "You don't have permission." });
      } else {
        return res.status(403).render('error',{error:"You dont have permission to do it, Bunu etməyə icazəniz yoxdur."});
      }
    }
  
  }
}









app.use(cors());
app.use(express.json());
app.set('trust proxy',true);

app.use("/upload", authMiddleware,generalLimiter, checkPermission("upload"));
app.use("/delete", authMiddleware ,generalLimiter, checkPermission("delete"));
app.use("/mkdir" , authMiddleware,generalLimiter, checkPermission("mkdir"));
app.use("/download", authMiddleware,generalLimiter, checkPermission("download"));
app.use("/files", authMiddleware,generalLimiter);
app.use("/storage", authMiddleware,generalLimiter, checkPermission("read"));
app.use("/logs", authMiddleware ,generalLimiter, checkPermission("logs"));
app.use("/terminal", authMiddleware ,generalLimiter, checkPermission("terminal"));
app.use("/preview", authMiddleware ,generalLimiter, checkPermission("preview"));


async function getFolderSize(folderPath) {
  let totalSize = 0;

  async function walk(currentPath) {
    const entries = await fsp.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stats = await fsp.stat(fullPath);
        totalSize += stats.size;
      }
    }
  }

  await walk(folderPath);
  return totalSize;
}





app.get("/",(req,res)=>{
  res.redirect('/storage/home');
})


app.get('/terminal' , (req,res)=>{
  res.render('terminal');
})



const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.params.folder.join("/") || "";
    const dest = path.join(__dirname, "uploads", folder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => cb(null, file.originalname),
});


const upload = multer({ storage });



app.post("/upload/{*folder}", upload.array("files"), (req, res) => {
  const authHeader = req.headers['authorization'];
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const user  = credentials.split(':')[0];
  

  console.log(`User ${user} uploaded files to ${req.params.folder}`);
  return res.json({ message: "Uploaded to " + (req.params[0] || "") });
});





app.get("/download/{*filePath}", (req, res) => {
  const authHeader = req.headers['authorization'];
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const user  = credentials.split(':')[0];
  
  const filePath = path.join(__dirname, "uploads/storage/", req.params.filePath.join('/'));
  if (filePath.includes("..")) return res.status(400).send("Invalid path");
  console.log(`User ${user} downloaded ${filePath}`)
  res.download(filePath);
});





// Preview Route for files and folders
app.get("/preview/{*filePath}", (req, res) => {
  const previewPath = path.join(__dirname, "uploads/storage/", req.params.filePath.join('/'));

  if (previewPath.includes("..")) {
    return res.status(400).send("Invalid path");
  }

  fs.stat(previewPath, (err, stats) => {
    if (err) return res.status(500).send("Error checking path");

    if (stats.isDirectory()) {
      fs.readdir(previewPath, (err, items) => {
        if (err) return res.status(500).send("Error reading folder");
        
        const files = items.map((item) => {
          const fullPath = path.join(previewPath, item);
          const stat = fs.statSync(fullPath);
          return {
            name: item,
            type: stat.isDirectory() ? "directory" : "file",
          };
        });
        
        return res.render("preview", { folder: req.params.filePath, files: files });
      });
    } else if (stats.isFile()) {
      const extname = path.extname(previewPath).toLowerCase();
      
      if (extname === '.txt' || extname === '.log') {
        fs.readFile(previewPath, 'utf8', (err, data) => {
          if (err) return res.status(500).send("Error reading file");
          return res.sendFile(previewPath);
        });
      } else if (extname === '.jpg' || extname === '.jpeg' || extname === '.png') {
        return res.sendFile(previewPath);
      } else {
        return res.status(400).send("Unsupported file type for preview");
      }
    } else {
      return res.status(404).send("File or folder not found");
    }
  });
});








app.delete("/delete/:filename", (req, res) => {
  const authHeader = req.headers['authorization'];
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const user  = credentials.split(':')[0];
  
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  if (filePath.includes("..")) return res.status(400).send("Invalid path");

  fs.unlink(filePath, (err) => {
    if (err){
      console.log(`User ${user} couldnt delete ${filePath}`)
      return res.status(500).send("Error deleting file");
    }
    console.log(`User ${user} deleted ${filePath}`)
    res.send("File deleted");
  });
});





app.post("/mkdir", (req, res) => {
  const authHeader = req.headers['authorization'];
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const user  = credentials.split(':')[0];
  
  let { currentFolder, newFolderName, locked } = req.body;
  if (!newFolderName) return res.status(400).json({ error: "newFolderName is required" });

  if(locked === true){
    newFolderName=`[locked][${user}]${newFolderName}` }



  const targetPath = path.join(__dirname, "uploads/storage/", currentFolder || "", newFolderName);

  if (!targetPath.startsWith(path.join(__dirname, "uploads/storage/")) || targetPath.includes("..")) {
    return res.status(400).send("Invalid path");
  }

  

  fs.readFile("folders.json", 'utf8', (err, data) => {
    if (err) {
      console.log(`User: ${user} tried to create folder at ${targetPath} named ${newFolderName}. ERROR:`, err);
      return;
    }

    let folders = JSON.parse(data);

   
    if (folders[targetPath]) {
      console.log(`User: ${user} tried to create folder at ${targetPath} named ${newFolderName}. Already exists`);
      return;
    }

    folders[targetPath] = {
      owner: user,
      locked: locked,
    };

    fs.writeFile("folders.json", JSON.stringify(folders, null, 2), (err) => {
      if (err) {
        console.log('Error writing to the file:', err);
      } else {   
        console.log(`Folder ${targetPath} added to json successfully.`);
      }
    });
  });



  try {
    fs.mkdirSync(targetPath, { recursive: true });

    console.log(`User: ${user} created folder at ${targetPath} named ${newFolderName}.`);
    res.json({ message: "Folder created", path: targetPath });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to create directory" });
  }
  
    


});








app.get("/files", (req, res) => {
  const getDirectoryStructure = (dirPath) => {
    let results = [];
    const list = fs.readdirSync(dirPath);

    list.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat && stat.isDirectory()) {
        results.push({ name: file, type: "directory", children: getDirectoryStructure(filePath) });
      } else {
        results.push({ name: file, type: "file" });
      }
    });

    return results;
  };

  const structure = getDirectoryStructure(path.join(__dirname, "uploads"));
  res.json(structure);
});






app.get("/stats", (req, res) => {
  osu.cpuUsage( async (cpuPercent) => {
    const uploadsPath = path.join(__dirname, 'uploads');
    const usedUploadsBytes = await getFolderSize(uploadsPath);
    let usedUploads = (usedUploadsBytes / 1024 / 1024).toFixed(2);
    if(usedUploads>1024){
      usedUploads=(usedUploads/1024).toFixed(2) + "GB";
    }
    else{
      usedUploads+="MB";
    }
    const stats = {
      uptime: os.uptime(), // in seconds
      totalMemGB: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
      freeMemGB: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
      usedMemGB: ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2),
      usedStorage: usedUploads,
      cpuUsagePercent: (cpuPercent * 100).toFixed(2),
      loadAverage: os.loadavg(), // [1m, 5m, 15m]
      platform: os.platform(),
      cpuCores: os.cpus().length,
    };

    res.json(stats);
  });
});





app.get("/storage/{*folderPathUrl}", (req, res) => {
  
  const authHeader = req.headers['authorization'];
  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const user  = credentials.split(':')[0];
  
  const folder = req.params.folderPathUrl.join("/") || "";
  
  if (folder.includes("..")) return res.status(400).send("Invalid path");

  const folderPath = path.join(__dirname, "uploads/storage/", folder);
  if (folderPath.includes("..")) return res.status(400).send("Invalid path");
  fs.readFile("folders.json", 'utf8', (err, data) => {
    if (err) {
      console.log(`User: ${user} ERROR:`, err);
      return;
    }

    let folders = JSON.parse(data);
    if(folders[folderPath]){
      if (folders[folderPath].locked === true) {
        if(folders[folderPath].owner != user && user != "root"){
          console.log(`User: ${user} tried to open ${folderPath} that is locked`);
          return res.render('error', {error: "You dont have permission to do it"});
          
        }
        
      }
    }

    if (!fs.existsSync(folderPath)){
      console.log("User: "+user+"tried to go to "+folderPath+". Folder not found");
      return res.status(404).send("Folder not found");
    }
    console.log("User: "+user+"was in" + folderPath);
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
  
      return res.render("folder", { folder: folder, files: files });
    });
    

    
  });

  
});





app.delete("/storage/{*folderPathUrl}", (req, res) => {
  const authHeader = req.headers['authorization'];

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const user  = credentials.split(':')[0];

  
  const folder = req.params.folderPathUrl.join("/") || "";
  if (folder.includes("..")) return res.status(400).send("Invalid path");

  const itemPath = path.join(__dirname, "uploads/storage/", folder);
  if (itemPath.includes("..")) return res.status(400).send("Invalid path");

  if (!itemPath.startsWith(path.join(__dirname, "uploads/storage/"))) {
    return res.status(400).send("Invalid path");
  }

  if (!fs.existsSync(itemPath)) {
    return res.status(404).send("File or folder not found");
  }

  const deleteRecursive = (targetPath) => {
    if (fs.lstatSync(targetPath).isDirectory()) {
      fs.readdirSync(targetPath).forEach((file) => {
        const curPath = path.join(targetPath, file);
        deleteRecursive(curPath);
      });
      fs.rmdirSync(targetPath);
    } else {
      fs.unlinkSync(targetPath);
    }
  };

  try {
    deleteRecursive(itemPath);
    console.log("user:"+user+"deleted:" + req.params.folderPathUrl);
    res.send("Deleted successfully");
  } catch (err) {
    console.log("user: "+user+"tried to delete: "+req.params.folderPathUrl+err);
    res.status(500).send("Error deleting item");
  }
});






app.get("/logs", (req, res) => {
  const filePath = path.join(__dirname, "logs.txt");
  const authHeader = req.headers['authorization'];

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const user  = credentials.split(':')[0];
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Failed to read terminal.txt" });
    console.log("User:"+user+" watched logs")
    return res.render('logs' , {logs:data});
  });
});
app.get("404",(req,res)=>{
  res.redirect("/storage/home");
})



server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
})
