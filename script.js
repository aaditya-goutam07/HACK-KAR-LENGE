import { db, collection, addDoc, onSnapshot, serverTimestamp, orderBy, query } from "./firebase-config.js";

const form = document.getElementById('donation-form');
const list = document.getElementById('donation-list');
const mealsCount = document.getElementById('meals-count');
const getLocationBtn = document.getElementById('get-location-btn');
const locationStatus = document.getElementById('location-status');

const donationsRef = collection(db, "donations");

// Captured pickup coordinates (optional — set via the "Use My Current Location" button)
let capturedLat = null;
let capturedLng = null;

getLocationBtn.addEventListener('click', function () {
  if (!navigator.geolocation) {
    locationStatus.textContent = 'Geolocation not supported on this browser.';
    return;
  }
  locationStatus.textContent = 'Getting location...';
  navigator.geolocation.getCurrentPosition(
    function (pos) {
      capturedLat = pos.coords.latitude;
      capturedLng = pos.coords.longitude;
      locationStatus.textContent = `✅ Location captured (${capturedLat.toFixed(4)}, ${capturedLng.toFixed(4)})`;
    },
    function () {
      locationStatus.textContent = '⚠️ Could not get location — check browser permissions.';
    }
  );
});

// Post a new donation to Firestore
form.addEventListener('submit', async function (e) {
  e.preventDefault();

  const item = document.getElementById('food-item').value;
  const location = document.getElementById('location').value;
  const expiry = document.getElementById('expiry').value;

  await addDoc(donationsRef, {
    item,
    location,
    expiry,
    status: 'Posted',
    driver: '',
    pickupLat: capturedLat,
    pickupLng: capturedLng,
    driverLat: null,
    driverLng: null,
    createdAt: serverTimestamp()
  });

  form.reset();
  capturedLat = null;
  capturedLng = null;
  locationStatus.textContent = 'Location not set (optional, but enables map tracking)';
});

const STATUS_CLASS = {
  'Posted': 'badge-posted',
  'Accepted': 'badge-accepted',
  'Dispatched': 'badge-dispatched',
  'Delivered': 'badge-delivered'
};

// Listen for live updates — runs automatically whenever data changes
const q = query(donationsRef, orderBy('createdAt', 'desc'));
const activeMaps = {}; // keep track of created Leaflet maps so we don't recreate unnecessarily

onSnapshot(q, function (snapshot) {
  list.innerHTML = '';
  let delivered = 0;
  const mapsToInit = [];

  snapshot.forEach(function (docSnap) {
    const donation = docSnap.data();
    const id = docSnap.id;
    if (donation.status === 'Delivered') delivered++;

    const badgeClass = STATUS_CLASS[donation.status] || 'badge-posted';
    const showMap = (donation.status === 'Dispatched' || donation.status === 'Delivered') && donation.driverLat;

    const card = document.createElement('div');
    card.className = 'donation-card';
    card.innerHTML = `
      <div class="card-top">
        <h3>${donation.item}</h3>
        <span class="badge ${badgeClass}">${donation.status}</span>
      </div>
      <p>📍 ${donation.location}</p>
      <p>⏰ Expires: ${new Date(donation.expiry).toLocaleString()}</p>
      ${donation.driver ? `<p>🚚 Driver: ${donation.driver}</p>` : ''}
      ${showMap ? `<div class="mini-map" id="map-${id}"></div>` : ''}
    `;
    list.appendChild(card);

    if (showMap) {
      mapsToInit.push({ id, donation });
    }
  });

  mealsCount.textContent = delivered;

  // Initialize maps after the cards are actually in the DOM
  mapsToInit.forEach(function ({ id, donation }) {
    const mapEl = document.getElementById(`map-${id}`);
    if (!mapEl) return;

    const map = L.map(mapEl).setView([donation.driverLat, donation.driverLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const driverMarker = L.marker([donation.driverLat, donation.driverLng])
      .addTo(map)
      .bindPopup('🚚 Driver location');

    if (donation.pickupLat && donation.pickupLng) {
      L.marker([donation.pickupLat, donation.pickupLng])
        .addTo(map)
        .bindPopup('📍 Pickup location');
      map.fitBounds([
        [donation.driverLat, donation.driverLng],
        [donation.pickupLat, donation.pickupLng]
      ], { padding: [30, 30] });
    }

    activeMaps[id] = map;
  });
});
