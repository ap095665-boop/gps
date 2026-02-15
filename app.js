let map;
let userMarker;
let destinationMarker;
let routeLine;
let shortcutLine;

let destinationCoords = null;
let currentRoute = [];
let travelHistory = [];

let savedShortcuts = JSON.parse(localStorage.getItem("shortcuts")) || [];

// ---------- INIT ----------
function initMap() {

  map = L.map('map').setView([13.0827,80.2707], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:'© OpenStreetMap'
  }).addTo(map);

  trackUserLocation();
}

window.onload = initMap;


// ---------- LIVE GPS ----------
function trackUserLocation(){

  navigator.geolocation.watchPosition(pos=>{

    let userLocation = [pos.coords.latitude, pos.coords.longitude];

    updateUserMarker(userLocation);

    if(destinationCoords){
      drawRoute(userLocation);
      detectDeviation(userLocation);
      learnShortcut(userLocation);
      checkShortcuts(userLocation);
    }

  }, err=>console.log(err), { enableHighAccuracy:true });
}


// ---------- USER MARKER ----------
function updateUserMarker(location){

  if(!userMarker){
    userMarker = L.marker(location).addTo(map);
    map.setView(location,15);
  }else{
    userMarker.setLatLng(location);
  }
}


// ---------- START NAVIGATION ----------
async function startNavigation(){

  let input = document.getElementById("destinationInput").value.trim();

  if(!input){
    alert("Enter destination");
    return;
  }

  document.getElementById("status").innerText="Detecting destination...";

  // Try extracting coordinates
  let coords = extractCoordinates(input);

  if(coords){
    destinationCoords = coords;
    placeDestinationMarker();
    return;
  }

  // Try place search
  searchPlace(input);
}


// ---------- EXTRACT COORDINATES ----------
function extractCoordinates(input){

  let match;

  match = input.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(match) return [parseFloat(match[1]), parseFloat(match[2])];

  match = input.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if(match) return [parseFloat(match[1]), parseFloat(match[2])];

  match = input.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
  if(match) return [parseFloat(match[1]), parseFloat(match[2])];

  return null;
}


// ---------- PLACE SEARCH ----------
function searchPlace(place){

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`)
  .then(res=>res.json())
  .then(data=>{

    if(data.length===0){
      document.getElementById("status").innerText =
        "Open short Google link once, copy full URL and paste again.";
      return;
    }

    destinationCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    placeDestinationMarker();
  });
}


// ---------- DESTINATION MARKER ----------
function placeDestinationMarker(){

  if(destinationMarker) map.removeLayer(destinationMarker);

  destinationMarker = L.marker(destinationCoords).addTo(map);

  map.setView(destinationCoords,16);

  document.getElementById("status").innerText =
    "Destination detected. Navigating...";
}


// ---------- ROUTING ----------
function drawRoute(start){

  let url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${destinationCoords[1]},${destinationCoords[0]}?overview=full&geometries=geojson`;

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

  if(minDistance>40){
    document.getElementById("status").innerText="Wrong route... recalculating";
    drawRoute(userLocation);
  }
}


// ---------- AUTO LEARN SHORTCUT ----------
function learnShortcut(userLocation){

  travelHistory.push(userLocation);

  let dist = map.distance(userLocation,destinationCoords);

  if(dist<40){

    if(travelHistory.length>25){

      savedShortcuts.push(travelHistory);
      localStorage.setItem("shortcuts",JSON.stringify(savedShortcuts));

      document.getElementById("status").innerText="Shortcut learned!";
    }

    travelHistory=[];
  }
}


// ---------- CHECK SHORTCUT ----------
function checkShortcuts(userLocation){

  savedShortcuts.forEach(shortcut=>{

    let shortcutDistance = calculateDistance(shortcut);
    let routeDistance = calculateDistance(currentRoute);

    if(shortcutDistance < routeDistance*0.85){

      if(shortcutLine) map.removeLayer(shortcutLine);

      shortcutLine = L.polyline(shortcut,{color:'green'}).addTo(map);

      document.getElementById("status").innerText="Using faster shortcut";
    }
  });
}


// ---------- DISTANCE ----------
function calculateDistance(path){

  let distance=0;

  for(let i=1;i<path.length;i++){
    distance+=map.distance(path[i-1],path[i]);
  }

  return distance;
}
