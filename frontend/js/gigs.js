async function fetchCategories() {
    const select = document.getElementById('gig-category');
    if(select.options.length > 1) return; 
    try {
        const res = await fetch(`${API}/api/categories`);
        const cats = await res.json();
        cats.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.category_id; opt.innerText = c.category_name;
            select.appendChild(opt);
        });
    } catch(e) { console.error("Fetch categories failed"); }
}

async function postGig() {
    const title = document.getElementById('gig-title').value;
    const description = document.getElementById('gig-desc').value;
    const category_id = document.getElementById('gig-category').value;
    const budget = document.getElementById('gig-budget').value;
    const deadline = document.getElementById('gig-deadline').value;
    
    if(!title || !budget || !category_id || !deadline) return alert("All fields are required.");
    
    // FIX: Flawless ISO to MySQL Timestamp conversion
    const formattedDeadline = deadline.replace('T', ' ') + ':00';

    showLoader("Publishing gig");
    try {
        const res = await fetch(`${API}/api/gigs`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ client_id: user.id, category_id, title, description, budget, deadline: formattedDeadline })
        });
        const data = await res.json();
        if(data.success) {
            document.getElementById('gig-title').value = ''; document.getElementById('gig-desc').value = '';
            document.getElementById('gig-budget').value = ''; document.getElementById('gig-deadline').value = '';
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
        
        if (gigs.error) throw new Error(gigs.error);

        const container = document.getElementById('my-gigs-container');
        if(gigs.length === 0) {
            container.innerHTML = `<div class="text-sm text-zinc-500 text-center py-10 border border-dashed border-zinc-200 rounded-md">You haven't posted any gigs yet.</div>`;
            return hideLoader();
        }

        container.innerHTML = '';
        for (let g of gigs) {
            let actionArea = '';

            if (g.status === 'open') {
                const bidsRes = await fetch(`${API}/api/bids/${g.project_id}`);
                const bids = await bidsRes.json();
                actionArea = bids.length === 0 
                    ? '<p class="text-xs text-zinc-500">No proposals received yet.</p>' 
                    : bids.map(b => `
                    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 sm:py-2 border-b border-zinc-100 last:border-0 gap-2">
                        <div class="text-sm">
                            <strong class="font-medium text-zinc-900">${b.first_name} ${b.last_name}</strong>
                            <span class="text-zinc-500 block sm:inline mt-0.5 sm:mt-0 sm:ml-1">bid ₹${b.proposal_amount}</span>
                        </div>
                        <button onclick="acceptBid(${g.project_id}, ${b.proposal_id}, ${b.freelancer_id}, ${b.proposal_amount})" class="w-full sm:w-auto text-xs font-medium bg-zinc-900 sm:bg-transparent text-white sm:text-accent hover:text-blue-700 py-2 sm:py-0 rounded-md sm:rounded-none transition-colors mt-1 sm:mt-0 border border-zinc-900 sm:border-0">Accept for Cash</button>
                    </div>`).join('');
            } else if (g.status === 'in_progress') {
                actionArea = `
                    <div class="bg-blue-50 border border-blue-100 p-4 rounded-md">
                        <p class="text-sm text-blue-800 mb-3">Gig is active with <strong class="font-bold">${g.f_first} ${g.f_last}</strong> for <strong class="font-bold">₹${g.contract_amount}</strong>.</p>
                        <div class="flex items-center gap-3">
                            <select id="rating-${g.contract_id}" class="text-sm border border-blue-200 rounded-md px-3 py-1.5 outline-none focus:border-blue-500 bg-white">
                                <option value="" disabled selected>Rate Freelancer</option>
                                <option value="5">⭐⭐⭐⭐⭐ (5) Perfect</option>
                                <option value="4">⭐⭐⭐⭐ (4) Good</option>
                                <option value="3">⭐⭐⭐ (3) Average</option>
                                <option value="2">⭐⭐ (2) Poor</option>
                                <option value="1">⭐ (1) Terrible</option>
                            </select>
                            <button onclick="markCompleted(${g.project_id}, ${g.contract_id}, ${g.client_id})" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-1.5 rounded-md transition-colors">Verify & Complete</button>
                        </div>
                    </div>
                `;
            } else if (g.status === 'completed') {
                actionArea = `<p class="text-sm text-emerald-600 font-medium">Completed and recorded in ledger for ₹${g.contract_amount}.</p>`;
            }

            container.innerHTML += `
                <div class="bg-white border ${g.status === 'open' ? 'border-zinc-300' : 'border-zinc-200 opacity-90'} p-4 sm:p-5 rounded-md">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                        <div>
                            <h3 class="text-base font-semibold text-zinc-900">${g.title}</h3>
                            <p class="text-xs text-zinc-500 mt-0.5">Budget: ₹${g.budget} • Deadline: ${formatDate(g.deadline)}</p>
                        </div>
                        <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-sm w-fit ${g.status === 'open' ? 'bg-zinc-100 text-zinc-900' : (g.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700')}">${g.status.replace('_', ' ')}</span>
                    </div>
                    <div class="pt-4 border-t border-zinc-100">
                        ${actionArea}
                    </div>
                </div>
            `;
        }
    } catch (e) { console.error("Failed to load your gigs"); }
    hideLoader();
}

async function acceptBid(project_id, proposal_id, freelancer_id, amount) {
    if(!confirm(`Accepting this creates a binding cash contract for ₹${amount}. Proceed?`)) return;
    showLoader("Creating cash contract");
    try {
        const res = await fetch(`${API}/api/gigs/accept`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project_id, proposal_id, client_id: user.id, freelancer_id, amount })
        });
        const data = await res.json();
        if(data.success) { alert("Contract created!"); loadMyGigs(); }
        else alert(data.error);
    } catch (e) { alert("Transaction failed."); }
    hideLoader();
}

async function markCompleted(project_id, contract_id, freelancer_id) {
    const rating = document.getElementById(`rating-${contract_id}`).value;
    if(!rating) return alert("Please rate the freelancer's work before verifying completion.");
    if(!confirm("Verify that you have paid the freelancer in cash? This will close the gig and update financial statistics.")) return;

    showLoader("Finalizing ledger records");
    try {
        const res = await fetch(`${API}/api/gigs/complete`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ project_id, client_id: user.id, contract_id, freelancer_id, rating: parseInt(rating) })
        });
        const data = await res.json();
        if(data.success) { alert("Gig verified and added to permanent ledger!"); loadMyGigs(); }
        else alert(data.error);
    } catch (e) { alert("Failed to complete gig."); }
    hideLoader();
}