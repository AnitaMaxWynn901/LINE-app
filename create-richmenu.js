require("dotenv").config();
const line = require("@line/bot-sdk");

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// 1️⃣ USER RICH MENU (6 buttons - 2 rows x 3 columns style)
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
          uri: "https://liff.line.me/2008995030-W39gBpe4",
        },
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 562 },
        action: {
          type: "uri",
          label: "My Orders",
          uri: "https://liff.line.me/2008995030-RawExQeM",
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
          uri: "https://liff.line.me/2008995030-d47ws6I6",
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
          uri: "https://liff.line.me/2008995030-W39gBpe4",
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
          uri: "https://liff.line.me/2008995030-vfYwWQCF",
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

    console.log(
      "⚠️  IMPORTANT: You still need to upload images for each Rich Menu!"
    );
    console.log("📸 Image size: 2500 x 1686 pixels");
    console.log("🎨 Use Canva or Photoshop to create the images");
    console.log("📤 Upload via LINE Developers Console > Rich menus");
  } catch (error) {
    console.error("❌ Error creating Rich Menus:", error);
  }
}

main();
