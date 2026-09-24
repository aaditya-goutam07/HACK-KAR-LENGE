import { db, collection, onSnapshot, doc, updateDoc, orderBy, query } from "./firebase-config.js";

const list = document.getElementById('ngo-donation-list');
const mealsCount = document.getElementById('ngo-meals-count');

const donationsRef = collection(db, "donations");
const q = query(donationsRef, orderBy('createdAt', 'desc'));

const STATUS_CLASS = {
  'Posted': 'badge-posted',
  'Accepted': 'badge-accepted',
  'Dispatched': 'badge-dispatched',
  'Delivered': 'badge-delivered'
};

// Track active geolocation watchers per donation, so we can stop them later
const activeWatchers = {};

onSnapshot(q, function (snapshot) {
  list.innerHTML = '';
  let delivered = 0;

  snapshot.forEach(function (docSnap) {
    const donation = docSnap.data();
    const id = docSnap.id;
    if (donation.status === 'Delivered') delivered++;

    const badgeClass = STATUS_CLASS[donation.status] || 'badge-posted';
    let actionHTML = '';

    if (donation.status === 'Posted') {
      actionHTML = `<button class="primary-btn" onclick="acceptDonation('${id}')">Accept Donation</button>`;
    } else if (donation.status === 'Accepted') {
      actionHTML = `
        <div class="location-row">
          <input type="text" id="driver-input-${id}" placeholder="Driver name">
          <button class="primary-btn" onclick="assignDriver('${id}')">Assign Driver</button>
        </div>
      `;
    } else if (donation.status === 'Dispatched') {
      const isSharing = !!activeWatchers[id];
      actionHTML = `
        <button class="${isSharing ? 'sharing-btn' : 'primary-btn'}" onclick="toggleSharing('${id}')">
          ${isSharing ? '🟢 Sharing Live Location (tap to stop)' : '📍 Start Sharing Location'}
        </button>
        <button class="primary-btn" onclick="markDelivered('${id}')">Mark as Delivered</button>
      `;
    }

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
      ${actionHTML}
    `;
    list.appendChild(card);
  });

  mealsCount.textContent = delivered;
});

window.acceptDonation = async function (id) {
  const ref = doc(db, "donations", id);
  await updateDoc(ref, { status: 'Accepted' });
};

window.assignDriver = async function (id) {
  const input = document.getElementById(`driver-input-${id}`);
  const driverName = input.value.trim();
  if (!driverName) {
    alert('Please enter a driver name');
    return;
  }
  const ref = doc(db, "donations", id);
  await updateDoc(ref, { status: 'Dispatched', driver: driverName });
};

window.toggleSharing = function (id) {
  if (activeWatchers[id]) {
    // Stop sharing
    navigator.geolocation.clearWatch(activeWatchers[id]);
    delete activeWatchers[id];
    return;
  }

  if (!navigator.geolocation) {
    alert('Geolocation not supported on this device.');
    return;
  }

  const ref = doc(db, "donations", id);

  const watchId = navigator.geolocation.watchPosition(
    async function (pos) {
      await updateDoc(ref, {
        driverLat: pos.coords.latitude,
        driverLng: pos.coords.longitude
      });
    },
    function (err) {
      alert('Could not get location: ' + err.message);
      navigator.geolocation.clearWatch(activeWatchers[id]);
      delete activeWatchers[id];
    },
    { enableHighAccuracy: true, maximumAge: 5000 }
  );

  activeWatchers[id] = watchId;
};

window.markDelivered = async function (id) {
  if (activeWatchers[id]) {
    navigator.geolocation.clearWatch(activeWatchers[id]);
    delete activeWatchers[id];
  }
  const ref = doc(db, "donations", id);
  await updateDoc(ref, { status: 'Delivered' });
};
