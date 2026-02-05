/**
 * Creates Rich Menus on LINE (user, shop_master, admin).
 *
 * ⚠️ IMPORTANT: Editing this file does NOT change menus already on LINE.
 * To apply changes:
 * 1. Delete existing Rich Menus in LINE Console
 * 2. Run this script: node create-richmenu.js
 * 3. Update RICH_MENUS IDs in index.js
 * 4. Upload images using upload-richmenu-images.js
 * 5. (Optional) Run force-link-all-users.js to update all users
 */
require("dotenv").config();
const line = require("@line/bot-sdk");

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// ============================================
// 🎯 LIFF IDS - FROM YOUR SCREENSHOT
// ============================================
const LIFF_IDS = {
  HELP: "2008995030-skHhHuZ3",
  USER_PROFILE: "2008995030-0uvyWNBb",
  USER_POINTS: "2008995030-gyFJjoF0",
  ANALYTICS: "2008995030-t2KDZKUZ",
  ALL_USERS: "2008995030-RIMwbPZT",
  SHOP_MENU: "2008995030-4EY711eF",
  ADMIN_DASHBOARD: "2008995030-vfYwWQCF",
  USER_DASHBOARD: "2008995030-RawExQeM",
  ADMIN_REGISTRATION: "2008995030-VESHc83X",
  SHOP_DASHBOARD: "2008995030-d47ws6I6",
  WELCOME_APP: "2008995030-W39gBpe4",
};

// 1️⃣ USER RICH MENU (6 buttons - 2 rows x 3 columns)
async function createUserRichMenu() {
  const richMenu = {
    size: {
      width: 2500,
      height: 1686,
    },
    selected: true,
    name: "User Menu",
    chatBarText: "Menu",
    areas: [
      // Row 1
      {
        bounds: { x: 0, y: 0, width: 1250, height: 562 },
        action: {
          type: "uri",
          label: "Order Now",
          uri: `https://liff.line.me/${LIFF_IDS.WELCOME_APP}`,
        },
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 562 },
        action: {
          type: "uri",
          label: "My Orders",
          uri: `https://liff.line.me/${LIFF_IDS.USER_DASHBOARD}`,
        },
      },
      // Row 2
      {
        bounds: { x: 0, y: 562, width: 1250, height: 562 },
        action: {
          type: "message",
          label: "My Points",
          text: "my points",
        },
      },
      {
        bounds: { x: 1250, y: 562, width: 1250, height: 562 },
        action: {
          type: "message",
          label: "My Profile",
          text: "my profile",
        },
      },
      // Row 3
      {
        bounds: { x: 0, y: 1124, width: 1250, height: 562 },
        action: {
          type: "message",
          label: "Contact",
          text: "contact",
        },
      },
      {
        bounds: { x: 1250, y: 1124, width: 1250, height: 562 },
        action: {
          type: "message",
          label: "Help",
          text: "help",
        },
      },
    ],
  };

  const richMenuId = await lineClient.createRichMenu(richMenu);
  console.log("✅ User Rich Menu created:", richMenuId);
  return richMenuId;
}

// 2️⃣ SHOP MASTER RICH MENU (4 buttons - 2x2 layout)
async function createShopMasterRichMenu() {
  const richMenu = {
    size: {
      width: 2500,
      height: 1686,
    },
    selected: true,
    name: "Shop Master Menu",
    chatBarText: "Shop Menu",
    areas: [
      // Top left
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri",
          label: "Dashboard",
          uri: `https://liff.line.me/${LIFF_IDS.SHOP_DASHBOARD}`,
        },
      },
      // Top right
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: {
          type: "message",
          label: "Pending Orders",
          text: "pending orders",
        },
      },
      // Bottom left
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: {
          type: "uri",
          label: "Menu",
          uri: `https://liff.line.me/${LIFF_IDS.SHOP_MENU}`,
        },
      },
      // Bottom right
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "message",
          label: "Settings",
          text: "settings",
        },
      },
    ],
  };

  const richMenuId = await lineClient.createRichMenu(richMenu);
  console.log("✅ Shop Master Rich Menu created:", richMenuId);
  return richMenuId;
}

// 3️⃣ ADMIN RICH MENU (4 buttons - 2x2 layout)
async function createAdminRichMenu() {
  const richMenu = {
    size: {
      width: 2500,
      height: 1686,
    },
    selected: true,
    name: "Admin Menu",
    chatBarText: "Admin",
    areas: [
      // Top left
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri",
          label: "Admin Dashboard",
          uri: `https://liff.line.me/${LIFF_IDS.ADMIN_DASHBOARD}`,
        },
      },
      // Top right
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: {
          type: "message",
          label: "Shop Masters",
          text: "shop masters",
        },
      },
      // Bottom left
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: {
          type: "message",
          label: "All Users",
          text: "all users",
        },
      },
      // Bottom right
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "message",
          label: "Analytics",
          text: "analytics",
        },
      },
    ],
  };

  const richMenuId = await lineClient.createRichMenu(richMenu);
  console.log("✅ Admin Rich Menu created:", richMenuId);
  return richMenuId;
}

// Run creation
async function main() {
  try {
    console.log("🚀 Creating Rich Menus...\n");
    console.log("📍 LIFF IDs configured:");
    console.log(`   Welcome App: ${LIFF_IDS.WELCOME_APP}`);
    console.log(`   User Dashboard: ${LIFF_IDS.USER_DASHBOARD}`);
    console.log(`   Shop Dashboard: ${LIFF_IDS.SHOP_DASHBOARD}`);
    console.log(`   Shop Menu: ${LIFF_IDS.SHOP_MENU}`);
    console.log(`   Admin Dashboard: ${LIFF_IDS.ADMIN_DASHBOARD}\n`);

    const userMenuId = await createUserRichMenu();
    const shopMasterMenuId = await createShopMasterRichMenu();
    const adminMenuId = await createAdminRichMenu();

    console.log("\n✅ All Rich Menus created successfully!");
    console.log("\n📝 Copy these IDs to your index.js:\n");
    console.log("const RICH_MENUS = {");
    console.log(`  user: '${userMenuId}',`);
    console.log(`  shop_master: '${shopMasterMenuId}',`);
    console.log(`  admin: '${adminMenuId}',`);
    console.log("};\n");

    console.log("⚠️  NEXT STEPS:");
    console.log("1. Update RICH_MENUS IDs in index.js");
    console.log("2. Upload images: node upload-richmenu-images.js");
    console.log("3. Images must be 2500 x 1686 pixels");
    console.log("4. Deploy your updated code");
    console.log(
      "5. (Optional) Force link all users: node force-link-all-users.js\n"
    );
  } catch (error) {
    console.error("❌ Error creating Rich Menus:", error);
    console.error("\n💡 Common issues:");
    console.error("   - Check .env file has correct LINE_CHANNEL_ACCESS_TOKEN");
    console.error("   - Verify channel access token has Rich Menu permissions");
    console.error(
      "   - Make sure you're using Messaging API channel (not LINE Login)"
    );
  }
}

main();
