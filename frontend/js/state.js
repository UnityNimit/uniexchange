// --- GLOBAL STATE ---
const API = ''; 
let user = JSON.parse(localStorage.getItem('user'));

// --- LOADER & ERRORS ---
function showLoader(text = "Processing") {
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
    
    // Show Top Nav
    const topNav = document.getElementById('top-nav');
    topNav.classList.remove('hidden');
    topNav.classList.add('flex');
    
    switchTab('market');
}

function switchTab(tab) {
    // Hide all tab contents
    document.getElementById('tab-market').classList.add('hidden');
    document.getElementById('tab-my-gigs').classList.add('hidden');
    document.getElementById('tab-profile').classList.add('hidden');
    
    // Reset top nav button styles (remove active borders)
    const buttons =['btn-market', 'btn-my-gigs', 'btn-profile'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.remove('border-zinc-900', 'text-zinc-900');
        btn.classList.add('border-transparent', 'text-zinc-500');
    });

    // Show active tab content
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    
    // Highlight active nav button
    const activeBtn = document.getElementById(`btn-${tab}`);
    activeBtn.classList.remove('border-transparent', 'text-zinc-500');
    activeBtn.classList.add('border-zinc-900', 'text-zinc-900');

    // Load Data
    if(tab === 'market') loadMarket();
    if(tab === 'my-gigs') loadMyGigs();
    if(tab === 'profile') loadProfile();
}

// Check session on load
window.onload = () => { if(user) showDashboard(); };