async function loadMyGigs() {
    showLoader("Fetching your postings...");
    try {
        const res = await fetch(`${API}/api/gigs/my/${user.id}`);
        const gigs = await res.json();
        
        const container = document.getElementById('my-gigs-container');
        if(gigs.length === 0) {
            container.innerHTML = `<div class="bg-slate-50 p-8 rounded-xl text-center text-slate-500 border border-dashed border-slate-300">You haven't posted any gigs yet.</div>`;
            return hideLoader();
        }

        container.innerHTML = '';
        for (let g of gigs) {
            const bidsRes = await fetch(`${API}/api/bids/${g.id}`);
            const bids = await bidsRes.json();
            
            const isOpen = g.status === 'open';
            const statusClass = isOpen ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200';
            
            let bidsHTML = bids.length === 0 
                ? '<p class="text-sm text-slate-500 italic">No bids received yet.</p>' 
                : bids.map(b => `
                <div class="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-2 shadow-sm">
                    <div>
                        <strong class="text-slate-900">${b.freelancer_name}</strong>
                        <span class="text-slate-500 text-sm ml-2">bid <span class="font-bold text-emerald-600">₹${b.amount}</span></span>
                    </div>
                    ${isOpen ? `<button onclick="acceptBid(${g.id})" class="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-1.5 px-4 rounded-md transition-colors shadow-sm">Accept</button>` : ''}
                </div>
            `).join('');

            container.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div class="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h3 class="text-lg font-bold text-slate-900">${g.title}</h3>
                            <p class="text-sm text-slate-500 mt-1">Base Budget: ₹${g.base_budget}</p>
                        </div>
                        <span class="text-xs font-bold px-3 py-1 rounded-full border ${statusClass}">${g.status.toUpperCase()}</span>
                    </div>
                    <div class="bg-slate-50 p-6">
                        <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Received Bids</h4>
                        <div class="space-y-2">${bidsHTML}</div>
                    </div>
                </div>
            `;
        }
    } catch (e) { console.error("Failed to load your gigs"); }
    hideLoader();
}

async function acceptBid(gig_id) {
    if(!confirm("Are you sure you want to accept this bid? This will permanently close the gig.")) return;
    
    showLoader("Closing gig...");
    try {
        const res = await fetch(`${API}/api/gigs/accept`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gig_id })
        });
        const data = await res.json();
        if(data.success) {
            loadMyGigs();
        }
    } catch (e) { alert("Error accepting bid"); }
    hideLoader();
}