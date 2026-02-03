/**
 * Delete ALL Rich Menus from the LINE bot
 *
 * Usage:
 *   node delete-richmenus.js
 */

require("dotenv").config();
const line = require("@line/bot-sdk");

// ===============================
// CLIENT
// ===============================
const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// ===============================
// MAIN
// ===============================
(async () => {
  console.log("🗑️  Deleting ALL Rich Menus...\n");

  try {
    // ✅ CORRECT METHOD
    const res = await client.getRichMenuList();
    const menus = res.richmenus || [];

    if (menus.length === 0) {
      console.log("✅ No Rich Menus found. Nothing to delete.");
      return;
    }

    console.log(`🔍 Found ${menus.length} Rich Menu(s)\n`);

    for (const menu of menus) {
      try {
        await client.deleteRichMenu(menu.richMenuId);
        console.log(`🗑️  Deleted: ${menu.name} (${menu.richMenuId})`);
      } catch (err) {
        console.error(
          `❌ Failed to delete ${menu.name} (${menu.richMenuId}):`,
          err.message
        );
      }
    }

    console.log("\n🎉 All Rich Menus deleted successfully!");
  } catch (err) {
    console.error("❌ Error fetching Rich Menus:", err.message);
  }
})();
