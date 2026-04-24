async function loadProfile() {
    document.getElementById('profile-name').innerText = user.name || "Unknown";
    document.getElementById('profile-email').innerText = user.email || "Unknown";
    document.getElementById('profile-username').innerText = `@${user.username || "user"}`;
    
    const imgEl = document.getElementById('profile-img');
    const initialsEl = document.getElementById('profile-initials');
    
    if (user.profile_pic_url && user.profile_pic_url.length > 10) {
        imgEl.src = user.profile_pic_url;
        imgEl.classList.remove('hidden'); initialsEl.classList.add('hidden');
    } else {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'UE';
        initialsEl.innerText = initials;
        imgEl.classList.add('hidden'); initialsEl.classList.remove('hidden');
    }

    try {
        const res = await fetch(`${API}/api/profile/stats/${user.id}`);
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);

        document.getElementById('stat-f-rating').innerText = data.freelancerRating;
        document.getElementById('stat-c-rating').innerText = data.clientRating;
        document.getElementById('stat-jobs').innerText = data.gigsPosted;
        document.getElementById('stat-avg-given').innerText = `₹${data.avgGiven}`;
        document.getElementById('stat-given').innerText = `₹${data.totalGiven}`;
        document.getElementById('stat-earned').innerText = `₹${data.totalEarned}`;
    } catch (e) { console.error("Failed to load profile stats"); }
}

async function uploadProfilePic() {
    const fileInput = document.getElementById('pfp-file');
    if (!fileInput.files || fileInput.files.length === 0) return alert("Select an image file.");
    
    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) return alert("File is too large (Max 5MB).");

    showLoader("Uploading to database");
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async function() {
        try {
            const res = await fetch(`${API}/api/profile/pfp`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: user.id, url: reader.result }) 
            });
            const data = await res.json();
            if (data.success) {
                user.profile_pic_url = data.url;
                localStorage.setItem('user', JSON.stringify(user));
                fileInput.value = ''; loadProfile(); 
                alert("Profile picture updated.");
            } else alert(data.error);
        } catch (e) { alert("Error uploading image."); }
        hideLoader();
    };
    reader.onerror = function() { hideLoader(); alert("Error reading file."); };
}

async function changePassword() {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    if(!oldPassword || !newPassword) return alert("Fill both password fields.");

    showLoader("Updating security credentials");
    try {
        const res = await fetch(`${API}/api/auth/change-password`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ userId: user.id, oldPassword, newPassword })
        });
        const data = await res.json();
        if(data.success) {
            alert("Password updated.");
            document.getElementById('old-password').value = ''; document.getElementById('new-password').value = '';
        } else alert(data.error);
    } catch (e) { alert("Error updating password."); }
    hideLoader();
}

async function deleteAccount() {
    if(!confirm("DANGER: This will permanently delete your account, all your gigs, bids, and contracts. This cannot be undone. Are you sure?")) return;
    
    showLoader("Deleting account");
    try {
        const res = await fetch(`${API}/api/profile/${user.id}`, { method: 'DELETE' });
        if(res.ok) {
            alert("Account deleted permanently.");
            logout();
        } else alert("Failed to delete account.");
    } catch(e) { alert("Error deleting account."); }
    hideLoader();
}