import { db, collection, onSnapshot, doc, updateDoc, orderBy, query } from "./firebase-config.js";

const list = document.getElementById('ngo-donation-list');
const mealsCount = document.getElementById('ngo-meals-count');

const donationsRef = collection(db, "donations");
const q = query(donationsRef, orderBy('createdAt', 'desc'));

onSnapshot(q, function (snapshot) {
  list.innerHTML = '';
  let delivered = 0;

  snapshot.forEach(function (docSnap) {
    const donation = docSnap.data();
    const id = docSnap.id;
    if (donation.status === 'Delivered') delivered++;

    const card = document.createElement('div');
    card.className = 'donation-card';

    let actionButtons = '';

    if (donation.status === 'Posted') {
      actionButtons = `<button onclick="acceptDonation('${id}')">Accept Donation</button>`;
    } else if (donation.status === 'Accepted') {
      actionButtons = `
        <input type="text" id="driver-input-${id}" placeholder="Driver name">
        <button onclick="assignDriver('${id}')">Assign Driver</button>
      `;
    } else if (donation.status === 'Dispatched') {
      actionButtons = `<button onclick="markDelivered('${id}')">Mark as Delivered</button>`;
    }

    card.innerHTML = `
      <h3>${donation.item}</h3>
      <p>Location: ${donation.location}</p>
      <p>Expires: ${new Date(donation.expiry).toLocaleString()}</p>
      <p>Status: <strong>${donation.status}</strong>${donation.driver ? ' — Driver: ' + donation.driver : ''}</p>
      ${actionButtons}
    `;
    list.appendChild(card);
  });

  mealsCount.textContent = delivered;
});

// These need to be on window since they're called from inline onclick attributes
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

window.markDelivered = async function (id) {
  const ref = doc(db, "donations", id);
  await updateDoc(ref, { status: 'Delivered' });
};
