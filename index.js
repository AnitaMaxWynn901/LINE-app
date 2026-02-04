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

    // Handle different message types
    if (
      userMessage.toLowerCase().includes("menu") ||
      userMessage.toLowerCase().includes("order") ||
      userMessage.toLowerCase().includes("start")
    ) {
      if (isRegistered) {
        // Registered user - show personalized menu card
        const user = users[0];

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
      const user = users[0];
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

    console.log("✅ New user registered:", newUser.line_uid);

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

    console.log(`✅ New ${userRole} registered:`, newUser.line_uid);

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

    // Role-based response
    if (userData.user_role === "admin") {
      console.log(`🔧 ADMIN Detected: ${userData.display_name}`);
      return res.json({
        success: true,
        userRole: "admin",
        displayName: userData.display_name,
        points: userData.points,
        message: "Admin access - Full control",
        richMenu: "admin_menu_id",
      });
    } else if (userData.user_role === "shop_master") {
      console.log(`👨‍🍳 SHOP MASTER Detected: ${userData.display_name}`);
      return res.json({
        success: true,
        userRole: "shop_master",
        displayName: userData.display_name,
        points: userData.points,
        message: "Shop Master access - Manage Restaurant",
        richMenu: "shop_master_menu_id",
      });
    } else {
      console.log(`👤 USER Detected: ${userData.display_name}`);
      return res.json({
        success: true,
        userRole: "user",
        displayName: userData.display_name,
        phoneNumber: userData.phone_number,
        email: userData.email,
        points: userData.points,
        registeredAt: userData.registered_at,
        message: "Welcome Back!",
        richMenu: "user_menu_id",
      });
    }
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
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Get orders error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

// Update order status
app.put("/api/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid status. Must be pending, confirmed, completed or cancelled",
      });
    }

    const { data: updatedOrder, error } = await supabase
      .from("orders")
      .update({ order_status: status })
      .eq("order_id", orderId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ Order #${orderId} status updated to: ${status}`);

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("❌ Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

// Get user dashboard
app.get("/api/dashboard/user/:lineUid", async (req, res) => {
  try {
    const { lineUid } = req.params;

    const { data: users } = await supabase
      .from("users")
      .select("*")
      .eq("line_uid", lineUid);

    if (!users || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .eq("line_uid", lineUid)
      .order("order_date", { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (o) => o.order_status === "completed"
    ).length;
    const totalSpent = orders.reduce(
      (sum, order) => sum + parseFloat(order.total_amount),
      0
    );
    const recentOrders = orders.slice(0, 5);

    res.json({
      success: true,
      data: {
        user: {
          displayName: user.display_name,
          phoneNumber: user.phone_number,
          email: user.email,
          points: user.points,
          memberSince: user.registered_at,
        },
        statistics: {
          totalOrders,
          completedOrders,
          totalSpent: totalSpent.toFixed(2),
        },
        recentOrders,
      },
    });
  } catch (error) {
    console.error("❌ Get user dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get shop master dashboard
app.get("/api/dashboard/shop", async (req, res) => {
  try {
    // 1️⃣ Fetch orders WITH user display name (JOIN)
    const { data: allOrders, error: ordersError } = await supabase.from(
      "orders"
    ).select(`
        order_id,
        order_details,
        total_amount,
        points_earned,
        order_status,
        order_date,
        line_uid,
        users (
          display_name
        )
      `);

    if (ordersError) {
      throw ordersError;
    }

    // 2️⃣ Normalize orders (flatten display_name)
    const normalizedOrders = allOrders.map((order) => ({
      order_id: order.order_id,
      order_details: order.order_details,
      total_amount: order.total_amount,
      points_earned: order.points_earned,
      order_status: order.order_status,
      order_date: order.order_date,
      line_uid: order.line_uid,
      display_name: order.users?.display_name || "Unknown",
    }));

    // 3️⃣ Fetch users (for statistics)
    const { data: allUsers, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError) {
      throw usersError;
    }

    // 4️⃣ Statistics calculations
    const totalOrders = normalizedOrders.length;

    const pendingOrders = normalizedOrders.filter(
      (o) => o.order_status === "pending"
    ).length;

    const completedOrders = normalizedOrders.filter(
      (o) => o.order_status === "completed"
    ).length;

    const totalRevenue = normalizedOrders
      .filter((o) => o.order_status === "completed")
      .reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    const totalCustomers = allUsers.filter(
      (u) => u.user_role === "user"
    ).length;

    const today = new Date().toISOString().split("T")[0];

    const todayOrders = normalizedOrders.filter((o) =>
      o.order_date.startsWith(today)
    );

    const todayRevenue = todayOrders.reduce(
      (sum, order) => sum + parseFloat(order.total_amount),
      0
    );

    // 5️⃣ Recent orders (latest 10)
    const recentOrders = [...normalizedOrders]
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
      .slice(0, 10);

    // 6️⃣ Response
    res.json({
      success: true,
      data: {
        statistics: {
          totalOrders,
          pendingOrders,
          completedOrders,
          totalRevenue: totalRevenue.toFixed(2),
          totalCustomers,
          todayOrders: todayOrders.length,
          todayRevenue: todayRevenue.toFixed(2),
        },
        recentOrders,
      },
    });
  } catch (error) {
    console.error("❌ Get shop dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get admin dashboard
app.get("/api/dashboard/admin", async (req, res) => {
  try {
    const { data: allOrders } = await supabase.from("orders").select("*");
    const { data: allUsers } = await supabase.from("users").select("*");

    const usersByRole = {
      users: allUsers.filter((u) => u.user_role === "user").length,
      shopMasters: allUsers.filter((u) => u.user_role === "shop_master").length,
      admins: allUsers.filter((u) => u.user_role === "admin").length,
    };

    const totalRevenue = allOrders.reduce(
      (sum, order) => sum + parseFloat(order.total_amount),
      0
    );

    res.json({
      success: true,
      data: {
        statistics: {
          totalUsers: allUsers.length,
          usersByRole,
          totalOrders: allOrders.length,
          totalRevenue: totalRevenue.toFixed(2),
        },
        recentUsers: allUsers.slice(-10).reverse(),
        recentOrders: allOrders.slice(-10).reverse(),
      },
    });
  } catch (error) {
    console.error("❌ Get admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// ============================================
// ADMIN API ENDPOINTS (Add these to index.js)
// ============================================

// Get all users (Admin only)
app.get("/api/admin/users", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .order("registered_at", { ascending: false });

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("❌ Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Change user role (Admin only)
app.put("/api/admin/users/:lineUid/role", async (req, res) => {
  try {
    const { lineUid } = req.params;
    const { role } = req.body;

    // Validate role
    const validRoles = ["user", "shop_master", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be user, shop_master, or admin",
      });
    }

    // Update user role
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({ user_role: role })
      .eq("line_uid", lineUid)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ User ${lineUid} role changed to: ${role}`);

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Change role error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Adjust user points (Admin only)
app.put("/api/admin/users/:lineUid/points", async (req, res) => {
  try {
    const { lineUid } = req.params;
    const { points } = req.body;

    // Validate points
    if (typeof points !== "number" || points < 0) {
      return res.status(400).json({
        success: false,
        message: "Points must be a non-negative number",
      });
    }

    // Update user points
    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({ points: points })
      .eq("line_uid", lineUid)
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log(`✅ User ${lineUid} points updated to: ${points}`);

    res.json({
      success: true,
      message: `User points updated to ${points}`,
      data: updatedUser,
    });
  } catch (error) {
    console.error("❌ Update points error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get enhanced admin statistics
app.get("/api/admin/statistics", async (req, res) => {
  try {
    const { data: users } = await supabase.from("users").select("*");
    const { data: orders } = await supabase.from("orders").select("*");

    // User statistics by role
    const usersByRole = {
      users: users.filter((u) => u.user_role === "user").length,
      shopMasters: users.filter((u) => u.user_role === "shop_master").length,
      admins: users.filter((u) => u.user_role === "admin").length,
    };

    // Order statistics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(
      (o) => o.order_status === "pending"
    ).length;
    const completedOrders = orders.filter(
      (o) => o.order_status === "completed"
    ).length;
    const cancelledOrders = orders.filter(
      (o) => o.order_status === "cancelled"
    ).length;

    // Revenue statistics
    const totalRevenue = orders
      .filter((o) => o.order_status === "completed")
      .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    // Today's statistics
    const today = new Date().toISOString().split("T")[0];
    const todayOrders = orders.filter((o) => o.order_date.startsWith(today));
    const todayRevenue = todayOrders
      .filter((o) => o.order_status === "completed")
      .reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    // Growth statistics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = users.filter(
      (u) => new Date(u.registered_at) >= sevenDaysAgo
    ).length;
    const recentOrders = orders.filter(
      (o) => new Date(o.order_date) >= sevenDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        users: {
          total: users.length,
          byRole: usersByRole,
          recentSignups: recentUsers,
        },
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          completed: completedOrders,
          cancelled: cancelledOrders,
          recent: recentOrders,
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          today: todayRevenue.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("❌ Get admin statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log("🚀 ========================================");
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log("   🍣 Sushi Cafe API");
  console.log("   📊 Connected to Supabase");
  console.log("🚀 ========================================");
});
