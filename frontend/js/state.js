// --- GLOBAL STATE ---
const API = ''; // Empty for relative path (works on Render)
let user = JSON.parse(localStorage.getItem('user'));

// --- LOADER & ERRORS ---
function showLoader(text = "Processing...") {
    document.getElementById('loader-text').innerText = text;
    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');
    loader.classList.add('flex');
}

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
    loader.classList.remove('flex');
}

function showError(msg) {
    const errDiv = document.getElementById('auth-error');
    if(errDiv) {
        errDiv.innerText = msg;
        errDiv.classList.remove('hidden');
    } else {
        alert(msg);
    }
}

// --- NAVIGATION LOGIC ---
function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    
    const userInfo = document.getElementById('user-info');
    userInfo.classList.remove('hidden');
    userInfo.classList.add('flex');
    
    document.getElementById('username-display').innerText = user.name;
    switchTab('market');
}

function switchTab(tab) {
    // Hide all tabs
    document.getElementById('tab-market').classList.add('hidden');
    document.getElementById('tab-my-gigs').classList.add('hidden');
    document.getElementById('tab-profile').classList.add('hidden');
    
    // Reset button styles
    const buttons =['btn-market', 'btn-my-gigs', 'btn-profile'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.remove('bg-brand', 'text-white');
        btn.classList.add('text-slate-600', 'hover:bg-slate-50');
    });

    // Show active tab
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`btn-${tab}`);
    activeBtn.classList.remove('text-slate-600', 'hover:bg-slate-50');
    activeBtn.classList.add('bg-brand', 'text-white');

    // Load Data
    if(tab === 'market') loadMarket();
    if(tab === 'my-gigs') loadMyGigs();
    if(tab === 'profile') loadProfile();
}

// Check session on load
window.onload = () => { if(user) showDashboard(); };