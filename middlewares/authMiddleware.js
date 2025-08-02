import fs from "fs";
import path from "path";
import basicAuth from "basic-auth";

export function authMiddleware(req, res, next) {
  const user = basicAuth(req);
  const usersPath = path.join(process.cwd(), "users.json");
  const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));

  if (user && user.name && user.pass && users[user.name] && users[user.name].password === user.pass) {
    req.user = {
      name: user.name,
      permissions: users[user.name].permissions,
    };
    console.log(`Username: ${user.name} logged in successfully`);
    return next();
  }

  res.set("WWW-Authenticate", 'Basic realm="Admin Area"');
  return res.status(401).send("Authentication required.");
}
