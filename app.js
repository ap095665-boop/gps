let map;
let userMarker;
let destinationMarker;
let routeLine;

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

  trackLocation();
}

window.onload = initMap;


// ---------- GET CURRENT LOCATION ----------
function trackLocation() {

  navigator.geolocation.watchPosition(pos => {

    let userLocation = [pos.coords.latitude, pos.coords.longitude];

    updateUserMarker(userLocation);

    if(destinationCoords){
      drawRoute(userLocation);
      detectDeviation(userLocation);
      learnShortcut(userLocation);
    }

  }, err => console.log(err), {
    enableHighAccuracy:true
  });
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


// ---------- SEARCH DESTINATION NAME ----------
function startNavigation(){

  let place = document.getElementById("destination").value;

  if(!place){
    alert("Enter destination name");
    return;
  }

  document.getElementById("status").innerText="Searching location...";

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${place}`)
  .then(res=>res.json())
  .then(data=>{

    if(data.length===0){
      alert("Location not found");
      return;
    }

    destinationCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];

    if(destinationMarker) map.removeLayer(destinationMarker);

    destinationMarker = L.marker(destinationCoords).addTo(map);
    map.setView(destinationCoords,16);

    document.getElementById("status").innerText="Destination found. Navigating...";

  });
}


// ---------- ROUTE ----------
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
    document.getElementById("status").innerText="Re-routing...";
    drawRoute(userLocation);
  }
}


// ---------- AUTO SHORTCUT LEARNING ----------
function learnShortcut(userLocation){

  travelHistory.push(userLocation);

  let distToDestination = map.distance(userLocation,destinationCoords);

  if(distToDestination<40){

    if(travelHistory.length>25){
      savedShortcuts.push(travelHistory);
      localStorage.setItem("shortcuts",JSON.stringify(savedShortcuts));
      document.getElementById("status").innerText="Shortcut learned!";
    }

    travelHistory=[];
  }
}
