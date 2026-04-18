const API = ''; 
let user = JSON.parse(localStorage.getItem('user'));

if (user) showDashboard();

function showError(msg) {
    const errDiv = document.getElementById('auth-error');
    if(errDiv) errDiv.innerText = msg;
    else alert(msg);
}

// --- AUTH ---
async function register() {
    try {
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        const res = await fetch(`${API}/api/auth/register`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        
        if (data.success) {
            alert("Registered successfully! Logging you in...");
            user = data.user;
            localStorage.setItem('user', JSON.stringify(user));
            showDashboard();
        } else showError(data.error);
    } catch (e) {
        showError("Network error. Is the server running?");
    }
}

async function login() {
    try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
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
    } catch (e) {
        showError("Network error. Is the server running?");
    }
}

function logout() {
    localStorage.removeItem('user');
    user = null;
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
}

// --- UI ROUTING ---
function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('username-display').innerText = user.name;
    switchTab('market');
}

function switchTab(tab) {
    document.getElementById('tab-market').style.display = tab === 'market' ? 'block' : 'none';
    document.getElementById('tab-my-gigs').style.display = tab === 'my-gigs' ? 'block' : 'none';
    if(tab === 'market') loadMarket();
    if(tab === 'my-gigs') loadMyGigs();
}

// --- MARKETPLACE ---
async function postGig() {
    try {
        const title = document.getElementById('gig-title').value;
        const description = document.getElementById('gig-desc').value;
        const base_budget = document.getElementById('gig-budget').value;
        
        if(!title || !base_budget) return alert("Title and budget are required!");

        const res = await fetch(`${API}/api/gigs`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ client_id: user.id, title, description, base_budget })
        });
        const data = await res.json();
        if(data.success) {
            alert("Gig Posted!");
            loadMarket();
        } else alert(data.error);
    } catch (e) { alert("Error posting gig"); }
}

async function loadMarket() {
    try {
        const res = await fetch(`${API}/api/gigs`);
        const gigs = await res.json();
        
        const container = document.getElementById('market-container');
        if(gigs.length === 0) return container.innerHTML = "<p>No open gigs available.</p>";

        container.innerHTML = gigs.map(g => `
            <div class="gig-card">
                <h3>${g.title} (by ${g.client_name})</h3>
                <p>${g.description}</p>
                <div class="price-stats">
                    Base Budget: ₹${g.base_budget} | 
                    Total Bids: ${g.total_bids} | 
                    <span style="color: green;">Current Market Price: ₹${parseFloat(g.dynamic_market_price).toFixed(2)}</span>
                </div>
                <div style="margin-top: 10px;">
                    <input type="number" id="bid-amount-${g.gig_id}" placeholder="Your Bid (₹)">
                    <button onclick="placeBid(${g.gig_id})">Place Bid</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Failed to load market"); }
}

async function placeBid(gig_id) {
    try {
        const amount = document.getElementById(`bid-amount-${gig_id}`).value;
        if(!amount) return alert("Enter an amount!");

        const res = await fetch(`${API}/api/bids`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gig_id, freelancer_id: user.id, amount })
        });
        const data = await res.json();
        
        if(data.success) {
            alert("Bid Placed successfully!");
            loadMarket();
        } else {
            alert(data.error); // Will trigger if you bid on your own gig
        }
    } catch (e) { alert("Error placing bid"); }
}

// --- MY GIGS (NEW) ---
async function loadMyGigs() {
    try {
        const res = await fetch(`${API}/api/gigs/my/${user.id}`);
        const gigs = await res.json();
        
        const container = document.getElementById('my-gigs-container');
        if(gigs.length === 0) return container.innerHTML = "<p>You haven't posted any gigs.</p>";

        container.innerHTML = '';
        for (let g of gigs) {
            // Fetch bids for this specific gig
            const bidsRes = await fetch(`${API}/api/bids/${g.id}`);
            const bids = await bidsRes.json();
            
            let bidsHTML = bids.length === 0 ? '<p>No bids yet.</p>' : bids.map(b => `
                <li style="margin-bottom: 5px;">
                    <strong>${b.freelancer_name}</strong> bid ₹${b.amount} 
                    ${g.status === 'open' ? `<button onclick="acceptBid(${g.id})" style="background:green; padding:2px 5px;">Accept</button>` : ''}
                </li>
            `).join('');

            container.innerHTML += `
                <div class="gig-card" style="border-color: ${g.status === 'open' ? '#0056b3' : '#777'}">
                    <h3>${g.title} <span style="font-size: 12px; color: ${g.status === 'open' ? 'green' : 'red'};">(${g.status.toUpperCase()})</span></h3>
                    <p>Base Budget: ₹${g.base_budget}</p>
                    <div style="background: #f9f9f9; padding: 10px; border-left: 3px solid #ccc;">
                        <h4>Received Bids:</h4>
                        <ul>${bidsHTML}</ul>
                    </div>
                </div>
            `;
        }
    } catch (e) { console.error("Failed to load your gigs"); }
}

async function acceptBid(gig_id) {
    if(!confirm("Are you sure you want to accept this bid? This will close the gig.")) return;
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
}