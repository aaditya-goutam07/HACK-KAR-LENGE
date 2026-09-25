# 🍲 Surplus-to-Shelter

A real-time food rescue web app that connects surplus food **donors** with **NGOs/shelters**, matches each donation to the nearest recipient hub, and tracks the pickup live on a map until delivery — all backed by Firebase Firestore, with no login required.

**Live demo:**
- Donor view: https://surplus-to-shelter-719fc.web.app
- NGO / Dispatch view: https://surplus-to-shelter-719fc.web.app/ngo.html

## What it does

- **Donors** post surplus food (item, quantity, pickup location via device geolocation, and a "safe until" expiry) from `index.html`.
- **NGOs** see new donations appear instantly on `ngo.html`, and can:
  1. **Accept & auto-match** — the app picks the nearest recipient hub that has enough capacity for the donation.
  2. **Assign a driver** by name.
  3. **Share live location** — the assigned driver's device streams its position via `navigator.geolocation.watchPosition`.
  4. **Mark as delivered**, which rolls the donation into the impact stats.
- Both pages show a **live route** between the pickup point and the driver's current location, drawn on a Leaflet/OpenStreetMap map and calculated through the public OSRM routing API.
- An **Impact dashboard** (meals rescued, kg diverted, kg CO₂e avoided) animates in real time as donations are marked delivered.
- **Dark/light theme toggle**, remembered per browser and defaulting to the system theme.
- **Share button** — copies the page link (or opens the native share sheet on mobile) so donor and NGO links can be sent out directly.
- Fully responsive horizontal dashboard layout that collapses to a single column on mobile.

## Tech stack

- Vanilla HTML/CSS/JavaScript (ES modules), no build step or framework.
- **Firebase Firestore** for the real-time `donations` collection (`firebase-config.js`).
- **Leaflet.js** + OpenStreetMap tiles for maps (`ui.js`).
- **OSRM** public demo server for route distance/duration between pickup and driver.
- **Firebase Hosting** for deployment (`firebase.json`, `.firebaserc`).

## Project structure

| File | Purpose |
|---|---|
| `index.html`, `script.js` | Donor view — post a donation, watch it move through the rescue pipeline |
| `ngo.html`, `ngo.js` | NGO/dispatch view — accept, match, assign driver, track, deliver |
| `firebase-config.js` | Shared Firebase app/Firestore initialization, imported by both pages |
| `ui.js` | Shared UI helpers: safe HTML escaping, animated counters, diff-based card rendering (no flicker on live updates), map drawing/routing |
| `theme.js` | Dark/light theme toggle and the share button |
| `style.css` | Shared styling, including the dark theme via CSS variables |
| `404.html` | Fallback page for unmatched routes on Firebase Hosting |

## Local setup

Because this uses ES modules and browser geolocation, it needs to run from a real HTTP origin — don't just double-click the HTML files.

```bash
# from the project folder, using VS Code's Live Server extension, or:
npx serve .
```

Then open the printed local URL (e.g. `http://127.0.0.1:5500` or similar). Note that a `127.0.0.1` link only works on your own machine — it is not shareable.

## Deploy

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

This publishes to the Firebase Hosting URL configured in `.firebaserc` (`surplus-to-shelter-719fc.web.app`). The Firestore config is already wired up in `firebase-config.js`, so no extra setup is needed after deploying.

## Demo flow (for judges)

1. Open the **donor link** and post a donation — fill in item, quantity, click "Use my current location," and set an expiry a few minutes out.
2. Open the **NGO link** in a second tab/device — the new donation appears instantly.
3. Click **Accept & auto-match** — a nearby recipient hub is matched automatically.
4. Enter a driver name and **Assign driver**.
5. Click **Start sharing live location** (allow location access) — watch the map update on both views.
6. Click **Mark as delivered** — the impact numbers count up on both pages.

## Known limitations

- No authentication — anyone with the link can post or update donations. Firestore security rules should be tightened before real-world use (see rules example in the deployment notes).
- Recipient hubs in `ngo.js` (`DEMO_RECIPIENTS`) are hardcoded demo coordinates for the hackathon — replace with real, verified shelter data for production.
- Routing uses OSRM's free public demo server, which is rate-limited and not meant for production traffic.
- CO₂e and weight figures are rough demo estimates for presentation purposes, not audited figures.
