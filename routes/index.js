import express from "express";
const router = express.Router();
import { getFolderView } from '../controllers/storageController.js';

router.get("/", (req, res) => {
  res.redirect("/storage/home");
});
router.get('/storage/{*folderPathUrl}', getFolderView);

export default router;
