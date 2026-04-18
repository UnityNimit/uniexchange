const API = ''; 
let user = JSON.parse(localStorage.getItem('user'));

if (user) showDashboard();

// --- UI HELPERS ---
function showLoader(text = "Processing...") {
    document.getElementById('loader-text').innerText = text;
    document.getElementById('loader').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader').style.display = 'none';
}

function showError(msg) {
    const errDiv = document.getElementById('auth-error');
    if(errDiv) errDiv.innerText = msg;
    else alert(msg);
}

// --- AUTH ---
async function register() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    showLoader("Registering account...");
    try {
        const res = await fetch(`${API}/api/auth/register`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if (data.success) {
            alert("Registered successfully!");
            user = data.user;
            localStorage.setItem('user', JSON.stringify(user));
            showDashboard();
        } else showError(data.error);
    } catch (e) { showError("Network error. Is the server running?"); }
    hideLoader();
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    showLoader("Logging in...");
    try {
        const res = await fetch(`${API}/api/auth/login`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (data.success) {
            user = data.user;
            localStorage.setItem('user', JSON.stringify(user));
            showDashboard();
        } else showError(data.error);
    } catch (e) { showError("Network error."); }
    hideLoader();
}

function logout() {
    localStorage.removeItem('user');
    user = null;
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
}

// --- NAVIGATION ---
function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('username-display').innerText = user.name;
    switchTab('market');
}

function switchTab(tab) {
    // Hide all tabs
    document.getElementById('tab-market').style.display = 'none';
    document.getElementById('tab-my-gigs').style.display = 'none';
    document.getElementById('tab-profile').style.display = 'none';
    
    // Reset buttons
    document.getElementById('btn-market').classList.remove('active');
    document.getElementById('btn-my-gigs').classList.remove('active');
    document.getElementById('btn-profile').classList.remove('active');

    // Show active tab
    document.getElementById(`tab-${tab}`).style.display = 'block';
    document.getElementById(`btn-${tab}`).classList.add('active');

    // Load Data
    if(tab === 'market') loadMarket();
    if(tab === 'my-gigs') loadMyGigs();
    if(tab === 'profile') loadProfile();
}

// --- MARKETPLACE ---
async function postGig() {
    const title = document.getElementById('gig-title').value;
    const description = document.getElementById('gig-desc').value;
    const base_budget = document.getElementById('gig-budget').value;
    
    if(!title || !base_budget) return alert("Title and budget are required!");

    showLoader("Posting your gig...");
    try {
        const res = await fetch(`${API}/api/gigs`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ client_id: user.id, title, description, base_budget })
        });
        const data = await res.json();
        if(data.success) {
            alert("Gig Posted!");
            // Clear inputs
            document.getElementById('gig-title').value = '';
            document.getElementById('gig-desc').value = '';
            document.getElementById('gig-budget').value = '';
            loadMarket();
        } else alert(data.error);
    } catch (e) { alert("Error posting gig"); }
    hideLoader();
}

async function loadMarket() {
    showLoader("Loading market data...");
    try {
        const res = await fetch(`${API}/api/gigs`);
        const gigs = await res.json();
        
        const container = document.getElementById('market-container');
        if(gigs.length === 0) {
            container.innerHTML = "<p>No open gigs available.</p>";
            return hideLoader();
        }

        container.innerHTML = gigs.map(g => `
            <div class="gig-card">
                <h3>${g.title} (by ${g.client_name})</h3>
                <p>${g.description}</p>
                <div class="price-stats">
                    Base Budget: ₹${g.base_budget} | 
                    Total Bids: ${g.total_bids} | 
                    <span style="color: green;">Current Market Price: ₹${parseFloat(g.dynamic_market_price).toFixed(2)}</span>
                </div>
                <div style="margin-top: 10px; display: flex; gap: 5px;">
                    <input type="number" id="bid-amount-${g.gig_id}" placeholder="Your Bid (₹)" style="margin: 0; width: 150px;">
                    <button onclick="placeBid(${g.gig_id})" style="margin: 0;">Place Bid</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Failed to load market"); }
    hideLoader();
}

async function placeBid(gig_id) {
    const amount = document.getElementById(`bid-amount-${gig_id}`).value;
    if(!amount) return alert("Enter an amount!");

    showLoader("Placing bid...");
    try {
        const res = await fetch(`${API}/api/bids`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gig_id, freelancer_id: user.id, amount })
        });
        const data = await res.json();
        
        if(data.success) {
            alert("Bid Placed successfully!");
            loadMarket();
        } else alert(data.error);
    } catch (e) { alert("Error placing bid"); }
    hideLoader();
}

// --- MY GIGS ---
async function loadMyGigs() {
    showLoader("Fetching your gigs...");
    try {
        const res = await fetch(`${API}/api/gigs/my/${user.id}`);
        const gigs = await res.json();
        
        const container = document.getElementById('my-gigs-container');
        if(gigs.length === 0) {
            container.innerHTML = "<p>You haven't posted any gigs.</p>";
            return hideLoader();
        }

        container.innerHTML = '';
        for (let g of gigs) {
            const bidsRes = await fetch(`${API}/api/bids/${g.id}`);
            const bids = await bidsRes.json();
            
            let bidsHTML = bids.length === 0 ? '<p>No bids yet.</p>' : bids.map(b => `
                <li style="margin-bottom: 5px;">
                    <strong>${b.freelancer_name}</strong> bid ₹${b.amount} 
                    ${g.status === 'open' ? `<button onclick="acceptBid(${g.id})" style="background:green; padding:2px 8px; margin-left: 10px;">Accept</button>` : ''}
                </li>
            `).join('');

            container.innerHTML += `
                <div class="gig-card" style="border-color: ${g.status === 'open' ? '#0056b3' : '#777'}">
                    <h3>${g.title} <span style="font-size: 12px; color: ${g.status === 'open' ? 'green' : 'red'};">(${g.status.toUpperCase()})</span></h3>
                    <p>Base Budget: ₹${g.base_budget}</p>
                    <div style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc;">
                        <h4 style="margin-top:0;">Received Bids:</h4>
                        <ul style="margin-bottom:0;">${bidsHTML}</ul>
                    </div>
                </div>
            `;
        }
    } catch (e) { console.error("Failed to load your gigs"); }
    hideLoader();
}

async function acceptBid(gig_id) {
    if(!confirm("Are you sure you want to accept this bid? This will close the gig.")) return;
    
    showLoader("Accepting bid...");
    try {
        const res = await fetch(`${API}/api/gigs/accept`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gig_id })
        });
        const data = await res.json();
        if(data.success) {
            alert("Bid Accepted! Gig is now closed.");
            loadMyGigs();
        }
    } catch (e) { alert("Error accepting bid"); }
    hideLoader();
}

// --- PROFILE ---
function loadProfile() {
    document.getElementById('profile-name').innerText = user.name || "Unknown";
    document.getElementById('profile-email').innerText = user.email || "Unknown";
}

async function changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;

    if(!oldPassword || !newPassword) return alert("Please fill both password fields.");

    showLoader("Updating password...");
    try {
        const res = await fetch(`${API}/api/auth/change-password`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: user.id, oldPassword, newPassword })
        });
        const data = await res.json();
        
        if(data.success) {
            alert("Password updated successfully!");
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
        } else {
            alert(data.error);
        }
    } catch (e) { alert("Error updating password."); }
    hideLoader();
}