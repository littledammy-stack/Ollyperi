/* ---------------------------------------------------------------
   OLLYPERI PRODUCT LIST
   These are sample products. To change a product, edit its name,
   price, desc or specs below. Prices are in naira (no commas).
   Keep the quotes and commas exactly as they are.
---------------------------------------------------------------- */
const CATS = {
  gadgets:    {name: 'Gadgets',              nav: 'Gadgets',    blurb: 'Phones, laptops and accessories', subs: ['Phones','Laptops','Accessories']},
  footwear:   {name: 'Footwear',             nav: 'Footwear',   blurb: 'Handmade palms, slippers, sandals and shoes', subs: ['Palms','Slippers','Sandals','Shoes']},
  clothing:   {name: 'Clothing',             nav: 'Clothing',   blurb: 'Everyday wear and statement pieces', subs: ['Tops','Outerwear','Native wear','Dresses','Accessories']},
  appliances: {name: 'Household Appliances', nav: 'Appliances', blurb: 'Solar power, kitchen, cooling and home care', subs: ['Solar','Kitchen','Cooling','Home care']}
};
const SZ_SHOE = ['38','39','40','41','42','43','44','45','46'], SZ_CLO = ['S','M','L','XL','XXL'];
const SEED = [
 {id:'g1',cat:'gadgets',sub:'Phones',g:'phone',name:'Android Smartphone 8GB / 256GB',price:185000,badge:'New',opts:['Black','Blue','Green'],optLabel:'Colour',desc:'A fast everyday phone with a big display and a camera that holds up in low light.',specs:['6.6" display, 120Hz','8GB RAM, 256GB storage','5,000mAh battery with fast charging','Dual SIM']},
 {id:'g2',cat:'gadgets',sub:'Laptops',g:'laptop',name:'Slim Laptop 15.6" Core i5',price:620000,opts:null,desc:'Light enough to carry daily, strong enough for work, design and study.',specs:['Core i5, 8GB RAM','512GB SSD','15.6" Full HD display','Backlit keyboard']},
 {id:'g3',cat:'gadgets',sub:'Accessories',g:'buds',name:'Wireless Earbuds Pro',price:18500,badge:'Popular',opts:['Black','White'],optLabel:'Colour',desc:'Clear calls, deep bass and a charging case that lasts through the week.',specs:['Bluetooth 5.3','Up to 24 hours with the case','Touch controls','Splash resistant']},
 {id:'g4',cat:'gadgets',sub:'Accessories',g:'phone',name:'20,000mAh Power Bank',price:14000,opts:null,desc:'Keeps your phone alive through long days and NEPA surprises.',specs:['20,000mAh','Two USB-A and one USB-C port','Fast-charge capable','LED level indicator']},
 {id:'g5',cat:'gadgets',sub:'Accessories',g:'laptop',name:'65W Fast Charger',price:9500,opts:null,desc:'One charger for your phone, tablet and most modern laptops.',specs:['65W USB-C','Compact folding plug','Over-heat protection']},
 {id:'g6',cat:'gadgets',sub:'Accessories',g:'buds',name:'Smartwatch Series S',price:32000,opts:['Black','Silver'],optLabel:'Colour',desc:'Track steps, sleep and heart rate, and read your messages at a glance.',specs:['1.8" touch display','Heart rate and sleep tracking','7-day battery','Water resistant']},

 {id:'f1',cat:'footwear',sub:'Palms',g:'shoe',name:'Handmade Palm Slippers',price:6500,badge:'Signature',opts:SZ_SHOE,optLabel:'Size (EU)',desc:'Cut, stitched and finished by hand. Soft underfoot and built to last for years.',specs:['Handmade','Genuine leather upper','Cushioned insole','Made to your size']},
 {id:'f2',cat:'footwear',sub:'Sandals',g:'shoe',name:'Leather Palm Sandals',price:12000,opts:SZ_SHOE,optLabel:'Size (EU)',desc:'The classic strap sandal in smooth leather that softens with wear.',specs:['Handmade','Adjustable strap','Flexible rubber sole']},
 {id:'f3',cat:'footwear',sub:'Shoes',g:'shoe',name:'Handcrafted Leather Loafers',price:38000,badge:'New',opts:SZ_SHOE,optLabel:'Size (EU)',desc:'Sharp enough for the office, comfortable enough for the whole day.',specs:['Handmade','Full leather lining','Non-slip sole']},
 {id:'f4',cat:'footwear',sub:'Slippers',g:'shoe',name:'Beaded Slides for Her',price:15000,opts:['36','37','38','39','40','41'],optLabel:'Size (EU)',desc:'Hand-beaded slides that dress up any outfit.',specs:['Handmade beadwork','Padded footbed','Light and flexible']},
 {id:'f5',cat:'footwear',sub:'Slippers',g:'shoe',name:'Cushion Home Slippers',price:5000,opts:SZ_SHOE,optLabel:'Size (EU)',desc:'Soft everyday slippers for around the house.',specs:['Plush lining','Anti-slip sole','Easy to wash']},
 {id:'f6',cat:'footwear',sub:'Sandals',g:'shoe',name:'Everyday Strap Sandals',price:9000,opts:SZ_SHOE,optLabel:'Size (EU)',desc:'Light, tough and ready for hot days and long walks.',specs:['Handmade','Water-friendly sole','Adjustable fit']},

 {id:'c1',cat:'clothing',sub:'Native wear',g:'shirt',name:'Ankara Print Shirt',price:16500,badge:'Popular',opts:SZ_CLO,optLabel:'Size',desc:'Bold Ankara print, clean tailoring, and a fit that works for weddings and weekends.',specs:['100% cotton','Short sleeve','Tailored fit']},
 {id:'c2',cat:'clothing',sub:'Tops',g:'shirt',name:'Classic Cotton Polo',price:9800,opts:SZ_CLO,optLabel:'Size',desc:'A soft, breathable polo that goes with everything you own.',specs:['Pique cotton','Ribbed collar','Machine washable']},
 {id:'c3',cat:'clothing',sub:'Outerwear',g:'shirt',name:'Pullover Hoodie',price:22000,opts:SZ_CLO,optLabel:'Size',desc:'Heavyweight fleece for cool evenings and harmattan mornings.',specs:['Brushed fleece','Kangaroo pocket','Relaxed fit']},
 {id:'c4',cat:'clothing',sub:'Native wear',g:'shirt',name:'Senator Two-Piece',price:45000,badge:'New',opts:SZ_CLO,optLabel:'Size',desc:'A sharp senator set with clean embroidery at the neckline.',specs:['Top and trouser','Embroidered neckline','Breathable fabric']},
 {id:'c5',cat:'clothing',sub:'Dresses',g:'shirt',name:'Ladies Wrap Dress',price:28000,opts:SZ_CLO,optLabel:'Size',desc:'A flattering wrap that moves well and dresses up or down.',specs:['Soft stretch fabric','Adjustable waist tie','Knee length']},
 {id:'c6',cat:'clothing',sub:'Accessories',g:'shirt',name:'Cotton Socks, 3-Pack',price:4500,opts:null,desc:'Cushioned, breathable socks that keep their shape.',specs:['3 pairs','Cotton blend','One size fits 40 to 45']},

 {id:'s1',cat:'appliances',sub:'Solar',pal:'solar',g:'solar',name:'400W Monocrystalline Solar Panel',price:145000,badge:'Best seller',opts:null,desc:'High-efficiency mono panel for homes, shops and small offices.',specs:['400W, monocrystalline','Aluminium frame','Suitable for 12V and 24V systems','Warranty details confirmed at order']},
 {id:'s2',cat:'appliances',sub:'Solar',pal:'solar',g:'solar',name:'3.5kVA Hybrid Inverter',price:480000,opts:null,desc:'Runs your appliances from solar, battery or the grid and switches automatically.',specs:['3.5kVA / 24V','Built-in MPPT charge controller','Pure sine wave','Warranty details confirmed at order']},
 {id:'s3',cat:'appliances',sub:'Solar',pal:'solar',g:'solar',name:'200Ah Lithium Battery',price:780000,opts:null,desc:'Long-life lithium storage with a built-in battery management system.',specs:['200Ah lithium (LiFePO4)','Deep-cycle ready','Built-in BMS','Warranty details confirmed at order']},
 {id:'s4',cat:'appliances',sub:'Solar',pal:'solar',g:'solar',name:'Solar Street Light 100W',price:55000,opts:null,desc:'Dusk-to-dawn lighting with no wiring and no electricity bill.',specs:['100W LED','Auto on and off sensor','Weatherproof','Remote included']},
 {id:'s5',cat:'appliances',sub:'Solar',pal:'solar',g:'solar',name:'Rechargeable Solar Lantern',price:12500,badge:'Popular',opts:null,desc:'Light for the room, a charger for your phone, and a backup when power drops.',specs:['USB phone charging','Three brightness levels','Solar and USB charging']},
 {id:'s6',cat:'appliances',sub:'Solar',pal:'solar',g:'solar',name:'1kVA Home Backup Kit',price:650000,opts:null,desc:'Panels, inverter and battery sized for lights, fans, TV and a fridge.',specs:['Inverter, battery and panels included','Sized for light home loads','Installation quote on request']},

 {id:'a1',cat:'appliances',sub:'Kitchen',g:'box',name:'High-Speed Blender 1.5L',price:38000,badge:'Popular',opts:null,desc:'Smoothies, pepper mix and soups in seconds, with a jar that is easy to clean.',specs:['1.5L jar','1,000W motor','Stainless steel blades','Two speeds and pulse']},
 {id:'a2',cat:'appliances',sub:'Kitchen',g:'box',name:'20L Microwave Oven',price:95000,opts:null,desc:'Reheat, defrost and cook quickly with simple dial controls.',specs:['20L capacity','700W','Six power levels','Defrost function']},
 {id:'a3',cat:'appliances',sub:'Kitchen',g:'box',name:'Electric Kettle 2L',price:12500,opts:null,desc:'Boils fast and switches itself off when done.',specs:['2L capacity','Auto shut-off','Boil-dry protection','Stainless steel body']},
 {id:'a4',cat:'appliances',sub:'Cooling',g:'fan',name:'18" Standing Fan',price:42000,badge:'New',opts:null,desc:'Strong, quiet airflow with adjustable height and tilt.',specs:['18" blade','Three speeds','Oscillating head','Adjustable height']},
 {id:'a5',cat:'appliances',sub:'Cooling',g:'box',name:'1HP Split Air Conditioner',price:420000,opts:null,desc:'Cools a bedroom or small office quickly and quietly.',specs:['1HP split unit','Cooling and dehumidify modes','Remote control','Installation quote on request']},
 {id:'a6',cat:'appliances',sub:'Home care',g:'box',name:'Steam Iron 2400W',price:15000,opts:null,desc:'Heats fast and glides smoothly, with steam for stubborn creases.',specs:['2400W','Non-stick soleplate','Variable steam','Self-clean function']}
];

/* ---- Do not edit below this line ---------------------------------
   SEED above is the starting catalogue. In live mode the products live in your
   database and you manage them from Admin > Products. */
const GLYPH_DEFAULT = {gadgets: 'phone', footwear: 'shoe', clothing: 'shirt', appliances: 'box'};
const FEATURED_SEED = ['f1','g1','c1','s1','g3','f3','c4','a4'];
function normProduct(p, i) {
  return {
    id: p.id, cat: CATS[p.cat] ? p.cat : 'gadgets', sub: p.sub || '', name: p.name || 'Untitled', price: Number(p.price) || 0, compare: Number(p.compare) > Number(p.price) ? Number(p.compare) : 0,
    badge: p.badge || '', desc: p.desc || '', specs: Array.isArray(p.specs) ? p.specs : [],
    opts: Array.isArray(p.opts) && p.opts.length ? p.opts : null, optLabel: p.optLabel || 'Option',
    images: Array.isArray(p.images) ? p.images.filter(Boolean) : [], g: p.g || GLYPH_DEFAULT[p.cat] || 'box', pal: p.pal || '',
    featured: !!p.featured, inStock: p.inStock !== false, active: p.active !== false, sort: p.sort == null ? i : p.sort, n: i
  };
}
const DEMO_DEALS = ['g3', 'f2', 'c2', 'a4'];
const seedProducts = () => SEED.map((p, i) => normProduct(Object.assign({}, p, {featured: FEATURED_SEED.includes(p.id), compare: DEMO_DEALS.includes(p.id) ? Math.round(p.price * 1.25 / 500) * 500 : 0}), i));
const pctOff = p => p.compare > p.price ? Math.round((1 - p.price / p.compare) * 100) : 0;
let P = [];
const setProducts = list => { P = list.map((p, i) => Object.assign(p, {n: i})); };
const byId = id => P.find(p => p.id === id);
const subsFor = cat => { const base = CATS[cat].subs.slice(); P.forEach(p => { if (p.cat === cat && p.sub && !base.includes(p.sub)) base.push(p.sub); }); return base; };
