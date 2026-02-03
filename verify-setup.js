require("dotenv").config();

console.log("🔍 Verifying Environment Configuration\n");
console.log("=".repeat(50));

// Check .env file
console.log("\n📄 Checking .env file...\n");

const requiredVars = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
];

let allPresent = true;

for (const varName of requiredVars) {
  const value = process.env[varName];
  if (value) {
    const masked =
      value.substring(0, 10) + "..." + value.substring(value.length - 5);
    console.log(`✅ ${varName}: ${masked}`);
  } else {
    console.log(`❌ ${varName}: MISSING!`);
    allPresent = false;
  }
}

console.log("\n" + "=".repeat(50));

if (!allPresent) {
  console.log("\n❌ Some environment variables are missing!");
  console.log("\n💡 Fix:");
  console.log("   1. Check your .env file exists");
  console.log("   2. Verify all values are set");
  console.log("   3. No extra spaces or quotes\n");
  process.exit(1);
}

console.log("\n✅ All environment variables present!\n");

// Test LINE API
console.log("🔗 Testing LINE API connection...\n");

const line = require("@line/bot-sdk");

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

async function testLine() {
  try {
    const response = await lineClient.getRichMenuList();
    const menus = response.richmenus || response || [];
    console.log(`✅ LINE API connection successful!`);
    console.log(`   Found ${menus.length} Rich Menu(s)\n`);
    return true;
  } catch (error) {
    console.log(`❌ LINE API connection failed!`);
    console.log(`   Error: ${error.message}\n`);
    console.log("💡 Possible fixes:");
    console.log("   1. Reissue Channel Access Token in LINE Console");
    console.log("   2. Update .env with new token");
    console.log("   3. Restart your application\n");
    return false;
  }
}

// Test Supabase
console.log("🗄️  Testing Supabase connection...\n");

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testSupabase() {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      console.log(`❌ Supabase connection failed!`);
      console.log(`   Error: ${error.message}\n`);
      console.log("💡 Possible fixes:");
      console.log("   1. Check SUPABASE_URL is correct");
      console.log("   2. Check SUPABASE_ANON_KEY is correct");
      console.log('   3. Verify "users" table exists\n');
      return false;
    }

    console.log(`✅ Supabase connection successful!\n`);
    return true;
  } catch (error) {
    console.log(`❌ Supabase connection failed!`);
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function main() {
  const lineOk = await testLine();
  const supabaseOk = await testSupabase();

  console.log("=".repeat(50));
  console.log("\n📊 Summary:\n");
  console.log(`   LINE API: ${lineOk ? "✅ Working" : "❌ Failed"}`);
  console.log(`   Supabase: ${supabaseOk ? "✅ Working" : "❌ Failed"}`);

  if (lineOk && supabaseOk) {
    console.log("\n🎉 Everything is configured correctly!\n");
    console.log("💡 Next steps:");
    console.log("   1. Make sure updated index.js is deployed");
    console.log("   2. Remove bot from LINE and re-add it");
    console.log("   3. Rich Menu should appear!\n");
  } else {
    console.log("\n❌ Please fix the issues above first.\n");
  }
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err.message);
  process.exit(1);
});
