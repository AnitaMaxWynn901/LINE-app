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
    id: "richmenu-ca98b1782a9bfbd74a760da174ef5d89",
    image: "./richmenu-images/user.png",
  },
  shop_master: {
    id: "richmenu-929f0718536125629c13a665dda2b321",
    image: "./richmenu-images/shop_master.png",
  },
  admin: {
    id: "richmenu-a904cb094de54137f38041ff00671aff",
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
