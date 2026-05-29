import { useState, useEffect, useRef, useCallback } from "react";

const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY";

const BUSINESS_TYPES = [
  { value: "restaurant", label: "Restaurants" },
  { value: "cafe", label: "Cafes" },
  { value: "gym", label: "Gyms & Fitness" },
  { value: "beauty_salon", label: "Beauty Salons" },
  { value: "real_estate_agency", label: "Real Estate" },
  { value: "lawyer", label: "Law Firms" },
  { value: "dentist", label: "Dentists" },
  { value: "doctor", label: "Doctors" },
  { value: "accounting", label: "Accounting" },
  { value: "store", label: "Retail Stores" },
  { value: "hotel", label: "Hotels" },
  { value: "car_dealer", label: "Car Dealers" },
  { value: "contractor", label: "Contractors" },
  { value: "electrician", label: "Electricians" },
  { value: "plumber", label: "Plumbers" },
];

const STATUS_COLORS = {
  new: "#2563eb",
  contacted: "#d97706",
  qualified: "#16a34a",
  closed: "#dc2626",
};

const STATUS_LABELS = {
  new: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
};

function useGoogleMaps() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (window.google && window.google.maps) { setLoaded(true); return; }
    if (GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
      setError("demo");
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => setLoaded(true);
    script.onerror = () => setError("load");
    document.head.appendChild(script);
  }, []);

  return { loaded, error };
}

// ─── Demo data for when no API key is configured ─────────────────────────────
function generateDemoLeads(center, radiusKm, type) {
  const names = {
    restaurant: ["The Golden Fork", "Spice Garden", "Urban Bistro", "The Hungry Monk", "Casa Bella", "Saffron House"],
    gym: ["Iron Peak Gym", "FitZone Pro", "Pulse Fitness", "ElevateGym", "BodyForge Studio"],
    cafe: ["Brew & Co", "The Daily Grind", "Sunlit Cafe", "Roast Republic", "Grounds & Glory"],
    beauty_salon: ["Gloss Studio", "The Mane Event", "Velvet Beauty", "Luxe Look Salon"],
    default: ["Alpha Solutions", "Beta Corp", "Gamma Group", "Delta Partners", "Epsilon Co"],
  };
  const pool = names[type] || names.default;
  const count = Math.floor(Math.random() * 8) + 5;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + Math.random() * 0.5;
    const dist = (Math.random() * 0.9 + 0.05) * radiusKm / 111;
    return {
      id: `demo-${i}`,
      name: pool[i % pool.length] + (i >= pool.length ? ` ${Math.floor(i / pool.length) + 1}` : ""),
      vicinity: `${Math.floor(Math.random() * 999) + 1} ${["Main St", "Park Ave", "Oak Blvd", "Cedar Lane", "River Rd"][i % 5]}`,
      rating: +(Math.random() * 2 + 3).toFixed(1),
      user_ratings_total: Math.floor(Math.random() * 300) + 10,
      types: [type],
      geometry: {
        location: {
          lat: () => center.lat + dist * Math.sin(angle),
          lng: () => center.lng + dist * Math.cos(angle),
        },
      },
      place_id: `demo_${i}`,
      status: "new",
      notes: "",
      website: Math.random() > 0.5 ? "https://example.com" : "",
      phone: Math.random() > 0.4 ? `+1 (${Math.floor(Math.random()*900)+100}) ${Math.floor(Math.random()*900)+100}-${Math.floor(Math.random()*9000)+1000}` : "",
    };
  });
}

// ─── Map Component ────────────────────────────────────────────────────────────
function MapView({ center, radius, leads, selectedLead, onSelectLead, isDemo }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const circleRef = useRef(null);
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (isDemo) {
      mapRef.current.innerHTML = `<div style="width:100%;height:100%;background:#e8eaed;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">
        <div style="font-size:48px;margin-bottom:12px">🗺️</div>
        <div style="font-size:15px;color:#555;font-weight:600">Map Preview (Demo Mode)</div>
        <div style="font-size:13px;color:#888;margin-top:6px;text-align:center;max-width:260px">Add your Google Maps API key to see live map, radius, and pins</div>
      </div>`;
      return;
    }
    if (!window.google) return;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    infoWindowRef.current = new window.google.maps.InfoWindow();
  }, [isDemo]);

  useEffect(() => {
    if (!mapInstance.current || isDemo) return;
    mapInstance.current.setCenter(center);
    if (circleRef.current) circleRef.current.setMap(null);
    circleRef.current = new window.google.maps.Circle({
      map: mapInstance.current,
      center,
      radius: radius * 1000,
      fillColor: "#2563eb",
      fillOpacity: 0.08,
      strokeColor: "#2563eb",
      strokeOpacity: 0.5,
      strokeWeight: 2,
    });
    mapInstance.current.fitBounds(circleRef.current.getBounds());
  }, [center, radius, isDemo]);

  useEffect(() => {
    if (!mapInstance.current || isDemo) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    leads.forEach(lead => {
      const pos = { lat: lead.geometry.location.lat(), lng: lead.geometry.location.lng() };
      const color = STATUS_COLORS[lead.status] || STATUS_COLORS.new;
      const marker = new window.google.maps.Marker({
        map: mapInstance.current,
        position: pos,
        title: lead.name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        onSelectLead(lead);
        infoWindowRef.current.setContent(`
          <div style="font-family:sans-serif;padding:4px 2px;max-width:200px">
            <strong style="font-size:14px">${lead.name}</strong>
            <p style="margin:4px 0 2px;font-size:12px;color:#555">${lead.vicinity}</p>
            ${lead.rating ? `<p style="margin:2px 0;font-size:12px">⭐ ${lead.rating} (${lead.user_ratings_total} reviews)</p>` : ""}
            <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${color}22;color:${color};font-weight:600">${STATUS_LABELS[lead.status]}</span>
          </div>
        `);
        infoWindowRef.current.open(mapInstance.current, marker);
      });
      markersRef.current.push(marker);
    });
  }, [leads, isDemo, onSelectLead]);

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden" }} />
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────────────
function LeadCard({ lead, selected, onClick, onStatusChange }) {
  const color = STATUS_COLORS[lead.status];
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: "10px",
        border: `1.5px solid ${selected ? color : "rgba(0,0,0,0.09)"}`,
        background: selected ? `${color}08` : "#fff",
        cursor: "pointer",
        transition: "all 0.15s",
        marginBottom: "8px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.name}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#666", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.vicinity}</p>
        </div>
        <select
          value={lead.status}
          onChange={e => { e.stopPropagation(); onStatusChange(lead.id, e.target.value); }}
          onClick={e => e.stopPropagation()}
          style={{
            fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 20,
            border: `1px solid ${color}`, background: `${color}18`, color,
            cursor: "pointer", flexShrink: 0,
          }}
        >
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {lead.rating && (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888" }}>
          ⭐ {lead.rating} · {lead.user_ratings_total} reviews
        </p>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ lead, onClose, onUpdate }) {
  const [notes, setNotes] = useState(lead?.notes || "");
  const [status, setStatus] = useState(lead?.status || "new");

  useEffect(() => {
    if (lead) { setNotes(lead.notes || ""); setStatus(lead.status || "new"); }
  }, [lead?.id]);

  if (!lead) return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#aaa", gap: 12 }}>
      <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
      <p style={{ margin: 0, fontSize: 13, textAlign: "center" }}>Select a business<br/>to view details</p>
    </div>
  );

  const color = STATUS_COLORS[status];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1a1a2e" }}>{lead.name}</h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>{lead.vicinity}</p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#999", padding: 0, lineHeight: 1 }}>×</button>
      </div>

      {lead.rating && (
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "#f8f9fa", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>⭐ {lead.rating}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#888" }}>Rating</p>
          </div>
          <div style={{ flex: 1, background: "#f8f9fa", borderRadius: 8, padding: "8px 12px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a1a2e" }}>{lead.user_ratings_total}</p>
            <p style={{ margin: 0, fontSize: 10, color: "#888" }}>Reviews</p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</label>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); onUpdate(lead.id, { status: e.target.value }); }}
          style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: `1.5px solid ${color}`, background: `${color}10`, color, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {lead.phone && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone</label>
          <a href={`tel:${lead.phone}`} style={{ display: "block", marginTop: 4, fontSize: 13, color: "#2563eb", textDecoration: "none" }}>{lead.phone}</a>
        </div>
      )}

      {lead.website && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Website</label>
          <a href={lead.website} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 4, fontSize: 13, color: "#2563eb", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lead.website}</a>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={() => onUpdate(lead.id, { notes })}
          placeholder="Add notes about this lead..."
          style={{ display: "block", width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, resize: "vertical", minHeight: 80, boxSizing: "border-box", fontFamily: "inherit", color: "#1a1a2e" }}
        />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {lead.phone && (
          <a href={`tel:${lead.phone}`} style={{ flex: 1, padding: "9px", borderRadius: 8, background: "#2563eb", color: "#fff", textAlign: "center", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>📞 Call</a>
        )}
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noreferrer" style={{ flex: 1, padding: "9px", borderRadius: 8, background: "#f1f5f9", color: "#2563eb", textAlign: "center", textDecoration: "none", fontSize: 12, fontWeight: 600 }}>🌐 Website</a>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function LeadRadar() {
  const { loaded, error } = useGoogleMaps();
  const isDemo = error === "demo";
  const [searchText, setSearchText] = useState("");
  const [coords, setCoords] = useState({ lat: 40.7128, lng: -74.006 });
  const [radius, setRadius] = useState(2);
  const [type, setType] = useState("restaurant");
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!loaded || !inputRef.current || isDemo) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, { types: ["geocode"] });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        setCoords({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() });
        setSearchText(place.formatted_address || place.name);
      }
    });
  }, [loaded, isDemo]);

  const searchLeads = useCallback(() => {
    setLoading(true);
    setSearched(true);
    if (isDemo) {
      setTimeout(() => {
        const results = generateDemoLeads(coords, radius, type);
        setLeads(results.map(r => ({ ...r, status: "new", notes: "" })));
        setLoading(false);
      }, 900);
      return;
    }
    if (!window.google) return;
    const service = new window.google.maps.places.PlacesService(document.createElement("div"));
    service.nearbySearch({
      location: coords,
      radius: radius * 1000,
      type,
    }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setLeads(results.map(r => ({ ...r, status: "new", notes: "" })));
      }
      setLoading(false);
    });
  }, [coords, radius, type, isDemo]);

  const updateLead = useCallback((id, updates) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    setSelectedLead(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  }, []);

  const filteredLeads = leads.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (searchQuery && !l.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const exportCSV = () => {
    const rows = [["Name", "Address", "Rating", "Reviews", "Status", "Phone", "Website", "Notes"]];
    leads.forEach(l => rows.push([l.name, l.vicinity, l.rating || "", l.user_ratings_total || "", l.status, l.phone || "", l.website || "", l.notes]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "leads.csv"; a.click();
  };

  const statusCounts = Object.keys(STATUS_LABELS).reduce((acc, s) => {
    acc[s] = leads.filter(l => l.status === s).length; return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f0f4f8", fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#1a1a2e", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#2563eb,#7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📡</div>
          <div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-0.02em" }}>LeadRadar</span>
            <span style={{ color: "#4a9eff", fontSize: 11, marginLeft: 8, background: "#2563eb22", padding: "1px 7px", borderRadius: 10, border: "1px solid #2563eb44" }}>
              {isDemo ? "Demo Mode" : "Live"}
            </span>
          </div>
        </div>
        {leads.length > 0 && (
          <button onClick={exportCSV} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            ⬇ Export CSV
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 24px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", flexShrink: 0 }}>
        <div style={{ flex: "1 1 220px" }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#888", display: "block", marginBottom: 4 }}>LOCATION</label>
          <input
            ref={inputRef}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Enter city, address..."
            style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, boxSizing: "border-box" }}
          />
        </div>
        <div style={{ flex: "0 1 160px" }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#888", display: "block", marginBottom: 4 }}>BUSINESS TYPE</label>
          <select value={type} onChange={e => setType(e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 13, background: "#fff" }}>
            {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "0 1 140px" }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#888", display: "block", marginBottom: 4 }}>RADIUS: {radius} km</label>
          <input type="range" min="0.5" max="20" step="0.5" value={radius} onChange={e => setRadius(+e.target.value)} style={{ width: "100%" }} />
        </div>
        <button onClick={searchLeads} disabled={loading} style={{ padding: "9px 20px", background: loading ? "#93c5fd" : "#2563eb", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", flexShrink: 0 }}>
          {loading ? "Searching..." : "🔍 Search"}
        </button>
      </div>

      {/* Stats Bar */}
      {searched && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "8px 24px", display: "flex", gap: 16, alignItems: "center", flexShrink: 0, overflowX: "auto" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e" }}>{leads.length} leads found</span>
          <div style={{ width: 1, height: 16, background: "#e2e8f0" }} />
          {Object.entries(STATUS_LABELS).map(([s, l]) => (
            <span key={s} style={{ fontSize: 11, color: STATUS_COLORS[s], fontWeight: 600, whiteSpace: "nowrap" }}>
              {statusCounts[s]} {l}
            </span>
          ))}
        </div>
      )}

      {/* Main Layout */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar */}
        <div style={{ width: 300, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {/* Filters */}
          <div style={{ padding: "12px 14px", borderBottom: "1px solid #e2e8f0" }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter leads..." style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 12, boxSizing: "border-box", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["all", ...Object.keys(STATUS_LABELS)].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "3px 10px", borderRadius: 20, border: `1.5px solid ${s === "all" ? "#e2e8f0" : STATUS_COLORS[s]}`, background: filterStatus === s ? (s === "all" ? "#f1f5f9" : `${STATUS_COLORS[s]}15`) : "transparent", color: s === "all" ? "#555" : STATUS_COLORS[s], fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                  {s === "all" ? "All" : STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          {/* Lead List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
            {!searched ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📍</div>
                <p style={{ margin: 0, fontSize: 13 }}>Search to discover businesses in your area</p>
              </div>
            ) : loading ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
                <div style={{ fontSize: 30, marginBottom: 8, animation: "spin 1s linear infinite" }}>⟳</div>
                <p style={{ margin: 0, fontSize: 13 }}>Finding businesses...</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa" }}>
                <p style={{ margin: 0, fontSize: 13 }}>No leads match your filters</p>
              </div>
            ) : (
              filteredLeads.map(lead => (
                <LeadCard key={lead.id} lead={lead} selected={selectedLead?.id === lead.id} onClick={() => setSelectedLead(lead)} onStatusChange={(id, status) => updateLead(id, { status })} />
              ))
            )}
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <MapView center={coords} radius={radius} leads={leads} selectedLead={selectedLead} onSelectLead={setSelectedLead} isDemo={isDemo} />
          {isDemo && !loading && leads.length > 0 && (
            <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", background: "rgba(26,26,46,0.9)", color: "#fff", padding: "10px 18px", borderRadius: 10, fontSize: 12, backdropFilter: "blur(8px)", textAlign: "center", maxWidth: 340 }}>
              🔑 Add your <strong>Google Maps API Key</strong> to <code>GOOGLE_MAPS_API_KEY</code> to see the live map & real business data
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div style={{ width: 280, background: "#fff", borderLeft: "1px solid #e2e8f0", flexShrink: 0 }}>
          <DetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={updateLead} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
