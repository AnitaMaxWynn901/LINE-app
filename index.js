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
    const { data: allOrders, error: ordersError } = await supabase
      .from("orders")
      .select("*");

    if (ordersError) {
      throw ordersError;
    }

    const { data: allUsers, error: usersError } = await supabase
      .from("users")
      .select("*");

    if (usersError) {
      throw usersError;
    }

    const totalOrders = allOrders.length;
    const pendingOrders = allOrders.filter(
      (o) => o.order_status === "pending"
    ).length;
    const completedOrders = allOrders.filter(
      (o) => o.order_status === "completed"
    ).length;
    const totalRevenue = allOrders
      .filter((o) => o.order_status === "completed")
      .reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    const totalCustomers = allUsers.filter(
      (u) => u.user_role === "user"
    ).length;

    const today = new Date().toISOString().split("T")[0];
    const todayOrders = allOrders.filter((o) => o.order_date.startsWith(today));

    const todayRevenue = todayOrders.reduce(
      (sum, order) => sum + parseFloat(order.total_amount),
      0
    );

    const recentOrders = allOrders
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
      .slice(0, 10);

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

// Start server
app.listen(PORT, () => {
  console.log("🚀 ========================================");
  console.log(`   Server running on http://localhost:${PORT}`);
  console.log("   🍣 Sushi Cafe API");
  console.log("   📊 Connected to Supabase");
  console.log("🚀 ========================================");
});
