/* ---------------------------------------------------------------
   DATA LAYER
   LIVE mode  : talks to Supabase (when config.js has your keys).
   DEMO mode  : keeps everything in the visitor's own browser.
   The rest of the site does not care which one is running.
---------------------------------------------------------------- */
const CFG = window.OLLYPERI_CONFIG || {};
const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_KEY && window.supabase);
const STAT = ['New', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];
/* What the address looked like when the page opened (email links bring a token in here). */
const BOOT = {hash: location.hash, type: ((location.hash.match(/[#&]type=([a-z]+)/) || [])[1]) || '', error: /error_code|error_description/.test(location.hash)};
const siteUrl = () => location.origin + location.pathname;
const newId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

function friendly(e) {
  const m = (e && e.message) || String(e);
  if (/already registered|already exists/i.test(m)) return 'That email already has an account. Try logging in.';
  if (/invalid login/i.test(m)) return 'Email or password is not right. Check both and try again.';
  if (/not confirmed/i.test(m)) return 'Please confirm your email first. Check your inbox (and spam folder).';
  if (/rate limit|too many|security purposes/i.test(m)) return 'Too many attempts right now. Wait a few minutes and try again.';
  if (/password/i.test(m) && /(short|least|characters|weak)/i.test(m)) return 'Choose a password with at least 6 characters.';
  if (/same password|different from the old/i.test(m)) return 'Choose a password you have not used before.';
  if (/failed to fetch|network|load failed/i.test(m)) return 'Could not reach the server. Check your internet and try again.';
  if (/not allowed/i.test(m)) return 'This account is not allowed to open the admin dashboard.';
  if (/row-level security|permission denied/i.test(m)) return 'You do not have permission to do that. Log in as an admin and try again.';
  if (/mime|file type|not supported/i.test(m)) return 'That file type is not allowed. Use a JPG, PNG or WebP photo.';
  if (/too large|exceeded the maximum|payload/i.test(m)) return 'That photo is too large. Try a smaller one.';
  return m;
}

/* database row <-> app product */
const fromRow = r => normProduct({id: r.id, cat: r.category, sub: r.sub, name: r.name, price: r.price, compare: r.compare_price, badge: r.badge, desc: r.description,
  specs: r.specs, opts: r.opts, optLabel: r.opt_label, images: r.images, g: r.glyph, pal: r.pal, featured: r.featured,
  inStock: r.in_stock, active: r.active, sort: r.sort}, 0);
const toRow = p => ({id: p.id, category: p.cat, sub: p.sub || '', name: p.name, price: Number(p.price), compare_price: Number(p.compare) > Number(p.price) ? Number(p.compare) : 0, badge: p.badge || '', description: p.desc || '',
  specs: p.specs || [], opts: p.opts && p.opts.length ? p.opts : null, opt_label: p.opts && p.opts.length ? (p.optLabel || 'Option') : '',
  images: p.images || [], glyph: p.g || '', pal: p.pal || '', featured: !!p.featured, in_stock: p.inStock !== false, active: p.active !== false, sort: p.sort || 0});

/* ============================ LIVE (Supabase) ============================ */
function makeLive() {
  const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY, {auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true}});
  let user = null, recovering = BOOT.type === 'recovery';
  const hooks = {};
  /* Keep this callback tiny: calling the database from inside it can deadlock the client. */
  sb.auth.onAuthStateChange(ev => {
    if (ev === 'PASSWORD_RECOVERY') { recovering = true; setTimeout(() => hooks.recovery && hooks.recovery(), 0); }
    if (ev === 'SIGNED_OUT' && user) { user = null; setTimeout(() => hooks.change && hooks.change(), 0); }
  });
  const toUser = async session => {
    if (!session) return null;
    const uid = session.user.id;
    const [p, a] = await Promise.all([
      sb.from('profiles').select('*').eq('id', uid).maybeSingle(),
      sb.from('admins').select('user_id').eq('user_id', uid).maybeSingle()
    ]);
    const pr = p.data || {};
    return {id: uid, email: session.user.email, isAdmin: !!a.data,
      name: pr.name || (session.user.user_metadata || {}).name || '', phone: pr.phone || '',
      address: pr.address || '', city: pr.city || '', state: pr.state || ''};
  };
  const toOrder = r => ({id: r.id, ref: r.ref, userId: r.user_id,
    customer: {name: r.customer_name, phone: r.customer_phone, email: r.customer_email},
    address: r.address, city: r.city, state: r.state, note: r.note, items: r.items,
    total: Number(r.total), status: r.status, date: new Date(r.created_at).getTime()});
  const must = ({error}) => { if (error) throw new Error(friendly(error)); };
  const bucket = () => sb.storage.from('product-images');

  return {
    live: true,
    get user() { return user; },
    get recovering() { return recovering; },
    on(name, fn) { hooks[name] = fn; },
    async init() { try { const {data} = await sb.auth.getSession(); user = await toUser(data.session); } catch (e) { user = null; } return user; },
    async signUp({name, phone, email, pass}) {
      const {data, error} = await sb.auth.signUp({email, password: pass, options: {data: {name, phone}, emailRedirectTo: siteUrl()}});
      if (error) throw new Error(friendly(error));
      if (!data.session) return {pending: true, email};
      user = await toUser(data.session); return {user};
    },
    async signIn({email, pass}) {
      const {data, error} = await sb.auth.signInWithPassword({email, password: pass});
      if (error) throw new Error(friendly(error));
      user = await toUser(data.session); return user;
    },
    async signOut() { await sb.auth.signOut(); user = null; recovering = false; },
    async resendConfirmation(email) { must(await sb.auth.resend({type: 'signup', email, options: {emailRedirectTo: siteUrl()}})); },
    async resetRequest(email) { must(await sb.auth.resetPasswordForEmail(email, {redirectTo: siteUrl()})); },
    async updatePassword(pass) { must(await sb.auth.updateUser({password: pass})); recovering = false; },
    async refreshUser() { const {data} = await sb.auth.getSession(); user = await toUser(data.session); return user; },
    async saveProfile(d) {
      if (!user) throw new Error('Please log in first.');
      must(await sb.from('profiles').update(d).eq('id', user.id));
      Object.assign(user, d);
    },
    async placeOrder(o) {
      must(await sb.from('orders').insert({
        ref: o.ref, user_id: user ? user.id : null,
        customer_name: o.customer.name, customer_phone: o.customer.phone, customer_email: o.customer.email || '',
        address: o.address, city: o.city || '', state: o.state, note: o.note || '',
        items: o.items.map(i => ({id: i.id, name: i.name, price: i.price, qty: i.qty, opt: i.opt || ''})),
        total: o.total, status: 'New', channel: 'WhatsApp'}));
    },
    async myOrders() {
      if (!user) return [];
      const {data, error} = await sb.from('orders').select('*').eq('user_id', user.id).order('created_at', {ascending: false}).limit(50);
      if (error) throw new Error(friendly(error));
      return data.map(toOrder);
    },
    products: {
      async list() {
        const {data, error} = await sb.from('products').select('*').eq('active', true).order('sort', {ascending: true}).order('created_at', {ascending: true});
        if (error) throw new Error(friendly(error));
        return data.map(fromRow);
      }
    },
    admin: {
      async summary() { const {data, error} = await sb.rpc('admin_summary'); if (error) throw new Error(friendly(error)); return data; },
      async orders({status, q, page, size}) {
        let query = sb.from('orders').select('*', {count: 'exact'}).order('created_at', {ascending: false});
        if (status && status !== 'all') query = query.eq('status', status);
        const s = (q || '').replace(/[^\p{L}\p{N} +\-]/gu, '').trim();
        if (s) query = query.or(`ref.ilike.%${s}%,customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%`);
        const {data, error, count} = await query.range(page * size, page * size + size - 1);
        if (error) throw new Error(friendly(error));
        return {rows: data.map(toOrder), total: count || 0};
      },
      async setStatus(ids, status) { must(await sb.from('orders').update({status}).in('id', ids)); },
      async customers({q, page, size}) {
        const {data, error} = await sb.rpc('admin_customers', {p_search: q || '', p_limit: size, p_offset: page * size});
        if (error) throw new Error(friendly(error));
        return {rows: data.map(r => ({id: r.id, name: r.name, email: r.email, phone: r.phone, city: r.city, state: r.state,
          created: new Date(r.created_at).getTime(), orders: Number(r.order_count), spent: Number(r.total_spent)})),
          total: data.length ? Number(data[0].total_rows) : 0};
      },
      async products() {
        const {data, error} = await sb.from('products').select('*').order('sort', {ascending: true}).order('created_at', {ascending: true});
        if (error) throw new Error(friendly(error));
        return data.map(fromRow);
      },
      async saveProduct(p, isNew) {
        let row = toRow(p);
        const send = async r => {
          if (isNew) return {error: (await sb.from('products').insert(r)).error, data: [1]};
          const {id, ...rest} = r; return sb.from('products').update(rest).eq('id', id).select('id');
        };
        let {data, error} = await send(row);
        if (error && /compare_price/.test(error.message || '')) {
          if (row.compare_price) throw new Error('Discounts need a one-time database update. Run the update-v4.sql file in Supabase (SQL Editor), then try again.');
          delete row.compare_price; ({data, error} = await send(row));
        }
        if (error) throw new Error(friendly(error));
        if (!data || !data.length) throw new Error('You do not have permission to change products. Log in as an admin.');
      },
      async deleteProduct(id) { const {data, error} = await sb.from('products').delete().eq('id', id).select('id'); if (error) throw new Error(friendly(error)); if (!data || !data.length) throw new Error('Nothing was deleted. Check you are logged in as an admin.'); },
      async uploadImage(blob, productId) {
        const path = productId + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 7) + '.jpg';
        const {error} = await bucket().upload(path, blob, {contentType: 'image/jpeg', cacheControl: '31536000'});
        if (error) throw new Error(friendly(error));
        return bucket().getPublicUrl(path).data.publicUrl;
      },
      async removeImage(url) { try { const i = url.indexOf('/product-images/'); if (i > -1) await bucket().remove([decodeURIComponent(url.slice(i + 16).split('?')[0])]); } catch (e) {} }
    }
  };
}

/* ============================ DEMO (this browser only) ============================ */
function makeDemo() {
  let user = null;
  const hooks = {};
  const U = () => store.get('users', []), O = () => store.get('orders', []);
  const PR = () => { let l = store.get('products', null); if (!l) { l = seedProducts(); store.set('products', l); } return l; };
  const pub = u => u ? {id: u.id, email: u.email, name: u.name, phone: u.phone, address: u.address, city: u.city, state: u.state, isAdmin: false} : null;
  const sum = list => { const live = list.filter(o => o.status !== 'Cancelled'); const by = {}; list.forEach(o => by[o.status] = (by[o.status] || 0) + 1);
    const top = {}; live.forEach(o => o.items.forEach(i => { const t = top[i.name] || (top[i.name] = {name: i.name, units: 0, revenue: 0}); t.units += i.qty; t.revenue += i.qty * i.price; }));
    return {customers: U().length, orders: list.length, revenue: live.reduce((s, o) => s + o.total, 0), by_status: by, top_products: Object.values(top).sort((a, b) => b.units - a.units).slice(0, 6)}; };
  const page = (rows, p, s) => ({rows: rows.slice(p * s, p * s + s), total: rows.length});
  const api = {
    live: false,
    get user() { return user; },
    get recovering() { return false; },
    on(name, fn) { hooks[name] = fn; },
    async init() { const id = store.get('session', null); user = pub(U().find(u => u.id === id)); return user; },
    async signUp({name, phone, email, pass}) {
      const em = email.trim().toLowerCase(), us = U();
      if (us.find(x => x.email === em)) throw new Error('That email already has an account. Try logging in.');
      const d = store.get('draft', {});
      const u = {id: 'u' + Date.now().toString(36), name, email: em, phone, pass: await sha(pass), address: d.address || '', city: d.city || '', state: d.state || '', created: Date.now()};
      us.push(u); store.set('users', us); store.set('session', u.id); user = pub(u); return {user};
    },
    async signIn({email, pass}) {
      const u = U().find(x => x.email === email.trim().toLowerCase());
      if (!u || !u.pass || u.pass !== await sha(pass)) throw new Error('Email or password is not right. Check both and try again.');
      store.set('session', u.id); user = pub(u); return user;
    },
    async signOut() { store.set('session', null); user = null; },
    async resendConfirmation() { throw new Error('Emails are only sent on the live site.'); },
    async resetRequest() { throw new Error('Password reset emails are only sent on the live site. In this preview, create a new account instead.'); },
    async updatePassword() { throw new Error('Not available in preview.'); },
    async refreshUser() { return user; },
    async saveProfile(d) { const us = U(), u = us.find(x => x.id === user.id); Object.assign(u, d); store.set('users', us); Object.assign(user, d); },
    async placeOrder(o) { const os = O(); os.push({...o, userId: user ? user.id : null, date: Date.now(), status: 'New'}); store.set('orders', os); },
    async myOrders() { return O().filter(o => user && o.userId === user.id).sort((a, b) => b.date - a.date); },
    products: { async list() { return PR().filter(p => p.active).map(p => ({...p})); } },
    admin: {
      async summary() { return sum(O()); },
      async orders({status, q, page: p, size}) {
        let l = [...O()].sort((a, b) => b.date - a.date);
        if (status && status !== 'all') l = l.filter(o => o.status === status);
        const s = (q || '').trim().toLowerCase(); if (s) l = l.filter(o => (o.ref + ' ' + o.customer.name + ' ' + o.customer.phone).toLowerCase().includes(s));
        return page(l, p, size);
      },
      async setStatus(ids, status) { const os = O(); os.forEach(o => { if (ids.includes(o.id)) o.status = status; }); store.set('orders', os); },
      async customers({q, page: p, size}) {
        const os = O(), s = (q || '').trim().toLowerCase();
        let l = U().filter(u => !s || (u.name + u.email + u.phone).toLowerCase().includes(s)).sort((a, b) => b.created - a.created)
          .map(u => ({id: u.id, name: u.name, email: u.email, phone: u.phone, city: u.city, state: u.state, created: u.created,
            orders: os.filter(o => o.userId === u.id).length, spent: os.filter(o => o.userId === u.id && o.status !== 'Cancelled').reduce((a, o) => a + o.total, 0)}));
        return page(l, p, size);
      },
      async products() { return PR().map(p => ({...p})); },
      async saveProduct(p, isNew) { const l = PR(), i = l.findIndex(x => x.id === p.id); if (isNew || i < 0) l.push({...p}); else l[i] = {...p}; store.set('products', l); },
      async deleteProduct(id) { store.set('products', PR().filter(p => p.id !== id)); },
      async uploadImage(blob) { return await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('Could not read that photo.')); r.readAsDataURL(blob); }); },
      async removeImage() {}
    },
    demo: {
      hasExamples() { return U().some(u => u.example) || O().some(o => o.example); },
      clearExamples() { store.set('users', U().filter(u => !u.example)); store.set('orders', O().filter(o => !o.example)); },
      resetProducts() { store.set('products', seedProducts()); },
      loadExamples() {
        let s = 7; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
        const nm = [['Adaeze Okafor','Anambra','Awka'],['Tunde Bakare','Lagos','Ikeja'],['Chiamaka Eze','Enugu','Enugu'],['Ibrahim Musa','Kano','Nassarawa'],['Funke Adeyemi','Oyo','Ibadan'],['Emeka Nwosu','Rivers','Port Harcourt'],['Zainab Bello','FCT Abuja','Wuse 2'],['Seyi Ogunleye','Ogun','Abeokuta']];
        const us = U(), os = O(), now = Date.now(), st = ['New','New','Confirmed','Shipped','Delivered','Delivered','Delivered','Cancelled'], src = PR().filter(p => p.active);
        nm.forEach((n, i) => { const id = 'ex_u' + i; if (!us.find(u => u.id === id)) us.push({id, example: true, name: n[0], email: n[0].split(' ')[0].toLowerCase() + '@example.com', phone: '080' + String(10000000 + Math.floor(rnd() * 89999999)), pass: '', address: '12 Sample Street', city: n[2], state: n[1], created: now - Math.floor(rnd() * 40) * 864e5}); });
        for (let i = 0; i < 30; i++) {
          const u = us.filter(x => x.example)[Math.floor(rnd() * 8)], items = [], k = 1 + Math.floor(rnd() * 2);
          for (let j = 0; j < k; j++) { const p = src[Math.floor(rnd() * src.length)]; items.push({id: p.id, name: p.name, price: p.price, qty: 1 + Math.floor(rnd() * 2), opt: p.opts ? p.opts[0] : ''}); }
          os.push({id: 'ex_o' + i, example: true, ref: 'OLY-EX' + (100 + i), userId: u.id, customer: {name: u.name, phone: u.phone, email: u.email}, address: u.address, city: u.city, state: u.state, note: '', items, total: items.reduce((a, b) => a + b.price * b.qty, 0), status: st[Math.floor(rnd() * st.length)], date: now - Math.floor(rnd() * 30) * 864e5});
        }
        store.set('users', us); store.set('orders', os);
      }
    }
  };
  return api;
}

const api = LIVE ? makeLive() : makeDemo();
