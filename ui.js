// Shared helpers: safe HTML, animated counters, flicker-free list updates, in-place map updates.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
export function countTo(el, to) {
  const from = Number(el.dataset.v || 0); el.dataset.v = to;
  if (from === to || reduce) { el.textContent = to; return; }
  const t0 = performance.now(), dur = 700;
  const step = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

const maps = {};
const routeUrl = (aLat, aLng, bLat, bLng) => `https://router.project-osrm.org/route/v1/driving/${aLng},${aLat};${bLng},${bLat}?overview=full&geometries=geojson`;

export function dropMap(id) { maps[id]?.map.remove(); delete maps[id]; }

export function drawMap(id, d) {
  const el = document.getElementById(`map-${id}`); if (!el || !window.L) return;
  const dLat = d.driverLat ?? d.pickupLat, dLng = d.driverLng ?? d.pickupLng;
  let m = maps[id];
  if (!m || m.el !== el) {
    m?.map.remove();
    const map = L.map(el, { scrollWheelZoom: false }).setView([dLat, dLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
    L.marker([d.pickupLat, d.pickupLng]).addTo(map).bindPopup('📍 Pickup location');
    m = maps[id] = { el, map, route: null, driver: L.marker([dLat, dLng]).addTo(map).bindPopup('🚚 Driver location') };
  }
  m.driver.setLatLng([dLat, dLng]);
  m.map.fitBounds([[d.pickupLat, d.pickupLng], [dLat, dLng]], { padding: [25, 25], animate: !reduce });
  if (d.driverLat == null || d.driverLng == null) return;
  fetch(routeUrl(d.pickupLat, d.pickupLng, d.driverLat, d.driverLng)).then(r => r.json()).then(data => {
    const r = data.routes?.[0]; if (!r || maps[id] !== m) return;
    m.route?.remove();
    m.route = L.geoJSON(r.geometry, { style: { weight: 5, opacity: .85, color: '#16a34a' } }).addTo(m.map);
    const info = document.getElementById(`route-${id}`);
    if (info) info.textContent = `${(r.distance / 1000).toFixed(1)} km · ~${Math.max(1, Math.round(r.duration / 60))} min to pickup`;
  }).catch(() => {});
}

// Updates only the cards that changed (no full re-render, so maps and typed input survive live updates).
// items: [{id, sig, msig, data}]; msig changes when the map should refresh.
export function syncCards(list, emptyEl, items, build, onMap) {
  const seen = new Set();
  items.forEach((it, i) => {
    seen.add(it.id);
    let c = list.querySelector(`[data-id="${it.id}"]`), rebuilt = false;
    if (!c) { c = document.createElement('article'); c.className = 'donation-card enter'; c.dataset.id = it.id; }
    if (list.children[i] !== c) list.insertBefore(c, list.children[i] || null);
    if (c.dataset.sig !== it.sig) { dropMap(it.id); c.dataset.sig = it.sig; c.innerHTML = build(it.data, it.id); rebuilt = true; }
    if (it.msig != null && (rebuilt || c.dataset.msig !== it.msig)) { c.dataset.msig = it.msig; onMap(it.data, it.id); }
  });
  [...list.children].forEach(c => { if (!seen.has(c.dataset.id)) { dropMap(c.dataset.id); c.remove(); } });
  if (emptyEl) emptyEl.hidden = items.length > 0;
}
