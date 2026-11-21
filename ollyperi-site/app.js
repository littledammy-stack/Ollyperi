/* ---------- placeholder art (inline SVG; shown until a product has a real photo) ---------- */
const PAL = {gadgets:['#1d2b45','#4f6a9a'], footwear:['#5a3b22','#c99d66'], clothing:['#2f4a3c','#8bab97'], appliances:['#2d4650','#86a9b1'], solar:['#c0801a','#f4d27c']};
const GL = {
 phone:'<rect x="150" y="100" width="100" height="190" rx="18"/><circle cx="200" cy="268" r="5"/><path d="M185 122h30"/>',
 laptop:'<rect x="115" y="130" width="170" height="108" rx="8"/><path d="M90 256h220l-14 18H104z"/>',
 buds:'<path d="M130 215a70 70 0 0 1 140 0"/><rect x="118" y="208" width="28" height="56" rx="12"/><rect x="254" y="208" width="28" height="56" rx="12"/>',
 shoe:'<path d="M92 252V216q0-12 14-14l42-6q16-30 48-30l18 24q40 8 80 30q18 10 14 30z"/><path d="M88 266h224"/><path d="M170 186l16 22M196 182l16 22"/>',
 shirt:'<path d="M150 120L108 152l26 36 22-14v108h88V174l22 14 26-36-42-32q-50 28-100 0z"/>',
 solar:'<path d="M112 270l34-112h140l-34 112z"/><path d="M135 216h140M123 243h140M180 158l-24 112M233 158l-24 112"/><circle cx="108" cy="124" r="20"/><path d="M108 88v-12M70 124H58M146 124h12M81 97l-9-9M135 97l9-9"/>',
 box:'<rect x="110" y="140" width="180" height="130" rx="14"/><rect x="130" y="160" width="86" height="90" rx="8"/><circle cx="252" cy="196" r="20"/><path d="M140 270v14M260 270v14"/>',
 fan:'<circle cx="200" cy="180" r="72"/><circle cx="200" cy="180" r="9"/><path d="M200 171q-12-46 22-58M209 180q46-12 58 22M200 189q12 46-22 58M191 180q-46 12-58-22"/><path d="M200 252v46M158 300h84"/>'
};
const artC = {};
function art(p) {
  const key = p.id + '|' + p.g + '|' + p.pal + '|' + p.cat + '|' + p.sub;
  if (artC[key]) return artC[key];
  const [a, b] = PAL[p.pal] || PAL[p.cat] || PAL.gadgets, k = (p.n || 0) % 4;
  const g = [[0,0,1,1],[1,0,0,1],[0,1,1,0],[.5,0,.5,1]][k];
  const cx = [80,320,330,70][k], cy = [90,100,320,310][k], r = [110,130,100,140][k];
  const cap = (p.sub || '').toUpperCase() + (LIVE ? '' : ' · SAMPLE');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g" x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="400" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" fill-opacity=".09"/><g fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".95">${GL[p.g] || GL.box}</g><text x="200" y="44" text-anchor="middle" font-family="Georgia,serif" font-size="16" letter-spacing="3" fill="#fff" fill-opacity=".75">${esc(cap)}</text></svg>`;
  return artC[key] = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
const pimg = (p, i) => (p.images && p.images[i || 0]) || art(p);
const palt = p => p.images && p.images.length ? p.name : p.name + (LIVE ? '' : ' (sample image)');
const avail = p => !!p && p.active !== false && p.inStock !== false;
const anyProduct = id => byId(id) || (adm.pm.list || []).find(p => p.id === id) || (adm.pm.edit && adm.pm.edit.id === id ? adm.pm.edit : null);

/* ---------- state ---------- */
const cart = () => store.get('cart', []);
const ui = {modal: null, opt: '', qty: 1, drawer: false, img: 0, lastFocus: null};
const shop = {q: '', sort: 'feat', sub: '', cat: '', limit: 48};
const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const pw = (id, name, label, auto) => `<label class="fl">${label}<span class="pw"><input name="${name}" id="${id}" type="password" autocomplete="${auto}" required><button class="pwbtn" type="button" data-showpw aria-label="Show password" aria-pressed="false">Show</button></span></label>`;
const adm = {tab: 'orders', status: 'New', q: '', page: 0, size: 25, sel: new Set(), summary: null, list: {rows: [], total: 0}, csv: '',
  pm: {list: null, q: '', edit: null, isNew: false, orig: [], uploaded: [], busy: false, sale: false}};
const catalogue = {ready: false, failed: false, stale: false};
let draft = store.get('draft', {}), lastOrder = null, authTab = 'login', next = null, coRef = null, lastRoute = '', keepSub = false, pendingEmail = '';

/* ---------- catalogue ---------- */
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out. Check your internet and try again.')), ms))]);
async function loadCatalogue() {
  try { const l = await withTimeout(api.products.list(), 9000); setProducts(l); store.set('pcache', l); catalogue.failed = false; catalogue.stale = false; }
  catch (e) {
    const c = store.get('pcache', null);
    if (c && c.length) { setProducts(c.map(normProduct)); catalogue.failed = false; catalogue.stale = true; }
    else if (!LIVE) { setProducts(seedProducts()); catalogue.failed = false; }
    else { setProducts([]); catalogue.failed = true; }
  }
  catalogue.ready = true; cleanCart();
}
function cleanCart() { const c = cart(), k = c.filter(l => byId(l.id)); if (k.length !== c.length) store.set('cart', k); }

/* ---------- cart ---------- */
const cartLines = () => cart().map((l, i) => ({i, l, p: byId(l.id)})).filter(x => x.p);
const cartCount = () => cartLines().reduce((s, x) => s + x.l.qty, 0);
const cartTotal = () => cartLines().filter(x => avail(x.p)).reduce((s, x) => s + x.p.price * x.l.qty, 0);
const cartBlocked = () => cartLines().some(x => !avail(x.p));
function addToCart(id, opt, qty) { const c = cart(); const l = c.find(x => x.id === id && x.opt === opt); if (l) l.qty = Math.min(50, l.qty + qty); else c.push({id, opt, qty}); store.set('cart', c); updateHeader(); }

/* ---------- header ---------- */
const NAV = [['shop', 'Shop all']].concat(Object.keys(CATS).map(k => [k, CATS[k].nav]));
const navItems = () => NAV.concat(P.some(p => p.active && p.compare > 0) ? [['deals', 'Deals']] : []);
const route = () => (location.hash.slice(1) || 'home').toLowerCase();
const TITLES = {home: 'Ollyperi', deals: 'Deals | Ollyperi', shop: 'Shop all | Ollyperi', account: 'My account | Ollyperi', checkout: 'Checkout | Ollyperi', done: 'Order | Ollyperi', admin: 'Admin | Ollyperi', reset: 'Reset password | Ollyperi', delivery: 'Delivery and returns | Ollyperi', privacy: 'Privacy | Ollyperi'};
const IC = {
  shop: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  gadgets: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>',
  footwear: '<path d="M3 16.5V13l5-1.2 3-4 3 2c3 .6 5 1.6 7 3.2v3.5z"/><path d="M3 19.5h18"/>',
  clothing: '<path d="M8.5 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5.5-3a3.5 3.5 0 0 1-7 0z"/>',
  appliances: '<rect x="4" y="2.5" width="16" height="19" rx="2.2"/><circle cx="12" cy="13.5" r="4.2"/><path d="M8 6.5h.01M11.5 6.5h.01"/>',
  deals: '<path d="M20.5 12.5l-8 8-9-9V3.5h8z"/><circle cx="7.8" cy="7.8" r="1.3"/>'
};
const ico = (k, cls) => `<svg class="${cls || 'ic'}" viewBox="0 0 24 24" aria-hidden="true">${IC[k] || IC.shop}</svg>`;
function acctMenuHTML() {
  const u = api.user;
  if (!u) return `<a class="btn primary block" href="#account" data-authgo="login" role="menuitem">Sign in</a><div class="ddsep"></div><a href="#account" data-authgo="signup" role="menuitem">Create an account</a><a href="#account" data-authgo="login" role="menuitem">My orders</a><div class="ddnote">Create an account to save your details and see your orders.</div>`;
  return `<div class="ddhi">Hi, ${esc(first(u.name))}<small>${esc(u.email)}</small></div><a href="#account" role="menuitem">My account</a><a href="#account" role="menuitem">My orders</a>${u.isAdmin ? '<a href="#admin" role="menuitem"><b>Admin dashboard</b></a>' : ''}<div class="ddsep"></div><button type="button" data-logout role="menuitem">Log out</button>`;
}
function closeMenus() { document.querySelectorAll('.dd.open').forEach(d => { d.classList.remove('open'); const b = d.querySelector('[data-dd]'); if (b) b.setAttribute('aria-expanded', 'false'); }); }
function updateHeader() {
  const r = route(), items = navItems();
  $('#navDesk').innerHTML = items.map(([h, t]) => `<a href="#${h}" class="${h === 'deals' ? 'deal' : ''}" ${r === h ? 'aria-current="page"' : ''}>${ico(h === 'shop' ? 'shop' : h)}${t}</a>`).join('');
  $('#navMob').innerHTML = items.map(([h, t]) => `<a href="#${h}" class="${h === 'deals' ? 'deal' : ''}" ${r === h ? 'aria-current="page"' : ''}>${t}</a>`).join('');
  const n = cartCount(), c = $('#cartCount'); c.textContent = n; c.hidden = !n;
  const c2 = $('#cartCount2'); if (c2) { c2.textContent = n; c2.hidden = !n; }
  document.querySelectorAll('#tabbar [data-tab]').forEach(a => { const on = a.dataset.tab === (r === 'home' ? 'home' : r === 'deals' ? 'deals' : r === 'account' || r === 'reset' ? 'account' : (r === 'shop' || CATS[r] || r.startsWith('item-')) ? 'shop' : ''); a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const u = api.user, tl = $('#tabAcct'); if (tl) tl.textContent = u ? first(u.name) : 'Account';
  $('#acctLabel').textContent = u ? 'Hi, ' + first(u.name) : 'Account';
  $('#acctMenu').innerHTML = acctMenuHTML();
  $('#demoBar').hidden = api.live;
  document.title = CATS[r] ? CATS[r].name + ' | Ollyperi' : (TITLES[r] || (r.startsWith('item-') && byId(r.slice(5)) ? byId(r.slice(5)).name + ' | Ollyperi' : 'Ollyperi'));
}

/* ---------- storefront views ---------- */
const priceHTML = p => `<div class="pr"><b class="price">${money(p.price)}</b>${p.compare ? `<s class="was">${money(p.compare)}</s>` : ''}</div>`;
const card = p => { const ok = avail(p), off = pctOff(p); return `<article class="card ${ok ? '' : 'soldout'}"><div class="imgw"><button class="imgbtn" data-open="${esc(p.id)}" aria-label="View ${esc(p.name)}"><img src="${esc(pimg(p))}" data-pid="${esc(p.id)}" alt="${esc(palt(p))}" loading="lazy"></button>${off && ok ? `<span class="off">-${off}%</span>` : ''}</div><div class="cbody">${!ok ? '<span class="badge out">Sold out</span>' : p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ''}<span class="sub">${esc(p.sub)}</span><button class="title" data-open="${esc(p.id)}">${esc(p.name)}</button><div class="crow">${priceHTML(p)}<button class="add" data-add="${esc(p.id)}" ${ok ? '' : 'disabled'} aria-label="Add ${esc(p.name)} to cart">${!ok ? 'Sold out' : p.opts ? 'Choose' : 'Add'}</button></div></div></article>`; };
const skel = n => Array.from({length: n}, () => '<div class="card sk"><div class="imgw"></div><div class="cbody"><i></i><i></i><i class="s"></i></div></div>').join('');
const loadingView = () => `<section class="block"><div class="wrap"><div class="grid" aria-busy="true" aria-label="Loading products">${skel(8)}</div></div></section>`;
const failedView = () => '<section class="block"><div class="wrap" style="max-width:560px"><h1 style="font-size:2.2rem;margin-bottom:10px">We could not load the products</h1><p class="muted" style="margin-bottom:16px">Check your internet connection and try again.</p><button class="btn primary" data-reload>Try again</button></div></section>';

const GRAD = {gadgets: ['#1d2b45', '#4f6a9a'], footwear: ['#5a3b22', '#c99d66'], clothing: ['#2f4a3c', '#8bab97'], appliances: ['#2d4650', '#86a9b1'], solar: ['#c0801a', '#f4d27c'], deals: ['#7a1f16', '#d4523f'], wa: ['#0f5b30', '#2fa866']};
const glyphSvg = (g, cls) => `<svg class="${cls}" viewBox="0 0 400 400" aria-hidden="true"><g fill="#fff" fill-opacity=".14" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".95">${GL[g] || GL.box}</g></svg>`;
const bg = k => `background:linear-gradient(135deg,${GRAD[k][0]},${GRAD[k][1]})`;
function slideArt(cat, glyph, act) { const p = act.find(x => x.cat === cat && x.images.length); return p ? `<img class="sl-img" src="${esc(p.images[0])}" data-pid="${esc(p.id)}" alt="">` : glyphSvg(glyph, 'sl-art'); }
function slides(act, deals) {
  const list = [];
  if (deals.length) { const top = Math.max(...deals.map(pctOff)); list.push({k: 'deals', eye: 'Deals right now', h: `Up to ${top}% off`, t: 'Prices just dropped on selected items. Grab them while they last.', cta: 'Shop deals', href: '#deals', art: glyphSvg('box', 'sl-art')}); }
  list.push({k: 'gadgets', eye: 'Gadgets', h: 'Phones, laptops and accessories', t: 'Genuine devices, honest prices, delivered nationwide.', cta: 'Shop gadgets', href: '#gadgets', art: slideArt('gadgets', 'phone', act)});
  list.push({k: 'footwear', eye: 'Our signature', h: 'Handmade footwear, made to your size', t: 'Palms, slippers, sandals and shoes, cut and stitched by hand.', cta: 'Shop footwear', href: '#footwear', art: slideArt('footwear', 'shoe', act)});
  list.push({k: 'solar', eye: 'Solar power', h: 'Keep the lights on with solar', t: 'Panels, inverters and batteries. Tell us your appliances and we size it for you.', cta: 'See solar', href: '#solar', art: glyphSvg('solar', 'sl-art')});
  list.push({k: 'wa', eye: 'Easy ordering', h: 'Order on WhatsApp in 2 minutes', t: 'Fill your cart, tap once, and your order arrives in our chat ready to confirm.', cta: 'Start shopping', href: '#shop', art: glyphSvg('phone', 'sl-art')});
  return `<div class="carousel" id="car" aria-roledescription="carousel" aria-label="Featured offers"><div class="slides" id="slides" tabindex="0">${list.map((x, i) => `<a class="slide" href="${x.href}" style="${bg(x.k)}" aria-label="${esc(x.h)}" ${i ? 'tabindex="-1"' : ''}><div class="sl-txt"><span class="sl-eye">${x.eye}</span><b class="sl-h">${esc(x.h)}</b><span class="sl-t">${esc(x.t)}</span><span class="sl-cta">${x.cta} <i>→</i></span></div><div class="sl-pic">${x.art}</div></a>`).join('')}</div><div class="dots" id="dots">${list.map((x, i) => `<button type="button" data-dot="${i}" class="${i ? '' : 'on'}" aria-label="Slide ${i + 1}"></button>`).join('')}</div></div>`;
}
let carTimer = null;
function stopCarousel() { if (carTimer) { clearInterval(carTimer); carTimer = null; } }
function initCarousel() {
  stopCarousel(); const el = $('#slides'); if (!el) return;
  const n = el.children.length, go = i => { el.scrollTo({left: el.clientWidth * i, behavior: 'smooth'}); };
  const cur = () => Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
  el.addEventListener('scroll', () => { const i = cur(); document.querySelectorAll('#dots [data-dot]').forEach((d, k) => d.classList.toggle('on', k === i)); }, {passive: true});
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const start = () => { stopCarousel(); carTimer = setInterval(() => { if (!document.hidden && route() === 'home') go((cur() + 1) % n); }, 5500); };
  ['pointerdown', 'focusin', 'mouseenter'].forEach(ev => el.addEventListener(ev, stopCarousel)); ['mouseleave', 'pointerup'].forEach(ev => el.addEventListener(ev, start)); start();
}
const subTile = (cat, sub, act) => { const l = act.filter(p => p.cat === cat && p.sub === sub), p = l.find(x => x.images.length) || l[0]; if (!l.length) return ''; const g = p.g || GLYPH_DEFAULT[cat], gk = cat === 'appliances' && sub === 'Solar' ? 'solar' : cat; return `<a class="ptile" href="#${cat}" data-gosub="${esc(cat + '|' + sub)}" style="${bg(gk)}"><b>${esc(sub)}</b><small>${l.length} item${l.length === 1 ? '' : 's'}</small>${p.images.length ? `<img src="${esc(p.images[0])}" data-pid="${esc(p.id)}" alt="">` : glyphSvg(g, 'pt-art')}</a>`; };
function viewHome() {
  const act = P.filter(p => p.active);
  let feat = act.filter(p => p.featured && avail(p)).slice(0, 12); if (feat.length < 4) feat = act.slice(0, 10);
  const deals = act.filter(p => p.compare > 0 && avail(p)).sort((a, b) => pctOff(b) - pctOff(a)).slice(0, 12);
  const keys = Object.keys(CATS).filter(k => act.some(p => p.cat === k));
  const side = `<aside class="sidecats" aria-label="Categories"><b class="sc-h">Categories</b>${keys.map(k => `<a href="#${k}">${ico(k)}<span>${CATS[k].name}</span><i>›</i></a>`).join('')}${deals.length ? `<a class="deal" href="#deals">${ico('deals')}<span>Deals</span><i>›</i></a>` : ''}</aside>`;
  const promo = `<aside class="sidepromo"><a class="sp sp-wa" href="https://wa.me/${WA}?text=${encodeURIComponent('Hello Ollyperi, I need help choosing a product.')}" target="_blank" rel="noopener"><b>Need help choosing?</b><span>Chat with us on WhatsApp</span></a><a class="sp sp-del" href="#delivery"><b>Delivery nationwide</b><span>Fee confirmed before you pay</span></a></aside>`;
  const circles = `<div class="circles">${keys.map(k => `<a href="#${k}"><span style="${bg(k)}">${ico(k)}</span>${CATS[k].nav}</a>`).join('')}${deals.length ? `<a href="#deals"><span style="${bg('deals')}">${ico('deals')}</span>Deals</a>` : ''}</div>`;
  const tiles = keys.flatMap(k => subsFor(k).map(sub => subTile(k, sub, act))).filter(Boolean).slice(0, 14);
  const row = (title, list, href, cls) => `<section class="block tight"><div class="wrap"><div class="shead"><h2 class="h2s">${title}</h2>${href ? `<a href="${href}" class="seeall">See all <i>→</i></a>` : ''}</div><div class="rail ${cls || ''}">${list.map(card).join('')}</div></div></section>`;
  return `<section class="hero2"><div class="wrap hgrid">${side}${slides(act, deals)}${promo}</div></section>
  ${circles}
  <section class="strip"><div class="wrap perks"><div><b>Order on WhatsApp</b><span>Quick and personal</span></div><div><b>Delivery nationwide</b><span>Fee confirmed before you pay</span></div><div><b>Pay after we confirm</b><span>No surprises</span></div><div><b>Save your details</b><span>One tap checkout</span></div></div></section>
  ${deals.length ? row('Deals right now', deals, '#deals', 'deals') : ''}
  ${tiles.length ? `<section class="block tight"><div class="wrap"><div class="shead"><h2 class="h2s">Shop by type</h2></div><div class="rail tiles">${tiles.join('')}</div></div></section>` : ''}
  ${feat.length ? row('Top picks', feat, '#shop') : ''}
  ${keys.map(k => row(CATS[k].name, act.filter(p => p.cat === k).slice(0, 10), '#' + k)).join('')}
  <section class="block"><div class="wrap pillars">
    <div><h3>Order on WhatsApp</h3><p class="muted">Fill your cart, tap once, and your order lands in our chat with every detail filled in.</p></div>
    <div><h3>Delivery nationwide</h3><p class="muted">We deliver across the country. We confirm your delivery fee and timing on WhatsApp before you pay.</p></div>
    <div><h3>Save your details</h3><p class="muted">Create an account once. Your name, phone and address are filled in every time after that.</p></div>
  </div></section>`;
}

function filtered() {
  let l = P.filter(p => p.active && (!shop.cat || (shop.cat === 'deals' ? p.compare > 0 : p.cat === shop.cat)) && (!shop.sub || p.sub === shop.sub));
  const q = shop.q.trim().toLowerCase(); if (q) l = l.filter(p => (p.name + ' ' + p.sub + ' ' + p.desc).toLowerCase().includes(q));
  if (shop.sort === 'lo') l = [...l].sort((a, b) => a.price - b.price);
  if (shop.sort === 'hi') l = [...l].sort((a, b) => b.price - a.price);
  return l;
}
function refreshGrid() { const g = $('#grid'); if (!g) return; g.innerHTML = gridHTML(); const n = filtered().length, r = $('#rcount'); if (r) r.textContent = n + (n === 1 ? ' product' : ' products'); document.querySelectorAll('[data-sort]').forEach(b => { const on = b.dataset.sort === shop.sort; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }
function gridHTML() {
  const l = filtered();
  if (!l.length) return `<p class="muted" style="grid-column:1/-1">${P.length ? 'Nothing matches that search. Try a different word or clear the filters.' : 'No products yet. Please check back soon.'}</p>`;
  return l.slice(0, shop.limit).map(card).join('') + (l.length > shop.limit ? `<div style="grid-column:1/-1;text-align:center"><button class="btn" data-more>Show more (${l.length - shop.limit} left)</button></div>` : '');
}
function viewShop(cat) {
  if (shop.cat !== cat) { shop.cat = cat; shop.sub = ''; if (!shop.keepq) shop.q = ''; shop.limit = 48; } shop.keepq = false;
  const c = CATS[cat], deals = cat === 'deals';
  const chips = `<a class="chip" href="#shop" ${!cat ? 'aria-current="page"' : ''}>All</a>` + Object.keys(CATS).map(k => `<a class="chip" href="#${k}" ${cat === k ? 'aria-current="page"' : ''}>${CATS[k].name}</a>`).join('') + (P.some(p => p.active && p.compare > 0) ? `<a class="chip deal" href="#deals" ${deals ? 'aria-current="page"' : ''}>Deals</a>` : '');
  const subs = c ? `<div class="chips" style="margin-top:0"><button class="chip ${!shop.sub ? 'on' : ''}" data-sub="">All</button>${subsFor(cat).map(s => `<button class="chip ${shop.sub === s ? 'on' : ''}" data-sub="${esc(s)}">${esc(s)}</button>`).join('')}</div>` : '';
  const solar = (cat === 'appliances' && shop.sub === 'Solar') ? `<div class="trust"><div><b>We size it for you</b>Send your appliance list on WhatsApp and we recommend the right system.</div><div><b>Installation quotes</b>Ask for a quote on any product or kit.</div><div><b>Warranty on every item</b>Terms are confirmed with you before you pay.</div></div>` : '';
  const n = filtered().length;
  return `<section class="shophead"><div class="wrap"><span class="eyebrow">${deals ? 'Limited time' : c ? 'Category' : 'Catalogue'}</span><h1 style="font-size:clamp(2rem,5vw,3rem);margin-top:6px">${deals ? 'Deals' : c ? c.name : 'Shop all'}</h1><p class="muted" style="margin-top:6px">${deals ? 'Prices that just dropped. Grab them while they last.' : c ? c.blurb : 'Four categories, one cart.'}</p>${catalogue.stale ? '<p class="muted" style="margin-top:8px;font-size:13px">You are seeing a saved copy of the catalogue. Prices and stock are confirmed when we reply on WhatsApp.</p>' : ''}<div class="chips">${chips}</div>${subs}${solar}
  <div class="tools"><input id="q" type="search" placeholder="Search in this list" value="${esc(shop.q)}" aria-label="Search products"><div class="seg" role="group" aria-label="Sort products"><button data-sort="feat" class="${shop.sort === 'feat' ? 'on' : ''}" aria-pressed="${shop.sort === 'feat'}">Featured</button><button data-sort="lo" class="${shop.sort === 'lo' ? 'on' : ''}" aria-pressed="${shop.sort === 'lo'}">Price: low</button><button data-sort="hi" class="${shop.sort === 'hi' ? 'on' : ''}" aria-pressed="${shop.sort === 'hi'}">Price: high</button></div></div>
  <p class="muted" id="rcount" style="font-size:13px;margin:-8px 0 14px">${n} ${n === 1 ? 'product' : 'products'}</p>
  <div class="grid" id="grid">${gridHTML()}</div></div></section>`;
}

const stateOpts = sel => STATES.map(s => `<option ${sel === s ? 'selected' : ''}>${s}</option>`).join('');
function viewAccount() {
  const u = api.user;
  if (!u) {
    const pre = authTab === 'signup' ? draft : {};
    const tabs = `<div class="tabs"><button class="chip ${authTab === 'login' || authTab === 'forgot' ? 'on' : ''}" data-auth="login">Log in</button><button class="chip ${authTab === 'signup' || authTab === 'pending' ? 'on' : ''}" data-auth="signup">Create account</button></div>`;
    let form;
    if (authTab === 'pending') form = `<div><h3 style="font-size:26px;margin-bottom:8px">Check your email</h3><p class="muted" style="margin-bottom:14px">We sent a confirmation link to <b style="color:var(--ink)">${esc(pendingEmail)}</b>. Tap the link, then come back and log in. Look in your spam folder if you do not see it.</p><div class="row"><button class="btn" data-resend="${esc(pendingEmail)}">Send it again</button><button class="btn ghost" data-auth="login">Back to log in</button></div><div class="err" role="alert" id="pendErr" style="margin-top:8px"></div></div>`;
    else if (authTab === 'forgot') form = `<form class="form" data-form="forgot" novalidate><p class="muted">Enter your email and we will send you a link to choose a new password.</p><label class="fl">Email<input name="email" id="fe" type="email" autocomplete="email" required></label><div class="err" role="alert"></div><div class="okmsg" role="status"></div><button class="btn primary block" type="submit">Send reset link</button><button class="btn ghost block" type="button" data-auth="login">Back to log in</button></form>`;
    else if (authTab === 'login') form = `<form class="form" data-form="login" novalidate>
      <label class="fl">Email<input name="email" id="le" type="email" autocomplete="email" required></label>
      ${pw('lp', 'pass', 'Password', 'current-password')}
      <div class="err" role="alert"></div><button class="btn ghost sm" type="button" data-resend-login hidden>Send the confirmation email again</button>
      <button class="btn primary block" type="submit">Log in</button><button class="linkbtn" type="button" data-auth="forgot">Forgot your password?</button></form>`;
    else form = `<form class="form" data-form="signup" novalidate>
      <label class="fl">Full name<input name="name" id="sn" autocomplete="name" value="${esc(pre.name)}" required></label>
      <div class="f2"><label class="fl">Phone<input name="phone" id="sp" type="tel" autocomplete="tel" value="${esc(pre.phone)}" placeholder="0803 000 0000" required></label>
      <label class="fl">Email<input name="email" id="se" type="email" autocomplete="email" value="${esc(pre.email)}" required></label></div>
      ${pw('sw', 'pass', 'Password (6 or more characters)', 'new-password')}
      <div class="err" role="alert"></div><button class="btn primary block" type="submit">Create my account</button></form>`;
    return `<section class="block"><div class="wrap two" style="max-width:920px"><div class="panel">${tabs}${form}</div>
    <div><h2 style="font-size:30px;margin-bottom:10px">Why create an account</h2>
      <div class="perk"><i>✓</i><span>Your name, phone and delivery address are saved, so checkout is one tap.</span></div>
      <div class="perk"><i>✓</i><span>See every order you have placed and its status.</span></div>
      <div class="perk"><i>✓</i><span>Reorder your favourites without searching again.</span></div>
      <p class="muted" style="margin-top:10px;font-size:13px">You can also order without an account at any time.</p></div></div></section>`;
  }
  return `<section class="block"><div class="wrap" style="max-width:920px"><span class="eyebrow">My account</span><h1 style="font-size:clamp(2rem,5vw,3rem);margin:6px 0 18px">Hello, ${esc(first(u.name))}</h1>
  <div class="two"><div class="panel"><h3 style="font-size:24px;margin-bottom:12px">Saved details</h3><form class="form" data-form="details" novalidate>
    <label class="fl">Full name<input name="name" id="dn" value="${esc(u.name)}" required></label>
    <div class="f2"><label class="fl">Phone<input name="phone" id="dp" type="tel" value="${esc(u.phone)}" required></label><label class="fl">Email<input id="de" value="${esc(u.email)}" disabled></label></div>
    <label class="fl">Delivery address<textarea name="address" id="da" rows="2">${esc(u.address)}</textarea></label>
    <div class="f2"><label class="fl">City or town<input name="city" id="dc" value="${esc(u.city)}"></label><label class="fl">State<select name="state" id="ds"><option value="">Select state</option>${stateOpts(u.state)}</select></label></div>
    <div class="err" role="alert"></div><div class="row"><button class="btn primary" type="submit">Save details</button><button class="btn" type="button" data-logout>Log out</button>${u.isAdmin ? '<a class="btn gold" href="#admin">Admin dashboard</a>' : ''}</div></form></div>
  <div class="panel"><h3 style="font-size:24px;margin-bottom:12px">My orders</h3><div id="myOrders" class="muted">Loading your orders…</div></div></div></div></section>`;
}
async function fillMyOrders() {
  const el = $('#myOrders'); if (!el) return;
  try {
    const os = await api.myOrders();
    el.className = '';
    el.innerHTML = os.length ? os.map(o => `<div style="padding:10px 0;border-top:1px solid var(--line)"><div class="row" style="justify-content:space-between"><b>${esc(o.ref)}</b><span class="pill ${o.status.toLowerCase()}">${esc(o.status)}</span></div><div class="muted" style="font-size:13px">${dlong(o.date)} · ${o.items.reduce((s, i) => s + i.qty, 0)} items · ${money(o.total)}</div></div>`).join('') : '<p class="muted">No orders yet. Your orders will show up here.</p>';
  } catch (e) { el.textContent = 'Could not load your orders. Refresh to try again.'; }
}
function viewReset() {
  if (!api.recovering) return `<section class="block"><div class="wrap" style="max-width:520px"><h1 style="font-size:2.2rem;margin-bottom:10px">This reset link has expired</h1><p class="muted" style="margin-bottom:16px">Reset links work once and expire after a while. Request a fresh one.</p><a class="btn primary" href="#account" data-forgot-link>Request a new link</a></div></section>`;
  return `<section class="block"><div class="wrap" style="max-width:460px"><span class="eyebrow">Almost done</span><h1 style="font-size:2.2rem;margin:6px 0 14px">Choose a new password</h1><form class="panel form" data-form="reset" novalidate>${pw('rp', 'pass', 'New password (6 or more characters)', 'new-password')}${pw('rp2', 'pass2', 'Type it again', 'new-password')}<div class="err" role="alert"></div><button class="btn primary block" type="submit">Save new password</button></form></div></section>`;
}

function viewPolicy(kind) {
  const body = kind === 'delivery'
    ? `<h1>Delivery and returns</h1><h3>Delivery</h3><p>We deliver nationwide. The delivery fee and timing depend on where you are and what you order, and we confirm both with you on WhatsApp before you pay.</p><p>Handmade footwear is made to your size, so it can take a little longer than items we hold in stock.</p><h3>How ordering works</h3><p>Send your order on WhatsApp. We confirm that the items are available, agree the delivery fee with you, and give you payment details. An order is only final once we have confirmed it with you.</p><h3>Problems with your order</h3><p>If something arrives damaged or not as described, message us on WhatsApp as soon as you notice, with photos. We will work out a replacement or refund with you.</p><p>Questions? WhatsApp or call ${WA_SHOW}.</p>`
    : `<h1>Privacy</h1><p>This explains what we collect and why.</p><h3>What we collect</h3><p>When you order or create an account we collect your name, phone number, delivery address and, if you give it, your email. If you create an account we also keep your order history.</p><h3>Why</h3><p>Only to confirm and deliver your orders, contact you about them, and save you retyping your details next time.</p><h3>Where it is kept</h3><p>Your details are stored securely with our database provider, Supabase. Only the people who run Ollyperi can see customer information. Passwords are never visible to us.</p><h3>Your choices</h3><p>You can change your saved details on your account page at any time. To see, correct or delete your data, message us on WhatsApp at ${WA_SHOW}.</p>`;
  return `<section class="block"><div class="wrap prose">${body}<p style="margin-top:20px"><a class="btn ghost" href="#home">Back to shop</a></p></div></section>`;
}

function viewCheckout() {
  const lines = cartLines();
  if (!lines.length) return `<section class="block"><div class="wrap" style="max-width:640px"><h1 style="font-size:2.4rem">Your cart is empty</h1><p class="muted" style="margin:10px 0 18px">Add something you like and come back here.</p><a class="btn primary" href="#shop">Browse products</a></div></section>`;
  if (!coRef) coRef = 'OLY-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const u = api.user, d = u ? {name: u.name, phone: u.phone, email: u.email, address: u.address, city: u.city, state: u.state, note: draft.note || ''} : draft;
  const blocked = cartBlocked();
  const rows = lines.map(({l, p}) => `<div class="sumline"><span>${l.qty} × ${esc(p.name)}${l.opt ? ` <span class="muted">(${esc(l.opt)})</span>` : ''}${avail(p) ? '' : ' <span class="badge out">Sold out</span>'}</span><span class="price">${avail(p) ? money(p.price * l.qty) : '—'}</span></div>`).join('');
  return `<section class="block"><div class="wrap"><h1 style="font-size:clamp(2rem,5vw,3rem);margin-bottom:6px">Checkout</h1>
  ${u ? '<p class="muted" style="margin-bottom:18px">Your saved details are filled in. Change anything you need.</p>' : `<div class="note" style="margin-bottom:18px">Have an account? <a href="#account" data-next="checkout"><b>Log in</b></a> and we fill this in for you.</div>`}
  <div class="two"><form class="panel form" id="coForm" novalidate>
    <label class="fl">Full name<input name="name" id="cn" autocomplete="name" value="${esc(d.name)}" required></label>
    <div class="f2"><label class="fl">Phone (WhatsApp)<input name="phone" id="cp" type="tel" autocomplete="tel" value="${esc(d.phone)}" required></label><label class="fl">Email (optional)<input name="email" id="ce" type="email" autocomplete="email" value="${esc(d.email)}"></label></div>
    <label class="fl">Delivery address<textarea name="address" id="ca" rows="2" autocomplete="street-address" required>${esc(d.address)}</textarea></label>
    <div class="f2"><label class="fl">City or town<input name="city" id="cc" value="${esc(d.city)}"></label><label class="fl">State<select name="state" id="cs" required><option value="">Select state</option>${stateOpts(d.state)}</select></label></div>
    <label class="fl">Note for us (optional)<textarea name="note" id="cm" rows="2" placeholder="Preferred colour, delivery time, landmark">${esc(d.note)}</textarea></label>
    ${u ? '<label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" name="save" id="csave" checked> Save these as my delivery details</label>' : ''}
  </form>
  <div class="panel"><h3 style="font-size:24px;margin-bottom:8px">Order summary</h3>${rows}
    <div class="sumline"><span class="muted">Delivery</span><span class="muted">Confirmed on WhatsApp</span></div>
    <div class="sumline tot"><span>Subtotal</span><span class="price">${money(cartTotal())}</span></div>
    <div style="display:grid;gap:10px;margin-top:14px">
      <div class="opt on"><span>●</span><div><b>Order on WhatsApp</b><div class="muted" style="font-size:13px">We confirm stock, delivery fee and payment details in chat.</div></div></div>
      <div class="opt" aria-disabled="true"><span>○</span><div><b>Pay online</b><div class="muted" style="font-size:13px">Card and bank transfer. Coming soon.</div></div></div>
    </div>
    ${blocked ? '<div class="note" style="margin-top:12px">Some items in your cart are sold out. Remove them from your cart to continue.</div>' : ''}
    <div class="err" id="coErr" role="alert" style="margin-top:10px"></div>
    <a class="btn wa block" id="waBtn" href="https://wa.me/${WA}" target="_blank" rel="noopener" data-wa ${blocked ? 'aria-disabled="true"' : ''}>Send order on WhatsApp</a>
  </div></div></div></section>`;
}
/* The WhatsApp link is rebuilt every time the form changes, so the message is already
   attached to the link before the customer taps it. */
function checkoutData() {
  const f = $('#coForm'); if (!f) return null;
  const d = Object.fromEntries(new FormData(f));
  const items = cartLines().filter(x => avail(x.p)).map(({l, p}) => ({id: p.id, name: p.name, price: p.price, qty: l.qty, opt: l.opt}));
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const name = (d.name || '').trim(), phone = (d.phone || '').trim(), addr = (d.address || '').trim(), city = (d.city || '').trim(), note = (d.note || '').trim();
  const msg = `Hello Ollyperi, I'd like to place an order.\nOrder ref: ${coRef}\n\n` + items.map(i => `${i.qty}x ${i.name}${i.opt ? ` (${i.opt})` : ''} - ${money(i.price * i.qty)}`).join('\n') +
    `\n\nSubtotal: ${money(total)}\n\nName: ${name}\nPhone: ${phone}\nAddress: ${addr}${city ? ', ' + city : ''}${d.state ? ', ' + d.state : ''}${note ? '\nNote: ' + note : ''}`;
  return {d, items, total, name, phone, addr, city, note, msg, url: `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`};
}
function refreshWaLink() { const a = $('#waBtn'), c = checkoutData(); if (a && c) a.href = c.url; }

function viewDone() {
  if (!lastOrder) return '<section class="block"><div class="wrap"><a class="btn primary" href="#shop">Continue shopping</a></div></section>';
  const o = lastOrder, u = api.user;
  return `<section class="block"><div class="wrap" style="max-width:640px"><span class="eyebrow">Last step</span><h1 style="font-size:clamp(2rem,5vw,3rem);margin:6px 0 10px">Send your order, ${esc(first(o.customer.name))}</h1>
  <p class="muted" style="margin-bottom:16px">Your order <b style="color:var(--ink)">${esc(o.ref)}</b> is ready. WhatsApp should have opened with your order details filled in. Tap send in WhatsApp and we will take it from there.</p>
  ${o.saveFailed ? '<div class="note" style="margin-bottom:16px">We could not save this order on our system, but your WhatsApp message has everything we need. Please send it.</div>' : ''}
  <div class="row" style="margin-bottom:22px"><a class="btn wa" href="${o.waUrl}" target="_blank" rel="noopener">Open WhatsApp again</a><button class="btn" data-copymsg>Copy order message</button></div>
  <div class="panel"><b>Order summary</b>${o.items.map(i => `<div class="sumline"><span>${i.qty} × ${esc(i.name)}${i.opt ? ` (${esc(i.opt)})` : ''}</span><span class="price">${money(i.price * i.qty)}</span></div>`).join('')}<div class="sumline tot"><span>Subtotal</span><span class="price">${money(o.total)}</span></div></div>
  ${u ? '' : `<div class="note" style="margin-top:18px"><b>Skip typing next time.</b> Create an account with these details and your next checkout takes one tap.<div style="margin-top:10px"><a class="btn gold sm" href="#account" data-signup-from-order>Create my account</a></div></div>`}
  <div style="margin-top:22px"><a class="btn ghost" href="#shop">Continue shopping</a></div></div></section>`;
}

/* ---------- admin ---------- */
const adminAllowed = () => !api.live || !!(api.user && api.user.isAdmin);
function viewAdmin() {
  if (api.live && !api.user) return `<section class="block"><div class="wrap" style="max-width:440px"><span class="eyebrow">Staff only</span><h1 style="font-size:2.4rem;margin:6px 0 14px">Admin sign in</h1><form class="panel form" data-form="login" novalidate><input type="hidden" name="next" value="admin"><label class="fl">Email<input name="email" id="ae" type="email" autocomplete="email"></label>${pw('ap', 'pass', 'Password', 'current-password')}<div class="err" role="alert"></div><button class="btn primary block" type="submit">Sign in</button></form></div></section>`;
  if (!adminAllowed()) return `<section class="block"><div class="wrap" style="max-width:520px"><h1 style="font-size:2.2rem;margin-bottom:10px">This account is not an admin</h1><p class="muted" style="margin-bottom:16px">You are signed in as ${esc(api.user.email)}. Ask the site owner to add you as an admin.</p><button class="btn" data-logout>Sign out</button></div></section>`;
  return `<section class="block"><div class="wrap"><div class="shead"><div><span class="eyebrow">Admin</span><h1 style="font-size:clamp(2rem,5vw,3rem);margin-top:6px">Dashboard</h1></div>
  <div class="row">${api.live ? '<button class="btn sm" data-logout>Sign out</button>' : `<button class="btn sm" data-loadex>Load example data</button><button class="btn sm" data-clearex ${api.demo.hasExamples() ? '' : 'hidden'}>Clear examples</button>`}</div></div>
  ${api.live ? '' : '<div class="note" style="margin-bottom:18px">Demo mode: this dashboard shows what is saved in this browser only, and anyone can open it. On the live site it needs an admin login and shows every customer and order.</div>'}
  <div id="admStats"></div>
  <div class="tabs"><button class="chip ${adm.tab === 'orders' ? 'on' : ''}" data-atab="orders">Orders</button><button class="chip ${adm.tab === 'customers' ? 'on' : ''}" data-atab="customers">Customers</button><button class="chip ${adm.tab === 'products' ? 'on' : ''}" data-atab="products">Products</button></div>
  <div id="admTools"></div><div id="admTable"><p class="muted">Loading…</p></div></div></section>`;
}
function renderAdmStats() {
  const s = adm.summary, el = $('#admStats'); if (!s || !el) return;
  const by = s.by_status || {}, top = s.top_products || [], mx = top.length ? top[0].units : 1;
  el.innerHTML = `<div class="stats"><div class="stat"><small>New orders</small><b>${by.New || 0}</b></div><div class="stat"><small>All orders</small><b>${s.orders}</b></div><div class="stat"><small>Revenue</small><b>${money(s.revenue)}</b></div><div class="stat"><small>Customer accounts</small><b>${s.customers}</b></div></div>
  <div class="panel" style="margin-bottom:22px"><h3 style="font-size:22px">Best-selling products</h3><p class="muted" style="font-size:13px;margin:2px 0 12px">The products customers ordered most, counted by units. Cancelled orders are left out.</p>${top.length ? `<div class="bars">${top.map(t => `<div class="sellrow"><div><b style="font-weight:600">${esc(t.name)}</b><div class="muted" style="font-size:12px">${t.units} sold · ${money(t.revenue)}</div></div><i style="width:${Math.max(6, t.units / mx * 100)}%"></i></div>`).join('')}</div>` : '<p class="muted">Once orders come in, your most-ordered products show up here.</p>'}</div>`;
}
function renderAdmTools() {
  const el = $('#admTools'); if (!el) return;
  if (adm.tab === 'orders') {
    const by = (adm.summary && adm.summary.by_status) || {}, all = adm.summary ? adm.summary.orders : 0;
    el.innerHTML = `<div class="filters">${STAT.map(s => `<button class="chip ${adm.status === s ? 'on' : ''}" data-status-filter="${s}">${s}<small>${by[s] || 0}</small></button>`).join('')}<button class="chip ${adm.status === 'all' ? 'on' : ''}" data-status-filter="all">All<small>${all}</small></button></div>
    <div class="filters"><input class="sbox" id="admQ" type="search" placeholder="Search by order ref, name or phone" value="${esc(adm.q)}" aria-label="Search orders"></div>`;
  } else if (adm.tab === 'customers') el.innerHTML = `<div class="filters"><input class="sbox" id="admQ" type="search" placeholder="Search customers by name, email or phone" value="${esc(adm.q)}" aria-label="Search customers"></div>`;
  else el.innerHTML = adm.pm.edit ? '' : `<div class="filters"><input class="sbox" id="pmQ" type="search" placeholder="Search products" value="${esc(adm.pm.q)}" aria-label="Search products"><button class="btn" data-sale-open>Run a sale</button><button class="btn primary" data-pm-new>Add product</button></div>`;
}
const statusMsg = o => {
  const n = first(o.customer.name), t = {
    New: `Hello ${n}, this is Ollyperi. We received your order ${o.ref}. We are checking stock and will confirm shortly.`,
    Confirmed: `Hello ${n}, your Ollyperi order ${o.ref} is confirmed (${money(o.total)} plus delivery). Please let us know when you are ready to pay.`,
    Shipped: `Hello ${n}, good news. Your Ollyperi order ${o.ref} has been shipped and is on its way to ${o.state}.`,
    Delivered: `Hello ${n}, your Ollyperi order ${o.ref} has been delivered. Thank you for shopping with us!`,
    Cancelled: `Hello ${n}, your Ollyperi order ${o.ref} has been cancelled. Message us if you would like to place it again.`};
  return t[o.status] || t.New;
};
function renderAdmTable() {
  const el = $('#admTable'); if (!el) return;
  if (adm.tab === 'products') return renderPm();
  const {rows, total} = adm.list, from = total ? adm.page * adm.size + 1 : 0, to = adm.page * adm.size + rows.length;
  const pager = `<div class="pager"><span>${total ? `Showing ${from}–${to} of ${total}` : 'Nothing to show'}</span><span class="row"><button class="btn sm" data-page="-1" ${adm.page === 0 ? 'disabled' : ''}>Previous</button><button class="btn sm" data-page="1" ${to >= total ? 'disabled' : ''}>Next</button></span></div>`;
  let html = '';
  if (adm.tab === 'orders') {
    if (adm.sel.size) html += `<div class="bulk"><b>${adm.sel.size} selected</b><span>Mark as:</span>${STAT.map(s => `<button class="btn sm" data-bulk="${s}">${s}</button>`).join('')}<button class="btn sm" data-clearsel>Clear</button></div>`;
    html += rows.length ? `<div class="tablewrap"><table><thead><tr><th><input type="checkbox" data-selall aria-label="Select all on this page" ${rows.length && rows.every(r => adm.sel.has(r.id)) ? 'checked' : ''}></th><th>Order</th><th>Customer</th><th>Items</th><th class="n">Total</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(o => `<tr><td><input type="checkbox" data-sel="${esc(o.id)}" aria-label="Select ${esc(o.ref)}" ${adm.sel.has(o.id) ? 'checked' : ''}></td><td><b>${esc(o.ref)}</b>${o.example ? ' <span class="pill ex">example</span>' : ''}<div class="muted" style="font-size:12px">${dshort(o.date)} · ${o.userId ? 'Account' : 'Guest'}</div></td><td>${esc(o.customer.name)}<div class="muted" style="font-size:12px">${esc(o.customer.phone)}</div><div class="addr">${esc([o.address, o.city, o.state].filter(Boolean).join(', '))}</div></td><td>${o.items.map(i => `${i.qty}× ${esc(i.name)}${i.opt ? ` <span class="muted">(${esc(i.opt)})</span>` : ''}`).join('<br>')}${o.note ? `<div class="addr">Note: ${esc(o.note)}</div>` : ''}</td><td class="n">${money(o.total)}</td><td><select data-status="${esc(o.id)}" aria-label="Status for ${esc(o.ref)}">${STAT.map(s => `<option ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${waPhone(o.customer.phone)}?text=${encodeURIComponent(statusMsg(o))}">Message</a></td></tr>`).join('')}</tbody></table></div>` : `<div class="panel muted">No ${adm.status === 'all' ? '' : adm.status.toLowerCase() + ' '}orders${adm.q ? ' match that search' : ' right now'}.</div>`;
  } else {
    html += rows.length ? `<div class="tablewrap"><table><thead><tr><th>Customer</th><th>Contact</th><th>Location</th><th>Joined</th><th class="n">Orders</th><th class="n">Spent</th></tr></thead><tbody>${rows.map(u => `<tr><td><b>${esc(u.name || 'No name')}</b>${u.id && String(u.id).startsWith('ex_') ? ' <span class="pill ex">example</span>' : ''}</td><td>${esc(u.phone)}<div class="muted" style="font-size:12px">${esc(u.email)}</div></td><td>${esc([u.city, u.state].filter(Boolean).join(', ') || 'Not saved')}</td><td>${dlong(u.created)}</td><td class="n">${u.orders}</td><td class="n">${money(u.spent)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="panel muted">No customer accounts yet.</div>';
  }
  html += pager + `<div class="row" style="margin-top:14px"><button class="btn sm" data-csv="orders">Download all orders (CSV)</button><button class="btn sm" data-csv="customers">Download all customers (CSV)</button></div>` +
    (adm.csv ? `<details class="csvbox" open><summary>If the download did not start, copy the data from here</summary><textarea class="csv" readonly aria-label="CSV data">${esc(adm.csv)}</textarea></details>` : '');
  el.innerHTML = html;
}
async function loadAdmList() {
  if (adm.tab === 'products') return loadPm();
  try { adm.list = adm.tab === 'orders' ? await api.admin.orders({status: adm.status, q: adm.q, page: adm.page, size: adm.size}) : await api.admin.customers({q: adm.q, page: adm.page, size: adm.size}); }
  catch (e) { const el = $('#admTable'); if (el) el.innerHTML = `<div class="panel err">${esc(friendly(e))}</div>`; return; }
  renderAdmTable();
}
async function loadAdmin() {
  if (route() !== 'admin' || !adminAllowed() || !$('#admTable')) return;
  try { adm.summary = await api.admin.summary(); } catch (e) { $('#admTable').innerHTML = `<div class="panel err">${esc(friendly(e))}</div>`; return; }
  renderAdmStats(); renderAdmTools(); await loadAdmList();
}
async function csvAll(kind) {
  const out = []; let p = 0;
  for (;;) {
    const r = kind === 'orders' ? await api.admin.orders({status: 'all', q: '', page: p, size: 1000}) : await api.admin.customers({q: '', page: p, size: 1000});
    out.push(...r.rows); if (!r.rows.length || out.length >= r.total || p > 100) break; p++;
  }
  const c = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }; /* stops spreadsheet formula tricks */
  return kind === 'orders'
    ? ['Ref,Date,Customer,Phone,Address,City,State,Items,Total,Status'].concat(out.map(o => [o.ref, new Date(o.date).toISOString().slice(0, 10), o.customer.name, o.customer.phone, o.address, o.city, o.state, o.items.map(i => i.qty + 'x ' + i.name).join('; '), o.total, o.status].map(c).join(','))).join('\n')
    : ['Name,Email,Phone,City,State,Joined,Orders,Spent'].concat(out.map(u => [u.name, u.email, u.phone, u.city, u.state, new Date(u.created).toISOString().slice(0, 10), u.orders, u.spent].map(c).join(','))).join('\n');
}
function downloadText(name, text) {
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type: 'text/csv'})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) {}
}

/* ---------- admin: product manager ---------- */
async function loadPm() {
  try { adm.pm.list = await api.admin.products(); } catch (e) { const el = $('#admTable'); if (el) el.innerHTML = `<div class="panel err">${esc(friendly(e))}</div>`; return; }
  renderAdmTools(); renderPm();
}
function renderPm() {
  const el = $('#admTable'); if (!el) return;
  if (adm.pm.edit) { el.innerHTML = pmForm(); return; }
  const q = adm.pm.q.trim().toLowerCase(), all = adm.pm.list || [], sp = adm.pm.sale ? salePanel() : '';
  const l = all.filter(p => !q || (p.name + ' ' + p.sub + ' ' + CATS[p.cat].name).toLowerCase().includes(q));
  el.innerHTML = sp + (l.length ? `<div class="tablewrap"><table><thead><tr><th>Photo</th><th>Product</th><th class="n">Price</th><th>Status</th><th></th></tr></thead><tbody>${l.map(p => `<tr><td><img class="thumb" src="${esc(pimg(p))}" data-pid="${esc(p.id)}" alt=""></td><td><b>${esc(p.name)}</b><div class="muted" style="font-size:12px">${esc(CATS[p.cat].name)}${p.sub ? ' · ' + esc(p.sub) : ''}</div></td><td class="n">${money(p.price)}${p.compare ? `<div class="muted" style="font-size:12px"><s>${money(p.compare)}</s> -${pctOff(p)}%</div>` : ''}</td><td><span class="pill ${p.active ? 'delivered' : 'cancelled'}">${p.active ? 'Visible' : 'Hidden'}</span> <span class="pill ${p.inStock ? 'delivered' : 'confirmed'}">${p.inStock ? 'In stock' : 'Sold out'}</span>${p.featured ? ' <span class="pill new">Featured</span>' : ''}</td><td><div class="row" style="flex-wrap:nowrap"><button class="btn sm" data-pm-edit="${esc(p.id)}">Edit</button><button class="btn sm ghost" data-pm-toggle="${esc(p.id)}:active">${p.active ? 'Hide' : 'Show'}</button><button class="btn sm ghost" data-pm-toggle="${esc(p.id)}:inStock">${p.inStock ? 'Mark sold out' : 'Back in stock'}</button></div></td></tr>`).join('')}</tbody></table></div><p class="muted" style="font-size:13px;margin-top:10px">${all.length} products. Hidden products do not show on the website. Sold-out products show but cannot be ordered.</p>` : `<div class="panel muted">${all.length ? 'No products match that search.' : 'No products yet. Click Add product to create your first one.'}</div>`);
  if (adm.pm.sale) saleInfo();
}
function salePanel() {
  return `<div class="panel salepanel" style="margin-bottom:16px"><h3 style="font-size:24px">Run a sale</h3><p class="muted" style="font-size:14px;margin:4px 0 12px">Takes a percentage off your prices. The old price shows crossed out with a "-%" tag, and a Deals page appears on the site. Click End sale to put the old prices back.</p>
  <div class="f2"><label class="fl">Which products<select id="saleCat"><option value="all">Everything</option>${Object.keys(CATS).map(k => `<option value="${k}">${CATS[k].name}</option>`).join('')}</select></label><label class="fl">Percent off (1 to 90)<input id="salePct" type="number" min="1" max="90" value="10" inputmode="numeric"></label></div>
  <p class="muted" id="saleInfo" style="font-size:13px;margin:10px 0"></p><div class="row"><button class="btn primary" data-sale-start>Start sale</button><button class="btn" data-sale-end>End sale</button><button class="btn ghost" data-sale-close>Close</button></div><div class="err" id="saleErr" role="alert"></div></div>`;
}
function saleScope() { const cat = ($('#saleCat') || {}).value || 'all', list = (adm.pm.list || []).filter(p => cat === 'all' || p.cat === cat); return {cat, list, fresh: list.filter(p => !p.compare), onSale: list.filter(p => p.compare > 0)}; }
function saleInfo() { const el = $('#saleInfo'); if (!el) return; const x = saleScope(), pct = Number(($('#salePct') || {}).value); el.textContent = `${x.fresh.length} product${x.fresh.length === 1 ? '' : 's'} will get ${isFinite(pct) ? pct : 0}% off. ${x.onSale.length} already on sale (End sale puts those back).`; }
async function runSale(end) {
  const err = $('#saleErr'), x = saleScope(), pct = Number($('#salePct').value); err.textContent = '';
  const targets = end ? x.onSale : x.fresh;
  if (!end && !(pct >= 1 && pct <= 90)) { err.textContent = 'Enter a percentage between 1 and 90.'; return; }
  if (!targets.length) { err.textContent = end ? 'Nothing is on sale in that group.' : 'Those products are already on sale.'; return; }
  const btns = document.querySelectorAll('.salepanel button'); btns.forEach(b => b.disabled = true); let done = 0;
  try {
    for (const p of targets) {
      const np = end ? {...p, price: p.compare, compare: 0} : {...p, compare: p.price, price: Math.max(1, Math.round(p.price * (100 - pct) / 100 / 50) * 50)};
      await api.admin.saveProduct(np, false); done++;
      $('#saleInfo').textContent = `Updating ${done} of ${targets.length}…`;
    }
    toast(end ? 'Sale ended. Old prices are back.' : 'Sale started on ' + done + ' products.');
  } catch (e) { err.textContent = friendly(e) + (done ? ` (${done} products were updated before this problem.)` : ''); }
  try { await pmReload(); } catch (e) {} adm.pm.sale = true; renderPm(); updateHeader();
}
function pmPhotos() {
  const e = adm.pm.edit; if (!e) return '';
  return `${e.images.length ? `<div class="photogrid">${e.images.map((u, i) => `<div class="ph ${i === 0 ? 'main' : ''}"><img src="${esc(u)}" alt="Photo ${i + 1}">${i === 0 ? '<span class="mainlab">Main photo</span>' : ''}<div class="phbtns">${i ? `<button type="button" class="btn sm" data-pm-main="${i}">Make main</button>` : ''}<button type="button" class="btn sm" data-pm-rm="${i}">Remove</button></div></div>`).join('')}</div>` : '<p class="muted" style="font-size:14px">No photos yet. Until you add one, a coloured placeholder is shown.</p>'}
  ${e.images.length < 6 ? `<label class="btn" style="margin-top:10px;cursor:pointer">${adm.pm.busy ? 'Uploading…' : 'Add photos'}<input type="file" id="pmFile" accept="image/*" multiple hidden ${adm.pm.busy ? 'disabled' : ''}></label>` : '<p class="muted" style="font-size:13px">Maximum of 6 photos.</p>'}
  <p class="muted" style="font-size:12px;margin-top:6px">Square photos look best. Large photos are shrunk automatically so the site stays fast.</p><div class="err" id="pmPhotoErr" role="alert"></div>`;
}
function pmForm() {
  const e = adm.pm.edit, allSubs = [...new Set(Object.keys(CATS).flatMap(subsFor))];
  return `<form class="panel form" data-form="product" novalidate><div class="shead" style="margin:0"><h3 style="font-size:26px">${adm.pm.isNew ? 'Add a product' : 'Edit product'}</h3><button class="btn sm ghost" type="button" data-pm-cancel>Back to list</button></div>
  <label class="fl">Product name<input name="name" id="pn" value="${esc(e.name)}" maxlength="150" required></label>
  <div class="f2"><label class="fl">Category<select name="cat" id="pc">${Object.keys(CATS).map(k => `<option value="${k}" ${e.cat === k ? 'selected' : ''}>${CATS[k].name}</option>`).join('')}</select></label>
  <label class="fl">Sub-category (for example Phones, Sandals, Solar)<input name="sub" id="ps" list="subList" value="${esc(e.sub)}" maxlength="40"><datalist id="subList">${allSubs.map(s => `<option value="${esc(s)}">`).join('')}</datalist></label></div>
  <div class="f2"><label class="fl">Price in naira (what customers pay)<input name="price" id="pp" type="number" min="0" step="1" inputmode="numeric" value="${esc(e.price)}" required></label>
  <label class="fl">Old price (optional, fill it to show a discount)<input name="compare" id="pcmp" type="number" min="0" step="1" inputmode="numeric" value="${e.compare ? esc(e.compare) : ''}" placeholder="Leave empty if no discount"></label></div>
  <label class="fl">Small label on the card (optional, for example New or Popular)<input name="badge" id="pb" value="${esc(e.badge)}" maxlength="30"></label>
  <label class="fl">Description<textarea name="desc" id="pd" rows="3" maxlength="2000">${esc(e.desc)}</textarea></label>
  <label class="fl">Key details (one per line)<textarea name="specs" id="psp" rows="4" placeholder="Handmade&#10;Genuine leather&#10;Made to your size">${esc((e.specs || []).join('\n'))}</textarea></label>
  <div class="f2"><label class="fl">Choice name (for example Size or Colour)<input name="optLabel" id="pol" value="${esc(e.opts ? e.optLabel : '')}" maxlength="30"></label>
  <label class="fl">Choices, separated by commas (leave empty if none)<input name="opts" id="po" value="${esc((e.opts || []).join(', '))}" placeholder="38, 39, 40, 41"></label></div>
  <div><b style="font-size:13px">Photos</b><div id="pmPhotos">${pmPhotos()}</div></div>
  <div class="checks"><label><input type="checkbox" name="active" ${e.active ? 'checked' : ''}> Show on the website</label><label><input type="checkbox" name="inStock" ${e.inStock ? 'checked' : ''}> In stock</label><label><input type="checkbox" name="featured" ${e.featured ? 'checked' : ''}> Feature on the homepage</label></div>
  <div class="err" id="pmErr" role="alert"></div>
  <div class="row"><button class="btn primary" type="submit">Save product</button><button class="btn" type="button" data-pm-cancel>Cancel</button><span id="pmDel" style="margin-left:auto">${adm.pm.isNew ? '' : '<button class="btn sm ghost" type="button" data-pm-del>Delete product</button>'}</span></div></form>`;
}
async function compressImage(file, max = 1200, q = 0.82) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That file is not a photo this browser can open. Try a JPG or PNG.')); i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
    return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('Could not process that photo.')), 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}
async function pmAddFiles(files) {
  const e = adm.pm.edit, err = $('#pmPhotoErr'); if (!e || !files.length) return;
  adm.pm.busy = true; $('#pmPhotos').innerHTML = pmPhotos();
  let msg = '';
  for (const f of files) {
    if (e.images.length >= 6) { msg = 'Only 6 photos fit on one product.'; break; }
    try { const blob = await compressImage(f); const url = await api.admin.uploadImage(blob, e.id); e.images.push(url); adm.pm.uploaded.push(url); }
    catch (x) { msg = friendly(x); }
  }
  adm.pm.busy = false; $('#pmPhotos').innerHTML = pmPhotos(); if (msg) $('#pmPhotoErr').textContent = msg;
}
async function pmCleanup(keep) { const del = [...new Set([...adm.pm.orig, ...adm.pm.uploaded])].filter(u => !keep.includes(u)); for (const u of del) await api.admin.removeImage(u); }
function pmOpen(p, isNew) {
  adm.pm.edit = JSON.parse(JSON.stringify(p)); adm.pm.isNew = isNew; adm.pm.orig = isNew ? [] : (p.images || []).slice(); adm.pm.uploaded = []; adm.pm.busy = false;
  renderAdmTools(); renderPm(); window.scrollTo({top: 0});
}
async function pmClose(discard) { if (discard) await pmCleanup(adm.pm.orig); adm.pm.edit = null; adm.pm.uploaded = []; renderAdmTools(); renderPm(); }
async function pmReload() { adm.pm.list = await api.admin.products(); await loadCatalogue(); updateHeader(); }

/* ---------- overlay ---------- */
function drawerHTML() {
  const c = cartLines();
  const body = c.length ? c.map(({i, l, p}) => `<div class="line"><img src="${esc(pimg(p))}" data-pid="${esc(p.id)}" alt=""><div><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><span class="nm">${esc(p.name)}</span><button class="xbtn" data-rm="${i}" aria-label="Remove ${esc(p.name)}">×</button></div>${l.opt ? `<div class="muted" style="font-size:13px">${esc(p.optLabel)}: ${esc(l.opt)}</div>` : ''}${avail(p) ? '' : '<div style="margin-top:4px"><span class="badge out">Sold out. Please remove.</span></div>'}<div class="row" style="justify-content:space-between;margin-top:6px"><span class="qty"><button data-q="${i}:-1" aria-label="Fewer">−</button><span>${l.qty}</span><button data-q="${i}:1" aria-label="More">+</button></span><b class="price">${avail(p) ? money(p.price * l.qty) : '—'}</b></div></div></div>`).join('') : '<p class="muted" style="padding:24px 0">Your cart is empty. Add something and it will show up here.</p>';
  return `<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Cart"><div class="dhead"><h3>Your cart</h3><button class="xbtn" data-close aria-label="Close cart">×</button></div><div class="dbody">${body}</div>${c.length ? `<div class="dfoot"><div class="sumline tot" style="border:0;margin:0;padding:0"><span>Subtotal</span><span class="price">${money(cartTotal())}</span></div><p class="muted" style="font-size:13px">Delivery fee is confirmed on WhatsApp.</p><a class="btn wa block" href="#checkout" data-close>Checkout</a></div>` : ''}</aside>`;
}
function modalHTML() {
  const p = byId(ui.modal); if (!p) return '';
  const q = encodeURIComponent(`Hello Ollyperi, I'd like to ask about: ${p.name} (${money(p.price)})`);
  const quote = p.sub === 'Solar' || /Installation quote/.test((p.specs || []).join(' ')), ok = avail(p);
  const thumbs = p.images.length > 1 ? `<div class="thumbs">${p.images.map((u, i) => `<button class="${i === ui.img ? 'on' : ''}" data-thumb="${i}" aria-label="Photo ${i + 1}"><img src="${esc(u)}" alt=""></button>`).join('')}</div>` : '';
  return `<div class="scrim" data-close></div><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(p.name)}"><button class="xbtn xtop" data-close aria-label="Close">×</button><div class="pimg"><img src="${esc(pimg(p, ui.img))}" data-pid="${esc(p.id)}" alt="${esc(palt(p))}">${thumbs}</div><div class="pinfo"><span class="sub">${esc(CATS[p.cat].name)}${p.sub ? ' · ' + esc(p.sub) : ''}</span><h2>${esc(p.name)}</h2><div class="mprice"><b class="price">${money(p.price)}</b>${p.compare ? `<s class="was">${money(p.compare)}</s><span class="off inline">-${pctOff(p)}%</span>` : ''}</div>${ok ? '' : '<span class="badge out">Sold out</span>'}<p class="muted">${esc(p.desc)}</p>
  ${p.opts ? `<div class="fl" role="group" aria-label="${esc(p.optLabel)}">${esc(p.optLabel)}: <span style="font-weight:400">${esc(ui.opt)}</span><div class="optchips">${p.opts.map(o => `<button type="button" class="chip ${ui.opt === o ? 'on' : ''}" data-optv="${esc(o)}" aria-pressed="${ui.opt === o}">${esc(o)}</button>`).join('')}</div></div>` : ''}
  ${p.specs.length ? `<ul class="specs">${p.specs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
  <div class="row"><span class="qty"><button data-mq="-1" aria-label="Fewer">−</button><span>${ui.qty}</span><button data-mq="1" aria-label="More">+</button></span><button class="btn primary" data-addmodal style="flex:1" ${ok ? '' : 'disabled'}>${ok ? 'Add to cart' : 'Sold out'}</button></div>
  <div class="row"><a class="btn ghost" style="flex:1" href="https://wa.me/${WA}?text=${q}" target="_blank" rel="noopener">${quote ? 'Get a quote on WhatsApp' : 'Ask on WhatsApp'}</a><button class="btn ghost" data-share="${esc(p.id)}">Share</button></div></div></div>`;
}
function renderOverlay() {
  const o = $('#overlay'), on = ui.drawer || ui.modal, was = o.classList.contains('on');
  o.classList.toggle('on', !!on); o.innerHTML = ui.modal ? modalHTML() : ui.drawer ? drawerHTML() : '';
  document.documentElement.style.overflow = on ? 'hidden' : '';
  if (on && !was) { ui.lastFocus = document.activeElement; const b = o.querySelector('.xbtn'); if (b) b.focus(); }
  if (!on && was && ui.lastFocus && ui.lastFocus.focus) { try { ui.lastFocus.focus(); } catch (e) {} ui.lastFocus = null; }
}
function openProduct(id) { const p = byId(id); if (!p) return; ui.modal = id; ui.drawer = false; ui.opt = p.opts ? p.opts[0] : ''; ui.qty = 1; ui.img = 0; renderOverlay(); }
function closeOverlay() { const was = ui.modal; ui.modal = null; ui.drawer = false; renderOverlay(); if (was && route().startsWith('item-')) { history.replaceState(null, '', location.pathname + location.search + '#shop'); updateHeader(); } }

/* ---------- router ---------- */
function render() {
  const r = route(), app = $('#app');
  if (r === 'solar') { shop.cat = 'appliances'; shop.sub = 'Solar'; shop.q = ''; keepSub = true; location.replace('#appliances'); return; }
  if (CATS[r] && lastRoute !== r && !keepSub) shop.sub = '';
  if (CATS[r]) keepSub = false;
  const isItem = r.startsWith('item-'), needsCatalogue = r === 'home' || r === 'shop' || r === 'deals' || isItem || CATS[r] || r === 'checkout';
  if (needsCatalogue && !catalogue.ready) app.innerHTML = loadingView();
  else if (needsCatalogue && catalogue.failed) app.innerHTML = failedView();
  else if (r === 'home') app.innerHTML = viewHome();
  else if (r === 'shop' || isItem) app.innerHTML = viewShop('');
  else if (r === 'deals') app.innerHTML = viewShop('deals');
  else if (CATS[r]) app.innerHTML = viewShop(r);
  else if (r === 'account') app.innerHTML = viewAccount();
  else if (r === 'reset') app.innerHTML = viewReset();
  else if (r === 'checkout') app.innerHTML = viewCheckout();
  else if (r === 'done') app.innerHTML = viewDone();
  else if (r === 'delivery' || r === 'privacy') app.innerHTML = viewPolicy(r);
  else if (r === 'admin') app.innerHTML = viewAdmin();
  else app.innerHTML = catalogue.ready ? viewHome() : loadingView();
  updateHeader();
  if (r === 'account' && api.user) fillMyOrders();
  if (r === 'checkout' && catalogue.ready) refreshWaLink();
  if (r === 'admin') loadAdmin();
  if (isItem && catalogue.ready && !catalogue.failed) { const id = decodeURIComponent(r.slice(5)); if (byId(id) && byId(id).active) openProduct(byId(id).id); else { toast('That product is no longer available.'); history.replaceState(null, '', location.pathname + '#shop'); } }
  stopCarousel(); if (r === 'home' && catalogue.ready && !catalogue.failed) initCarousel();
  lastRoute = r;
}
window.addEventListener('hashchange', () => { closeOverlay(); render(); window.scrollTo(0, 0); });

/* ---------- events ---------- */
document.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.dataset.pid) { const p = anyProduct(t.dataset.pid); delete t.dataset.pid; if (p) t.src = art(p); } }, true);
document.addEventListener('click', async e => {
  const t = e.target, c = s => t.closest(s);
  let el;
  if ((el = c('[data-dd]'))) { const d = $('#' + el.dataset.dd), was = d.classList.contains('open'); closeMenus(); if (!was) { d.classList.add('open'); el.setAttribute('aria-expanded', 'true'); } return; }
  if (!c('.dd')) closeMenus(); else if (c('.ddm a, .ddm button')) closeMenus();
  if ((el = c('[data-authgo]'))) { authTab = el.dataset.authgo; if (route() === 'account') render(); return; }
  if ((el = c('[data-gosub]'))) { const [k, sb] = el.dataset.gosub.split('|'); shop.cat = k; shop.sub = sb; shop.q = ''; shop.limit = 48; keepSub = true; return; }
  if ((el = c('[data-dot]'))) { const sl = $('#slides'); if (sl) sl.scrollTo({left: sl.clientWidth * Number(el.dataset.dot), behavior: 'smooth'}); return; }
  if (c('#cartBtn, #cartBtn2')) { ui.drawer = true; ui.modal = null; renderOverlay(); return; }
  if (c('[data-close]')) { closeOverlay(); return; }
  if ((el = c('[data-open]'))) { openProduct(el.dataset.open); return; }
  if ((el = c('[data-add]'))) { const p = byId(el.dataset.add); if (!avail(p)) return; if (p.opts) openProduct(p.id); else { addToCart(p.id, '', 1); toast('Added to cart'); } return; }
  if (c('[data-addmodal]')) { const p = byId(ui.modal); if (avail(p)) { addToCart(p.id, ui.opt, ui.qty); closeOverlay(); toast('Added to cart'); } return; }
  if ((el = c('[data-thumb]'))) { ui.img = Number(el.dataset.thumb); renderOverlay(); return; }
  if ((el = c('[data-mq]'))) { ui.qty = Math.min(50, Math.max(1, ui.qty + Number(el.dataset.mq))); renderOverlay(); return; }
  if ((el = c('[data-q]'))) { const [i, d] = el.dataset.q.split(':').map(Number); const k = cart(); k[i].qty = Math.min(50, Math.max(1, k[i].qty + d)); store.set('cart', k); renderOverlay(); updateHeader(); return; }
  if ((el = c('[data-rm]'))) { const k = cart(); k.splice(Number(el.dataset.rm), 1); store.set('cart', k); renderOverlay(); updateHeader(); if (route() === 'checkout') render(); return; }
  if ((el = c('[data-sub]'))) { shop.sub = el.dataset.sub; shop.limit = 48; render(); return; }
  if ((el = c('[data-sort]'))) { shop.sort = el.dataset.sort; refreshGrid(); return; }
  if ((el = c('[data-optv]'))) { ui.opt = el.dataset.optv; renderOverlay(); return; }
  if ((el = c('[data-showpw]'))) { const inp = el.parentElement.querySelector('input'), show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; el.textContent = show ? 'Hide' : 'Show'; el.setAttribute('aria-pressed', show); el.setAttribute('aria-label', show ? 'Hide password' : 'Show password'); return; }
  if ((el = c('[data-share]'))) { const link = location.origin + location.pathname + '#item-' + el.dataset.share, p = byId(el.dataset.share); try { if (navigator.share) { await navigator.share({title: p.name, text: p.name + ' on Ollyperi', url: link}); return; } } catch (err) { if (err && err.name === 'AbortError') return; } try { await navigator.clipboard.writeText(link); toast('Link copied'); } catch (err) { toast(link); } return; }
  if (c('[data-more]')) { shop.limit += 48; refreshGrid(); return; }
  if (c('[data-reload]')) { catalogue.ready = false; render(); await loadCatalogue(); render(); return; }
  if ((el = c('[data-auth]'))) { authTab = el.dataset.auth; render(); return; }
  if (c('[data-forgot-link]')) { authTab = 'forgot'; return; }
  if ((el = c('[data-resend]'))) { try { await api.resendConfirmation(el.dataset.resend); toast('Confirmation email sent'); } catch (err) { const m = $('#pendErr'); if (m) m.textContent = friendly(err); } return; }
  if (c('[data-resend-login]')) { const em = ($('#le') || {}).value || ''; if (!em.trim()) return; try { await api.resendConfirmation(em.trim()); toast('Confirmation email sent'); } catch (err) { toast(friendly(err)); } return; }
  if (c('[data-signup-from-order]')) { authTab = 'signup'; return; }
  if (c('[data-next]')) { next = 'checkout'; return; }
  if (c('[data-logout]')) { await api.signOut(); authTab = 'login'; store.set('draft', {}); draft = {}; toast('Logged out'); if (route() === 'admin' || route() === 'account') render(); updateHeader(); return; }
  if (c('[data-copymsg]')) { try { await navigator.clipboard.writeText(decodeURIComponent(lastOrder.waUrl.split('?text=')[1])); toast('Message copied'); } catch (err) { toast('Copy is not available here. Use Open WhatsApp again.'); } return; }
  if (c('[data-wa]')) { handleWhatsApp(e, c('[data-wa]')); return; }
  /* admin: orders and customers */
  if ((el = c('[data-atab]'))) { adm.tab = el.dataset.atab; adm.page = 0; adm.q = ''; adm.sel.clear(); adm.csv = ''; adm.pm.edit = null; document.querySelectorAll('[data-atab]').forEach(b => b.classList.toggle('on', b === el)); renderAdmTools(); await loadAdmList(); return; }
  if ((el = c('[data-status-filter]'))) { adm.status = el.dataset.statusFilter; adm.page = 0; adm.sel.clear(); renderAdmTools(); await loadAdmList(); return; }
  if ((el = c('[data-page]'))) { adm.page = Math.max(0, adm.page + Number(el.dataset.page)); adm.sel.clear(); await loadAdmList(); return; }
  if ((el = c('[data-bulk]'))) { const ids = [...adm.sel]; try { await api.admin.setStatus(ids, el.dataset.bulk); toast(ids.length + ' orders marked ' + el.dataset.bulk); } catch (err) { toast(friendly(err)); } adm.sel.clear(); adm.summary = await api.admin.summary(); renderAdmStats(); renderAdmTools(); await loadAdmList(); return; }
  if (c('[data-clearsel]')) { adm.sel.clear(); renderAdmTable(); return; }
  if ((el = c('[data-csv]'))) { el.disabled = true; try { adm.csv = await csvAll(el.dataset.csv); downloadText('ollyperi-' + el.dataset.csv + '.csv', adm.csv); toast('CSV ready'); } catch (err) { toast(friendly(err)); } el.disabled = false; renderAdmTable(); return; }
  if (c('[data-loadex]')) { api.demo.loadExamples(); await loadAdmin(); const b = $('[data-clearex]'); if (b) b.hidden = false; toast('Example data loaded'); return; }
  if (c('[data-clearex]')) { api.demo.clearExamples(); await loadAdmin(); toast('Examples cleared'); return; }
  /* admin: products */
  if (c('[data-sale-open]')) { adm.pm.sale = !adm.pm.sale; renderPm(); return; }
  if (c('[data-sale-close]')) { adm.pm.sale = false; renderPm(); return; }
  if (c('[data-sale-start]')) { await runSale(false); return; }
  if (c('[data-sale-end]')) { await runSale(true); return; }
  if (c('[data-pm-new]')) { const mx = (adm.pm.list || []).reduce((m, p) => Math.max(m, p.sort || 0), 0); pmOpen({id: newId(), cat: 'gadgets', sub: '', name: '', price: '', compare: 0, badge: '', desc: '', specs: [], opts: null, optLabel: '', images: [], g: '', pal: '', featured: false, inStock: true, active: true, sort: mx + 1}, true); return; }
  if ((el = c('[data-pm-edit]'))) { const p = (adm.pm.list || []).find(x => x.id === el.dataset.pmEdit); if (p) pmOpen(p, false); return; }
  if (c('[data-pm-cancel]')) { await pmClose(true); return; }
  if ((el = c('[data-pm-toggle]'))) { const [id, f] = el.dataset.pmToggle.split(':'), p = (adm.pm.list || []).find(x => x.id === id); if (!p) return; try { await api.admin.saveProduct({...p, [f]: !p[f]}, false); await pmReload(); renderPm(); toast('Updated'); } catch (err) { toast(friendly(err)); } return; }
  if ((el = c('[data-pm-main]'))) { const e2 = adm.pm.edit, i = Number(el.dataset.pmMain); if (e2) { const [u] = e2.images.splice(i, 1); e2.images.unshift(u); $('#pmPhotos').innerHTML = pmPhotos(); } return; }
  if ((el = c('[data-pm-rm]'))) { const e2 = adm.pm.edit; if (e2) { e2.images.splice(Number(el.dataset.pmRm), 1); $('#pmPhotos').innerHTML = pmPhotos(); } return; }
  if (c('[data-pm-del]')) { $('#pmDel').innerHTML = '<span class="muted" style="font-size:13px">Delete this product for good?</span> <button class="btn sm" type="button" data-pm-del-yes style="background:var(--bad);border-color:var(--bad);color:#fff">Yes, delete</button> <button class="btn sm ghost" type="button" data-pm-del-no>Keep it</button>'; return; }
  if (c('[data-pm-del-no]')) { $('#pmDel').innerHTML = '<button class="btn sm ghost" type="button" data-pm-del>Delete product</button>'; return; }
  if (c('[data-pm-del-yes]')) { const p = adm.pm.edit; try { await api.admin.deleteProduct(p.id); await pmCleanup([]); adm.pm.edit = null; await pmReload(); renderAdmTools(); renderPm(); toast('Product deleted'); } catch (err) { $('#pmErr').textContent = friendly(err); } return; }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeMenus();
  if (!(ui.modal || ui.drawer)) return;
  if (e.key === 'Escape') { closeOverlay(); return; }
  if (e.key === 'Tab') { const f = [...$('#overlay').querySelectorAll('a[href],button:not([disabled]),select,input')].filter(x => x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
});
let qT;
document.addEventListener('input', e => {
  if (e.target.id === 'q') { shop.q = e.target.value; shop.limit = 48; refreshGrid(); }
  if (e.target.id === 'salePct') saleInfo();
  if (e.target.id === 'pmQ') { adm.pm.q = e.target.value; renderPm(); }
  if (e.target.id === 'admQ') { adm.q = e.target.value; clearTimeout(qT); qT = setTimeout(() => { adm.page = 0; adm.sel.clear(); loadAdmList(); }, 300); }
  if (e.target.closest('#coForm')) { refreshWaLink(); if (!api.user) { const c = checkoutData(); draft = Object.assign(draft, {name: c.name, phone: c.phone, email: (c.d.email || '').trim(), address: c.addr, city: c.city, state: c.d.state || '', note: c.note}); store.set('draft', draft); } }
});
document.addEventListener('change', async e => {
  if (e.target.closest('#coForm')) { refreshWaLink(); if (!api.user) { const c = checkoutData(); draft = Object.assign(draft, {state: c.d.state || ''}); store.set('draft', draft); } }
  if (e.target.id === 'saleCat') saleInfo();
  if (e.target.id === 'pmFile') { const files = [...e.target.files]; e.target.value = ''; await pmAddFiles(files); }
  if (e.target.dataset.status) { try { await api.admin.setStatus([e.target.dataset.status], e.target.value); toast('Status updated'); } catch (err) { toast(friendly(err)); } adm.summary = await api.admin.summary(); renderAdmStats(); renderAdmTools(); await loadAdmList(); }
  if (e.target.dataset.sel) { e.target.checked ? adm.sel.add(e.target.dataset.sel) : adm.sel.delete(e.target.dataset.sel); renderAdmTable(); }
  if (e.target.hasAttribute && e.target.hasAttribute('data-selall')) { adm.list.rows.forEach(r => e.target.checked ? adm.sel.add(r.id) : adm.sel.delete(r.id)); renderAdmTable(); }
});
document.addEventListener('submit', async e => {
  if (e.target.id === 'hsearch') { e.preventDefault(); const v = $('#hq').value.trim(); shop.cat = ''; shop.sub = ''; shop.q = v; shop.keepq = true; shop.limit = 48; if (route() === 'shop') { render(); } else location.hash = '#shop'; $('#hq').blur(); return; }
  const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
  const kind = f.dataset.form, d = Object.fromEntries(new FormData(f)), err = f.querySelector('.err'), ok = f.querySelector('.okmsg'), say = m => { err.textContent = m; }, btn = f.querySelector('[type=submit]');
  say('');
  try {
    if (kind === 'login') {
      if (!(d.email || '').trim() || !d.pass) return say('Enter your email and password.');
      btn.disabled = true;
      try { await api.signIn({email: d.email.trim(), pass: d.pass}); } catch (x) { const rb = f.querySelector('[data-resend-login]'); if (rb) rb.hidden = !/confirm/i.test(x.message); throw x; }
      toast('Welcome back, ' + first(api.user.name)); afterAuth(d.next); return;
    }
    if (kind === 'signup') {
      const em = (d.email || '').trim(), name = (d.name || '').trim(), ph = (d.phone || '').trim();
      if (name.length < 2) return say('Enter your full name.');
      if (ph.replace(/\D/g, '').length < 10) return say('Enter a phone number with at least 10 digits.');
      if (!/^\S+@\S+\.\S+$/.test(em)) return say('Enter a valid email address.');
      if ((d.pass || '').length < 6) return say('Choose a password with at least 6 characters.');
      btn.disabled = true; const r = await api.signUp({name, phone: ph, email: em, pass: d.pass});
      if (r.pending) { pendingEmail = em; authTab = 'pending'; render(); return; }
      if (draft.address || draft.city || draft.state) { try { await api.saveProfile({address: draft.address || '', city: draft.city || '', state: draft.state || ''}); } catch (x) {} }
      toast('Account created. Welcome, ' + first(name)); afterAuth(); return;
    }
    if (kind === 'forgot') {
      const em = (d.email || '').trim(); if (!/^\S+@\S+\.\S+$/.test(em)) return say('Enter a valid email address.');
      btn.disabled = true; await api.resetRequest(em); ok.textContent = 'If that email has an account, a reset link is on its way. Check your inbox and spam folder.'; return;
    }
    if (kind === 'reset') {
      if ((d.pass || '').length < 6) return say('Choose a password with at least 6 characters.');
      if (d.pass !== d.pass2) return say('The two passwords do not match.');
      btn.disabled = true; await api.updatePassword(d.pass); await api.refreshUser(); toast('Password updated. You are logged in.'); location.hash = '#home'; if (route() === 'home') render(); updateHeader(); return;
    }
    if (kind === 'details') {
      if ((d.name || '').trim().length < 2) return say('Enter your full name.');
      btn.disabled = true; await api.saveProfile({name: d.name.trim(), phone: (d.phone || '').trim(), address: (d.address || '').trim(), city: (d.city || '').trim(), state: d.state || ''});
      updateHeader(); toast('Details saved');
    }
    if (kind === 'product') {
      const e2 = adm.pm.edit, perr = $('#pmErr'); perr.textContent = '';
      const name = (d.name || '').trim(), price = Number(d.price), cmp = d.compare === '' || d.compare == null ? 0 : Number(d.compare);
      if (!name) return void (perr.textContent = 'Enter the product name.');
      if (d.price === '' || !isFinite(price) || price < 0) return void (perr.textContent = 'Enter the price as a number, for example 15000.');
      if (cmp && (!isFinite(cmp) || cmp <= price)) return void (perr.textContent = 'The old price must be higher than the price customers pay. Clear it if there is no discount.');
      if (adm.pm.busy) return void (perr.textContent = 'Wait for the photos to finish uploading.');
      const opts = [...new Set((d.opts || '').split(',').map(s => s.trim()).filter(Boolean))].slice(0, 40);
      const p = {...e2, name, cat: d.cat, sub: (d.sub || '').trim(), price: Math.round(price), compare: cmp ? Math.round(cmp) : 0, badge: (d.badge || '').trim(), desc: (d.desc || '').trim(),
        specs: (d.specs || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 20), opts: opts.length ? opts : null, optLabel: opts.length ? ((d.optLabel || '').trim() || 'Option') : '',
        active: !!d.active, inStock: !!d.inStock, featured: !!d.featured, g: e2.g || ''};
      btn.disabled = true; await api.admin.saveProduct(p, adm.pm.isNew); await pmCleanup(p.images);
      adm.pm.edit = null; adm.pm.uploaded = []; await pmReload(); renderAdmTools(); renderPm(); toast('Product saved'); window.scrollTo({top: 0});
      return;
    }
  } catch (x) { if (kind === 'product') { const pe = $('#pmErr'); if (pe) pe.textContent = friendly(x); } else say(friendly(x)); }
  finally { if (btn && document.body.contains(btn)) btn.disabled = false; }
});
function afterAuth(n) { const go = n || next || 'home'; next = null; updateHeader(); if (go && ('#' + go) !== location.hash) location.hash = '#' + go; else render(); }

function handleWhatsApp(e, a) {
  const c = checkoutData(), err = $('#coErr'); err.textContent = '';
  const bad = cartBlocked() ? 'Remove the sold-out items from your cart first.' : !c.items.length ? 'Your cart is empty.' : !c.name ? 'Enter your name.' : c.phone.replace(/\D/g, '').length < 10 ? 'Enter a phone number with at least 10 digits.' : !c.addr ? 'Enter your delivery address.' : !c.d.state ? 'Choose your state.' : '';
  if (bad) { e.preventDefault(); err.textContent = bad; return; }
  a.href = c.url; /* already set while typing; set again to be safe */
  const u = api.user;
  const order = {id: 'o' + Date.now().toString(36), ref: coRef, customer: {name: c.name, phone: c.phone, email: (c.d.email || '').trim()}, address: c.addr, city: c.city, state: c.d.state, note: c.note, items: c.items, total: c.total, waUrl: c.url};
  lastOrder = order;
  api.placeOrder(order).catch(() => { order.saveFailed = true; if (route() === 'done') render(); });
  if (u && c.d.save) api.saveProfile({name: c.name, phone: c.phone, address: c.addr, city: c.city, state: c.d.state}).catch(() => {});
  if (!u) { draft = Object.assign(draft, {name: c.name, phone: c.phone, email: (c.d.email || '').trim(), address: c.addr, city: c.city, state: c.d.state}); store.set('draft', draft); }
  store.set('cart', []); coRef = null;
  setTimeout(() => { location.hash = '#done'; }, 80);
}

/* ---------- start ---------- */
api.on('recovery', () => { location.hash = '#reset'; });
api.on('change', () => { updateHeader(); render(); });
render();
Promise.all([api.init(), loadCatalogue()]).then(() => {
  updateHeader();
  if (BOOT.type === 'recovery') location.hash = '#reset';
  else if (BOOT.error) { toast('That link has expired or was already used. Please request a new one.'); location.hash = '#account'; }
  else if (['signup', 'magiclink', 'invite', 'email_change'].includes(BOOT.type) && api.user) { toast('Email confirmed. You are logged in.'); location.hash = '#home'; }
  render();
});
