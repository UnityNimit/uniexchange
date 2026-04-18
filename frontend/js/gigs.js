async function loadMyGigs() {
    showLoader("Fetching your postings");
    try {
        const res = await fetch(`${API}/api/gigs/my/${user.id}`);
        const gigs = await res.json();
        
        const container = document.getElementById('my-gigs-container');
        if(gigs.length === 0) {
            container.innerHTML = `<div class="text-sm text-zinc-500 text-center py-10 border border-dashed border-zinc-200 rounded-md">You haven't posted any gigs yet.</div>`;
            return hideLoader();
        }

        container.innerHTML = '';
        for (let g of gigs) {
            const bidsRes = await fetch(`${API}/api/bids/${g.id}`);
            const bids = await bidsRes.json();
            
            const isOpen = g.status === 'open';
            
            // Clean, minimal lists for bids
            let bidsHTML = bids.length === 0 
                ? '<p class="text-xs text-zinc-500">No bids received yet.</p>' 
                : bids.map(b => `
                <div class="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div class="text-sm">
                        <strong class="font-medium text-zinc-900">${b.freelancer_name}</strong>
                        <span class="text-zinc-500 ml-1">bid ₹${b.amount}</span>
                    </div>
                    ${isOpen ? `<button onclick="acceptBid(${g.id})" class="text-xs font-medium text-accent hover:text-blue-700 transition-colors">Accept</button>` : ''}
                </div>
            `).join('');

            // Minimalist Card Generation
            container.innerHTML += `
                <div class="bg-white border ${isOpen ? 'border-zinc-300' : 'border-zinc-200 opacity-75'} p-5 rounded-md">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-base font-semibold text-zinc-900">${g.title}</h3>
                            <p class="text-xs text-zinc-500 mt-0.5">Budget: ₹${g.base_budget}</p>
                        </div>
                        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-sm ${isOpen ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-50 text-zinc-400'}">${g.status}</span>
                    </div>
                    <div class="pt-4 border-t border-zinc-100">
                        <h4 class="text-xs font-semibold text-zinc-900 mb-2">Bids</h4>
                        <div class="space-y-1">${bidsHTML}</div>
                    </div>
                </div>
            `;
        }
    } catch (e) { console.error("Failed to load your gigs"); }
    hideLoader();
}

async function acceptBid(gig_id) {
    if(!confirm("Are you sure you want to accept this bid? This will permanently close the gig.")) return;
    
    showLoader("Closing gig");
    try {
        const res = await fetch(`${API}/api/gigs/accept`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gig_id })
        });
        const data = await res.json();
        if(data.success) {
            loadMyGigs();
        }
    } catch (e) { alert("Error accepting bid."); }
    hideLoader();
}