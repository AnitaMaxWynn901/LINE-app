require('dotenv').config();
const line = require('@line/bot-sdk');

const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

async function checkMenus() {
  console.log('🔍 Checking Rich Menus...\n');
  
  try {
    const menus = await lineClient.getRichMenuList();
    
    if (!menus || menus.length === 0) {
      console.log('❌ No Rich Menus found!');
      console.log('\nRun: node create-rich-menus.js');
      return;
    }
    
    console.log(`✅ Found ${menus.length} Rich Menus:\n`);
    
    for (const menu of menus) {
      console.log(`📱 ${menu.name || 'Unnamed Menu'}`);
      console.log(`   ID: ${menu.richMenuId}`);
      console.log(`   Selected: ${menu.selected}`);
      console.log(`   Size: ${menu.size.width} x ${menu.size.height}`);
      console.log(`   Chat bar text: ${menu.chatBarText}`);
      console.log('');
    }
    
    console.log('💡 Expected configuration:');
    console.log('   - 3 menus total');
    console.log('   - All have selected: true');
    console.log('   - All are 2500 x 1686 pixels');
    console.log('   - All have images uploaded\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMenus();
