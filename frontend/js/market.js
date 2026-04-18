async function postGig() {
    const title = document.getElementById('gig-title').value;
    const description = document.getElementById('gig-desc').value;
    const base_budget = document.getElementById('gig-budget').value;
    
    if(!title || !base_budget) return alert("Title and budget are required.");

    showLoader("Publishing your gig");
    try {
        const res = await fetch(`${API}/api/gigs`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ client_id: user.id, title, description, base_budget })
        });
        const data = await res.json();
        if(data.success) {
            document.getElementById('gig-title').value = '';
            document.getElementById('gig-desc').value = '';
            document.getElementById('gig-budget').value = '';
            loadMarket();
        } else {
            alert(data.error);
        }
    } catch (e) { alert("Error posting gig."); }
    hideLoader();
}

async function loadMarket() {
    showLoader("Syncing with market");
    try {
        const res = await fetch(`${API}/api/gigs`);
        const gigs = await res.json();
        
        const container = document.getElementById('market-container');
        if(gigs.length === 0) {
            container.innerHTML = `<div class="text-sm text-zinc-500 text-center py-10 border border-dashed border-zinc-200 rounded-md">No open gigs available right now.</div>`;
            return hideLoader();
        }

        container.innerHTML = gigs.map(g => `
            <div class="bg-white border border-zinc-200 p-5 rounded-md hover:border-zinc-300 transition-colors">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="text-base font-semibold text-zinc-900">${g.title}</h3>
                        <p class="text-xs text-zinc-500 mt-0.5">Posted by ${g.client_name}</p>
                    </div>
                    <span class="bg-zinc-100 text-zinc-600 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-sm">Open</span>
                </div>
                <p class="text-sm text-zinc-700 mb-5 leading-relaxed">${g.description}</p>

                <div class="flex flex-wrap gap-4 text-sm mb-5">
                    <div class="flex flex-col">
                        <span class="text-xs text-zinc-500 font-medium">Base Budget</span>
                        <span class="font-semibold text-zinc-900">₹${g.base_budget}</span>
                    </div>
                    <div class="flex flex-col border-l border-zinc-200 pl-4">
                        <span class="text-xs text-zinc-500 font-medium">Total Bids</span>
                        <span class="font-semibold text-zinc-900">${g.total_bids}</span>
                    </div>
                    <div class="flex flex-col border-l border-zinc-200 pl-4">
                        <span class="text-xs text-zinc-500 font-medium">Market Price</span>
                        <span class="font-semibold text-accent">₹${parseFloat(g.dynamic_market_price).toFixed(2)}</span>
                    </div>
                </div>

                <div class="flex gap-2">
                    <input type="number" id="bid-amount-${g.gig_id}" placeholder="Bid amount (₹)" class="w-32 text-sm border border-zinc-300 px-3 py-1.5 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none rounded-md transition-all">
                    <button onclick="placeBid(${g.gig_id})" class="bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors">Place Bid</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Failed to load market"); }
    hideLoader();
}

async function placeBid(gig_id) {
    const amount = document.getElementById(`bid-amount-${gig_id}`).value;
    if(!amount) return alert("Enter an amount.");

    showLoader("Placing your bid");
    try {
        const res = await fetch(`${API}/api/bids`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gig_id, freelancer_id: user.id, amount })
        });
        const data = await res.json();
        
        if(data.success) {
            loadMarket();
        } else {
            alert(data.error);
        }
    } catch (e) { alert("Error placing bid."); }
    hideLoader();
}