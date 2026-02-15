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

  trackLocation();
}

window.onload = initMap;


// ---------- TRACK USER GPS ----------
function trackLocation() {

  navigator.geolocation.watchPosition(pos => {

    let userLocation = [pos.coords.latitude, pos.coords.longitude];

    updateUserMarker(userLocation);

    if(destinationCoords){
      drawRoute(userLocation);
      detectDeviation(userLocation);
      learnShortcut(userLocation);
      checkShortcut(userLocation);
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


// ---------- GOOGLE LINK EXTRACTOR ----------
function extractCoordinates(url){

  // pattern 1: @lat,lng
  let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

  if(match) return [parseFloat(match[1]), parseFloat(match[2])];

  // pattern 2: q=lat,lng
  match = url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);

  if(match) return [parseFloat(match[1]), parseFloat(match[2])];

  return null;
}


// ---------- START NAVIGATION ----------
function startNavigation(){

  let link = document.getElementById("googleLink").value;

  if(!link){
    alert("Paste Google Maps link");
    return;
  }

  let coords = extractCoordinates(link);

  if(!coords){
    alert("Unable to extract coordinates from link");
    return;
  }

  destinationCoords = coords;

  if(destinationMarker) map.removeLayer(destinationMarker);

  destinationMarker = L.marker(destinationCoords).addTo(map);

  map.setView(destinationCoords,16);

  document.getElementById("status").innerText="Destination loaded. Navigating...";
}


// ---------- ROUTE DRAW ----------
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


// ---------- WRONG ROUTE DETECTION ----------
function detectDeviation(userLocation){

  if(currentRoute.length===0) return;

  let minDistance = Infinity;

  currentRoute.forEach(point=>{
    let dist = map.distance(userLocation,point);
    if(dist<minDistance) minDistance = dist;
  });

  if(minDistance>40){
    document.getElementById("status").innerText="Wrong route. Re-routing...";
    drawRoute(userLocation);
  }
}


// ---------- AUTO LEARN SHORTCUT ----------
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


// ---------- USE BEST SHORTCUT ----------
function checkShortcut(userLocation){

  if(savedShortcuts.length===0) return;

  savedShortcuts.forEach(shortcut=>{

    let shortcutDistance = calculateDistance(shortcut);
    let routeDistance = calculateDistance(currentRoute);

    if(shortcutDistance < routeDistance*0.85){

      if(shortcutLine) map.removeLayer(shortcutLine);

      shortcutLine = L.polyline(shortcut,{color:'green'}).addTo(map);

      document.getElementById("status").innerText="Using learned shortcut route";
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
