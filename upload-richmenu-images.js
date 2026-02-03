/**
 * Upload images to your LINE Rich Menus.
 *
 * Prerequisites:
 * 1. Run create-richmenu.js first and copy the Rich Menu IDs into index.js.
 * 2. Create images 2500 x 1686 px (PNG or JPEG) and place them in richmenu-images/:
 *    - user.png       (or user.jpg)       → User menu
 *    - shop_master.png (or shop_master.jpg) → Shop Master menu
 *    - admin.png      (or admin.jpg)      → Admin menu
 *
 * Usage:
 *   node upload-richmenu-images.js
 *
 * Optional env vars (if different from index.js):
 *   RICH_MENU_USER_ID, RICH_MENU_SHOP_MASTER_ID, RICH_MENU_ADMIN_ID
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Use legacy Client for setRichMenuImage (Buffer support)
const { Client } = require("@line/bot-sdk");

const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// Same IDs as index.js – or set via env
const RICH_MENUS = {
  user:
    process.env.RICH_MENU_USER_ID ||
    "richmenu-7e927704589f3fdc528d2109f0eba524",
  shop_master:
    process.env.RICH_MENU_SHOP_MASTER_ID ||
    "richmenu-8bcf53dee6047027c4535960312476f3",
  admin:
    process.env.RICH_MENU_ADMIN_ID ||
    "richmenu-85032b9ca1e7ef1295865003e6cd303e",
};

const IMAGES_DIR = path.join(__dirname, "richmenu-images");

function findImageFile(baseName) {
  const names = [`${baseName}.png`, `${baseName}.jpg`, `${baseName}.jpeg`];
  for (const name of names) {
    const filePath = path.join(IMAGES_DIR, name);
    if (fs.existsSync(filePath)) return filePath;
  }
  return null;
}

async function uploadImage(richMenuId, imagePath) {
  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";

  await lineClient.setRichMenuImage(richMenuId, buffer, contentType);
}

async function main() {
  if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
    console.error("❌ LINE_CHANNEL_ACCESS_TOKEN is not set in .env");
    process.exit(1);
  }

  if (!fs.existsSync(IMAGES_DIR)) {
    console.error(`❌ Folder "${IMAGES_DIR}" not found.`);
    console.log("\nCreate it and add:");
    console.log("  - user.png (or .jpg)");
    console.log("  - shop_master.png (or .jpg)");
    console.log("  - admin.png (or .jpg)");
    console.log(
      "\nImage size must be 2500 x 1686 pixels. See richmenu-images/README.md"
    );
    process.exit(1);
  }

  const entries = [
    { role: "user", key: "user" },
    { role: "shop_master", key: "shop_master" },
    { role: "admin", key: "admin" },
  ];

  console.log("🚀 Uploading Rich Menu images...\n");

  for (const { role, key } of entries) {
    const imagePath = findImageFile(key);
    const richMenuId = RICH_MENUS[key];

    if (!imagePath) {
      console.log(
        `⏭️  Skipped ${role}: no image (${key}.png or ${key}.jpg) in richmenu-images/`
      );
      continue;
    }

    try {
      await uploadImage(richMenuId, imagePath);
      console.log(`✅ ${role}: uploaded ${path.basename(imagePath)}`);
    } catch (err) {
      console.error(`❌ ${role}: upload failed –`, err.message);
    }
  }

  console.log("\n✨ Done. Check your LINE bot to see the Rich Menu images.");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
