import express from "express";
import cors from "cors";
import pkg from "pg";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { createRequire } from "module";
import authenticateToken from "./middleware/authMiddleware.js";

const require = createRequire(import.meta.url);
require("dotenv").config();

const { Pool } = pkg;
const JWT_SECRET = process.env.JWT_SECRET;
const DELIVERY_FEE = 30;

const app = express();
app.use(cors());
app.use(express.json());

// ✅ PostgreSQL Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL"))
  .catch((err) => console.error("❌ DB connection error:", err));

// ============================================================
// 🧩 RESTAURANTS
// ============================================================
app.get("/api/restaurants", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM restaurants ORDER BY restaurant_id ASC");
    res.json({ success: true, restaurants: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// ============================================================
// 🧩 MENU ITEMS
// ============================================================
app.get("/api/menu/:restaurant_id", async (req, res) => {
  const { restaurant_id } = req.params;
  try {
    const result = await pool.query(
      "SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY item_id ASC",
      [restaurant_id]
    );
    res.json({ success: true, menu: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});


// ============================================================
// 🧩 FILTER API — (Filters + Veg/Non-Veg)
// ============================================================
app.get("/api/filter", async (req, res) => {
  const { filter = "All", veg = "Veg" } = req.query;
  try {
    let query = `
      SELECT m.*, r.name AS restaurant_name, r.location
      FROM menu_items m
      JOIN restaurants r ON m.restaurant_id = r.restaurant_id
      WHERE m.available = true
    `;

    if (veg) {
      if (veg === "Veg") query += " AND LOWER(m.veg_nonveg) = 'veg'";
      else if (veg === "Non-Veg") query += " AND LOWER(m.veg_nonveg) = 'nonveg'";
    }

    switch (filter) {
      case "Offers":
        query += " AND m.price <= 200 ORDER BY m.price ASC";
        break;
      case "Rating 4.5+":
        query += " AND m.rating >= 4.5 ORDER BY m.rating DESC";
        break;
      case "High Protein":
        query += `
          AND (
            LOWER(m.item_name) LIKE '%chicken%' OR
            LOWER(m.item_name) LIKE '%egg%' OR
            LOWER(m.item_name) LIKE '%paneer%' OR
            LOWER(m.description) LIKE '%protein%'
          )
          ORDER BY m.rating DESC
        `;
        break;
      case "Low Budget":
        query += " AND m.price <= 120 ORDER BY m.price ASC";
        break;
      case "Student Combo":
        query += `
          AND (
            LOWER(m.item_name) LIKE '%combo%' OR
            LOWER(m.item_name) LIKE '%meal%' OR
            m.price BETWEEN 50 AND 150
          )
          ORDER BY m.price ASC
        `;
        break;
      default:
        query += " ORDER BY m.rating DESC";
        break;
    }

    const result = await pool.query(query);
    res.json({ success: true, items: result.rows });
  } catch (err) {
    console.error("❌ Filter error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});


// ============================================================
// 🔍 SEARCH API
// ============================================================
app.get("/api/search", async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === "") {
    return res.status(400).json({ message: "Search query missing" });
  }

  try {
    const searchTerm = `%${q.toLowerCase()}%`;
    const result = await pool.query(
      `
      SELECT 
        m.item_id,
        m.item_name,
        m.price,
        m.description,
        m.image,
        m.veg_nonveg,
        m.rating,
        m.restaurant_id,
        r.name AS restaurant_name,
        r.location
      FROM menu_items m
      JOIN restaurants r ON m.restaurant_id = r.restaurant_id
      WHERE LOWER(m.item_name) LIKE $1
         OR LOWER(r.name) LIKE $1
         OR LOWER(m.description) LIKE $1
      ORDER BY r.name;
      `,
      [searchTerm]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error searching items:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ============================================================
// 🧩 PLACE ORDER
// ============================================================
app.post("/api/placeorder", authenticateToken, async (req, res) => {
  const user_id = req.user.customer_id;
  const { delivery_address, coupon_code, cartItems } = req.body;

  if (!delivery_address || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ success: false, message: "Invalid order data" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderItems = [];
    let subtotal = 0;

    for (const item of cartItems) {
      const itemId = Number(item.item_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(itemId) || !Number.isInteger(quantity) || quantity <= 0) {
        const err = new Error("Invalid cart item");
        err.statusCode = 400;
        throw err;
      }

      const menuResult = await client.query(
        "SELECT item_id, price FROM menu_items WHERE item_id = $1",
        [itemId]
      );

      if (menuResult.rows.length === 0) {
        const err = new Error(`Menu item ${itemId} no longer exists`);
        err.statusCode = 404;
        throw err;
      }

      const dbPrice = Number(menuResult.rows[0].price);
      const lineTotal = dbPrice * quantity;
      subtotal += lineTotal;

      orderItems.push({
        item_id: itemId,
        quantity,
        price: dbPrice,
      });
    }

    let discount_amount = 0;

    if (coupon_code && coupon_code.trim() !== "") {
      const couponResult = await client.query(
        "SELECT * FROM apply_coupon($1, $2, $3)",
        [user_id, coupon_code.trim(), subtotal]
      );

      const couponData = couponResult.rows[0];
      discount_amount = couponData ? Number(couponData.discount_amount) || 0 : 0;
    }

    const total_amount = subtotal - discount_amount + DELIVERY_FEE;

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, order_time, status, subtotal, discount_amount, total_amount, delivery_address)
       VALUES ($1, NOW(), 'Pending', $2, $3, $4, $5) RETURNING order_id`,
      [user_id, subtotal, discount_amount, total_amount, delivery_address]
    );

    const orderId = orderResult.rows[0].order_id;

    for (const item of orderItems) {
      await client.query(
        `INSERT INTO order_details (order_id, item_id, quantity, price)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.item_id, item.quantity, item.price]
      );
    }

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Order placed successfully",
      orderId,
      subtotal,
      discount_amount,
      delivery_fee: DELIVERY_FEE,
      total_amount,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }

    console.error("Error placing order:", err);
    res.status(500).json({ success: false, message: "Database error" });
  } finally {
    client.release();
  }
});

// ============================================================
app.post("/api/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({
      success: false,
      message: "All fields required",
    });

  try {
    // Check if email already exists
    const check = await pool.query(
      "SELECT * FROM customers WHERE email = $1",
      [email]
    );

    if (check.rows.length > 0)
      return res.json({
        success: false,
        message: "Email already registered",
      });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create customer
    const result = await pool.query(
      `INSERT INTO customers (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING customer_id, name, email`,
      [name, email, hashedPassword]
    );

    const customer = result.rows[0];

    // ✅ Generate JWT
    const token = jwt.sign(
      {
        customer_id: customer.customer_id,
        email: customer.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Return token + customer
    res.json({
      success: true,
      token,
      customer,
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      success: false,
      message: "Database error",
    });
  }
});
app.get("/api/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT customer_id, name, email FROM customers WHERE customer_id = $1",
      [req.user.customer_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, customer: result.rows[0] });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });

  try {
    const result = await pool.query("SELECT * FROM customers WHERE email = $1", [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ success: false, message: "Invalid email" });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid password" });

    // ✅ INSERT THE LOG CALL *RIGHT HERE*
    await pool.query("SELECT log_activity($1, 'LOGIN', 'User logged in successfully')", [
      user.customer_id
    ]);

    // ✅ Then return success response
    if (!JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const token = jwt.sign(
      {
        customer_id: user.customer_id,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      customer: {
        customer_id: user.customer_id,
        name: user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.post("/api/apply-coupon", async (req, res) => {
  try {
    const { user_id, coupon_code, subtotal } = req.body;

    if (!user_id || subtotal == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // -----------------------------
    // Default discount if no coupon
    // -----------------------------
    if (!coupon_code || coupon_code.trim() === "") {
      const discount_amount = Math.round(subtotal * 0.1); // 10% default
      const final_total = subtotal - discount_amount;
      return res.json({
        success: true,
        discount_amount,
        final_total,
        message: "Default discount applied 🎉",
      });
    }

    // -----------------------------
    // Coupon code logic
    // -----------------------------
    const result = await pool.query(
      "SELECT * FROM apply_coupon($1, $2, $3)",
      [user_id, coupon_code, subtotal]
    );

    const data = result.rows[0];

    // Compute final total here
    const discount_amount = Number(data.discount_amount);
    const final_total = Number(data.subtotal) - discount_amount;

    res.json({
      success: true,
      discount_amount,
      final_total,
      message: data.message,
    });
  } catch (err) {
    console.error("❌ Coupon apply error:", err);
    res.status(500).json({ success: false, message: "Server error applying coupon" });
  }
});

app.get("/api/orders/:user_id", async (req, res) => {
  const { user_id } = req.params;

  try {
    // Step 1: Fetch all orders of user
    const orders = await pool.query(
      `SELECT * FROM orders 
       WHERE user_id = $1 
       ORDER BY order_time DESC`,
      [user_id]
    );

    const orderList = orders.rows;

    // Step 2: For each order fetch items
    for (let order of orderList) {
      const items = await pool.query(
        `SELECT od.quantity, od.price, m.item_name, m.image 
         FROM order_details od
         JOIN menu_items m ON od.item_id = m.item_id
         WHERE od.order_id = $1`,
        [order.order_id]
      );

      order.items = items.rows;  // attach items to each order
    }

    res.json({ success: true, orders: orderList });

  } catch (err) {
    console.error("❌ Orders fetch error:", err);
    res.status(500).json({ success: false, message: "Server error fetching orders" });
  }
});



// ============================================================
// 🚀 START SERVER
// ============================================================
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
