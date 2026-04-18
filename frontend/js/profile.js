function loadProfile() {
    document.getElementById('profile-name').innerText = user.name || "Unknown";
    document.getElementById('profile-email').innerText = user.email || "Unknown";
    
    // Generate initials for the profile picture (e.g., "John Doe" -> "JD")
    if (user.name) {
        const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        document.getElementById('profile-initials').innerText = initials;
    }
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
        } else {
            alert(data.error);
        }
    } catch (e) { alert("Error updating password."); }
    hideLoader();
}