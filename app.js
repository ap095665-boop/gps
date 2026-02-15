let map;
let userMarker;
let routeLine;
let shortcutLine;

let currentRoute = [];
let travelHistory = [];
let navigating = false;

let destination = null;

// load saved shortcuts
let savedShortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];

// ---------- INIT MAP ----------
function initMap() {

  map = L.map('map').setView([13.0827,80.2707], 13); // Chennai start

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© OpenStreetMap'
  }).addTo(map);
}

window.onload = initMap;

// ---------- START NAVIGATION ----------
function startNavigation() {

  let fromInput = document.getElementById("from").value;
  let toInput = document.getElementById("to").value;

  if (!toInput) {
    alert("Enter destination lat,lng");
    return;
  }

  destination = toInput.split(',').map(Number);

  navigating = true;
  travelHistory = [];

  trackLocation();
}

// ---------- GPS TRACKING ----------
function trackLocation() {

  navigator.geolocation.watchPosition(pos => {

    if (!navigating) return;

    let userLocation = [pos.coords.latitude, pos.coords.longitude];

    updateUserMarker(userLocation);

    travelHistory.push(userLocation);

    getRoute(userLocation);
    detectDeviation(userLocation);
    checkAutoShortcut(userLocation);

  }, err => console.log(err), {
    enableHighAccuracy:true,
    maximumAge:0,
    timeout:5000
  });
}

// ---------- USER MARKER ----------
function updateUserMarker(location) {

  if (!userMarker) {
    userMarker = L.marker(location).addTo(map);
    map.setView(location,16);
  } else {
    userMarker.setLatLng(location);
  }
}

// ---------- ROUTE ----------
function getRoute(start) {

  let url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${destination[1]},${destination[0]}?overview=full&geometries=geojson`;

  fetch(url)
  .then(res=>res.json())
  .then(data=>{

    let coords = data.routes[0].geometry.coordinates;
    currentRoute = coords.map(c=>[c[1],c[0]]);

    if(routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(currentRoute,{color:'blue'}).addTo(map);

  });
}

// ---------- WRONG ROUTE ----------
function detectDeviation(userLocation){

  if(currentRoute.length===0) return;

  let minDistance = Infinity;

  currentRoute.forEach(point=>{
    let dist = map.distance(userLocation,point);
    if(dist<minDistance) minDistance = dist;
  });

  if(minDistance>35){
    document.getElementById("status").innerText="Wrong route... recalculating";
    getRoute(userLocation);
  }
}

// ---------- AUTO LEARN SHORTCUT ----------
function checkAutoShortcut(userLocation){

  if(travelHistory.length<30) return;

  // if destination reached
  let distToDestination = map.distance(userLocation,destination);

  if(distToDestination<40){

    saveShortcut(travelHistory);
    travelHistory=[];
    navigating=false;

    document.getElementById("status").innerText="Route learned!";
  }

  // compare existing shortcuts
  savedShortcuts.forEach(shortcut=>{

    let shortcutDistance = calculateDistance(shortcut);
    let routeDistance = calculateDistance(currentRoute);

    if(shortcutDistance < routeDistance*0.85){

      if(shortcutLine) map.removeLayer(shortcutLine);

      shortcutLine = L.polyline(shortcut,{color:'green'}).addTo(map);

      document.getElementById("status").innerText="Using learned shortcut!";
    }
  });
}

// ---------- SAVE SHORTCUT ----------
function saveShortcut(path){

  savedShortcuts.push(path);
  localStorage.setItem("shortcuts",JSON.stringify(savedShortcuts));
}

// ---------- DISTANCE ----------
function calculateDistance(path){

  let distance=0;

  for(let i=1;i<path.length;i++){
    distance+=map.distance(path[i-1],path[i]);
  }

  return distance;
}
