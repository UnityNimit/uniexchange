const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve the super simple frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Database Connection Pool (Use your free DB URL here)
const pool = mysql.createPool({
    uri: process.env.DATABASE_URL, // Example: mysql://user:pass@host:port/dbname
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const [result] = await pool.query('INSERT INTO Users (name, email, password) VALUES (?, ?, ?)', [name, email, password]);
        res.json({ success: true, userId: result.insertId, name });
    } catch (err) {
        res.status(400).json({ error: "Email might already exist." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const[users] = await pool.query('SELECT * FROM Users WHERE email = ? AND password = ?',[email, password]);
    if (users.length > 0) res.json({ success: true, user: { id: users[0].id, name: users[0].name } });
    else res.status(401).json({ error: "Invalid credentials." });
});

// --- GIGS & BIDS (The Core Functionality) ---
app.post('/api/gigs', async (req, res) => {
    const { client_id, title, description, base_budget } = req.body;
    await pool.query('INSERT INTO Gigs (client_id, title, description, base_budget) VALUES (?, ?, ?, ?)',[client_id, title, description, base_budget]);
    res.json({ success: true });
});

// Fetches gigs using the DBMS View (Dynamic Pricing)
app.get('/api/gigs', async (req, res) => {
    const [gigs] = await pool.query('SELECT * FROM GigMarketStats WHERE status = "open"');
    res.json(gigs);
});

app.post('/api/bids', async (req, res) => {
    const { gig_id, freelancer_id, amount } = req.body;
    await pool.query('INSERT INTO Bids (gig_id, freelancer_id, amount) VALUES (?, ?, ?)', [gig_id, freelancer_id, amount]);
    res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));