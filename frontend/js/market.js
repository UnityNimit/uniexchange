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
            <div class="market-card relative bg-white border border-zinc-200 rounded-md hover:border-zinc-300 transition-colors overflow-hidden">
                <div class="p-4 sm:p-5">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
                        
                        <div class="flex items-center gap-3 cursor-pointer group" onclick="showPublicProfile(${g.client_id})">
                            <div class="w-10 h-10 rounded-full overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                ${g.profile_pic_url && g.profile_pic_url.length > 10 
                                    ? `<img src="${g.profile_pic_url}" class="w-full h-full object-cover">` 
                                    : `<span class="text-xs font-semibold text-zinc-500">${g.first_name[0]}${g.last_name[0]}</span>`}
                            </div>
                            <div>
                                <h3 class="text-base font-semibold text-zinc-900 leading-tight">${g.title}</h3>
                                <p class="text-xs text-zinc-500 group-hover:text-accent transition-colors">${g.first_name} ${g.last_name}</p>
                            </div>
                        </div>

                        <span class="status-badge bg-zinc-100 text-zinc-600 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-sm shrink-0">Open</span>
                    </div>
                    
                    <p class="text-sm text-zinc-700 mb-5 leading-relaxed">${g.description}</p>

                    <div class="grid grid-cols-2 sm:flex sm:flex-wrap gap-4 text-sm mb-5">
                        <div class="flex flex-col">
                            <span class="text-xs text-zinc-500 font-medium">Base Budget</span>
                            <span class="font-semibold text-zinc-900">₹${g.budget}</span>
                        </div>
                        <div class="flex flex-col sm:border-l border-zinc-200 sm:pl-4">
                            <span class="text-xs text-zinc-500 font-medium">Active Bids</span>
                            <span class="font-semibold text-zinc-900">${g.total_proposals}</span>
                        </div>
                        <div class="flex flex-col col-span-2 sm:col-span-1 sm:border-l border-zinc-200 sm:pl-4">
                            <span class="text-xs text-zinc-500 font-medium">Dynamic Mkt Price</span>
                            <span class="font-semibold text-accent">₹${parseFloat(g.current_market_value).toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-2 mt-4">
                        <input type="number" id="bid-amount-${g.project_id}" placeholder="Your bid (₹)" class="w-full sm:w-32 text-sm border border-zinc-300 px-3 py-2 sm:py-1.5 focus:border-zinc-900 outline-none rounded-md transition-all">
                        <button onclick="placeBid(${g.project_id})" class="bid-btn w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2 sm:py-1.5 rounded-md transition-colors">Place Bid</button>
                    </div>
                </div>

                <div class="absolute bottom-0 left-0 w-full h-1 bg-zinc-100">
                    <div class="gig-progress h-full bg-zinc-900 transition-all duration-1000 ease-linear" data-start="${new Date(g.created_at).getTime()}" data-end="${new Date(g.deadline).getTime()}"></div>
                </div>
            </div>
        `).join('');

        startProgressBars();

    } catch (e) { console.error("Failed to load market"); }
    hideLoader();
}

function startProgressBars() {
    if(progressInterval) clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        document.querySelectorAll('.gig-progress').forEach(el => {
            const start = parseInt(el.getAttribute('data-start'));
            const end = parseInt(el.getAttribute('data-end'));
            const now = Date.now();
            
            const card = el.closest('.market-card');
            const badge = card.querySelector('.status-badge');
            const bidBtn = card.querySelector('.bid-btn');

            if (now >= end) {
                el.style.width = '0%';
                if(badge && badge.innerText !== 'EXPIRED') {
                    badge.innerText = 'EXPIRED';
                    badge.classList.replace('bg-zinc-100', 'bg-red-50');
                    badge.classList.replace('text-zinc-600', 'text-red-700');
                    bidBtn.disabled = true;
                    bidBtn.innerText = 'Deadline Passed';
                    bidBtn.classList.add('opacity-50', 'cursor-not-allowed');
                }
            } else {
                const total = end - start;
                const remaining = end - now;
                const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
                el.style.width = pct + '%';
                
                if(pct < 15) el.classList.replace('bg-zinc-900', 'bg-red-500');
            }
        });
    }, 1000);
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