let map;
let userMarker;
let routeLine;
let shortcutLine;

let currentRoute = [];
let travelHistory = [];

let destination = [13.0827, 80.2707]; // change anytime

// Load saved shortcuts
let savedShortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];

// ---------- INIT MAP ----------
function initMap() {

  map = L.map('map').setView(destination, 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  trackLocation();
}

window.onload = initMap;

// ---------- GPS TRACKING ----------
function trackLocation() {

  navigator.geolocation.watchPosition(pos => {

    let userLocation = [pos.coords.latitude, pos.coords.longitude];

    updateUserMarker(userLocation);

    travelHistory.push(userLocation);

    getRoute(userLocation);
    detectDeviation(userLocation);
    checkShortcut(userLocation);

  }, err => console.log(err), {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
  });
}

// ---------- USER MARKER ----------
function updateUserMarker(location) {

  if (!userMarker) {
    userMarker = L.marker(location).addTo(map);
    map.setView(location, 16);
  } else {
    userMarker.setLatLng(location);
  }
}

// ---------- ROUTING ----------
function getRoute(start) {

  let url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;

  fetch(url)
    .then(res => res.json())
    .then(data => {

      let coords = data.routes[0].geometry.coordinates;
      currentRoute = coords.map(c => [c[1], c[0]]);

      if (routeLine) map.removeLayer(routeLine);

      routeLine = L.polyline(currentRoute, { color:'blue' }).addTo(map);

    });
}

// ---------- WRONG ROUTE DETECTION ----------
function detectDeviation(userLocation) {

  if (currentRoute.length === 0) return;

  let minDistance = Infinity;

  currentRoute.forEach(point => {
    let dist = map.distance(userLocation, point);
    if (dist < minDistance) minDistance = dist;
  });

  if (minDistance > 30) {
    document.getElementById("status").innerText =
      "Wrong route! Recalculating...";
    getRoute(userLocation);
  }
}

// ---------- SAVE SHORTCUT ----------
function saveShortcut() {

  if (travelHistory.length < 20) return;

  savedShortcuts.push(travelHistory);
  localStorage.setItem("shortcuts", JSON.stringify(savedShortcuts));

  travelHistory = [];

  alert("Shortcut saved!");
}

// ---------- CHECK FOR SHORTCUT ----------
function checkShortcut(userLocation) {

  if (savedShortcuts.length === 0) return;

  savedShortcuts.forEach(shortcut => {

    let shortcutDistance = calculatePathDistance(shortcut);
    let routeDistance = calculatePathDistance(currentRoute);

    if (shortcutDistance < routeDistance * 0.85) {

      if (shortcutLine) map.removeLayer(shortcutLine);

      shortcutLine = L.polyline(shortcut, { color:'green' }).addTo(map);

      document.getElementById("status").innerText =
        "Shortcut available! Using faster path.";
    }
  });
}

// ---------- DISTANCE CALCULATION ----------
function calculatePathDistance(path) {

  let distance = 0;

  for (let i = 1; i < path.length; i++) {
    distance += map.distance(path[i-1], path[i]);
  }

  return distance;
}
