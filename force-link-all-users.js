require('dotenv').config();
const line = require('@line/bot-sdk');
const { createClient } = require('@supabase/supabase-js');

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const RICH_MENUS = {
  user: 'richmenu-7e927704589f3fdc528d2109f0eba524',
  shop_master: 'richmenu-8bcf53dee6047027c4535960312476f3',
  admin: 'richmenu-85032b9ca1e7ef1295865003e6cd303e',
};

async function linkMenu(userId, role) {
  try {
    await lineClient.linkRichMenuToUser(userId, RICH_MENUS[role]);
    console.log(`✅ Linked ${role} menu to ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to link ${role} menu:`, error.message);
  }
}

async function linkAllUsers() {
  console.log('🔗 Fetching all users from database...\n');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('line_uid, display_name, user_role');
  
  if (error) {
    console.error('❌ Database error:', error);
    return;
  }
  
  if (!users || users.length === 0) {
    console.log('❌ No users found in database');
    return;
  }
  
  console.log(`📊 Found ${users.length} users\n`);
  
  for (const user of users) {
    console.log(`\n👤 ${user.display_name} (${user.user_role})`);
    console.log(`   LINE UID: ${user.line_uid.substring(0, 15)}...`);
    await linkMenu(user.line_uid, user.user_role);
  }
  
  console.log('\n✨ Done! Check your LINE chat for Rich Menu.');
}

linkAllUsers().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
