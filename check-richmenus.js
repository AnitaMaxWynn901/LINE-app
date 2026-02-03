require("dotenv").config();
const line = require("@line/bot-sdk");

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

async function checkMenus() {
  console.log("🔍 Checking Rich Menus...\n");

  try {
    const response = await lineClient.getRichMenuList();

    // Handle different response formats
    const menus = response.richmenus || response || [];

    if (!menus || menus.length === 0) {
      console.log("❌ No Rich Menus found!");
      console.log("\n📝 To create Rich Menus:");
      console.log("   node create-rich-menus.js\n");
      return;
    }

    console.log(`✅ Found ${menus.length} Rich Menu(s):\n`);

    for (const menu of menus) {
      console.log(`📱 ${menu.name || "Unnamed Menu"}`);
      console.log(`   ID: ${menu.richMenuId}`);
      console.log(`   Selected: ${menu.selected ? "Yes ✅" : "No ❌"}`);
      console.log(`   Size: ${menu.size.width} x ${menu.size.height}`);
      console.log(`   Chat bar: "${menu.chatBarText}"`);
      console.log(`   Areas: ${menu.areas.length} buttons`);
      console.log("");
    }

    console.log("📊 Summary:");
    console.log(`   Total menus: ${menus.length}`);
    console.log(`   Expected: 3 (user, shop_master, admin)`);

    if (menus.length === 3) {
      console.log("   ✅ All menus created!");
    } else {
      console.log("   ⚠️  Missing some menus");
    }

    console.log("\n💡 Next steps:");
    console.log(
      "   1. Upload images (if not done): node upload-richmenu-images.js"
    );
    console.log("   2. Remove bot from LINE and add again");
    console.log("   3. Rich Menu should appear!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("\n💡 Possible causes:");
    console.error("   - Invalid LINE_CHANNEL_ACCESS_TOKEN in .env");
    console.error("   - Token expired (reissue in LINE Console)");
    console.error("   - No Rich Menus created yet\n");
  }
}

checkMenus();
