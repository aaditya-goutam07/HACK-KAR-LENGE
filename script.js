import { db, collection, addDoc, onSnapshot, serverTimestamp, orderBy, query } from "./firebase-config.js";

const form = document.getElementById('donation-form');
const list = document.getElementById('donation-list');
const mealsCount = document.getElementById('meals-count');

const donationsRef = collection(db, "donations");

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
    createdAt: serverTimestamp()
  });

  form.reset();
});

// Listen for live updates — runs automatically whenever data changes
const q = query(donationsRef, orderBy('createdAt', 'desc'));

onSnapshot(q, function (snapshot) {
  list.innerHTML = '';
  let delivered = 0;

  snapshot.forEach(function (docSnap) {
    const donation = docSnap.data();
    if (donation.status === 'Delivered') delivered++;

    const card = document.createElement('div');
    card.className = 'donation-card';
    card.innerHTML = `
      <h3>${donation.item}</h3>
      <p>Location: ${donation.location}</p>
      <p>Expires: ${new Date(donation.expiry).toLocaleString()}</p>
      <p>Status: <strong>${donation.status}</strong>${donation.driver ? ' — Driver: ' + donation.driver : ''}</p>
    `;
    list.appendChild(card);
  });

  mealsCount.textContent = delivered;
});
