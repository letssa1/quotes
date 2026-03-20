// ======================================================
// server.js — Quote API
// Express + PostgreSQL (pg)
// Routes: GET /quotes, GET /random, POST /quotes, DELETE /quotes/:id
// ======================================================

import "dotenv/config";
import express from "express";
import cors    from "cors";
import morgan  from "morgan";
import pg      from "pg";

const { Pool } = pg;
const app  = express();
const PORT = process.env.PORT || 3000;


// =========================
// DB CONNECTION
// =========================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // required for Railway
});

// Create table if it doesn't exist
await pool.query(`
    CREATE TABLE IF NOT EXISTS quotes (
        id         SERIAL PRIMARY KEY,
        quote      TEXT        NOT NULL,
        author     TEXT        NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    )
`);

console.log("✅ Database ready");


// =========================
// MIDDLEWARE
// =========================

app.use(cors({
    origin: ["https://quotes-two-beta.vercel.app", "http://localhost:5173"],
}));
app.use(express.json());
app.use(morgan("dev"));


// =========================
// ROUTES
// =========================

// Health check
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Quote API is running",
        endpoints: {
            getAllQuotes:    "GET    /quotes",
            getRandomQuote: "GET    /random",
            createQuote:    "POST   /quotes",
            deleteQuote:    "DELETE /quotes/:id",
        },
    });
});

// Get all quotes
app.get("/quotes", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM quotes ORDER BY created_at DESC");
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve quotes", message: err.message });
    }
});

// Get a random quote
app.get("/random", async (req, res) => {
    try {
        const { rows } = await pool.query("SELECT * FROM quotes ORDER BY RANDOM() LIMIT 1");
        if (!rows.length) return res.status(404).json({ error: "No quotes found" });
        res.status(200).json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve random quote", message: err.message });
    }
});

// Create a new quote
app.post("/quotes", async (req, res) => {
    try {
        const { quote, author } = req.body;

        if (!quote || !author) {
            return res.status(400).json({
                error: "Validation error",
                message: "Both 'quote' and 'author' are required",
            });
        }

        const { rows } = await pool.query(
            "INSERT INTO quotes (quote, author) VALUES ($1, $2) RETURNING *",
            [quote, author]
        );

        res.status(201).json({ message: "Quote created successfully", data: rows[0] });
    } catch (err) {
        res.status(500).json({ error: "Failed to create quote", message: err.message });
    }
});

// Delete a quote by ID
app.delete("/quotes/:id", async (req, res) => {
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM quotes WHERE id = $1",
            [req.params.id]
        );

        if (rowCount === 0) {
            return res.status(404).json({ error: "Quote not found" });
        }

        res.status(200).json({ message: "Quote deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete quote", message: err.message });
    }
});


// =========================
// START
// =========================

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});