/**
 * Replace the Shop Master Rich Menu (e.g. so the "Menu" button opens shop-menu LIFF).
 *
 * LINE does NOT support updating a Rich Menu's areas/URIs in place — you must delete
 * and create a new one, then relink users. This script automates most of that.
 *
 * Usage: node update-shop-richmenu.js
 *
 * The script will:
 *   - Read the current shop_master ID from index.js (to delete the old menu)
 *   - Delete the old menu, create a new one from the definition below
 *   - Write the new ID back into index.js
 *
 * You still need to:
 *   1. Upload the image for the new Rich Menu (LINE Console or upload-richmenu-images.js)
 *   2. Run: node force-link-all-users.js  (so shop_master users see the new menu)
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const line = require("@line/bot-sdk");

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const INDEX_PATH = path.join(__dirname, "index.js");

function getShopMasterRichMenuDefinition() {
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "Shop Master Menu",
    chatBarText: "Shop Menu",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri",
          label: "Dashboard",
          uri: "https://liff.line.me/2008995030-d47ws6I6",
        },
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: {
          type: "message",
          label: "Pending Orders",
          text: "pending orders",
        },
      },
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: {
          type: "uri",
          label: "Menu",
          uri: "https://liff.line.me/2008995030-4EY711eF",
        },
      },
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
}

function getCurrentShopMasterId() {
  const content = fs.readFileSync(INDEX_PATH, "utf8");
  const m = content.match(/shop_master:\s*"([^"]+)"/);
  if (!m) throw new Error("Could not find shop_master ID in index.js");
  return m[1];
}

function setShopMasterIdInIndex(newId) {
  let content = fs.readFileSync(INDEX_PATH, "utf8");
  content = content.replace(
    /(shop_master:\s*)"[^"]+"/,
    `$1"${newId}"`
  );
  fs.writeFileSync(INDEX_PATH, content);
}

async function main() {
  console.log("🔄 Replacing Shop Master Rich Menu...\n");

  const currentId = getCurrentShopMasterId();
  console.log("   Current ID (from index.js):", currentId);

  try {
    await lineClient.deleteRichMenu(currentId);
    console.log("✅ Deleted old Shop Master Rich Menu");
  } catch (e) {
    const status = e.response?.status ?? e.status;
    if (status === 404) {
      console.log("⚠️  Old menu already deleted or ID changed. Creating new one.");
    } else {
      throw e;
    }
  }

  const newId = await lineClient.createRichMenu(getShopMasterRichMenuDefinition());
  console.log("✅ Created new Shop Master Rich Menu:", newId);

  setShopMasterIdInIndex(newId);
  console.log("✅ Updated index.js with new shop_master ID");

  console.log("\n📝 Remaining steps:");
  console.log("1. Upload image (2500×1686) for this Rich Menu:");
  console.log("   LINE Console → Rich menus → " + newId + " → Set image");
  console.log("   (or update upload-richmenu-images.js with this ID and run it)");
  console.log("2. Run: node force-link-all-users.js");
  console.log("");
}

main().catch((err) => {
  console.error("❌ Error:", err.message || err);
  process.exit(1);
});
