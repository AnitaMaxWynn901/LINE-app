/**
 * Upload images for Rich Menus
 *
 * Requirements:
 * - PNG
 * - 2500 x 1686
 */

require("dotenv").config();
const fs = require("fs");
const line = require("@line/bot-sdk");

// ===============================
// CLIENT (IMPORTANT)
// ===============================
const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// ===============================
// RICH MENUS
// ===============================
const MENUS = {
  user: {
    id: "richmenu-4c2fb5baae65f486266f6dbb45566e4b",
    image: "./richmenu-images/user.png",
  },
  shop_master: {
    id: "richmenu-e6572e43832cb375bc321cb4f1875296",
    image: "./richmenu-images/shop_master.png",
  },
  admin: {
    id: "richmenu-1f7cc3a53633cf2fbf9c3a158d1fb003",
    image: "./richmenu-images/admin.png",
  },
};

// ===============================
// MAIN
// ===============================
(async () => {
  console.log("🚀 Uploading Rich Menu images...\n");

  for (const [role, menu] of Object.entries(MENUS)) {
    try {
      const image = fs.readFileSync(menu.image);

      await client.setRichMenuImage(menu.id, image, "image/png");

      console.log(`✅ ${role}: image uploaded`);
    } catch (err) {
      console.error(`❌ ${role}:`, err.message);
    }
  }

  console.log("\n✨ Done");
})();
