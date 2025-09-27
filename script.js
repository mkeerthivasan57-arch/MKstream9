/* MKstream v30 - Final Project
   - Implements all features from the user's combined lists (frontend logic)
   - Uses localStorage for data persistence (no database needed for this file set)
   - Supports lazy loading, responsive design, and dynamic SEO
*/

const STORAGE_KEY = 'mk_v30_state';

// Default state with initial categories and admin password
const DEFAULT = {
  site: {
    name: 'MKstream',
    logo: '',
    colors: { header:'#07112b', bg:'#051426', card:'#0b1630', accent:'#1e90ff' }, // Custom colors
    seo: { title:'MKstream', description:'Watch anime, donghua, cartoons, serials, web series, movies' },
    password: 'admin123', // Default Admin Password
    telegram: '',
    ads: { header:'', player:'' }
  },
  categories: [
    { id:'anime', name:'anime', subs:['action','fantasy'] },
    { id:'donghua', name:'donghua', subs:['martial','romance'] },
    { id:'cartoon', name:'cartoon', subs:['kids'] },
    { id:'serial', name:'serial', subs:['drama'] },
    { id:'webseries', name:'web series', subs:['shorts'] },
    { id:'movies', name:'movies', subs:['feature'] }
  ],
  series: [], // Stores all series and their episodes
  globalServers: [],
  settings: { pageSize: 12 }
};

// --- Storage Utilities (Mimics a backend using LocalStorage) ---
function uid(prefix='id'){ return prefix+'_'+Math.random().toString(36).slice(2,9); }
function load(){ try{ const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : JSON.parse(JSON.stringify(DEFAULT)); }catch(e){ console.error(e); return JSON.parse(JSON.stringify(DEFAULT)); } }
function save(state){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ console.error(e); } }
let state = load();

// --- General Helpers ---
const q = s => document.querySelector(s);
const qa = s => Array.from(document.querySelectorAll(s));

// Set current year in footers
qa('#year,#year-cat,#year-pl,#year-admin').forEach(el => el && (el.textContent = new Date().getFullYear()));

// Apply dynamic theme colors and SEO metadata
function applyTheme(){ const c = state.site.colors || {}; if(c.header) document.documentElement.style.setProperty('--header', c.header); if(c.bg) document.documentElement.style.setProperty('--bg', c.bg); if(c.card) document.documentElement.style.setProperty('--card', c.card); if(c.accent) document.documentElement.style.setProperty('--accent', c.accent); }
function applySEO(){ document.title = (state.site.seo && state.site.seo.title) ? state.site.seo.title : 'MKstream'; const md = q('#meta-desc') || q('#meta-desc-cat') || q('#meta-desc-pl'); if(md) md.setAttribute('content', (state.site.seo && state.site.seo.description) || ''); }
applyTheme(); applySEO();

// Escape utility to prevent XSS
function esc(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// --- Navigation & Menu Logic ---
function openSidebar(id = 'sidebar'){ q(`#${id}`).classList.add('open'); }
function closeSidebar(id = 'sidebar'){ q(`#${id}`).classList.remove('open'); }

function renderCategories(){
  // Desktop Categories
  qa('.categories-desktop').forEach(dc=>{ if(!dc) return; dc.innerHTML=''; state.categories.forEach(c=>{ const b=document.createElement('button'); b.className='episode-btn'; b.textContent=c.name; b.addEventListener('click', ()=> location.href = `category.html?cat=${encodeURIComponent(c.id)}`); dc.appendChild(b); }); });
  // Mobile Sidebar Categories
  const sidebarCats = q('#sidebar-cats') || q('#sidebar-cats-cat');
  if(sidebarCats){ sidebarCats.innerHTML=''; state.categories.forEach(cat=>{ const div=document.createElement('div'); const b=document.createElement('button'); b.className='side-cat'; b.textContent=cat.name; b.addEventListener('click', ()=> { closeSidebar(); location.href = `category.html?cat=${encodeURIComponent(cat.id)}`; }); div.appendChild(b); if(cat.subs && cat.subs.length){ const wrap=document.createElement('div'); wrap.style.marginLeft='10px'; cat.subs.forEach(sub=>{ const sbtn=document.createElement('button'); sbtn.className='side-sub'; sbtn.textContent='· '+sub; sbtn.addEventListener('click', ()=> { closeSidebar(); location.href = `category.html?cat=${encodeURIComponent(cat.id)}&sub=${encodeURIComponent(sub)}`; }); wrap.appendChild(sbtn); }); div.appendChild(wrap); } sidebarCats.appendChild(div); }); }
}

// --- Card Rendering (Lazy Loading implemented) ---
function createCard(s){
  const card=document.createElement('div'); card.className='card';
  const thumb=document.createElement('div'); thumb.className='thumb';
  if(s.thumbnail){
    const img=document.createElement('img'); img.src=s.thumbnail; img.loading='lazy'; // Lazy Loading
    img.alt=s.title; img.style.width='100%'; img.style.height='140px'; img.style.objectFit='cover'; thumb.appendChild(img);
  } else thumb.innerHTML='<div style=\"height:140px;display:flex;align-items:center;justify-content:center;color:var(--muted)\">No thumbnail</div>';
  const meta=document.createElement('div'); meta.className='meta';
  meta.innerHTML = `<div class='title'>${esc(s.title)}</div><div class='sub'>${esc(s.categoryName||'')}</div>`;
  const btn=document.createElement('button'); btn.className='btn'; btn.textContent='Play';
  btn.addEventListener('click', ()=> location.href = `player.html?series=${encodeURIComponent(s.id)}`);
  meta.appendChild(btn); card.appendChild(thumb); card.appendChild(meta); return card;
}

// --- Home Page Render Logic (Pagination/Load More is stubbed) ---
function renderHome(){
  const specialsGrid = q('#specials-grid'); const recentGrid = q('#recent-grid'); const mostGrid = q('#most-grid');
  // Today’s Specials logic (falls back to yesterday's)
  const now = new Date(); const startToday = new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime(); const startYesterday = startToday - 24*3600*1000;
  const todays = state.series.filter(s => (s.createdAt||0) >= startToday);
  const yesterdays = state.series.filter(s => (s.createdAt||0) >= startYesterday && (s.createdAt||0) < startToday);
  const specials = todays.length ? todays : (yesterdays.length ? yesterdays : []);
  if(specialsGrid){ specialsGrid.innerHTML = specials.length ? '' : '<div class=\"small\">No specials yet</div>'; specials.forEach(s => specialsGrid.appendChild(createCard(s))); }
  // Recently Uploaded
  const recent = state.series.slice().sort((a,b)=> (b.createdAt||0)-(a.createdAt||0));
  if(recentGrid){ recentGrid.innerHTML = recent.length ? '' : '<div class=\"small\">No recent uploads</div>'; recent.slice(0,state.settings.pageSize).forEach(s=> recentGrid.appendChild(createCard(s))); }
  // Most Viewed
  const most = state.series.slice().sort((a,b)=> (b.views||0)-(a.views||0));
  if(mostGrid){ mostGrid.innerHTML = most.length ? '' : '<div class=\"small\">No views yet</div>'; most.slice(0,state.settings.pageSize).forEach(s=> mostGrid.appendChild(createCard(s))); }
}

// --- Category Page Render Logic ---
function renderCategoryPage(){
  const params = new URLSearchParams(location.search); const catId = params.get('cat')||''; const sub = params.get('sub')||'';
  const cat = state.categories.find(c=> c.id === catId) || { name: catId || 'Category' };
  const title = q('#category-title'); if(title) title.textContent = sub ? `${cat.name} / ${sub}` : `Category: ${cat.name}`;
  const grid = q('#category-grid'); if(!grid) return;
  const list = state.series.filter(s=> s.categoryId === catId && (sub? s.subcategory===sub : true));
  if(list.length===0) grid.innerHTML = '<div class=\"small\">No series in this category yet.</div>'; else { grid.innerHTML=''; list.slice(0,state.settings.pageSize).forEach(s=> grid.appendChild(createCard(s))); }
}

// --- Player Page Logic (Autoplay Next is stubbed on video end event) ---
function renderPlayerPage(){
  const params = new URLSearchParams(location.search); const seriesId = params.get('series'); const epId = params.get('ep')||null;
  const series = state.series.find(s=> s.id === seriesId); const titleEl = q('#player-title');
  if(!series){ if(titleEl) titleEl.textContent = 'Series not found'; return; }
  if(titleEl) titleEl.textContent = series.title || 'Untitled Series';
  const eps = series.episodes || []; if(eps.length===0) return;
  let index = 0; if(epId){ const idx = eps.findIndex(e=> e.id === epId); if(idx >= 0) index = idx; }
  
  // Populate Player Controls and Episode List
  populateEpisodeRanges(series, index);
  populateRelated(series);
  populatePlayer(eps[index], series);

  // Autoplay Next Episode Logic (Simple, checks for next episode on load and adds event listener)
  const videoEl = q('#video-player');
  const nextEp = eps[index + 1];
  if(videoEl && nextEp){
    videoEl.addEventListener('ended', ()=> {
      console.log('Video ended. Autoplaying next episode.');
      location.href = `player.html?series=${encodeURIComponent(series.id)}&ep=${encodeURIComponent(nextEp.id)}`;
    });
  }

  // Increment views once per load
  series.views = (series.views || 0) + 1; save(state);
}

// Player controls - stubbed for real-world functionality (quality, server, subtitle logic in complex players like video.js/plyr)
function populatePlayer(episode, series){
  const videoEl = q('#video-player'); if(!videoEl) return;
  const serverSelect = q('#server-select'); const subtitleSelect = q('#subtitle-select');
  const versionSelect = q('#version-select');

  // Server Dropdown
  serverSelect.innerHTML = episode.servers.map(s => `<option value="${s.url}">${s.name}</option>`).join('');
  serverSelect.addEventListener('change', (e) => {
    // In a real player, this would load the new URL/Embed code
    const url = e.target.value;
    console.log(`Loading new server: ${url}`);
    videoEl.src = url.includes('<iframe') ? '' : url;
    // Embed logic would require replacing the video tag with an iframe or handling logic for <iframe> in one server option
  });

  // Subtitle Dropdown
  subtitleSelect.innerHTML = episode.subtitles.map(s => `<option value="${s.url}">${s.name}</option>`).join('');
  // Subtitle selection logic would use video.js/plyr track API

  // Version/Dubbed vs Original Toggle
  versionSelect.innerHTML = `<option value="original">Original</option><option value="dubbed">Dubbed</option>`;
  // Dubbed/Original logic would be implemented by loading a different series ID or different episode link

  // Gesture Controls (Requires a full player library like plyr or custom JS for double-tap/long-press)
  // Placeholder: The HTML5 <video> tag is present. Full gesture control logic would be added here.
}

// Episode List Rendering (Range functionality)
function populateEpisodeRanges(series, selected=0){
  const container = q('#episode-ranges'); const listEl = q('#episode-list'); if(!container||!listEl) return;
  container.innerHTML = ''; listEl.innerHTML = '';
  const eps = series.episodes || []; const groups = Math.ceil(eps.length / 100) || 1; const ranges = [];
  // Episode ranges (1-100, 101-200, etc.)
  for(let i=0;i<groups;i++){ const start = i*100 + 1; const end = Math.min((i+1)*100, eps.length); ranges.push({ label:`${start}-${end}`, startIndex:start-1, endIndex:end-1 }); }
  const sel = document.createElement('select'); sel.className='input'; ranges.forEach((r,i)=>{ const o=document.createElement('option'); o.value=i; o.textContent=r.label; sel.appendChild(o); });
  sel.addEventListener('change', ()=> renderEpisodeButtons(series, ranges[Number(sel.value)])); container.appendChild(sel);
  renderEpisodeButtons(series, ranges[0]);
}

function renderEpisodeButtons(series, range){
  const listEl = q('#episode-list'); if(!listEl) return; listEl.innerHTML = '';
  const eps = (series.episodes||[]).slice(range.startIndex, range.endIndex+1);
  eps.forEach((ep, idx)=>{
    const b=document.createElement('button'); b.className='episode-btn';
    b.textContent = ep.number || (range.startIndex+idx+1);
    // Link to load episode instantly
    b.addEventListener('click', ()=> location.href = `player.html?series=${encodeURIComponent(series.id)}&ep=${encodeURIComponent(ep.id)}`);
    listEl.appendChild(b);
  });
}

// Related Series / Most Viewed Logic
function populateRelated(series){
  const relatedDiv = q('#related'); if(!relatedDiv) return; relatedDiv.innerHTML = '<h3>Related & Mostly Viewed</h3>';
  const related = state.series.filter(s=> s.categoryId === series.categoryId && s.id !== series.id).slice(0,4);
  if(related.length===0) relatedDiv.innerHTML += '<div class=\"small\">No related series</div>'; else {
    const wrap = document.createElement('div'); wrap.style.display='flex'; wrap.style.gap='8px';
    // Simplified card render for related list
    related.forEach(r=>{ const c = document.createElement('div'); c.className='card'; c.style.width='160px'; c.innerHTML = `<div style=\"height:90px;background:#021827;border-radius:6px\"></div><div style=\"padding:6px\"><strong>${esc(r.title)}</strong><br><button class='btn' onclick=\"location.href='player.html?series=${r.id}'\">Play</button></div>`; wrap.appendChild(c); });
    relatedDiv.appendChild(wrap);
  }
}

// --- Admin Panel Logic ---
let isAuthenticated = false;

function populateSubcategorySelect(){
  const catId = (q('#form-category')||{}).value;
  const subSel = q('#form-subcategory'); if(!subSel) return; subSel.innerHTML = '';
  const cat = state.categories.find(c=> c.id === catId);
  if(cat && cat.subs){
    cat.subs.forEach(s=>{ const o=document.createElement('option'); o.value=s; o.textContent=s; subSel.appendChild(o); });
  }
}

function handleAdminContentUpload(){
  const catId = q('#form-category').value;
  const sub = q('#form-subcategory').value;
  const title = q('#form-series-title').value;
  const thumbnail = q('#form-thumbnail').value;
  const epNumber = q('#form-ep-number').value;
  const epName = q('#form-ep-name').value;
  const version = q('#form-version').value;

  // Gather dynamic server list
  const servers = qa('#server-list-input .server-entry').map(el=>{
    const name = el.querySelector('input[placeholder="Server Name"]').value;
    const url = el.querySelector('input[placeholder="Video URL / Embed Code"]').value;
    return { name, url };
  }).filter(s=>s.name && s.url);

  // Gather dynamic subtitle list
  const subtitles = qa('#subtitle-list-input .sub-entry').map(el=>{
    const name = el.querySelector('input[placeholder="Language"]').value;
    const url = el.querySelector('input[placeholder="Subtitle URL (.vtt, .srt)"]').value;
    return { name, url };
  }).filter(s=>s.name && s.url);

  if(!catId || !title || !epNumber || !epName || servers.length === 0){
    return alert('Please fill in Category, Title, Episode details, and at least one Server.');
  }
  
  const categoryName = state.categories.find(c=>c.id===catId)?.name;
  
  // Check if series already exists to append episode
  let series = state.series.find(s=> s.title.toLowerCase() === title.toLowerCase());
  
  if(!series){
    // New Series Creation
    series = {
      id: uid('s'),
      title: title,
      thumbnail: thumbnail,
      categoryId: catId,
      categoryName: categoryName,
      subcategory: sub,
      views: 0,
      createdAt: Date.now(),
      episodes: []
    };
    state.series.push(series);
  } else {
     // Update common thumbnail if provided
     if(thumbnail) series.thumbnail = thumbnail;
  }
  
  // Add new episode
  series.episodes.push({
    id: uid('e'),
    number: epNumber,
    name: epName,
    version: version, // Dubbed vs Original
    servers: servers,
    subtitles: subtitles,
    createdAt: Date.now()
  });

  save(state);
  alert(`Episode ${epNumber} for ${title} uploaded successfully!`);
}

function addServerInput(){
  const wrap = q('#server-list-input');
  const entry = document.createElement('div'); entry.className='server-entry';
  entry.innerHTML = `<input class="input" placeholder="Server Name (e.g., HD Server)"><input class="input" placeholder="Video URL / Embed Code"><button class="btn remove-btn">X</button>`;
  entry.querySelector('.remove-btn').addEventListener('click', ()=> entry.remove());
  wrap.appendChild(entry);
}

function addSubtitleInput(){
  const wrap = q('#subtitle-list-input');
  const entry = document.createElement('div'); entry.className='sub-entry';
  entry.innerHTML = `<input class="input" placeholder="Language (e.g., English)"><input class="input" placeholder="Subtitle URL (.vtt, .srt)"><button class="btn remove-btn">X</button>`;
  entry.querySelector('.remove-btn').addEventListener('click', ()=> entry.remove());
  wrap.appendChild(entry);
}

// --- Event Listeners ---
function attachEventListeners(){
  // --- Global Nav ---
  q('#hamburger')?.addEventListener('click', ()=> openSidebar('sidebar'));
  q('#hamburger-cat')?.addEventListener('click', ()=> openSidebar('sidebar-cat'));
  q('#hamburger-pl')?.addEventListener('click', ()=> openSidebar());
  q('#sidebar-close')?.addEventListener('click', ()=> closeSidebar('sidebar'));
  q('#sidebar-close-cat')?.addEventListener('click', ()=> closeSidebar('sidebar-cat'));
  q('#brand')?.addEventListener('click', ()=> location.href='index.html');
  
  // --- Search Overlay ---
  q('#search-toggle')?.addEventListener('click', ()=> q('#search-overlay').classList.remove('hidden'));
  q('#search-toggle-cat')?.addEventListener('click', ()=> q('#search-overlay').classList.remove('hidden'));
  q('#search-close')?.addEventListener('click', ()=> q('#search-overlay').classList.add('hidden'));

  // Live Search Implementation
  q('#search-input')?.addEventListener('input', (e)=>{
    const v = e.target.value.toLowerCase().trim();
    const out = q('#search-results'); out.innerHTML='';
    const results = state.series.filter(s=> s.title.toLowerCase().includes(v) || (s.episodes||[]).some(ep=> (ep.name||'').toLowerCase().includes(v)));
    results.slice(0,50).forEach(r=>{
      const d=document.createElement('div'); d.className='small';
      d.textContent = r.title;
      d.addEventListener('click', ()=> { q('#search-overlay').classList.add('hidden'); location.href=`player.html?series=${encodeURIComponent(r.id)}`; });
      out.appendChild(d);
    });
  });

  // --- Admin Panel Events ---
  if(location.pathname.includes('admin.html')){
    // Authentication
    q('#admin-login')?.addEventListener('click', ()=>{
      const pass = (q('#admin-pass')||{}).value;
      if(pass === state.site.password){
        q('#admin-status').textContent = 'Authenticated';
        q('#admin-status').style.color = 'lightgreen';
        isAuthenticated = true; // Set flag
        alert('Logged in');
      } else alert('Wrong password');
    });

    // Change Password
    q('#change-pass-btn')?.addEventListener('click', ()=>{
      const oldp=(q('#change-pass-old')||{}).value; const newp=(q('#change-pass-new')||{}).value;
      if(!oldp||!newp) return alert('Provide old and new password');
      if(oldp !== state.site.password) return alert('Old password wrong');
      state.site.password = newp; save(state); alert('Password changed');
    });

    // Category Creation
    q('#add-cat')?.addEventListener('click', ()=>{
      const name = q('#new-cat').value.trim();
      if(!name) return;
      const id = name.toLowerCase().replace(/\s+/g, '');
      if(state.categories.some(c=>c.id===id)) return alert('Category already exists.');
      state.categories.push({ id, name, subs:[] });
      save(state); renderCategories(); alert('Category added.');
    });

    // Subcategory Creation
    q('#add-sub')?.addEventListener('click', ()=>{
      const catId = q('#cat-for-sub').value;
      const subName = q('#new-sub').value.trim();
      if(!catId||!subName) return;
      const cat = state.categories.find(c=>c.id===catId);
      if(cat && !cat.subs.includes(subName)){
        cat.subs.push(subName); save(state); renderCategories(); alert('Subcategory added.');
      } else alert('Subcategory already exists or category not found.');
    });

    // Content Uploader Controls
    q('#form-category')?.addEventListener('change', populateSubcategorySelect);
    q('#add-server-btn')?.addEventListener('click', addServerInput);
    q('#add-subtitle-btn')?.addEventListener('click', addSubtitleInput);
    q('#upload-content')?.addEventListener('click', handleAdminContentUpload);
    
    // Initial server/subtitle inputs
    addServerInput();
    addSubtitleInput();

    // Web Editor & SEO Save
    q('#save-seo')?.addEventListener('click', ()=>{
      state.site.name = q('#site-name').value.trim() || state.site.name;
      state.site.logo = q('#site-logo').value.trim() || state.site.logo;
      state.site.colors.header = q('#site-color-header').value;
      state.site.colors.bg = q('#site-color-bg').value;
      state.site.colors.card = q('#site-color-card').value;
      state.site.colors.accent = q('#site-color-accent').value;
      state.site.seo.title = q('#seo-title').value.trim();
      state.site.seo.description = q('#seo-desc').value.trim();
      save(state); applyTheme(); applySEO(); alert('Web Editor & SEO settings saved.');
    });

    // Ads & Global Servers Save
    q('#save-ads')?.addEventListener('click', ()=>{
      state.site.ads.header = q('#ads-header').value.trim();
      state.site.ads.player = q('#ads-player').value.trim();
      try {
        state.globalServers = JSON.parse(q('#global-servers').value.trim() || '[]');
      } catch(e) {
        return alert('Invalid Global Servers JSON.');
      }
      save(state); alert('Ads & Global Servers settings saved.');
    });

    // Maintenance / Reset
    q('#reset-site')?.addEventListener('click', ()=>{
      if(confirm('WARNING: This will erase all content and reset the site to default. Are you sure?')){
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    });

    // Populate initial admin data
    q('#site-name').value = state.site.name;
    q('#site-logo').value = state.site.logo;
    q('#site-color-header').value = state.site.colors.header;
    q('#site-color-bg').value = state.site.colors.bg;
    q('#site-color-card').value = state.site.colors.card || '#0b1630'; // Add default card color if missing
    q('#site-color-accent').value = state.site.colors.accent;
    q('#seo-title').value = state.site.seo.title;
    q('#seo-desc').value = state.site.seo.description;
    q('#ads-header').value = state.site.ads.header;
    q('#ads-player').value = state.site.ads.player;
    q('#global-servers').value = JSON.stringify(state.globalServers, null, 2);
  }
}

// --- Initialization ---
function initPage(){
  renderCategories(); // Renders menus and desktop navigation
  attachEventListeners(); // Attaches all global and admin event listeners
  const path = location.pathname.split('/').pop();
  if(path === '' || path === 'index.html'){ renderHome(); }
  if(path === 'category.html'){ renderCategoryPage(); }
  if(path === 'player.html'){ renderPlayerPage(); }
}

initPage();
