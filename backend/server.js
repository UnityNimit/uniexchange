const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));

const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- AUTHENTICATION ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const { first_name, last_name, email, password, college_id, dob } = req.body;
        const [userRes] = await pool.query(
            'INSERT INTO Platform_Users (role_id, first_name, last_name, email, password_hash, college_id, dob) VALUES (2, ?, ?, ?, ?, ?, ?)',[first_name, last_name, email, password, college_id, dob || null]
        );
        res.json({ success: true, user: { id: userRes.insertId, name: `${first_name} ${last_name}`, email, profile_pic_url: null } });
    } catch (err) { res.status(400).json({ error: "Registration failed. Email or College ID might exist." }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM Platform_Users WHERE email = ? AND password_hash = ?', [email, password]);
        if (users.length > 0) {
            const u = users[0];
            res.json({ success: true, user: { id: u.user_id, name: `${u.first_name} ${u.last_name}`, email: u.email, profile_pic_url: u.profile_pic_url } });
        } else res.status(401).json({ error: "Invalid credentials." });
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});

app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        const[users] = await pool.query('SELECT * FROM Platform_Users WHERE user_id = ? AND password_hash = ?', [userId, oldPassword]);
        if (users.length === 0) return res.status(401).json({ error: "Incorrect old password." });
        await pool.query('UPDATE Platform_Users SET password_hash = ? WHERE user_id = ?',[newPassword, userId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Failed to change password." }); }
});

// --- PROFILE & TWO-WAY STATS ---
app.post('/api/profile/pfp', async (req, res) => {
    try {
        const { userId, url } = req.body;
        await pool.query('UPDATE Platform_Users SET profile_pic_url = ? WHERE user_id = ?',[url, userId]);
        res.json({ success: true, url });
    } catch (err) { res.status(500).json({ error: "Failed to update profile picture." }); }
});

app.get('/api/profile/stats/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const[user] = await pool.query('SELECT first_name, last_name, profile_pic_url, created_at FROM Platform_Users WHERE user_id = ?',[userId]);
        if (user.length === 0) return res.status(404).json({ error: "User not found" });

        // Two-way rating queries
        const [fReviews] = await pool.query('SELECT AVG(r.rating) as avg_rating FROM Reviews r JOIN Contracts c ON r.contract_id = c.contract_id WHERE r.reviewee_id = ? AND c.freelancer_id = ?', [userId, userId]);
        const[cReviews] = await pool.query('SELECT AVG(r.rating) as avg_rating FROM Reviews r JOIN Contracts c ON r.contract_id = c.contract_id WHERE r.reviewee_id = ? AND c.client_id = ?', [userId, userId]);
        
        const [gigs] = await pool.query('SELECT COUNT(*) as total_posted FROM Projects WHERE client_id = ?',[userId]);
        const [earned] = await pool.query(`SELECT SUM(c.contract_amount) as total_earned FROM Contracts c JOIN Projects p ON c.project_id = p.project_id WHERE c.freelancer_id = ? AND p.status = 'completed'`, [userId]);
        const [given] = await pool.query(`SELECT SUM(c.contract_amount) as total_given, AVG(c.contract_amount) as avg_given FROM Contracts c JOIN Projects p ON c.project_id = p.project_id WHERE c.client_id = ? AND p.status = 'completed'`, [userId]);

        res.json({
            firstName: user[0].first_name, lastName: user[0].last_name, pfp: user[0].profile_pic_url, memberSince: user[0].created_at,
            freelancerRating: fReviews[0].avg_rating ? parseFloat(fReviews[0].avg_rating).toFixed(1) : 'No ratings',
            clientRating: cReviews[0].avg_rating ? parseFloat(cReviews[0].avg_rating).toFixed(1) : 'No ratings',
            gigsPosted: gigs[0].total_posted || 0,
            totalEarned: earned[0].total_earned || 0,
            totalGiven: given[0].total_given || 0,
            avgGiven: given[0].avg_given ? parseFloat(given[0].avg_given).toFixed(2) : 0
        });
    } catch (err) { res.status(500).json({ error: "Failed to fetch stats." }); }
});

// --- CATEGORIES & GIGS ---
app.get('/api/categories', async (req, res) => {
    try {
        const[cats] = await pool.query('SELECT * FROM Project_categories ORDER BY category_name ASC');
        res.json(cats);
    } catch (err) { res.status(500).json({ error: "Failed to load categories." }); }
});

app.post('/api/gigs', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { client_id, category_id, title, description, budget, deadline } = req.body;
        await conn.beginTransaction();
        const [result] = await conn.query('INSERT INTO Projects (client_id, category_id, title, description, budget, deadline) VALUES (?, ?, ?, ?, ?, ?)',[client_id, category_id, title, description, budget, deadline]);
        await conn.query('INSERT INTO Project_status_info (project_id, project_status, payment_status) VALUES (?, ?, ?)',[result.insertId, 'Open for Bidding', 'Unpaid']);
        await conn.commit();
        res.json({ success: true });
    } catch (err) { 
        await conn.rollback(); res.status(500).json({ error: "Failed to post project." }); 
    } finally { conn.release(); }
});

app.get('/api/gigs', async (req, res) => {
    try {
        const searchQuery = req.query.q;
        let query = `
            SELECT p.project_id, p.title, p.description, p.budget, p.deadline, p.created_at,
                   u.user_id as client_id, u.first_name, u.last_name, u.profile_pic_url, 
                   dmp.current_market_value, dmp.total_proposals
            FROM Projects p
            JOIN Platform_Users u ON p.client_id = u.user_id
            JOIN DynamicMarketPricing dmp ON p.project_id = dmp.project_id
            WHERE p.status = 'open'
        `;
        let params =[];
        if (searchQuery) {
            query += ` AND (p.title LIKE ? OR p.description LIKE ?)`;
            params.push(`%${searchQuery}%`, `%${searchQuery}%`);
        }
        query += ` ORDER BY p.created_at DESC`;
        const [gigs] = await pool.query(query, params);
        res.json(gigs);
    } catch (err) { res.status(500).json({ error: "Failed to fetch market." }); }
});

// Client View: Gigs they posted
app.get('/api/gigs/my/:userId', async (req, res) => {
    try {
        const [gigs] = await pool.query(`
            SELECT p.*, c.contract_amount, c.contract_id, c.freelancer_id, u.first_name as f_first, u.last_name as f_last 
            FROM Projects p 
            LEFT JOIN Contracts c ON p.project_id = c.project_id
            LEFT JOIN Platform_Users u ON c.freelancer_id = u.user_id
            WHERE p.client_id = ? ORDER BY p.created_at DESC
        `,[req.params.userId]);
        res.json(gigs);
    } catch (err) { res.status(500).json({ error: "Failed to fetch your projects." }); }
});

// Freelancer View: Bids they placed & active work
app.get('/api/bids/my/:userId', async (req, res) => {
    try {
        const [bids] = await pool.query(`
            SELECT prop.proposal_id, prop.proposal_amount, prop.status as bid_status,
                   p.project_id, p.title, p.status as project_status, p.client_id, p.deadline,
                   u.first_name as client_first, u.last_name as client_last,
                   c.contract_id, c.contract_amount,
                   (SELECT COUNT(*) FROM Reviews r WHERE r.contract_id = c.contract_id AND r.reviewer_id = ?) as has_rated_client
            FROM Proposals prop
            JOIN Projects p ON prop.project_id = p.project_id
            JOIN Platform_Users u ON p.client_id = u.user_id
            LEFT JOIN Contracts c ON prop.proposal_id = c.proposal_id
            WHERE prop.freelancer_id = ?
            ORDER BY prop.created_at DESC
        `,[req.params.userId, req.params.userId]);
        res.json(bids);
    } catch (err) { res.status(500).json({ error: "Failed to fetch your bids." }); }
});

// --- PROPOSALS & CONTRACTS ---
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
    try {
        const { project_id, freelancer_id, amount } = req.body;
        const[gig] = await pool.query('SELECT client_id, deadline FROM Projects WHERE project_id = ?',[project_id]);
        if (gig.length === 0) throw new Error("Project not found.");
        if (gig[0].client_id === freelancer_id) throw new Error("You cannot bid on your own project.");

        const deadline = new Date(gig[0].deadline), now = new Date();
        if (((deadline - now) / 1000 / 60) > 0 && ((deadline - now) / 1000 / 60) < 30) {
            await pool.query('UPDATE Projects SET deadline = DATE_ADD(deadline, INTERVAL 1 HOUR) WHERE project_id = ?',[project_id]);
        }
        await pool.query('INSERT INTO Proposals (project_id, freelancer_id, proposal_amount) VALUES (?, ?, ?)',[project_id, freelancer_id, amount]);
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: err.message || "Failed to place bid." }); }
});

app.post('/api/gigs/accept', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { project_id, proposal_id, client_id, freelancer_id, amount } = req.body;
        await conn.beginTransaction();

        await conn.query('INSERT INTO Contracts (project_id, proposal_id, client_id, freelancer_id, contract_amount, escrow_status) VALUES (?, ?, ?, ?, ?, ?)',[project_id, proposal_id, client_id, freelancer_id, amount, 'pending']);
        await conn.query('UPDATE Projects SET status = "in_progress" WHERE project_id = ?',[project_id]);
        await conn.query('UPDATE Proposals SET status = "accepted" WHERE proposal_id = ?', [proposal_id]);
        await conn.query('UPDATE Proposals SET status = "rejected" WHERE project_id = ? AND proposal_id != ?',[project_id, proposal_id]);

        await conn.commit();
        res.json({ success: true });
    } catch (err) { 
        await conn.rollback(); res.status(400).json({ error: "Transaction failed." }); 
    } finally { conn.release(); }
});

app.post('/api/gigs/complete', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { project_id, client_id, contract_id, freelancer_id, rating } = req.body;
        await conn.beginTransaction();

        await conn.query('UPDATE Projects SET status = "completed" WHERE project_id = ?', [project_id]);
        await conn.query('UPDATE Contracts SET completed_at = CURRENT_TIMESTAMP WHERE contract_id = ?', [contract_id]);

        if (rating) {
            await conn.query('INSERT INTO Reviews (contract_id, reviewer_id, reviewee_id, rating) VALUES (?, ?, ?, ?)',[contract_id, client_id, freelancer_id, rating]);
        }
        await conn.commit();
        res.json({ success: true });
    } catch (err) { 
        await conn.rollback(); res.status(400).json({ error: "Failed to complete gig." }); 
    } finally { conn.release(); }
});

// Freelancer rating the Client
app.post('/api/gigs/rate', async (req, res) => {
    try {
        const { contract_id, reviewer_id, reviewee_id, rating } = req.body;
        await pool.query('INSERT INTO Reviews (contract_id, reviewer_id, reviewee_id, rating) VALUES (?, ?, ?, ?)',[contract_id, reviewer_id, reviewee_id, rating]);
        res.json({ success: true });
    } catch (err) { res.status(400).json({ error: "Failed to submit rating." }); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));