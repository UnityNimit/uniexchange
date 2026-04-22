async function register() {
    const payload = {
        first_name: document.getElementById('r-fname').value,
        last_name: document.getElementById('r-lname').value,
        college_id: document.getElementById('r-cid').value,
        dob: document.getElementById('r-dob').value,
        email: document.getElementById('r-email').value,
        password: document.getElementById('r-password').value
    };
    
    showLoader("Creating account");
    try {
        const res = await fetch(`${API}/api/auth/register`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (data.success) {
            alert("Account created successfully! Please log in.");
            toggleAuth();
            document.getElementById('l-email').value = payload.email;
        } else showError(data.error);
    } catch (e) { showError("Network error. Verify server status."); }
    hideLoader();
}

async function login() {
    const email = document.getElementById('l-email').value;
    const password = document.getElementById('l-password').value;
    
    showLoader("Authenticating");
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
    } catch (e) { showError("Network error. Verify server status."); }
    hideLoader();
}

function logout() {
    localStorage.removeItem('user');
    user = null;
    location.reload(); 
}