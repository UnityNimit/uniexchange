const API = ''; 
let user = JSON.parse(localStorage.getItem('user'));
let progressInterval = null; 

function showLoader(text = "Processing") {
    document.getElementById('loader-text').innerText = text;
    document.getElementById('loader').classList.replace('hidden', 'flex');
}
function hideLoader() { document.getElementById('loader').classList.replace('flex', 'hidden'); }

function showError(msg) {
    const errDiv = document.getElementById('auth-error');
    if(errDiv) { errDiv.innerText = msg; errDiv.classList.remove('hidden'); } else alert(msg);
}

function toggleAuth() {
    document.getElementById('auth-error').classList.add('hidden');
    const l = document.getElementById('login-fields'), r = document.getElementById('register-fields');
    l.classList.toggle('hidden'); r.classList.toggle('hidden');
}

function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('top-nav').classList.replace('hidden', 'flex');
    switchTab('market');
}

function switchTab(tab) {
    if(progressInterval) clearInterval(progressInterval);['tab-market', 'tab-my-gigs', 'tab-profile'].forEach(id => document.getElementById(id).classList.add('hidden'));['btn-market', 'btn-my-gigs', 'btn-profile'].forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.remove('border-zinc-900', 'text-zinc-900');
        btn.classList.add('border-transparent', 'text-zinc-500');
    });

    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.getElementById(`btn-${tab}`).classList.replace('border-transparent', 'border-zinc-900');
    document.getElementById(`btn-${tab}`).classList.replace('text-zinc-500', 'text-zinc-900');

    if(tab === 'market') loadMarket();
    if(tab === 'my-gigs') { fetchCategories(); loadMyGigs(); }
    if(tab === 'profile') loadProfile();
}

function formatDate(dateString) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString));
}

async function showPublicProfile(userId) {
    document.getElementById('public-profile-modal').classList.replace('hidden', 'flex');
    try {
        const res = await fetch(`${API}/api/profile/stats/${userId}`);
        const data = await res.json();
        
        document.getElementById('pub-name').innerText = `${data.firstName} ${data.lastName} (@${data.username})`;
        document.getElementById('pub-date').innerText = new Date(data.memberSince).getFullYear();
        document.getElementById('pub-f-rating').innerText = data.freelancerRating;
        document.getElementById('pub-c-rating').innerText = data.clientRating;
        document.getElementById('pub-posted').innerText = data.gigsPosted;
        document.getElementById('pub-paid').innerText = `₹${data.totalGiven}`;
        document.getElementById('pub-earned').innerText = `₹${data.totalEarned}`;

        const imgEl = document.getElementById('pub-pfp');
        const initEl = document.getElementById('pub-initials');
        if (data.pfp && data.pfp.length > 10) {
            imgEl.src = data.pfp; imgEl.classList.remove('hidden'); initEl.classList.add('hidden');
        } else {
            initEl.innerText = data.firstName[0] + data.lastName[0];
            imgEl.classList.add('hidden'); initEl.classList.remove('hidden');
        }
    } catch(e) { console.error(e); }
}

function closePublicProfile() { document.getElementById('public-profile-modal').classList.replace('flex', 'hidden'); }

// Verify Session Integrity on Load
async function validateSession() {
    if (!user) return;
    try {
        const res = await fetch(`${API}/api/auth/verify/${user.id}`);
        const data = await res.json();
        if (!data.valid) {
            alert("Database was reset or account no longer exists. Logging out.");
            logout();
        } else {
            showDashboard();
        }
    } catch (e) { showDashboard(); }
}

window.onload = () => { validateSession(); };