// Load environment variables from a .env file
require("dotenv").config();

// Import packages
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const line = require("@line/bot-sdk");
const {
  getWelcomeCard,
  getMenuCard,
  getOrderConfirmation,
  getPendingOrdersCarousel,
  getNoPendingOrdersCard,
  getContactCard,
} = require("./flexMessages");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// LINE configuration
const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

// Create LINE client
const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: lineConfig.channelAccessToken,
});

const RICH_MENUS = {
  user: "richmenu-7e927704589f3fdc528d2109f0eba524", // Replace after creation
  shop_master: "richmenu-8bcf53dee6047027c4535960312476f3", // Replace after creation
  admin: "richmenu-85032b9ca1e7ef1295865003e6cd303e", // Replace after creation
};

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ============================================
// LINE WEBHOOK
// ============================================

app.post("/webhook", line.middleware(lineConfig), async (req, res) => {
  try {
    const events = req.body.events;
    await Promise.all(events.map(handleLineEvent));
    res.status(200).end();
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).end();
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (for LIFF app later)
app.use(express.static("public"));

/**
 * Link Rich Menu to user based on their role
 */
async function linkRichMenu(lineUid, role) {
  const richMenuId = RICH_MENUS[role];

  if (!richMenuId) {
    console.log("⚠️ No Rich Menu configured for role:", role);
    return;
  }

  try {
    // ✅ FIXED: Use linkUserRichMenu (SDK v9 method)
    await lineClient.linkUserRichMenu(lineUid, richMenuId);
    console.log(`✅ Rich Menu linked to ${lineUid} (${role})`);
  } catch (error) {
    console.error("❌ Failed to link Rich Menu:", error);
  }
}

/**
 * Switch Rich Menu when user role changes
 */
async function switchRichMenu(lineUid, newRole) {
  const richMenuId = RICH_MENUS[newRole];

  if (!richMenuId) {
    console.log("⚠️ No Rich Menu configured for role:", newRole);
    return;
  }

  try {
    // Try to unlink old Rich Menu (might not exist for new users)
    try {
      // ✅ FIXED: Use unlinkUserRichMenu (SDK v9 method)
      await lineClient.unlinkUserRichMenu(lineUid);
    } catch (unlinkError) {
      // Ignore error if no Rich Menu was linked
      console.log("No existing Rich Menu to unlink");
    }

    // Link new Rich Menu
    // ✅ FIXED: Use linkUserRichMenu (SDK v9 method)
    await lineClient.linkUserRichMenu(lineUid, richMenuId);

    console.log(`✅ Rich Menu switched for ${lineUid} to ${newRole}`);
  } catch (error) {
    console.error("❌ Failed to switch Rich Menu:", error);
  }
}

async function handleLineEvent(event) {
  console.log("📨 LINE Event:", event.type);

  // Handle FOLLOW event (when user adds bot as friend)
  if (event.type === "follow") {
    const userId = event.source.userId;
    console.log(`✅ New follower: ${userId}`);

    // EVERYONE gets welcome card when they first add the bot
    return lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [getWelcomeCard()],
    });
  }

  // Handle MESSAGE events
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    const userId = event.source.userId;

    console.log(`👤 User ${userId} said: ${userMessage}`);

    // Check if user is registered
    const { data: users } = await supabase
      .from("users")
      .select("*")
      .eq("line_uid", userId);

    const isRegistered = users && users.length > 0;
    const user = isRegistered ? users[0] : null;

    // Convert to lowercase for case-insensitive matching
    const lowerMessage = userMessage.toLowerCase();

    // ============================================
    // 🆕 ADMIN RICH MENU HANDLERS
    // ============================================

    // 👨‍🍳 SHOP MASTERS BUTTON
    if (lowerMessage === "shop masters") {
      if (!user || user.user_role !== "admin") {
        return lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: "❌ Admin access only." }],
        });
      }

      // Get all shop masters
      const { data: shopMasters } = await supabase
        .from("users")
        .select("*")
        .eq("user_role", "shop_master")
        .order("registered_at", { ascending: false });

      if (!shopMasters || shopMasters.length === 0) {
        return lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [
            {
              type: "text",
              text: "👨‍🍳 No Shop Masters Found\n\nPromote users to shop_master role in the admin dashboard.",
            },
          ],
        });
      }

      // Create carousel of shop master cards (max 12)
      const bubbles = shopMasters.slice(0, 12).map((sm) => ({
        type: "bubble",
        size: "micro",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: sm.display_name,
              weight: "bold",
              size: "md",
              wrap: true,
            },
            {
              type: "text",
              text: `📱 ${sm.phone_number}`,
              size: "xs",
              color: "#666666",
              margin: "md",
            },
            {
              type: "text",
              text: `📧 ${sm.email || "No email"}`,
              size: "xs",
              color: "#666666",
              wrap: true,
            },
            {
              type: "separator",
              margin: "md",
            },
            {
              type: "box",
              layout: "baseline",
              margin: "md",
              contents: [
                {
                  type: "text",
                  text: "💎 Points:",
                  size: "xs",
                  color: "#999999",
                  flex: 0,
                },
                {
                  type: "text",
                  text: `${sm.points}`,
                  size: "xs",
                  margin: "sm",
                  flex: 0,
                },
              ],
            },
            {
              type: "text",
              text: `📅 ${new Date(sm.registered_at).toLocaleDateString()}`,
              size: "xxs",
              color: "#999999",
              margin: "sm",
            },
          ],
        },
      }));

      return lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "flex",
            altText: `${shopMasters.length} Shop Master(s)`,
            contents: {
              type: "carousel",
              contents: bubbles,
            },
          },
        ],
      });
    }

    // 👥 ALL USERS BUTTON
    if (lowerMessage === "all users") {
      if (!user || user.user_role !== "admin") {
        return lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: "❌ Admin access only." }],
        });
      }

      // TODO: Replace YOUR_USERS_LIFF_ID with actual LIFF ID from LINE Console
      return lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "flex",
            altText: "View All Users",
            contents: {
              type: "bubble",
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "👥 All Users",
                    size: "xl",
                    weight: "bold",
                  },
                  {
                    type: "text",
                    text: "View detailed user list with search and filters",
                    size: "sm",
                    color: "#666666",
                    margin: "md",
                    wrap: true,
                  },
                ],
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    action: {
                      type: "uri",
                      label: "Open User List",
                      // TODO: Replace with your All Users LIFF ID
                      uri: "https://liff.line.me/2008995030-RIMwbPZT",
                    },
                  },
                ],
              },
            },
          },
        ],
      });
    }

    // 📊 ANALYTICS BUTTON
    if (lowerMessage === "analytics") {
      if (!user || user.user_role !== "admin") {
        return lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: "❌ Admin access only." }],
        });
      }

      // Get analytics data
      const { data: allUsers } = await supabase.from("users").select("*");
      const { data: allOrders } = await supabase.from("orders").select("*");

      const totalUsers = allUsers?.length || 0;
      const totalShopMasters =
        allUsers?.filter((u) => u.user_role === "shop_master").length || 0;
      const totalAdmins =
        allUsers?.filter((u) => u.user_role === "admin").length || 0;

      const totalOrders = allOrders?.length || 0;
      const completedOrders =
        allOrders?.filter((o) => o.order_status === "completed").length || 0;
      const pendingOrders =
        allOrders?.filter((o) => o.order_status === "pending").length || 0;

      const totalRevenue =
        allOrders
          ?.filter((o) => o.order_status === "completed")
          .reduce((sum, o) => sum + parseFloat(o.total_amount), 0) || 0;

      // Today's stats
      const today = new Date().toISOString().split("T")[0];
      const todayOrders =
        allOrders?.filter((o) => o.order_date.startsWith(today)) || [];
      const todayRevenue = todayOrders
        .filter((o) => o.order_status === "completed")
        .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

      return lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "flex",
            altText: "Analytics Dashboard",
            contents: {
              type: "bubble",
              body: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "text",
                    text: "📊 Analytics",
                    size: "xl",
                    weight: "bold",
                    color: "#f5576c",
                  },
                  {
                    type: "separator",
                    margin: "lg",
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    margin: "lg",
                    spacing: "sm",
                    contents: [
                      // Users Section
                      {
                        type: "text",
                        text: "👥 Users",
                        weight: "bold",
                        size: "sm",
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Total:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `${totalUsers}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                          },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Shop Masters:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `${totalShopMasters}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                          },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Admins:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `${totalAdmins}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                          },
                        ],
                      },
                      {
                        type: "separator",
                        margin: "md",
                      },
                      // Orders Section
                      {
                        type: "text",
                        text: "📦 Orders",
                        weight: "bold",
                        size: "sm",
                        margin: "md",
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Total:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `${totalOrders}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                          },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Completed:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `${completedOrders}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                            color: "#28a745",
                          },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Pending:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `${pendingOrders}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                            color: "#ffc107",
                          },
                        ],
                      },
                      {
                        type: "separator",
                        margin: "md",
                      },
                      // Revenue Section
                      {
                        type: "text",
                        text: "💰 Revenue",
                        weight: "bold",
                        size: "sm",
                        margin: "md",
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Total:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `$${totalRevenue.toFixed(2)}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                            weight: "bold",
                          },
                        ],
                      },
                      {
                        type: "box",
                        layout: "baseline",
                        contents: [
                          {
                            type: "text",
                            text: "Today:",
                            size: "xs",
                            color: "#999999",
                            flex: 2,
                          },
                          {
                            type: "text",
                            text: `$${todayRevenue.toFixed(2)}`,
                            size: "xs",
                            flex: 1,
                            align: "end",
                            color: "#06c755",
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              footer: {
                type: "box",
                layout: "vertical",
                contents: [
                  {
                    type: "button",
                    style: "primary",
                    action: {
                      type: "uri",
                      label: "Full Dashboard",
                      // Opens existing admin dashboard (or create new analytics LIFF)
                      uri: "https://liff.line.me/2008995030-BmX1RlOW",
                    },
                  },
                ],
              },
            },
          },
        ],
      });
    }

    // ============================================
    // EXISTING MESSAGE HANDLERS
    // ============================================

    // Handle different message types
    if (
      lowerMessage.includes("menu") ||
      lowerMessage.includes("order") ||
      lowerMessage.includes("start")
    ) {
      if (isRegistered) {
        // Registered user - show personalized menu card
        return lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [getMenuCard(user.display_name, user.points)],
        });
      } else {
        // Not registered - show welcome card with register button
        return lineClient.replyMessage({
          replyToken: event.replyToken,
          messages: [getWelcomeCard()],
        });
      }
    }

    // CONTACT
    if (userMessage.toLowerCase() === "contact") {
      return lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [getContactCard()],
      });
    }

    // Handle order confirmation messages (from LIFF app)
    if (userMessage.includes("🍣 ORDER")) {
      console.log("📦 Order message detected");

      // Extract order details (we'll improve this later)
      return lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: "✅ Order received! Processing your order...",
          },
        ],
      });
    }

    // Default response - show welcome card to everyone
    if (isRegistered) {
      return lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [
          {
            type: "text",
            text: `Hello ${user.display_name}! 👋\n\nYou have ${user.points} points! 💎\n\nType "menu" to order more delicious sushi! 🍣`,
          },
        ],
      });
    } else {
      return lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [getWelcomeCard()],
      });
    }
  }

  return Promise.resolve(null);
}

// ============================================
// REST API ENDPOINTS
// ============================================

// Test endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🍣 Sushi Cafe API is running",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Registration endpoint (normal users)
app.post("/api/register", async (req, res) => {
  try {
    const { lineUid, displayName, phoneNumber, email } = req.body;

    // Validation
    if (!lineUid || !displayName || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "LINE ID, display name and phone number are required.",
      });
    }

    if (phoneNumber.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Phone Number (at least 10 digits)",
      });
    }

    // Check if user already registered
    const { data: existingUsers } = await supabase
      .from("users")
      .select("*")
      .eq("line_uid", lineUid);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This LINE account is already registered.",
      });
    }

    // Check if phone number already used
    const { data: existingPhone } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phoneNumber);

    if (existingPhone && existingPhone.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This phone number is already used.",
      });
    }

    // Register new user
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          line_uid: lineUid,
          display_name: displayName,
          phone_number: phoneNumber,
          email: email || null,
          user_role: "user",
          points: 0,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 🔥 THIS IS THE KEY LINE
    await linkRichMenu(newUser.line_uid, newUser.user_role);

    console.log("✅ User registered + Rich Menu linked:", newUser.line_uid);

    res.status(201).json({
      success: true,
      message: "🎉 Registration Successful!",
      data: {
        lineUid: newUser.line_uid,
        displayName: newUser.display_name,
        userRole: newUser.user_role,
        points: newUser.points,
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
});

// Admin registration endpoint (with role selection)
app.post("/api/register-admin", async (req, res) => {
  try {
    const { lineUid, displayName, phoneNumber, email, userRole } = req.body;

    // Validation
    if (!lineUid || !displayName || !phoneNumber || !userRole) {
      return res.status(400).json({
        success: false,
        message: "All fields are required including user role.",
      });
    }

    if (phoneNumber.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Phone Number (at least 10 digits)",
      });
    }

    // Validate role
    const validRoles = ["user", "shop_master", "admin"];
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user role",
      });
    }

    // Check if user already registered
    const { data: existingUsers } = await supabase
      .from("users")
      .select("*")
      .eq("line_uid", lineUid);

    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This LINE account is already registered.",
      });
    }

    // Check if phone number already used (only enforce for regular users)
    // Shop masters and admins can share phone numbers
    if (userRole === "user") {
      const { data: existingPhone } = await supabase
        .from("users")
        .select("*")
        .eq("phone_number", phoneNumber);

      if (existingPhone && existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: "This phone number is already used.",
        });
      }
    }

    // Register new user with specified role
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert([
        {
          line_uid: lineUid,
          display_name: displayName,
          phone_number: phoneNumber,
          email: email || null,
          user_role: userRole,
          points: 0,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 🔥 AUTO-LINK Rich Menu based on role
    await linkRichMenu(newUser.line_uid, newUser.user_role);

    console.log(`✅ ${userRole} registered + Rich Menu linked`);

    res.status(201).json({
      success: true,
      message: `🎉 Registration Successful as ${userRole}!`,
      data: {
        lineUid: newUser.line_uid,
        displayName: newUser.display_name,
        userRole: newUser.user_role,
        points: newUser.points,
      },
    });
  } catch (error) {
    console.error("❌ Admin registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
});

// Get user info
app.get("/api/user/:lineUid", async (req, res) => {
  try {
    const { lineUid } = req.params;

    console.log("🔍 Looking for user:", lineUid);

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("line_uid", lineUid);

    console.log("📊 Found:", users?.length || 0, "users");

    if (error) {
      console.error("❌ Database error:", error);
      return res.status(500).json({
        success: false,
        message: "Database error",
        error: error.message,
      });
    }

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please register first.",
      });
    }

    const userData = users[0];

    // ✅ COMMON PROFILE FIELDS (for ALL roles)
    const baseProfile = {
      success: true,
      userRole: userData.user_role,
      displayName: userData.display_name,
      phoneNumber: userData.phone_number,
      email: userData.email,
      points: userData.points,
      registeredAt: userData.registered_at,
    };

    // 🔧 ADMIN
    if (userData.user_role === "admin") {
      console.log(`🔧 ADMIN Detected: ${userData.display_name}`);
      return res.json({
        ...baseProfile,
        message: "Admin access - Full control",
        richMenu: "admin_menu_id",
      });
    }

    // 👨‍🍳 SHOP MASTER
    if (userData.user_role === "shop_master") {
      console.log(`👨‍🍳 SHOP MASTER Detected: ${userData.display_name}`);
      return res.json({
        ...baseProfile,
        message: "Shop Master access - Manage Restaurant",
        richMenu: "shop_master_menu_id",
      });
    }

    // 👤 USER
    console.log(`👤 USER Detected: ${userData.display_name}`);
    return res.json({
      ...baseProfile,
      message: "Welcome Back!",
      richMenu: "user_menu_id",
    });
  } catch (error) {
    console.error("❌ Get user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Create order
app.post("/api/orders", async (req, res) => {
  try {
    const { lineUid, orderDetails, totalAmount } = req.body;

    if (!lineUid || !orderDetails || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: "LINE ID, OrderDetails and TotalAmount are required.",
      });
    }

    // Check if user exists
    const { data: users } = await supabase
      .from("users")
      .select("*")
      .eq("line_uid", lineUid);

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found! Please register first",
      });
    }

    const user = users[0];

    // Calculate points ($10 = 1 point)
    const pointsEarned = Math.floor(totalAmount / 10);

    // Create order
    const { data: newOrder, error: orderError } = await supabase
      .from("orders")
      .insert([
        {
          line_uid: lineUid,
          order_details: orderDetails,
          total_amount: totalAmount,
          points_earned: pointsEarned,
          order_status: "pending",
        },
      ])
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // Update user's total points
    const newTotalPoints = user.points + pointsEarned;

    const { error: updateError } = await supabase
      .from("users")
      .update({ points: newTotalPoints })
      .eq("line_uid", lineUid);

    if (updateError) {
      throw updateError;
    }

    console.log(
      `✅ Order created: Order #${newOrder.order_id} for ${user.display_name}`
    );

    res.status(201).json({
      success: true,
      message: "✅ Order placed successfully!",
      data: {
        orderId: newOrder.order_id,
        orderDetails: newOrder.order_details,
        totalAmount: newOrder.total_amount,
        pointsEarned: pointsEarned,
        newTotalPoints: newTotalPoints,
        orderStatus: newOrder.order_status,
      },
    });
  } catch (error) {
    console.error("❌ Order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating order",
      error: error.message,
    });
  }
});

// Get user's order history
app.get("/api/orders/user/:lineUid", async (req, res) => {
  try {
    const { lineUid } = req.params;

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("line_uid", lineUid)
      .order("order_date", { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("❌ Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// ============================================
// ADMIN API ENDPOINTS
// ============================================

// Get all users (Admin only)
app.get("/api/admin/users", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("registered_at", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: users,
      count: users.length,
    });
  } catch (error) {
    console.error("❌ Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
});

// Get all orders (Admin only)
app.get("/api/admin/orders", async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        users (
          display_name,
          phone_number
        )
      `
      )
      .order("order_date", { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("❌ Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
});

// Update user role (Admin only)
app.put("/api/admin/users/:lineUid/role", async (req, res) => {
  try {
    const { lineUid } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["user", "shop_master", "admin"];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be: user, shop_master, or admin",
      });
    }

    // Update user role
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({ user_role: role })
      .eq("line_uid", lineUid)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ User ${lineUid} role changed to: ${role}`);

    // 🔥 AUTO-SWITCH Rich Menu when role changes
    await switchRichMenu(lineUid, role);

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Update role error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user role",
      error: error.message,
    });
  }
});

// Delete user (Admin only)
app.delete("/api/admin/users/:lineUid", async (req, res) => {
  try {
    const { lineUid } = req.params;

    // Delete user's orders first (foreign key constraint)
    await supabase.from("orders").delete().eq("line_uid", lineUid);

    // Delete user
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("line_uid", lineUid);

    if (error) throw error;

    console.log(`✅ User ${lineUid} deleted`);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message,
    });
  }
});

// ============================================
// SHOP MASTER API ENDPOINTS
// ============================================

// Get pending orders (Shop Master)
app.get("/api/shop/orders/pending", async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        users (
          display_name,
          phone_number
        )
      `
      )
      .eq("order_status", "pending")
      .order("order_date", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("❌ Get pending orders error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending orders",
      error: error.message,
    });
  }
});

// Update order status (Shop Master)
app.patch("/api/shop/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["pending", "completed", "cancelled"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: pending, completed, or cancelled",
      });
    }

    // Update order status
    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({ order_status: status })
      .eq("order_id", orderId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Order ${orderId} status changed to: ${status}`);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
});

// ============================================
// MENU API ENDPOINTS
// ============================================

// Get all menu items (public)
app.get("/api/menu/items", async (req, res) => {
  try {
    const { data: items, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: items,
      count: items.length,
    });
  } catch (error) {
    console.error("❌ Get menu items error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch menu items",
      error: error.message,
    });
  }
});

// Get single menu item (public)
app.get("/api/menu/items/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;

    const { data: item, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("item_id", itemId)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("❌ Get menu item error:", error);
    res.status(500).json({
      success: false,
      message: "Menu item not found",
      error: error.message,
    });
  }
});

// Update menu item (Shop Master/Admin only)
app.put("/api/shop/menu/items/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const { lineUid, name, price, description } = req.body;

    // Validate LINE UID
    if (!lineUid) {
      return res.status(400).json({
        success: false,
        message: "LINE UID is required",
      });
    }

    if (!name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name and price are required",
      });
    }

    // Validate price
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number",
      });
    }

    // Check user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_role, display_name")
      .eq("line_uid", lineUid)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.user_role !== "shop_master" && user.user_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Shop Master or Admin only.",
      });
    }

    // Update menu item
    const updateData = {
      name: name.trim(),
      price: parseFloat(price),
    };

    if (description !== undefined) {
      updateData.description = description.trim() || null;
    }

    const { data: updatedItem, error } = await supabase
      .from("menu_items")
      .update(updateData)
      .eq("item_id", itemId)
      .select()
      .single();

    if (error) throw error;

    console.log(
      `✅ Menu item ${itemId} updated by ${user.display_name} (${lineUid})`
    );

    res.json({
      success: true,
      message: "Menu item updated successfully",
      data: updatedItem,
    });
  } catch (error) {
    console.error("❌ Update menu item error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update menu item. Ensure table menu_items exists.",
      error: error.message,
    });
  }
});

// Add new menu item (Shop Master/Admin only)
app.post("/api/shop/menu/items", async (req, res) => {
  try {
    const { lineUid, name, price, description, category } = req.body;

    // Validate required fields
    if (!lineUid || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "LINE UID, name, and price are required",
      });
    }

    // Validate price
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number",
      });
    }

    // Check user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_role, display_name")
      .eq("line_uid", lineUid)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.user_role !== "shop_master" && user.user_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Shop Master or Admin only.",
      });
    }

    // Insert new menu item
    const { data: newItem, error } = await supabase
      .from("menu_items")
      .insert([
        {
          name: name.trim(),
          price: parseFloat(price),
          description: description ? description.trim() : null,
          category: category || "sushi",
        },
      ])
      .select()
      .single();

    if (error) throw error;

    console.log(
      `✅ New menu item created by ${user.display_name} (${lineUid}): ${newItem.name}`
    );

    res.status(201).json({
      success: true,
      message: "Menu item created successfully",
      data: newItem,
    });
  } catch (error) {
    console.error("❌ Create menu item error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create menu item",
      error: error.message,
    });
  }
});

// Delete menu item - Soft delete (Shop Master/Admin only)
app.delete("/api/shop/menu/items/:itemId", async (req, res) => {
  try {
    const { itemId } = req.params;
    const { lineUid } = req.body;

    if (!lineUid) {
      return res.status(400).json({
        success: false,
        message: "LINE UID is required",
      });
    }

    // Check user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_role, display_name")
      .eq("line_uid", lineUid)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.user_role !== "shop_master" && user.user_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Shop Master or Admin only.",
      });
    }

    // Soft delete - set is_available to false
    const { data: deletedItem, error } = await supabase
      .from("menu_items")
      .update({ is_available: false })
      .eq("item_id", itemId)
      .select()
      .single();

    if (error) throw error;

    console.log(
      `✅ Menu item ${itemId} deleted by ${user.display_name} (${lineUid})`
    );

    res.json({
      success: true,
      message: "Menu item deleted successfully",
      data: deletedItem,
    });
  } catch (error) {
    console.error("❌ Delete menu item error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete menu item",
      error: error.message,
    });
  }
});

// Toggle menu item availability (Shop Master/Admin only)
app.patch("/api/shop/menu/items/:itemId/toggle", async (req, res) => {
  try {
    const { itemId } = req.params;
    const { lineUid } = req.body;

    if (!lineUid) {
      return res.status(400).json({
        success: false,
        message: "LINE UID is required",
      });
    }

    // Check user role
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_role")
      .eq("line_uid", lineUid)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.user_role !== "shop_master" && user.user_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Shop Master or Admin only.",
      });
    }

    // Get current item
    const { data: currentItem } = await supabase
      .from("menu_items")
      .select("is_available")
      .eq("item_id", itemId)
      .single();

    if (!currentItem) {
      return res.status(404).json({
        success: false,
        message: "Menu item not found",
      });
    }

    // Toggle availability
    const { data: updatedItem, error } = await supabase
      .from("menu_items")
      .update({ is_available: !currentItem.is_available })
      .eq("item_id", itemId)
      .select()
      .single();

    if (error) throw error;

    console.log(
      `✅ Menu item ${itemId} toggled to ${updatedItem.is_available}`
    );

    res.json({
      success: true,
      message: `Menu item ${updatedItem.is_available ? "enabled" : "disabled"}`,
      data: updatedItem,
    });
  } catch (error) {
    console.error("❌ Toggle menu item error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle menu item",
      error: error.message,
    });
  }
});

// 🆕 Analytics API - Get system statistics (Admin only)
app.get("/api/admin/statistics", async (req, res) => {
  try {
    // Get all users
    const { data: users } = await supabase.from("users").select("*");

    // Get all orders
    const { data: orders } = await supabase.from("orders").select("*");

    // Calculate statistics
    const today = new Date().toISOString().split("T")[0];
    const last7Days = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const stats = {
      users: {
        total: users?.length || 0,
        byRole: {
          users: users?.filter((u) => u.user_role === "user").length || 0,
          shopMasters:
            users?.filter((u) => u.user_role === "shop_master").length || 0,
          admins: users?.filter((u) => u.user_role === "admin").length || 0,
        },
        recentSignups:
          users?.filter((u) => u.registered_at >= last7Days).length || 0,
      },
      orders: {
        total: orders?.length || 0,
        pending:
          orders?.filter((o) => o.order_status === "pending").length || 0,
        completed:
          orders?.filter((o) => o.order_status === "completed").length || 0,
        cancelled:
          orders?.filter((o) => o.order_status === "cancelled").length || 0,
        recent: orders?.filter((o) => o.order_date >= last7Days).length || 0,
      },
      revenue: {
        total:
          orders
            ?.filter((o) => o.order_status === "completed")
            .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
            .toFixed(2) || "0.00",
        today:
          orders
            ?.filter(
              (o) =>
                o.order_status === "completed" && o.order_date.startsWith(today)
            )
            .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
            .toFixed(2) || "0.00",
      },
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ Statistics error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("🚀 ========================================");
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log("   🍣 Sushi Cafe API");
  console.log("   📊 Connected to Supabase");
  console.log("   ✅ Admin Rich Menu Handlers Active");
  console.log("🚀 ========================================");
});
