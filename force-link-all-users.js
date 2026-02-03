/**
 * Force link correct Rich Menu to ALL users in Supabase
 * SAFE – can be run multiple times
 */

require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const line = require("@line/bot-sdk");

// ===============================
// RICH MENU IDS (UPDATE IF NEEDED)
// ===============================
const RICH_MENUS = {
  user: "richmenu-4c2fb5baae65f486266f6dbb45566e4b",
  shop_master: "richmenu-e6572e43832cb375bc321cb4f1875296",
  admin: "richmenu-1f7cc3a53633cf2fbf9c3a158d1fb003",
};

// ===============================
// CLIENTS (IMPORTANT)
// ===============================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ✅ MUST USE line.Client for Rich Menu
const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// ===============================
// MAIN
// ===============================
(async () => {
  console.log("🔗 Force Linking Rich Menus (AUTO MODE)");

  const { data: users, error } = await supabase
    .from("users")
    .select("line_uid, display_name, user_role");

  if (error) {
    console.error("❌ Supabase error:", error.message);
    return;
  }

  if (!users || users.length === 0) {
    console.log("❌ No users found");
    return;
  }

  console.log(`👥 Found ${users.length} user(s)\n`);

  let successCount = 0;

  for (const user of users) {
    const menuId = RICH_MENUS[user.user_role] || RICH_MENUS.user;

    try {
      await client.linkRichMenuToUser(user.line_uid, menuId);
      console.log(`✅ Linked ${user.display_name} → ${user.user_role}`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed for ${user.display_name}:`, err.message);
    }
  }

  console.log(`\n🎯 Result: ${successCount}/${users.length} users linked`);
})();
