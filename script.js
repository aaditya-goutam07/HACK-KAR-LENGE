// Temporary in-memory storage (we'll replace this with Firebase later)
let donations = [];
let mealsRescued = 0;

const form = document.getElementById('donation-form');
const list = document.getElementById('donation-list');
const mealsCount = document.getElementById('meals-count');

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const item = document.getElementById('food-item').value;
  const location = document.getElementById('location').value;
  const expiry = document.getElementById('expiry').value;

  const donation = {
    id: Date.now(),
    item,
    location,
    expiry,
    status: 'Posted'
  };

  donations.push(donation);
  renderDonations();
  form.reset();
});

function renderDonations() {
  list.innerHTML = '';

  donations.forEach(function (donation) {
    const card = document.createElement('div');
    card.className = 'donation-card';
    card.innerHTML = `
      <h3>${donation.item}</h3>
      <p>Location: ${donation.location}</p>
      <p>Expires: ${new Date(donation.expiry).toLocaleString()}</p>
      <p>Status: ${donation.status}</p>
      <button onclick="markDelivered(${donation.id})">Mark as Delivered</button>
    `;
    list.appendChild(card);
  });
}

function markDelivered(id) {
  const donation = donations.find(function (d) { return d.id === id; });
  if (donation && donation.status !== 'Delivered') {
    donation.status = 'Delivered';
    mealsRescued++;
    mealsCount.textContent = mealsRescued;
    renderDonations();
  }
}
