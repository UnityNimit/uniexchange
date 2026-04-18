const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Robust Database Connection Pool (Added SSL for free cloud databases)
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Crucial for TiDB / Aiven free tiers!
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test DB Connection on startup
pool.getConnection()
    .then(conn => {
        console.log("✅ Database Connected Successfully!");
        conn.release();
    })
    .catch(err => console.error("❌ Database Connection Failed:", err.message));

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if(!name || !email || !password) return res.status(400).json({ error: "All fields required" });

        const [result] = await pool.query('INSERT INTO Users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
        res.json({ success: true, user: { id: result.insertId, name } });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Registration failed. Email might already exist." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM Users WHERE email = ? AND password = ?', [email, password]);
        
        if (users.length > 0) {
            res.json({ success: true, user: { id: users[0].id, name: users[0].name } });
        } else {
            res.status(401).json({ error: "Invalid email or password." });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error during login." });
    }
});

// --- GIGS & BIDS ---
// Create Gig
app.post('/api/gigs', async (req, res) => {
    try {
        const { client_id, title, description, base_budget } = req.body;
        await pool.query('INSERT INTO Gigs (client_id, title, description, base_budget) VALUES (?, ?, ?, ?)', [client_id, title, description, base_budget]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to post gig." });
    }
});

// Get all open gigs (Marketplace)
app.get('/api/gigs', async (req, res) => {
    try {
        const [gigs] = await pool.query('SELECT * FROM GigMarketStats WHERE status = "open" ORDER BY gig_id DESC');
        res.json(gigs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch market." });
    }
});

// Get MY gigs
app.get('/api/gigs/my/:userId', async (req, res) => {
    try {
        const [gigs] = await pool.query('SELECT * FROM Gigs WHERE client_id = ? ORDER BY created_at DESC', [req.params.userId]);
        res.json(gigs);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch your gigs." });
    }
});

// Get bids for a specific gig
app.get('/api/bids/:gigId', async (req, res) => {
    try {
        const [bids] = await pool.query(`
            SELECT b.id, b.amount, u.name as freelancer_name 
            FROM Bids b JOIN Users u ON b.freelancer_id = u.id 
            WHERE b.gig_id = ? ORDER BY b.amount ASC
        `, [req.params.gigId]);
        res.json(bids);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch bids." });
    }
});

// Place a Bid
app.post('/api/bids', async (req, res) => {
    try {
        const { gig_id, freelancer_id, amount } = req.body;
        // Check if user is trying to bid on their own gig
        const[gig] = await pool.query('SELECT client_id FROM Gigs WHERE id = ?', [gig_id]);
        if (gig[0].client_id === freelancer_id) return res.status(400).json({ error: "You cannot bid on your own gig!" });

        await pool.query('INSERT INTO Bids (gig_id, freelancer_id, amount) VALUES (?, ?, ?)',[gig_id, freelancer_id, amount]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to place bid." });
    }
});

// Accept a Bid (Close the gig)
app.post('/api/gigs/accept', async (req, res) => {
    try {
        const { gig_id } = req.body;
        await pool.query('UPDATE Gigs SET status = "closed" WHERE id = ?', [gig_id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to accept bid." });
    }
});

// Serve frontend for any unknown routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));