import fs from "fs/promises";

export async function getFolderSize(folderPath) {
  let totalSize = 0;

  async function walk(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = currentPath + "/" + entry.name;
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
  }

  await walk(folderPath);
  return totalSize;
}
