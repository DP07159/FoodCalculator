(function(){
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function metric(label,value,note=''){return `<div class="admin-summary-card"><span>${esc(label)}</span><strong>${esc(value)}</strong>${note?`<small>${esc(note)}</small>`:''}</div>`;}
async function readJson(response){
    const text=await response.text();
    if(!text)return null;
    try{return JSON.parse(text);}catch{return {error:`Serverantwort konnte nicht verarbeitet werden (HTTP ${response.status}).`};}
}
async function load(){
    const s=document.getElementById('analytics-summary');
    const days=Number(document.getElementById('analytics-range')?.value||28);
    document.getElementById('analytics-range-label').textContent=`Letzte ${days} Tage`;
    s.innerHTML='<p>Lädt…</p>';
    try{
        const r=await AuthShell.request(`/analytics/summary?days=${encodeURIComponent(days)}`);
        const d=await readJson(r);
        if(!r.ok){
            const message=r.status===403?'Platform-Admin-Rechte erforderlich.':(d?.error||`Auswertung konnte nicht geladen werden (HTTP ${r.status}).`);
            s.innerHTML=`<p>${esc(message)}</p>`;
            document.getElementById('analytics-journeys').innerHTML='';
            document.getElementById('analytics-users').innerHTML='';
            document.getElementById('analytics-events').innerHTML='';
            return;
        }
        const t=d?.totals||{};
        const share=t.total_events?Math.round((t.connection_events/t.total_events)*100):0;
        s.innerHTML=metric('Aktive Nutzer',t.active_users||0)+metric('Sessions',t.sessions||0)+metric('Aktionen',t.total_events||0)+metric('Connections',t.connection_events||0,`${share}% aller Aktionen`);
        const names={inspiration:'Inspiration festhalten',recipe_planning:'Rezept konkret einplanen',occasion:'Besuch / Anlass',weekly_planning:'Woche planen',shopping:'Einkaufen'};
        document.getElementById('analytics-journeys').innerHTML=Object.entries(d?.journey_signals||{}).map(([k,v])=>`<div class="admin-result-row"><strong>${esc(names[k]||k)}</strong><span>${esc(v)} Signale</span></div>`).join('')||'<p>Noch keine Signale.</p>';
        document.getElementById('analytics-users').innerHTML=(d?.users||[]).map(u=>`<div class="admin-result-row"><div><strong>${esc(u.display_name||u.email||`User ${u.user_id}`)}</strong><small>${esc(u.email||'')}</small></div><span>${esc(u.events)} Aktionen · ${esc(u.sessions)} Sessions · ${esc(u.connections)} Connections</span></div>`).join('')||'<p>Noch keine Nutzeraktivität.</p>';
        document.getElementById('analytics-events').innerHTML=(d?.events||[]).map(e=>`<div class="admin-result-row"><div><strong>${esc(e.event_name)}</strong><small>${esc(e.event_category)}</small></div><span>${esc(e.count)} · ${esc(e.users)} Nutzer</span></div>`).join('')||'<p>Noch keine Ereignisse.</p>';
    }catch(error){s.innerHTML=`<p>${esc(error?.message||'Auswertung konnte nicht geladen werden.')}</p>`;}
}
document.addEventListener('auth:ready',load);
document.getElementById('analytics-refresh')?.addEventListener('click',load);
document.getElementById('analytics-range')?.addEventListener('change',load);
})();
