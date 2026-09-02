const list=document.getElementById('food-moments-list');
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
let allMoments=[];
let showHistory=false;

function todayDate(){const d=new Date();d.setHours(0,0,0,0);return d;}
function momentDate(m){return m.moment_date||m.starts_at?.slice(0,10)||'';}
function dateValue(m){const value=momentDate(m);if(!value)return null;const d=new Date(`${value}T12:00:00`);return Number.isNaN(d.getTime())?null:d;}
function formatWhen(m){const d=dateValue(m);if(!d)return 'Noch offen';const today=todayDate();const target=new Date(d);target.setHours(0,0,0,0);const diff=Math.round((target-today)/86400000);const time=m.moment_time||(!m.is_all_day&&m.starts_at?m.starts_at.slice(11,16):'');if(diff===0)return `Heute${time?` · ${time} Uhr`:''}`;if(diff===1)return `Morgen${time?` · ${time} Uhr`:''}`;if(diff===-1)return 'Gestern';return `${d.toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',year:d.getFullYear()!==today.getFullYear()?'numeric':undefined})}${time?` · ${time} Uhr`:''}`;}

// "Groß" ist eine Darstellungsregel, keine neue fachliche Food-Moment-Kategorie.
// Gezählt werden inhaltliche Dimensionen, nicht technische Felder oder die Anzahl einzelner Links.
function attributeCount(m){
    let count=0;
    if((m.recipes?.length||0)>0)count++;
    if((m.inspirations?.length||0)>0)count++;
    if(String(m.notes||'').trim())count++;
    if(Number(m.people_count||0)>0 || (m.audience_code && m.audience_code!=='open'))count++;
    if(momentDate(m))count++;
    return count;
}
function isExplicitCreated(m){return !m.source_code || m.source_code==='manual' || m.source_code==='home';}
function isVisibleFoodMoment(m){
    if(isExplicitCreated(m))return true;
    if(attributeCount(m)>2)return true;
    // Eine Inspiration im Wochenplan ist mehr als ein rein operativer, kleiner Planungsslot.
    if(m.source_code==='planning_slot' && (m.inspirations?.length||0)>0)return true;
    return false;
}
function detail(m){const parts=[];if(m.recipes?.length)parts.push(m.recipes.map(r=>r.name).join(', '));if(m.inspirations?.length)parts.push(m.inspirations.map(i=>i.title).join(', '));if(m.people_count)parts.push(`${m.people_count} Personen`);if(m.notes&&!parts.length)parts.push(m.notes);return parts.join(' · ')||'Bewusst als Food Moment festgehalten.';}
function card(m,variant='normal'){return `<article class="moment-overview-card is-rich ${variant==='past'?'is-past':''}"><a class="moment-overview-main" href="/foodMoment.html?id=${encodeURIComponent(m.public_id)}"><span class="moment-overview-when">${esc(formatWhen(m))}</span><span class="moment-overview-copy"><strong>${esc(m.title)}</strong><small>${esc(detail(m))}</small></span><svg class="fc-icon" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></a>${variant==='past'?`<button class="moment-repeat-button" type="button" data-repeat-moment="${esc(m.public_id)}">Nochmal machen</button>`:''}</article>`;}
function section(title,kicker,items,kind,description=''){if(!items.length)return '';return `<section class="moment-overview-section ${kind}"><div class="moment-overview-heading"><div><p class="home-section-kicker">${esc(kicker)}</p><h2>${esc(title)}</h2>${description?`<p>${esc(description)}</p>`:''}</div><span>${items.length}</span></div><div class="moment-overview-grid">${items.map(m=>card(m,kind==='history'?'past':'normal')).join('')}</div></section>`;}
function withinDays(moment,days){const d=dateValue(moment);if(!d)return false;const start=todayDate();const end=new Date(start);end.setDate(end.getDate()+days);end.setHours(23,59,59,999);return d>=start&&d<=end;}
function upcomingPreview(items){
    const sorted=items.filter(m=>dateValue(m)&&dateValue(m)>=todayDate()).sort((a,b)=>dateValue(a)-dateValue(b));
    if(!sorted.length)return [];
    // Mindestens eine Woche Vorschau; bei geringer Dichte schrittweise bis maximal zwei Monate erweitern.
    for(const days of [7,14,30,60]){
        const inWindow=sorted.filter(m=>withinDays(m,days));
        if(inWindow.length>=10 || days===60)return inWindow.slice(0,10);
    }
    return sorted.slice(0,10);
}
function searchable(m,q){return !q||`${m.title||''} ${(m.recipes||[]).map(r=>r.name).join(' ')} ${(m.inspirations||[]).map(i=>i.title).join(' ')} ${m.notes||''}`.toLocaleLowerCase('de').includes(q);}
function render(){
    const q=(document.getElementById('moments-search')?.value||'').trim().toLocaleLowerCase('de');
    const visible=allMoments.filter(isVisibleFoodMoment).filter(m=>searchable(m,q));
    const upcoming=upcomingPreview(visible);
    const past=visible.filter(m=>dateValue(m)&&dateValue(m)<todayDate()).sort((a,b)=>dateValue(b)-dateValue(a)).slice(0,50);
    const count=document.getElementById('moments-count');
    if(count)count.textContent=showHistory?`${upcoming.length} bevorstehend · ${past.length} vergangen`:`${upcoming.length} ${upcoming.length===1?'Moment':'Momente'}`;
    const blocks=[];
    if(upcoming.length)blocks.push(section('Was als Nächstes kommt','Bevorstehend',upcoming,'upcoming','Bis zu 10 relevante Food Moments – je nach Dichte aus den nächsten 1 Woche bis 2 Monaten.'));
    if(showHistory&&past.length)blocks.push(section('Vergangene Food Moments','Rückblick',past,'history','Zurückliegende größere Moments – bei Bedarf wieder aufnehmen.'));
    if(!blocks.length){
        if(q){list.innerHTML='<div class="moments-empty"><h2>Nichts gefunden.</h2><p>Versuche einen anderen Suchbegriff.</p></div>';return;}
        if(showHistory){list.innerHTML='<div class="moments-empty"><h2>Keine vergangenen Food Moments.</h2><p>Hier erscheinen später deine größeren zurückliegenden Moments.</p></div>';return;}
        list.innerHTML='<div class="moments-empty"><h2>Gerade steht kein größerer Food Moment an.</h2><p>Kleine Alltags-Moments findest du weiterhin im Wochenplan.</p><div class="moments-empty-actions"><a href="/foodMomentCreate.html">Food Moment erstellen →</a><a href="/mealPlan.html">Wochenplan öffnen →</a></div></div>';return;
    }
    list.innerHTML=blocks.join('');
}
async function load(){try{const r=await AuthShell.request('/food-moments');const items=await r.json();if(!r.ok)throw new Error(items?.error||'Food Moments konnten nicht geladen werden.');allMoments=Array.isArray(items)?items:[];render();}catch(e){list.innerHTML=`<p>${esc(e.message)}</p>`;}}
async function repeatMoment(publicId){const button=document.querySelector(`[data-repeat-moment="${CSS.escape(publicId)}"]`);if(button)button.disabled=true;try{const r=await AuthShell.request(`/food-moments/${encodeURIComponent(publicId)}/repeat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})});const data=await r.json();if(!r.ok)throw new Error(data?.error||'Food Moment konnte nicht wiederholt werden.');location.href=`/foodMoment.html?id=${encodeURIComponent(data.public_id)}`;}catch(e){alert(e.message);}finally{if(button)button.disabled=false;}}
function bindToggle(buttonId,panelId){document.getElementById(buttonId)?.addEventListener('click',()=>{const panel=document.getElementById(panelId);if(!panel)return;const open=!panel.classList.contains('is-hidden');panel.classList.toggle('is-hidden',open);document.getElementById(buttonId)?.classList.toggle('is-active',!open);if(!open)panel.querySelector('input')?.focus();});}
bindToggle('moments-search-toggle','moments-search-panel');
document.getElementById('moments-history-toggle')?.addEventListener('click',e=>{showHistory=!showHistory;e.currentTarget.classList.toggle('is-active',showHistory);e.currentTarget.setAttribute('aria-pressed',String(showHistory));render();});
document.getElementById('moments-search')?.addEventListener('input',render);
document.addEventListener('click',e=>{const b=e.target.closest('[data-repeat-moment]');if(!b)return;e.preventDefault();repeatMoment(b.dataset.repeatMoment);});
document.addEventListener('auth:ready',load);if(window.AuthShell?.isReady?.())load();
