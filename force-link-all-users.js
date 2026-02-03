require("dotenv").config();
const line = require("@line/bot-sdk");

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const RICH_MENUS = {
  user: "richmenu-7e927704589f3fdc528d2109f0eba524",
  shop_master: "richmenu-8bcf53dee6047027c4535960312476f3",
  admin: "richmenu-85032b9ca1e7ef1295865003e6cd303e",
};

async function linkMenu(userId, role) {
  try {
    // First, try to unlink any existing menu
    try {
      await lineClient.unlinkRichMenuFromUser(userId);
      console.log(`   Unlinked old menu`);
    } catch (e) {
      // No menu to unlink, that's ok
    }

    // Link new menu
    await lineClient.linkRichMenuToUser(userId, RICH_MENUS[role]);
    console.log(`✅ Successfully linked ${role} menu`);
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
  }
}

async function main() {
  console.log("🔗 Force Linking Rich Menus\n");

  // You need to provide your LINE User IDs here
  // Get them from your database or LINE webhook logs

  const users = [
    // REPLACE THESE WITH YOUR ACTUAL LINE USER IDs FROM DATABASE
    // Example format:
    // { userId: 'U1234567890abcdef...', role: 'shop_master', name: 'Hae Lay' },
    // { userId: 'U0987654321fedcba...', role: 'user', name: 'Friend Name' },
  ];

  if (users.length === 0) {
    console.log("❌ No users configured!\n");
    console.log("📝 To use this script:");
    console.log("1. Open your Supabase database");
    console.log("2. Run: SELECT line_uid, display_name, user_role FROM users;");
    console.log("3. Copy the line_uid values");
    console.log("4. Add them to the users array in this file\n");
    console.log("Example:");
    console.log("const users = [");
    console.log(
      '  { userId: "U1234abcd...", role: "shop_master", name: "Your Name" },'
    );
    console.log(
      '  { userId: "U5678efgh...", role: "user", name: "Friend Name" },'
    );
    console.log("];\n");
    console.log("💡 OR: Just remove bot and re-add it - that also works!\n");
    return;
  }

  for (const user of users) {
    console.log(`\n👤 ${user.name} (${user.role})`);
    console.log(`   LINE UID: ${user.userId.substring(0, 20)}...`);
    await linkMenu(user.userId, user.role);
  }

  console.log("\n✨ Done! Check your LINE app now.");
  console.log("📱 The Rich Menu should appear at the bottom of the chat.\n");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
