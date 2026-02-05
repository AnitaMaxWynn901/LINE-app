// Flex Message Templates for LINE Bot

// Welcome Card with Register/Login buttons
function getWelcomeCard() {
  return {
    type: "flex",
    altText: "Welcome to Sushi Cafe! 🍣",
    contents: {
      type: "bubble",
      hero: {
        type: "image",
        url: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800",
        size: "full",
        aspectRatio: "20:13",
        aspectMode: "cover",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "Welcome to",
            size: "sm",
            color: "#999999",
            weight: "bold",
          },
          {
            type: "text",
            text: "Sushi Cafe 🍣",
            size: "xxl",
            weight: "bold",
            margin: "xs",
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
              {
                type: "text",
                text: "✨ Fresh sushi daily",
                size: "sm",
                color: "#666666",
                flex: 0,
              },
              {
                type: "text",
                text: "🎁 Earn points with every order",
                size: "sm",
                color: "#666666",
                flex: 0,
              },
              {
                type: "text",
                text: "🚀 Fast & easy ordering",
                size: "sm",
                color: "#666666",
                flex: 0,
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "uri",
              label: "🍣 Order Now",
              uri: "https://liff.line.me/2008995030-W39gBpe4",
            },
          },
          {
            type: "box",
            layout: "vertical",
            contents: [],
            margin: "sm",
          },
        ],
        flex: 0,
      },
    },
  };
}

// Registered User Menu Card
function getMenuCard(userName, userPoints) {
  return {
    type: "flex",
    altText: `Welcome back, ${userName}! 🍣`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: `Hello, ${userName}! 👋`,
            size: "xl",
            weight: "bold",
          },
          {
            type: "box",
            layout: "baseline",
            margin: "md",
            contents: [
              {
                type: "text",
                text: "💎 Points:",
                size: "sm",
                color: "#999999",
                flex: 0,
              },
              {
                type: "text",
                text: `${userPoints} pts`,
                size: "sm",
                color: "#06c755",
                weight: "bold",
                margin: "sm",
              },
            ],
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "text",
            text: "Tap below to:",
            size: "sm",
            color: "#999999",
            margin: "lg",
          },
          {
            type: "box",
            layout: "vertical",
            margin: "md",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "🍣 Order delicious sushi",
                size: "sm",
                color: "#666666",
              },
              {
                type: "text",
                text: "📋 View order history",
                size: "sm",
                color: "#666666",
              },
              {
                type: "text",
                text: "🎁 Check your points",
                size: "sm",
                color: "#666666",
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "uri",
              label: "🍣 Open Menu",
              uri: "https://liff.line.me/2008995030-W39gBpe4",
            },
          },
        ],
      },
    },
  };
}

// Order confirmation message
function getOrderConfirmation(orderDetails, totalAmount, pointsEarned) {
  return {
    type: "flex",
    altText: "Order Confirmation 🍣",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "Order Confirmed! ✅",
            size: "xl",
            weight: "bold",
            color: "#06c755",
          },
          {
            type: "text",
            text: "Thank you for your order!",
            size: "sm",
            color: "#999999",
            margin: "md",
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
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "Order:",
                    color: "#999999",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: orderDetails,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 4,
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "Total:",
                    color: "#999999",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: `$${totalAmount}`,
                    wrap: true,
                    color: "#666666",
                    size: "sm",
                    flex: 4,
                    weight: "bold",
                  },
                ],
              },
              {
                type: "box",
                layout: "baseline",
                spacing: "sm",
                contents: [
                  {
                    type: "text",
                    text: "Points:",
                    color: "#999999",
                    size: "sm",
                    flex: 1,
                  },
                  {
                    type: "text",
                    text: `+${pointsEarned} pts 🎉`,
                    wrap: true,
                    color: "#06c755",
                    size: "sm",
                    flex: 4,
                    weight: "bold",
                  },
                ],
              },
            ],
          },
          {
            type: "separator",
            margin: "lg",
          },
          {
            type: "text",
            text: "Your sushi will be ready soon! 🍣",
            size: "sm",
            color: "#999999",
            margin: "lg",
            align: "center",
          },
        ],
      },
    },
  };
}

// Pending orders for Shop Master (carousel of order cards + "Mark completed" postback)
const SHOP_DASHBOARD_LIFF = "https://liff.line.me/2008995030-d47ws6I6";

function getPendingOrdersCarousel(orders) {
  const maxBubbles = 12;
  const bubbles = orders.slice(0, maxBubbles).map((o) => ({
    type: "bubble",
    size: "micro",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: `Order #${o.order_id}`,
          size: "sm",
          weight: "bold",
        },
        {
          type: "text",
          text: `👤 ${o.display_name}`,
          size: "xs",
          color: "#666666",
        },
        {
          type: "text",
          text: `🍣 ${o.order_details}`,
          size: "xs",
          color: "#666666",
          wrap: true,
        },
        {
          type: "box",
          layout: "baseline",
          contents: [
            { type: "text", text: "💰", size: "xs", flex: 0 },
            {
              type: "text",
              text: `$${o.total_amount}`,
              size: "xs",
              weight: "bold",
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
          height: "sm",
          action: {
            type: "postback",
            label: "Mark completed",
            data: `complete_order_${o.order_id}`,
          },
        },
      ],
    },
  }));

  const contents = {
    type: "carousel",
    contents: bubbles,
  };

  return {
    type: "flex",
    altText: `You have ${orders.length} pending order(s).`,
    contents,
  };
}

function getNoPendingOrdersCard() {
  return {
    type: "flex",
    altText: "No pending orders",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📦 Pending orders",
            size: "md",
            weight: "bold",
          },
          {
            type: "text",
            text: "No pending orders right now.",
            size: "sm",
            color: "#666666",
            margin: "md",
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
            height: "sm",
            action: {
              type: "uri",
              label: "Open Dashboard",
              uri: SHOP_DASHBOARD_LIFF,
            },
          },
        ],
      },
    },
  };
}

// Contact Card
function getContactCard() {
  return {
    type: "flex",
    altText: "Contact Sushi Cafe",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📞 Contact Us",
            weight: "bold",
            size: "lg",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "text",
            text: "🍣 Sushi Cafe",
            weight: "bold",
            size: "md",
          },
          {
            type: "text",
            text: "📍 Chiang Rai, Thailand",
            size: "sm",
            color: "#666666",
          },
          {
            type: "text",
            text: "📞 09X-XXX-XXXX",
            size: "sm",
            color: "#666666",
          },
          {
            type: "text",
            text: "🕘 Open daily: 10:00 – 21:00",
            size: "sm",
            color: "#666666",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            height: "sm",
            action: {
              type: "uri",
              label: "📍 Open in Google Maps",
              uri: "https://maps.google.com", // replace with real link
            },
          },
        ],
      },
    },
  };
}

module.exports = {
  getWelcomeCard,
  getMenuCard,
  getOrderConfirmation,
  getPendingOrdersCarousel,
  getNoPendingOrdersCard,
  getContactCard,
};
