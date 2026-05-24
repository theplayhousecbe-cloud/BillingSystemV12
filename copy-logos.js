import fs from "node:fs";
import path from "node:path";

console.log("--------------------------------------------------");
console.log("⚡ Playhouse Cafe Logo Sync Script Initialized... ⚡");
console.log("--------------------------------------------------");

try {
  const sourceDir = "C:\\Users\\SANJAY\\.gemini\antigravity\\brain\\c944e092-3b60-4b2e-8745-0757fe2b8700";
  const largeImg = path.join(sourceDir, "media__1779090220549.jpg");
  const smallImg = path.join(sourceDir, "media__1779090307091.jpg");

  const possibleDestDirs = [
    path.resolve("public"),
    path.resolve("host-status-view-main/public"),
    path.resolve("../public"),
    path.resolve("../host-status-view-main/public")
  ];

  let largeCopied = false;
  let smallCopied = false;

  for (const destDir of possibleDestDirs) {
    if (fs.existsSync(largeImg)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(largeImg, path.join(destDir, "logo.jpg"));
      fs.copyFileSync(largeImg, path.join(destDir, "logo-large.jpg"));
      largeCopied = true;
      console.log(`✅ Successfully copied LARGE logo to: ${destDir}`);
    }
    if (fs.existsSync(smallImg)) {
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(smallImg, path.join(destDir, "logo-small.jpg"));
      smallCopied = true;
      console.log(`✅ Successfully copied SMALL logo to: ${destDir}`);
    }
  }

  if (!largeCopied && !smallCopied) {
    console.warn("⚠️ Warning: Source logo files could not be located in AppData.");
  } else {
    console.log("🎉 Logo synchronization complete! Ready to start dev server.");
  }
} catch (e) {
  console.error("❌ Failed to synchronize logo assets:", e.message);
}
console.log("--------------------------------------------------\n");
