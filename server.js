// ======================================================
// server.js — Quote API
// Express + MongoDB (Mongoose)
// Routes: GET /quotes, POST /quotes, DELETE /quotes/:id
// ======================================================

import "dotenv/config";
import express  from "express";
import cors     from "cors";
import morgan   from "morgan";
import mongoose from "mongoose";

const app  = express();
const PORT = process.env.PORT || 3000;

// =========================
// MIDDLEWARE
// =========================

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));


// =========================
// SCHEMA + MODEL
// =========================

const quoteSchema = new mongoose.Schema(
    {
        quote:  { type: String, required: true, trim: true },
        author: { type: String, required: true, trim: true },
    },
    { timestamps: true }
);

const Quote = mongoose.model("Quote", quoteSchema);


// =========================
// ROUTES
// =========================

// Health check
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        message: "Quote API is running",
        endpoints: {
            getAllQuotes:   "GET    /quotes",
            getRandomQuote:"GET    /random",
            createQuote:   "POST   /quotes",
            deleteQuote:   "DELETE /quotes/:id",
        },
    });
});

// Get all quotes
app.get("/quotes", async (req, res) => {
    try {
        const quotes = await Quote.find();
        res.status(200).json(quotes);
    } catch (err) {
        res.status(500).json({ error: "Failed to retrieve quotes", message: err.message });
    }
});

// Get a random quote (memory-efficient: uses countDocuments + skip)
app.get("/random", async (req, res) => {
    try {
        const count = await Quote.countDocuments();
        if (count === 0) return res.status(404).json({ error: "No quotes found" });

        const random = await Quote.findOne().skip(Math.floor(Math.random() * count));
        res.status(200).json(random);
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

        const newQuote = new Quote({ quote, author });
        await newQuote.save();

        res.status(201).json({ message: "Quote created successfully", data: newQuote });
    } catch (err) {
        res.status(500).json({ error: "Failed to create quote", message: err.message });
    }
});

// Delete a quote by ID
app.delete("/quotes/:id", async (req, res) => {
    try {
        const deleted = await Quote.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ error: "Quote not found" });
        }

        res.status(200).json({ message: "Quote deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete quote", message: err.message });
    }
});


// =========================
// START — DB first, then server
// =========================

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ Database connection established");
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1);
    });