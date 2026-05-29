// Google Maps Places API — 25 different API usage patterns

export const GOOGLE_MAPS_KEY = "AIzaSyAlQsON2HFJM5mCRP18E_R_UGP_x3SXNI8"; // Replace with your Maps key

let mapsLoaded = false;
let mapsLoadingPromise = null;

// API 1: Load Google Maps SDK
export const loadGoogleMaps = () => {
  if (mapsLoaded && window.google) return Promise.resolve();
  if (mapsLoadingPromise) return mapsLoadingPromise;
  mapsLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,geometry`;
    script.async = true;
    script.onload = () => { mapsLoaded = true; resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return mapsLoadingPromise;
};

// API 2: Geocoding — address → coordinates
export const geocodeAddress = (address) => {
  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results[0]) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
          formatted: results[0].formatted_address,
          components: results[0].address_components,
        });
      } else reject(new Error(`Geocoding failed: ${status}`));
    });
  });
};

// API 3: Reverse Geocoding — coordinates → address
export const reverseGeocode = (lat, lng) => {
  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results[0]) resolve(results[0].formatted_address);
      else reject(new Error(`Reverse geocoding failed: ${status}`));
    });
  });
};

// API 4: Nearby Search — find businesses in radius
export const nearbySearch = (location, radiusM, type, keyword = "") => {
  return new Promise((resolve, reject) => {
    const service = new window.google.maps.places.PlacesService(document.createElement("div"));
    const request = { location, radius: radiusM, type };
    if (keyword) request.keyword = keyword;
    service.nearbySearch(request, (results, status, pagination) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        resolve({ results, pagination });
      } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve({ results: [], pagination: null });
      } else reject(new Error(`Nearby search failed: ${status}`));
    });
  });
};

// API 5: Nearby Search — next page
export const nearbySearchNextPage = (pagination) => {
  return new Promise((resolve) => {
    if (!pagination?.hasNextPage) { resolve([]); return; }
    setTimeout(() => {
      pagination.nextPage((results, status) => {
        resolve(status === window.google.maps.places.PlacesServiceStatus.OK ? results : []);
      });
    }, 2000);
  });
};

// API 6: Text Search — free-text query
export const textSearch = (query, location, radiusM) => {
  return new Promise((resolve, reject) => {
    const service = new window.google.maps.places.PlacesService(document.createElement("div"));
    service.textSearch({ query, location, radius: radiusM }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) resolve(results);
      else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) resolve([]);
      else reject(new Error(`Text search failed: ${status}`));
    });
  });
};

// API 7: Place Details — full details for a place_id
export const getPlaceDetails = (placeId) => {
  return new Promise((resolve, reject) => {
    const service = new window.google.maps.places.PlacesService(document.createElement("div"));
    service.getDetails({
      placeId,
      fields: [
        "name", "formatted_address", "formatted_phone_number", "international_phone_number",
        "website", "rating", "user_ratings_total", "opening_hours", "photos",
        "types", "geometry", "business_status", "price_level", "reviews",
        "url", "vicinity", "utc_offset_minutes", "address_components"
      ],
    }, (result, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) resolve(result);
      else reject(new Error(`Place details failed: ${status}`));
    });
  });
};

// API 8: Autocomplete — location suggestions
export const setupAutocomplete = (inputEl, onSelect) => {
  const autocomplete = new window.google.maps.places.Autocomplete(inputEl, {
    types: ["geocode", "establishment"],
  });
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place.geometry) onSelect({
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      formatted: place.formatted_address || place.name,
      name: place.name,
    });
  });
  return autocomplete;
};

// API 9: Autocomplete — predictions only (no input binding)
export const getAutocompletePredictions = (input) => {
  return new Promise((resolve) => {
    const service = new window.google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input, types: ["geocode"] }, (predictions, status) => {
      resolve(status === window.google.maps.places.PlacesServiceStatus.OK ? predictions : []);
    });
  });
};

// API 10: Distance Matrix — travel time between points
export const getDistanceMatrix = (origin, destinations) => {
  return new Promise((resolve) => {
    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
      origins: [origin],
      destinations,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (response, status) => {
      if (status === "OK") resolve(response.rows[0]?.elements || []);
      else resolve([]);
    });
  });
};

// API 11: Compute distance using geometry library
export const computeDistance = (from, to) => {
  const a = new window.google.maps.LatLng(from.lat, from.lng);
  const b = new window.google.maps.LatLng(to.lat, to.lng);
  return window.google.maps.geometry.spherical.computeDistanceBetween(a, b);
};

// API 12: Initialize Map instance
export const initMap = (container, center, zoom = 13) => {
  return new window.google.maps.Map(container, {
    center,
    zoom,
    disableDefaultUI: false,
    mapTypeControl: false,
    streetViewControl: true,
    fullscreenControl: true,
    zoomControl: true,
    styles: DARK_MAP_STYLES,
  });
};

// API 13: Draw circle on map
export const drawCircle = (map, center, radiusM) => {
  return new window.google.maps.Circle({
    map,
    center,
    radius: radiusM,
    fillColor: "#00d4ff",
    fillOpacity: 0.06,
    strokeColor: "#00d4ff",
    strokeOpacity: 0.6,
    strokeWeight: 1.5,
  });
};

// API 14: Create marker
export const createMarker = (map, position, label, color = "#00d4ff") => {
  return new window.google.maps.Marker({
    map,
    position,
    title: label,
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#0a0a0f",
      strokeWeight: 2,
    },
  });
};

// API 15: Create InfoWindow
export const createInfoWindow = (content) => {
  return new window.google.maps.InfoWindow({ content });
};

// API 16: Fit map to bounds of all markers
export const fitMapToBounds = (map, positions) => {
  if (!positions.length) return;
  const bounds = new window.google.maps.LatLngBounds();
  positions.forEach(p => bounds.extend(p));
  map.fitBounds(bounds);
};

// API 17: Find Place from text
export const findPlaceFromText = (query) => {
  return new Promise((resolve) => {
    const service = new window.google.maps.places.PlacesService(document.createElement("div"));
    service.findPlaceFromQuery({ query, fields: ["name", "geometry", "place_id", "formatted_address"] }, (results, status) => {
      resolve(status === window.google.maps.places.PlacesServiceStatus.OK ? results : []);
    });
  });
};

// API 18: Query Autocomplete (search-as-you-type)
export const queryAutocomplete = (input, location, radius) => {
  return new Promise((resolve) => {
    const service = new window.google.maps.places.AutocompleteService();
    service.getQueryPredictions({ input, location, radius }, (predictions, status) => {
      resolve(status === window.google.maps.places.PlacesServiceStatus.OK ? predictions : []);
    });
  });
};

// API 19: Street View availability check
export const checkStreetView = (location) => {
  return new Promise((resolve) => {
    const sv = new window.google.maps.StreetViewService();
    sv.getPanorama({ location, radius: 50 }, (data, status) => {
      resolve(status === window.google.maps.places.PlacesServiceStatus.OK);
    });
  });
};

// API 20: Heatmap layer (density visualization)
export const createHeatmap = (map, positions) => {
  const data = positions.map(p => new window.google.maps.LatLng(p.lat, p.lng));
  return new window.google.maps.visualization.HeatmapLayer({ data, map, radius: 30 });
};

// API 21: Directions service
export const getDirections = (origin, destination) => {
  return new Promise((resolve) => {
    const service = new window.google.maps.DirectionsService();
    service.route({
      origin,
      destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      resolve(status === "OK" ? result : null);
    });
  });
};

// API 22: Elevation service (useful for terrain analysis)
export const getElevation = (locations) => {
  return new Promise((resolve) => {
    const service = new window.google.maps.ElevationService();
    service.getElevationForLocations({ locations }, (results, status) => {
      resolve(status === "OK" ? results : []);
    });
  });
};

// API 23: Map data layer (GeoJSON import)
export const addGeoJsonLayer = (map, geojson) => {
  map.data.addGeoJson(geojson);
};

// API 24: Polygon/area search bounds
export const getPolygonBounds = (polygon) => {
  const bounds = new window.google.maps.LatLngBounds();
  polygon.getPath().forEach(p => bounds.extend(p));
  return bounds;
};

// API 25: Place photo URL
export const getPhotoUrl = (photoReference, maxWidth = 400) => {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_KEY}`;
};

// ─── Status colors ─────────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  new:       { color: "#00d4ff", label: "New Lead",   bg: "rgba(0,212,255,0.12)" },
  contacted: { color: "#f59e0b", label: "Contacted",  bg: "rgba(245,158,11,0.12)" },
  qualified: { color: "#10b981", label: "Qualified",  bg: "rgba(16,185,129,0.12)" },
  proposal:  { color: "#8b5cf6", label: "Proposal",   bg: "rgba(139,92,246,0.12)" },
  won:       { color: "#22c55e", label: "Won",        bg: "rgba(34,197,94,0.12)" },
  lost:      { color: "#ef4444", label: "Lost",       bg: "rgba(239,68,68,0.12)" },
};

// ─── Business type categories ─────────────────────────────────────────────────
export const BUSINESS_CATEGORIES = [
  { group: "Food & Drink",   types: [
    { value: "restaurant", label: "Restaurants", icon: "🍽️" },
    { value: "cafe", label: "Cafes", icon: "☕" },
    { value: "bar", label: "Bars", icon: "🍺" },
    { value: "bakery", label: "Bakeries", icon: "🥐" },
    { value: "meal_delivery", label: "Food Delivery", icon: "🛵" },
  ]},
  { group: "Health & Beauty", types: [
    { value: "gym", label: "Gyms", icon: "💪" },
    { value: "beauty_salon", label: "Beauty Salons", icon: "💇" },
    { value: "spa", label: "Spas", icon: "🧖" },
    { value: "dentist", label: "Dentists", icon: "🦷" },
    { value: "doctor", label: "Doctors", icon: "👨‍⚕️" },
    { value: "pharmacy", label: "Pharmacies", icon: "💊" },
  ]},
  { group: "Professional",   types: [
    { value: "lawyer", label: "Law Firms", icon: "⚖️" },
    { value: "accounting", label: "Accounting", icon: "📊" },
    { value: "real_estate_agency", label: "Real Estate", icon: "🏠" },
    { value: "insurance_agency", label: "Insurance", icon: "🛡️" },
    { value: "bank", label: "Banks", icon: "🏦" },
  ]},
  { group: "Trades",          types: [
    { value: "electrician", label: "Electricians", icon: "⚡" },
    { value: "plumber", label: "Plumbers", icon: "🔧" },
    { value: "painter", label: "Painters", icon: "🎨" },
    { value: "roofing_contractor", label: "Roofers", icon: "🏗️" },
    { value: "general_contractor", label: "Contractors", icon: "👷" },
  ]},
  { group: "Retail & Other",  types: [
    { value: "store", label: "Retail Stores", icon: "🛍️" },
    { value: "car_dealer", label: "Car Dealers", icon: "🚗" },
    { value: "hotel", label: "Hotels", icon: "🏨" },
    { value: "moving_company", label: "Moving Co.", icon: "📦" },
    { value: "pet_store", label: "Pet Stores", icon: "🐾" },
  ]},
];

// ─── Dark map styles ───────────────────────────────────────────────────────────
export const DARK_MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0d0d1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d0d1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8892a4" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e2535" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0d16" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#3a3a5c" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
];
