/* Small shared helpers */
const WA = '2347039691576', WA_SHOW = '+234 703 969 1576';
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '₦' + Number(n || 0).toLocaleString('en-NG');
const first = n => String(n || '').trim().split(' ')[0] || 'there';
const dshort = t => new Date(t).toLocaleDateString('en-NG', {day:'numeric', month:'short'});
const dlong = t => new Date(t).toLocaleDateString('en-NG', {day:'numeric', month:'short', year:'numeric'});
const mem = {};
const store = {
  get(k, d) { if (k in mem) return mem[k]; try { const v = localStorage.getItem('olly_' + k); if (v !== null) { mem[k] = JSON.parse(v); return mem[k]; } } catch (e) {} return d; },
  set(k, v) { mem[k] = v; try { localStorage.setItem('olly_' + k, JSON.stringify(v)); } catch (e) {} }
};
async function sha(s) { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return 'b' + btoa(unescape(encodeURIComponent(s))); } }
let toastT;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }
const waPhone = p => { const d = String(p || '').replace(/\D/g, ''); return d.startsWith('234') ? d : d.startsWith('0') ? '234' + d.slice(1) : d; };
const STATES = ['Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT Abuja','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'];
