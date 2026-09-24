import { db, collection, addDoc, onSnapshot, serverTimestamp, orderBy, query } from "./firebase-config.js";

const form = document.getElementById('donation-form');
const list = document.getElementById('donation-list');
const mealsCount = document.getElementById('meals-count');
const weightCount = document.getElementById('weight-count');
const co2Count = document.getElementById('co2-count');
const getLocationBtn = document.getElementById('get-location-btn');
const locationStatus = document.getElementById('location-status');
const donationsRef = collection(db, "donations");
let capturedLat = null, capturedLng = null;
const activeMaps = {};

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

function routeUrl(aLat,aLng,bLat,bLng){ return `https://router.project-osrm.org/route/v1/driving/${aLng},${aLat};${bLng},${bLat}?overview=full&geometries=geojson`; }
async function renderMap(id, donation) {
  const el = document.getElementById(`map-${id}`); if (!el || !window.L) return;
  if (activeMaps[id]) { activeMaps[id].remove(); delete activeMaps[id]; }
  const dLat = donation.driverLat ?? donation.pickupLat, dLng = donation.driverLng ?? donation.pickupLng;
  const map = L.map(el).setView([dLat,dLng],14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);
  const pickup = L.marker([donation.pickupLat,donation.pickupLng]).addTo(map).bindPopup('📍 Pickup location');
  const driver = L.marker([dLat,dLng]).addTo(map).bindPopup('🚚 Driver location');
  const points=[[donation.pickupLat,donation.pickupLng],[dLat,dLng]];
  if (donation.driverLat != null && donation.driverLng != null) {
    try {
      const response = await fetch(routeUrl(donation.pickupLat,donation.pickupLng,donation.driverLat,donation.driverLng));
      const data = await response.json();
      if (data.routes?.[0]) {
        const route=data.routes[0];
        L.geoJSON(route.geometry,{style:{weight:5,opacity:.8}}).addTo(map);
        const km=(route.distance/1000).toFixed(1), mins=Math.max(1,Math.round(route.duration/60));
        const info=document.getElementById(`route-${id}`); if(info) info.textContent=`${km} km · ~${mins} min to pickup`;
      }
    } catch { /* map still works if routing service is temporarily unavailable */ }
  }
  map.fitBounds(points,{padding:[25,25]});
  activeMaps[id]=map;
}

const q=query(donationsRef,orderBy('createdAt','desc'));
onSnapshot(q,snapshot=>{
  list.innerHTML=''; let deliveredMeals=0, weight=0;
  snapshot.forEach(docSnap=>{
    const d=docSnap.data(), id=docSnap.id;
    if(d.status==='Delivered'){ deliveredMeals += Number(d.quantity||0); weight += Number(d.quantity||0)*0.4; }
    const showMap=d.pickupLat!=null && d.pickupLng!=null && d.status!=='Posted';
    const card=document.createElement('div'); card.className='donation-card';
    card.innerHTML=`<div class="card-top"><div><h3>${d.item}</h3><p>${d.quantity||0} meals</p></div><span class="badge ${STATUS_CLASS[d.status]||'badge-posted'}">${d.status}</span></div><p>📍 ${d.location}</p><p>⏰ Safe until: ${new Date(d.expiry).toLocaleString()}</p>${d.recipient?`<p>🏠 Matched to: ${d.recipient}</p>`:''}${d.driver?`<p>🚚 Driver: ${d.driver}</p>`:''}${showMap?`<div class="route-info" id="route-${id}">Calculating route…</div><div class="mini-map" id="map-${id}"></div>`:''}`;
    list.appendChild(card);
    if(showMap) renderMap(id,d);
  });
  mealsCount.textContent=deliveredMeals; weightCount.textContent=Math.round(weight); co2Count.textContent=Math.round(weight*2.5);
});
