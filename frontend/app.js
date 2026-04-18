const API = ''; // Empty means it will use the current host (works for local and Render)
let user = JSON.parse(localStorage.getItem('user'));

if (user) showDashboard();

async function register() {
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const res = await fetch(`${API}/api/auth/register`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.success) alert("Registered! You can now login.");
    else alert(data.error);
}

async function login() {
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
    } else alert(data.error);
}

function logout() {
    localStorage.removeItem('user');
    user = null;
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
}

function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    document.getElementById('user-info').style.display = 'block';
    document.getElementById('username-display').innerText = user.name;
    loadGigs();
}

async function postGig() {
    const title = document.getElementById('gig-title').value;
    const description = document.getElementById('gig-desc').value;
    const base_budget = document.getElementById('gig-budget').value;
    
    await fetch(`${API}/api/gigs`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ client_id: user.id, title, description, base_budget })
    });
    alert("Gig Posted!");
    loadGigs();
}

async function loadGigs() {
    const res = await fetch(`${API}/api/gigs`);
    const gigs = await res.json();
    
    const container = document.getElementById('gigs-container');
    container.innerHTML = gigs.map(g => `
        <div class="gig-card">
            <h3>${g.title} (by ${g.client_name})</h3>
            <p>${g.description}</p>
            <div class="price-stats">
                Base Budget: ₹${g.base_budget} | 
                Total Bids: ${g.total_bids} | 
                <span style="color: green;">Current Market Price: ₹${parseFloat(g.dynamic_market_price).toFixed(2)}</span>
            </div>
            <input type="number" id="bid-amount-${g.gig_id}" placeholder="Your Bid (₹)">
            <button onclick="placeBid(${g.gig_id})">Place Bid</button>
        </div>
    `).join('');
}

async function placeBid(gig_id) {
    const amount = document.getElementById(`bid-amount-${gig_id}`).value;
    if(!amount) return alert("Enter an amount!");

    await fetch(`${API}/api/bids`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ gig_id, freelancer_id: user.id, amount })
    });
    alert("Bid Placed!");
    loadGigs(); // Refresh to see the market price fluctuate!
}