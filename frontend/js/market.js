async function loadMarket() {
    const query = document.getElementById('search-query').value;
    showLoader("Syncing market data");
    try {
        const res = await fetch(`${API}/api/gigs${query ? `?q=${encodeURIComponent(query)}` : ''}`);
        const gigs = await res.json();
        
        const container = document.getElementById('market-container');
        if(gigs.length === 0) {
            container.innerHTML = `<div class="text-sm text-zinc-500 text-center py-10 border border-dashed border-zinc-200 rounded-md">No gigs found.</div>`;
            return hideLoader();
        }

        container.innerHTML = gigs.map(g => `
            <div class="bg-white border border-zinc-200 p-5 rounded-md hover:border-zinc-300 transition-colors">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h3 class="text-base font-semibold text-zinc-900">${g.title}</h3>
                        <p class="text-xs text-zinc-500 mt-0.5">Posted by ${g.first_name} ${g.last_name} • Deadline: ${formatDate(g.deadline)}</p>
                    </div>
                </div>
                <p class="text-sm text-zinc-700 mb-5 leading-relaxed">${g.description}</p>

                <div class="flex flex-wrap gap-4 text-sm mb-5">
                    <div class="flex flex-col">
                        <span class="text-xs text-zinc-500 font-medium">Base Budget</span>
                        <span class="font-semibold text-zinc-900">₹${g.budget}</span>
                    </div>
                    <div class="flex flex-col border-l border-zinc-200 pl-4">
                        <span class="text-xs text-zinc-500 font-medium">Active Bids</span>
                        <span class="font-semibold text-zinc-900">${g.total_proposals}</span>
                    </div>
                    <div class="flex flex-col border-l border-zinc-200 pl-4">
                        <span class="text-xs text-zinc-500 font-medium">Dynamic Mkt Price</span>
                        <span class="font-semibold text-accent">₹${parseFloat(g.current_market_value).toFixed(2)}</span>
                    </div>
                </div>

                <div class="flex gap-2">
                    <input type="number" id="bid-amount-${g.project_id}" placeholder="Your bid (₹)" class="w-32 text-sm border border-zinc-300 px-3 py-1.5 focus:border-zinc-900 outline-none rounded-md transition-all">
                    <button onclick="placeBid(${g.project_id})" class="bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors">Place Bid</button>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Failed to load market"); }
    hideLoader();
}

async function placeBid(project_id) {
    const amount = document.getElementById(`bid-amount-${project_id}`).value;
    if(!amount) return alert("Enter an amount.");

    showLoader("Submitting proposal");
    try {
        const res = await fetch(`${API}/api/bids`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project_id, freelancer_id: user.id, amount })
        });
        const data = await res.json();
        if(data.success) loadMarket();
        else alert(data.error);
    } catch (e) { alert("Error placing bid."); }
    hideLoader();
}