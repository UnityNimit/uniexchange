const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../frontend')));

const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- AUTHENTICATION & WALLET INIT ---
app.post('/api/auth/register', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { first_name, last_name, email, password, college_id, dob } = req.body;
        await conn.beginTransaction();
        
        const [userRes] = await conn.query(
            'INSERT INTO Platform_Users (role_id, first_name, last_name, email, password_hash, college_id, dob) VALUES (2, ?, ?, ?, ?, ?, ?)',[first_name, last_name, email, password, college_id, dob || null]
        );
        const userId = userRes.insertId;

        await conn.query('INSERT INTO User_wallets (user_id, balance) VALUES (?, 0.00)', [userId]);
        await conn.commit();
        
        res.json({ success: true, user: { id: userId, name: `${first_name} ${last_name}`, email } });
    } catch (err) {
        await conn.rollback();
        res.status(400).json({ error: "Registration failed. Email or College ID might already exist." });
    } finally { conn.release(); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const[users] = await pool.query(`
            SELECT u.user_id, u.first_name, u.last_name, u.email, w.balance 
            FROM Platform_Users u JOIN User_wallets w ON u.user_id = w.user_id 
            WHERE u.email = ? AND u.password_hash = ?
        `, [email, password]);
        
        if (users.length > 0) {
            const u = users[0];
            res.json({ success: true, user: { id: u.user_id, name: `${u.first_name} ${u.last_name}`, email: u.email, balance: u.balance } });
        } else res.status(401).json({ error: "Invalid credentials." });
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});

app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        const [users] = await pool.query('SELECT * FROM Platform_Users WHERE user_id = ? AND password_hash = ?', [userId, oldPassword]);
        if (users.length === 0) return res.status(401).json({ error: "Incorrect old password." });

        await pool.query('UPDATE Platform_Users SET password_hash = ? WHERE user_id = ?', [newPassword, userId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to change password." }); }
});

// --- WALLET TOP-UP ---
app.post('/api/wallet/topup', async (req, res) => {
    try {
        const { user_id, amount } = req.body;
        await pool.query('UPDATE User_wallets SET balance = balance + ? WHERE user_id = ?',[amount, user_id]);
        const [wallet] = await pool.query('SELECT balance FROM User_wallets WHERE user_id = ?',[user_id]);
        res.json({ success: true, balance: wallet[0].balance });
    } catch (err) { res.status(500).json({ error: "Top-up failed." }); }
});

// --- CATEGORIES & GIGS ---
app.get('/api/categories', async (req, res) => {
    try {
        const [cats] = await pool.query('SELECT * FROM Project_categories ORDER BY category_name ASC');
        res.json(cats);
    } catch (err) { res.status(500).json({ error: "Failed to load categories." }); }
});

app.post('/api/gigs', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { client_id, category_id, title, description, budget, deadline } = req.body;
        await conn.beginTransaction();
        
        const [result] = await conn.query(
            'INSERT INTO Projects (client_id, category_id, title, description, budget, deadline) VALUES (?, ?, ?, ?, ?, ?)',[client_id, category_id, title, description, budget, deadline]
        );
        const projectId = result.insertId;

        await conn.query(
            'INSERT INTO Project_status_info (project_id, project_status, payment_status) VALUES (?, ?, ?)',[projectId, 'Open for Bidding', 'Unpaid']
        );

        await conn.commit();
        res.json({ success: true });
    } catch (err) { 
        await conn.rollback();
        res.status(500).json({ error: "Failed to post project." }); 
    } finally { conn.release(); }
});

// Advanced Search + Dynamic Pricing (Rewritten to support TiDB without FULLTEXT)
app.get('/api/gigs', async (req, res) => {
    try {
        const searchQuery = req.query.q;
        let query = `
            SELECT p.project_id, p.title, p.description, p.budget, p.deadline, 
                   u.first_name, u.last_name, dmp.current_market_value, dmp.total_proposals
            FROM Projects p
            JOIN Platform_Users u ON p.client_id = u.user_id
            JOIN DynamicMarketPricing dmp ON p.project_id = dmp.project_id
            WHERE p.status = 'open'
        `;
        let params =[];

        if (searchQuery) {
            // Using standard LIKE for bulletproof compatibility
            query += ` AND (p.title LIKE ? OR p.description LIKE ?)`;
            params.push(`%${searchQuery}%`, `%${searchQuery}%`);
        }
        
        query += ` ORDER BY p.created_at DESC`;
        const [gigs] = await pool.query(query, params);
        res.json(gigs);
    } catch (err) { res.status(500).json({ error: "Failed to fetch market." }); }
});

app.get('/api/gigs/my/:userId', async (req, res) => {
    try {
        const [gigs] = await pool.query('SELECT * FROM Projects WHERE client_id = ? ORDER BY created_at DESC',[req.params.userId]);
        res.json(gigs);
    } catch (err) { res.status(500).json({ error: "Failed to fetch your projects." }); }
});

// --- PROPOSALS (BIDS) & ESCROW ---
app.get('/api/bids/:projectId', async (req, res) => {
    try {
        const[bids] = await pool.query(`
            SELECT prop.proposal_id, prop.proposal_amount, u.user_id as freelancer_id, u.first_name, u.last_name 
            FROM Proposals prop JOIN Platform_Users u ON prop.freelancer_id = u.user_id 
            WHERE prop.project_id = ? ORDER BY prop.proposal_amount ASC
        `, [req.params.projectId]);
        res.json(bids);
    } catch (err) { res.status(500).json({ error: "Failed to fetch proposals." }); }
});

app.post('/api/bids', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { project_id, freelancer_id, amount } = req.body;
        await conn.beginTransaction();

        const[gig] = await conn.query('SELECT client_id, deadline FROM Projects WHERE project_id = ? FOR UPDATE',[project_id]);
        if (gig.length === 0) throw new Error("Project not found.");
        if (gig[0].client_id === freelancer_id) throw new Error("You cannot bid on your own project.");

        // Anti-Sniper Logic
        const deadline = new Date(gig[0].deadline);
        const now = new Date();
        const diffMins = (deadline - now) / 1000 / 60;
        if (diffMins > 0 && diffMins < 30) {
            await conn.query('UPDATE Projects SET deadline = DATE_ADD(deadline, INTERVAL 1 HOUR) WHERE project_id = ?', [project_id]);
        }

        await conn.query('INSERT INTO Proposals (project_id, freelancer_id, proposal_amount) VALUES (?, ?, ?)',[project_id, freelancer_id, amount]);
        await conn.commit();
        res.json({ success: true });
    } catch (err) { 
        await conn.rollback();
        res.status(400).json({ error: err.message || "Failed to place bid." }); 
    } finally { conn.release(); }
});

app.post('/api/gigs/accept', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { project_id, proposal_id, client_id, freelancer_id, amount } = req.body;
        await conn.beginTransaction();

        // 1. Verify Balance
        const [wallet] = await conn.query('SELECT wallet_id, balance FROM User_wallets WHERE user_id = ? FOR UPDATE', [client_id]);
        const clientWallet = wallet[0];
        if (clientWallet.balance < amount) throw new Error("Insufficient wallet balance for escrow.");

        // 2. Move Funds
        await conn.query('UPDATE User_wallets SET balance = balance - ? WHERE wallet_id = ?', [amount, clientWallet.wallet_id]);
        await conn.query('UPDATE Platform_wallet SET balance = balance + ? WHERE wallet_id = 1',[amount]);

        // 3. Log Transaction & Contract
        await conn.query('INSERT INTO Wallet_transactions (wallet_id, platform_wallet_id, transaction_type, amount) VALUES (?, 1, ?, ?)',[clientWallet.wallet_id, 'escrow_hold', amount]);
        await conn.query('INSERT INTO Contracts (project_id, proposal_id, client_id, freelancer_id, contract_amount, escrow_status) VALUES (?, ?, ?, ?, ?, ?)',[project_id, proposal_id, client_id, freelancer_id, amount, 'held']);

        // 4. Update Statuses
        await conn.query('UPDATE Projects SET status = "in_progress" WHERE project_id = ?', [project_id]);
        await conn.query('UPDATE Project_status_info SET project_status = "In Progress", payment_status = "In Escrow" WHERE project_id = ?', [project_id]);
        await conn.query('UPDATE Proposals SET status = "accepted" WHERE proposal_id = ?', [proposal_id]);
        await conn.query('UPDATE Proposals SET status = "rejected" WHERE project_id = ? AND proposal_id != ?',[project_id, proposal_id]);

        await conn.commit();
        res.json({ success: true, newBalance: clientWallet.balance - amount });
    } catch (err) { 
        await conn.rollback();
        res.status(400).json({ error: err.message || "Escrow transaction failed. Check balance." }); 
    } finally { conn.release(); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));