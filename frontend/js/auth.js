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
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('dashboard-section').classList.add('hidden');
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('user-info').classList.remove('flex');
}