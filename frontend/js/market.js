async function postGig() {
    const title = document.getElementById('gig-title').value;
    const description = document.getElementById('gig-desc').value;
    const base_budget = document.getElementById('gig-budget').value;
    
    if(!title || !base_budget) return alert("Title and budget are required!");

    showLoader("Publishing your gig...");
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
        } else alert(data.error);
    } catch (e) { alert("Error posting gig"); }
    hideLoader();
}

async function loadMarket() {
    showLoader("Syncing with market...");
    try {
        const res = await fetch(`${API}/api/gigs`);
        const gigs = await res.json();
        
        const container = document.getElementById('market-container');
        if(gigs.length === 0) {
            container.innerHTML = `<div class="bg-slate-50 p-8 rounded-xl text-center text-slate-500 border border-dashed border-slate-300">No open gigs available right now.</div>`;
            return hideLoader();
        }

        container.innerHTML = gigs.map(g => `
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all">
                <div class="p-6">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-lg font-bold text-slate-900">${g.title}</h3>
                            <p class="text-sm text-slate-500">Posted by ${g.client_name}</p>
                        </div>
                        <span class="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200">OPEN</span>
                    </div>
                    <p class="text-slate-600 mb-6">${g.description}</p>

                    <div class="bg-slate-50 rounded-xl p-4 mb-6 grid grid-cols-3 gap-4 text-center border border-slate-100">
                        <div>
                            <p class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Base Budget</p>
                            <p class="font-bold text-slate-900">₹${g.base_budget}</p>
                        </div>
                        <div>
                            <p class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Bids</p>
                            <p class="font-bold text-slate-900">${g.total_bids}</p>
                        </div>
                        <div class="col-span-3 sm:col-span-1 bg-emerald-50 rounded-lg py-1 border border-emerald-100">
                            <p class="text-xs text-emerald-700 uppercase font-bold tracking-wider mb-1">Market Price</p>
                            <p class="font-black text-emerald-600 text-lg">₹${parseFloat(g.dynamic_market_price).toFixed(2)}</p>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <input type="number" id="bid-amount-${g.gig_id}" placeholder="Your Bid (₹)" class="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:border-brand focus:ring-2 focus:ring-brand outline-none">
                        <button onclick="placeBid(${g.gig_id})" class="bg-brand hover:bg-brandHover text-white px-6 py-2 rounded-lg font-bold transition-colors shadow-md shadow-brand/20">Place Bid</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error("Failed to load market"); }
    hideLoader();
}

async function placeBid(gig_id) {
    const amount = document.getElementById(`bid-amount-${gig_id}`).value;
    if(!amount) return alert("Enter an amount!");

    showLoader("Placing your bid...");
    try {
        const res = await fetch(`${API}/api/bids`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ gig_id, freelancer_id: user.id, amount })
        });
        const data = await res.json();
        
        if(data.success) {
            loadMarket();
        } else alert(data.error);
    } catch (e) { alert("Error placing bid"); }
    hideLoader();
}