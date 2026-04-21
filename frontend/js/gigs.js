async function fetchCategories() {
    const select = document.getElementById('gig-category');
    if(select.options.length > 1) return; 
    try {
        const res = await fetch(`${API}/api/categories`);
        const cats = await res.json();
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.category_id;
            opt.innerText = c.category_name;
            select.appendChild(opt);
        });
    } catch(e) { console.error("Failed to fetch categories"); }
}

async function postGig() {
    const title = document.getElementById('gig-title').value;
    const description = document.getElementById('gig-desc').value;
    const category_id = document.getElementById('gig-category').value;
    const budget = document.getElementById('gig-budget').value;
    const deadline = document.getElementById('gig-deadline').value;
    
    if(!title || !budget || !category_id || !deadline) return alert("All fields are required.");

    const formattedDeadline = new Date(deadline).toISOString().slice(0, 19).replace('T', ' ');

    showLoader("Publishing record to ledger");
    try {
        const res = await fetch(`${API}/api/gigs`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ client_id: user.id, category_id, title, description, budget, deadline: formattedDeadline })
        });
        const data = await res.json();
        if(data.success) {
            document.getElementById('gig-title').value = '';
            document.getElementById('gig-desc').value = '';
            document.getElementById('gig-budget').value = '';
            document.getElementById('gig-deadline').value = '';
            document.getElementById('gig-category').value = '';
            loadMyGigs();
        } else alert(data.error);
    } catch (e) { alert("Error posting gig."); }
    hideLoader();
}

async function loadMyGigs() {
    showLoader("Compiling your records");
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
            const bidsRes = await fetch(`${API}/api/bids/${g.project_id}`);
            const bids = await bidsRes.json();
            
            const isOpen = g.status === 'open';
            
            let bidsHTML = bids.length === 0 
                ? '<p class="text-xs text-zinc-500">No proposals received yet.</p>' 
                : bids.map(b => `
                <div class="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div class="text-sm">
                        <strong class="font-medium text-zinc-900">${b.first_name} ${b.last_name}</strong>
                        <span class="text-zinc-500 ml-1">bid ₹${b.proposal_amount}</span>
                    </div>
                    ${isOpen ? `<button onclick="acceptBid(${g.project_id}, ${b.proposal_id}, ${b.freelancer_id}, ${b.proposal_amount})" class="text-xs font-medium text-accent hover:text-blue-700 transition-colors">Accept & Escrow</button>` : ''}
                </div>
            `).join('');

            container.innerHTML += `
                <div class="bg-white border ${isOpen ? 'border-zinc-300' : 'border-zinc-200 opacity-75'} p-5 rounded-md">
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h3 class="text-base font-semibold text-zinc-900">${g.title}</h3>
                            <p class="text-xs text-zinc-500 mt-0.5">Budget: ₹${g.budget} • Deadline: ${formatDate(g.deadline)}</p>
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

async function acceptBid(project_id, proposal_id, freelancer_id, amount) {
    if(!confirm(`Accepting this bid will deduct ₹${amount} from your wallet into Escrow. Proceed?`)) return;
    
    showLoader("Executing Escrow Transaction");
    try {
        const res = await fetch(`${API}/api/gigs/accept`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project_id, proposal_id, client_id: user.id, freelancer_id, amount })
        });
        const data = await res.json();
        
        if(data.success) {
            alert("Contract created! Funds have been secured in Escrow.");
            user.balance = data.newBalance;
            localStorage.setItem('user', JSON.stringify(user));
            updateWalletDisplay();
            loadMyGigs();
        } else alert(data.error);
    } catch (e) { alert("Escrow transaction failed."); }
    hideLoader();
}