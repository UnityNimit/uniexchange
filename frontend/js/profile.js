function loadProfile() {
    document.getElementById('profile-name').innerText = user.name || "Unknown";
    document.getElementById('profile-email').innerText = user.email || "Unknown";
    
    if (user.name) {
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('profile-initials').innerText = initials;
    }
}

async function topUpWallet() {
    const amount = document.getElementById('topup-amount').value;
    if(!amount || amount <= 0) return alert("Enter a valid amount.");

    showLoader("Processing deposit");
    try {
        const res = await fetch(`${API}/api/wallet/topup`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ user_id: user.id, amount })
        });
        const data = await res.json();
        
        if(data.success) {
            user.balance = data.balance;
            localStorage.setItem('user', JSON.stringify(user));
            updateWalletDisplay();
            document.getElementById('topup-amount').value = '';
            alert("Funds added successfully!");
        } else alert(data.error);
    } catch (e) { alert("Error adding funds."); }
    hideLoader();
}

async function changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;

    if(!oldPassword || !newPassword) return alert("Please fill both password fields.");

    showLoader("Updating security credentials");
    try {
        const res = await fetch(`${API}/api/auth/change-password`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: user.id, oldPassword, newPassword })
        });
        const data = await res.json();
        
        if(data.success) {
            alert("Password updated successfully.");
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
        } else alert(data.error);
    } catch (e) { alert("Error updating password."); }
    hideLoader();
}