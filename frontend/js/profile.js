async function loadProfile() {
    document.getElementById('profile-name').innerText = user.name || "Unknown";
    document.getElementById('profile-email').innerText = user.email || "Unknown";
    
    const imgEl = document.getElementById('profile-img');
    const initialsEl = document.getElementById('profile-initials');
    
    if (user.profile_pic_url && user.profile_pic_url.length > 10) {
        imgEl.src = user.profile_pic_url;
        imgEl.classList.remove('hidden');
        initialsEl.classList.add('hidden');
    } else {
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'UE';
        initialsEl.innerText = initials;
        imgEl.classList.add('hidden');
        initialsEl.classList.remove('hidden');
    }

    try {
        const res = await fetch(`${API}/api/profile/stats/${user.id}`);
        const data = await res.json();
        
        document.getElementById('stat-rating').innerText = data.avgRating;
        document.getElementById('stat-jobs').innerText = data.jobsWon;
    } catch (e) { console.error("Failed to load profile stats"); }
}

async function uploadProfilePic() {
    const fileInput = document.getElementById('pfp-file');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        return alert("Please select an image file first.");
    }
    
    const file = fileInput.files[0];
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        return alert("File is too large. Please select an image under 5MB.");
    }

    showLoader("Uploading profile picture to database");
    
    // Convert file to Base64 String
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onloadend = async function() {
        const base64String = reader.result;
        
        try {
            const res = await fetch(`${API}/api/profile/pfp`, {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userId: user.id, url: base64String }) // Reusing the 'url' backend logic to store the string
            });
            const data = await res.json();
            
            if (data.success) {
                user.profile_pic_url = data.url;
                localStorage.setItem('user', JSON.stringify(user));
                
                // Clear the input and reload the profile UI
                fileInput.value = '';
                loadProfile(); 
                alert("Profile picture updated successfully.");
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Error uploading image. Is the server running?"); }
        hideLoader();
    };
    
    reader.onerror = function() {
        hideLoader();
        alert("Error reading file.");
    };
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