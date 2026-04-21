const API = ''; 
let user = JSON.parse(localStorage.getItem('user'));

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
    } else alert(msg);
}

function toggleAuth() {
    document.getElementById('auth-error').classList.add('hidden');
    const loginFields = document.getElementById('login-fields');
    const regFields = document.getElementById('register-fields');
    if(loginFields.classList.contains('hidden')) {
        loginFields.classList.remove('hidden');
        regFields.classList.add('hidden');
    } else {
        loginFields.classList.add('hidden');
        regFields.classList.remove('hidden');
    }
}

function updateWalletDisplay() {
    if(user && user.balance !== undefined) {
        document.getElementById('nav-balance').innerText = `₹${parseFloat(user.balance).toFixed(2)}`;
    }
}

function showDashboard() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('top-nav').classList.remove('hidden');
    document.getElementById('top-nav').classList.add('flex');
    document.getElementById('wallet-display').classList.remove('hidden');
    document.getElementById('wallet-display').classList.add('flex');
    
    updateWalletDisplay();
    switchTab('market');
}

function switchTab(tab) {
    document.getElementById('tab-market').classList.add('hidden');
    document.getElementById('tab-my-gigs').classList.add('hidden');
    document.getElementById('tab-profile').classList.add('hidden');
    
    const buttons = ['btn-market', 'btn-my-gigs', 'btn-profile'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        btn.classList.remove('border-zinc-900', 'text-zinc-900');
        btn.classList.add('border-transparent', 'text-zinc-500');
    });

    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    const activeBtn = document.getElementById(`btn-${tab}`);
    activeBtn.classList.remove('border-transparent', 'text-zinc-500');
    activeBtn.classList.add('border-zinc-900', 'text-zinc-900');

    if(tab === 'market') loadMarket();
    if(tab === 'my-gigs') { fetchCategories(); loadMyGigs(); }
    if(tab === 'profile') loadProfile();
}

function formatDate(dateString) {
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(dateString));
}

window.onload = () => { if(user) showDashboard(); };