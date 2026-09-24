import { db, collection, addDoc, onSnapshot, serverTimestamp, orderBy, query } from "./firebase-config.js";
import { esc, countTo, syncCards, drawMap } from "./ui.js";

const form = document.getElementById('donation-form');
const list = document.getElementById('donation-list');
const emptyEl = document.getElementById('donation-empty');
const getLocationBtn = document.getElementById('get-location-btn');
const locationStatus = document.getElementById('location-status');
const donationsRef = collection(db, "donations");
let capturedLat = null, capturedLng = null;

getLocationBtn.addEventListener('click', () => {
  if (!navigator.geolocation) return locationStatus.textContent = 'Geolocation is not supported.';
  locationStatus.textContent = 'Getting location…';
  navigator.geolocation.getCurrentPosition(pos => {
    capturedLat = pos.coords.latitude; capturedLng = pos.coords.longitude;
    locationStatus.textContent = `✅ Location captured (${capturedLat.toFixed(4)}, ${capturedLng.toFixed(4)})`;
  }, () => locationStatus.textContent = '⚠️ Location permission was denied or unavailable.', { enableHighAccuracy: true, timeout: 10000 });
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (capturedLat === null) return alert('Please capture the pickup location so the system can route the rescue.');
  const item = document.getElementById('food-item').value.trim();
  const quantity = Number(document.getElementById('quantity').value);
  const location = document.getElementById('location').value.trim();
  const expiry = document.getElementById('expiry').value;
  if (new Date(expiry) <= new Date()) return alert('The donation expiry must be in the future.');
  await addDoc(donationsRef, { item, quantity, location, expiry, status: 'Posted', driver: '', recipient: '', pickupLat: capturedLat, pickupLng: capturedLng, driverLat: null, driverLng: null, createdAt: serverTimestamp() });
  form.reset(); capturedLat = null; capturedLng = null; locationStatus.textContent = 'Location not set — needed for routing';
});

const STATUS_CLASS = { Posted:'badge-posted', Accepted:'badge-accepted', Dispatched:'badge-dispatched', Delivered:'badge-delivered' };
const hasMap = d => d.pickupLat != null && d.pickupLng != null && d.status !== 'Posted';

const build = (d, id) => `<div class="card-top"><div><h3>${esc(d.item)}</h3><p>${Number(d.quantity || 0)} meals</p></div><span class="badge ${STATUS_CLASS[d.status] || 'badge-posted'}">${esc(d.status)}</span></div><p>📍 ${esc(d.location)}</p><p>⏰ Safe until: ${new Date(d.expiry).toLocaleString()}</p>${d.recipient ? `<p>🏠 Matched to: ${esc(d.recipient)}</p>` : ''}${d.driver ? `<p>🚚 Driver: ${esc(d.driver)}</p>` : ''}${hasMap(d) ? `<div class="route-info" id="route-${id}">Calculating route…</div><div class="mini-map" id="map-${id}"></div>` : ''}`;

onSnapshot(query(donationsRef, orderBy('createdAt', 'desc')), snapshot => {
  let meals = 0, weight = 0; const items = [];
  snapshot.forEach(s => {
    const d = s.data(), id = s.id;
    if (d.status === 'Delivered') { meals += Number(d.quantity || 0); weight += Number(d.quantity || 0) * 0.4; }
    items.push({ id, data: d, sig: [d.item, d.quantity, d.location, d.expiry, d.status, d.driver, d.recipient].join('|'), msig: hasMap(d) ? `${d.driverLat}|${d.driverLng}` : null });
  });
  syncCards(list, emptyEl, items, build, (d, id) => drawMap(id, d));
  countTo(document.getElementById('meals-count'), meals);
  countTo(document.getElementById('weight-count'), Math.round(weight));
  countTo(document.getElementById('co2-count'), Math.round(weight * 2.5));
});
