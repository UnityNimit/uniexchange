async function loadProfile() {
    // Load local storage details first for instant UI
    document.getElementById('profile-name').innerText = user.name || "Unknown";
    document.getElementById('profile-email').innerText = user.email || "Unknown";
    
    // Handle Profile Picture vs Initials
    const imgEl = document.getElementById('profile-img');
    const initialsEl = document.getElementById('profile-initials');
    
    if (user.profile_pic_url) {
        imgEl.src = user.profile_pic_url;
        imgEl.classList.remove('hidden');
        initialsEl.classList.add('hidden');
    } else {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'UE';
        initialsEl.innerText = initials;
        imgEl.classList.add('hidden');
        initialsEl.classList.remove('hidden');
    }

    // Fetch Database Stats
    try {
        const res = await fetch(`${API}/api/profile/stats/${user.id}`);
        const data = await res.json();
        
        document.getElementById('stat-rating').innerText = data.avgRating;
        document.getElementById('stat-jobs').innerText = data.jobsWon;
    } catch (e) { console.error("Failed to load profile stats"); }
}

async function updateProfilePic() {
    const url = document.getElementById('pfp-url').value;
    if (!url) return alert("Please enter a valid image or GIF URL.");

    showLoader("Updating profile visual");
    try {
        const res = await fetch(`${API}/api/profile/pfp`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: user.id, url })
        });
        const data = await res.json();
        
        if (data.success) {
            user.profile_pic_url = data.url;
            localStorage.setItem('user', JSON.stringify(user));
            document.getElementById('pfp-url').value = '';
            loadProfile(); // Re-render the image instantly
        } else {
            alert(data.error);
        }
    } catch (e) { alert("Error updating profile picture."); }
    hideLoader();
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