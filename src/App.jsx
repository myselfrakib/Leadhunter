import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLeads } from "./hooks/useLeads";
import {
  loadGoogleMaps, geocodeAddress, nearbySearch, nearbySearchNextPage,
  getPlaceDetails, setupAutocomplete, initMap, drawCircle,
  createMarker, createInfoWindow, fitMapToBounds,
  STATUS_CONFIG, BUSINESS_CATEGORIES,
} from "./lib/maps";
import { addNote, getNotes, deleteNote, getSearchHistory, trackEvent } from "./lib/firebase";

// ─── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #06060f; --bg2: #0d0d1a; --bg3: #12121f;
    --surface: rgba(255,255,255,0.04); --surface2: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.08); --border2: rgba(255,255,255,0.14);
    --text: #e8eaf6; --text2: #8892b0; --text3: #4a5568;
    --cyan: #00d4ff; --cyan2: rgba(0,212,255,0.15); --cyan3: rgba(0,212,255,0.06);
    --gold: #f59e0b; --green: #10b981; --red: #ef4444; --purple: #8b5cf6;
    --font-head: 'Syne', sans-serif; --font-body: 'DM Sans', sans-serif;
    --r: 12px; --r2: 16px; --shadow: 0 8px 32px rgba(0,0,0,0.4);
  }
  html, body, #root { height: 100%; font-family: var(--font-body); background: var(--bg); color: var(--text); overflow: hidden; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--cyan); }
  input, select, textarea, button { font-family: var(--font-body); }
  input::placeholder { color: var(--text3); }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  .slide-up { animation: slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards; }
  .spin { animation: spin 1s linear infinite; }
  .stagger > * { animation: slideUp 0.3s ease forwards; opacity: 0; }
  .stagger > *:nth-child(1) { animation-delay: 0.05s; }
  .stagger > *:nth-child(2) { animation-delay: 0.10s; }
  .stagger > *:nth-child(3) { animation-delay: 0.15s; }
  .stagger > *:nth-child(4) { animation-delay: 0.20s; }
  .stagger > *:nth-child(5) { animation-delay: 0.25s; }
  .stagger > *:nth-child(6) { animation-delay: 0.30s; }
  .stagger > *:nth-child(7) { animation-delay: 0.35s; }
  .stagger > *:nth-child(8) { animation-delay: 0.40s; }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes spin { to { transform:rotate(360deg) } }
  @keyframes shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
  .skeleton { background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:var(--r); }
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:9px 18px; border-radius:var(--r); border:none; cursor:pointer; font-family:var(--font-body); font-size:13px; font-weight:500; transition:all 0.18s ease; white-space:nowrap; }
  .btn:active { transform:scale(0.97); }
  .btn-primary { background:linear-gradient(135deg,var(--cyan),#0099cc); color:#000; font-weight:700; box-shadow:0 4px 16px rgba(0,212,255,0.3); }
  .btn-primary:hover { box-shadow:0 6px 24px rgba(0,212,255,0.5); transform:translateY(-1px); }
  .btn-ghost { background:var(--surface); color:var(--text2); border:1px solid var(--border); }
  .btn-ghost:hover { background:var(--surface2); color:var(--text); border-color:var(--border2); }
  .btn-danger { background:rgba(239,68,68,0.15); color:var(--red); border:1px solid rgba(239,68,68,0.3); }
  .btn-danger:hover { background:rgba(239,68,68,0.25); }
  .btn-icon { padding:8px; border-radius:8px; min-width:34px; }
  .input-field { width:100%; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r); color:var(--text); font-size:13px; outline:none; transition:all 0.2s; }
  .input-field:focus { border-color:var(--cyan); background:var(--surface2); box-shadow:0 0 0 3px rgba(0,212,255,0.1); }
  .input-field:hover:not(:focus) { border-color:var(--border2); }
  .card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r2); transition:all 0.2s; }
  .pac-container { background:var(--bg3) !important; border:1px solid var(--border2) !important; border-radius:var(--r) !important; box-shadow:var(--shadow) !important; font-family:var(--font-body) !important; margin-top:4px !important; }
  .pac-item { color:var(--text2) !important; padding:8px 14px !important; font-size:13px !important; border-top:1px solid var(--border) !important; cursor:pointer !important; }
  .pac-item:hover { background:var(--surface2) !important; }
  .pac-item-query { color:var(--text) !important; }
  .pac-icon { display:none !important; }
  .pac-matched { color:var(--cyan) !important; }
`;

// ─── Toast ─────────────────────────────────────────────────────────────────────
let toastFn = null;
function Toaster() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => {
    toastFn = (msg, type = "info") => {
      const id = Date.now();
      setToasts(t => [...t, { id, msg, type }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
    };
  }, []);
  const colors = { info: "var(--cyan)", success: "var(--green)", error: "var(--red)", warning: "var(--gold)" };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} className="slide-up" style={{ background:"var(--bg3)", border:`1px solid ${colors[t.type]}44`, borderLeft:`3px solid ${colors[t.type]}`, borderRadius:"var(--r)", padding:"10px 16px", fontSize:13, color:"var(--text)", maxWidth:300, boxShadow:"var(--shadow)" }}>{t.msg}</div>
      ))}
    </div>
  );
}
const toast = (msg, type) => toastFn?.(msg, type);

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, onChange }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.new;
  if (!onChange) return (
    <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:10, fontWeight:700, color:cfg.color, background:cfg.bg, border:`1px solid ${cfg.color}44` }}>{cfg.label}</span>
  );
  return (
    <select value={status} onChange={e => { e.stopPropagation(); onChange(e.target.value); }} onClick={e => e.stopPropagation()}
      style={{ fontSize:11, fontWeight:600, padding:"3px 8px", borderRadius:20, border:`1px solid ${cfg.color}66`, background:cfg.bg, color:cfg.color, cursor:"pointer", outline:"none", fontFamily:"var(--font-body)" }}>
      {Object.entries(STATUS_CONFIG).map(([v,c]) => <option key={v} value={v}>{c.label}</option>)}
    </select>
  );
}

function Stars({ rating }) {
  if (!rating) return null;
  return <span style={{ fontSize:11, color:"#f59e0b" }}>{"★".repeat(Math.round(rating))}{"☆".repeat(5-Math.round(rating))}<span style={{ color:"var(--text2)", marginLeft:4 }}>{rating.toFixed(1)}</span></span>;
}

// ─── Map ───────────────────────────────────────────────────────────────────────
function MapPane({ center, radius, leads, onSelectLead }) {
  const mapRef = useRef(null);
  const mapInst = useRef(null);
  const circleRef = useRef(null);
  const markers = useRef([]);
  const iw = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !window.google) return;
    mapInst.current = initMap(mapRef.current, center, 13);
    iw.current = createInfoWindow("");
  }, []);

  useEffect(() => {
    if (!mapInst.current) return;
    mapInst.current.setCenter(center);
    if (circleRef.current) circleRef.current.setMap(null);
    circleRef.current = drawCircle(mapInst.current, center, radius * 1000);
    mapInst.current.fitBounds(circleRef.current.getBounds());
  }, [center, radius]);

  useEffect(() => {
    if (!mapInst.current) return;
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];
    leads.forEach(lead => {
      const loc = lead.geometry?.location;
      if (!loc) return;
      const pos = { lat: typeof loc.lat === "function" ? loc.lat() : loc.lat, lng: typeof loc.lng === "function" ? loc.lng() : loc.lng };
      const cfg = STATUS_CONFIG[lead.status || "new"];
      const m = createMarker(mapInst.current, pos, lead.name, cfg.color);
      m.addListener("click", () => {
        onSelectLead(lead);
        iw.current.setContent(`<div style="font-family:'DM Sans',sans-serif;padding:6px;max-width:220px;background:#0d0d1a;color:#e8eaf6"><strong style="font-size:14px;display:block;margin-bottom:4px">${lead.name}</strong><span style="font-size:12px;color:#8892b0">${lead.vicinity||""}</span>${lead.rating?`<div style="margin-top:6px;font-size:12px;color:#f59e0b">★ ${lead.rating} (${lead.user_ratings_total} reviews)</div>`:""}<span style="display:inline-block;margin-top:6px;font-size:11px;padding:2px 8px;border-radius:10px;background:${cfg.bg};color:${cfg.color};font-weight:700">${cfg.label}</span></div>`);
        iw.current.open(mapInst.current, m);
      });
      markers.current.push(m);
    });
  }, [leads, onSelectLead]);

  return <div ref={mapRef} style={{ width:"100%", height:"100%" }} />;
}

// ─── Lead Card ─────────────────────────────────────────────────────────────────
function LeadCard({ lead, selected, onClick, onStatus }) {
  const cfg = STATUS_CONFIG[lead.status || "new"];
  return (
    <div onClick={onClick} style={{ padding:"12px 14px", borderRadius:"var(--r)", cursor:"pointer", border:`1px solid ${selected ? cfg.color+"66" : "var(--border)"}`, background: selected ? cfg.bg : "var(--surface)", transition:"all 0.18s", marginBottom:6 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ margin:0, fontWeight:600, fontSize:13, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.name}</p>
          <p style={{ margin:"2px 0 0", fontSize:11, color:"var(--text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lead.vicinity}</p>
        </div>
        <StatusBadge status={lead.status||"new"} onChange={s => onStatus(lead.id, s)} />
      </div>
      {lead.rating && <div style={{ marginTop:6 }}><Stars rating={lead.rating} /><span style={{ fontSize:10, color:"var(--text3)", marginLeft:6 }}>{lead.user_ratings_total} reviews</span></div>}
    </div>
  );
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ lead, onClose, onUpdate }) {
  const [details, setDetails] = useState(null);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (!lead) return;
    setTags(lead.tags || []);
    setLoadingDetails(true);
    getPlaceDetails(lead.place_id).then(d => setDetails(d)).catch(() => {}).finally(() => setLoadingDetails(false));
    getNotes(lead.id).then(setNotes).catch(() => {});
  }, [lead?.id]);

  if (!lead) return null;
  const cfg = STATUS_CONFIG[lead.status || "new"];

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    const id = await addNote(lead.id, newNote.trim());
    setNotes(n => [...n, { id, content: newNote.trim(), createdAt: { toDate: () => new Date() } }]);
    setNewNote("");
    toast("Note added", "success");
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    const updated = [...tags, newTag.trim().toLowerCase()];
    setTags(updated);
    onUpdate(lead.id, { tags: updated });
    setNewTag("");
  };

  const handleRemoveTag = (tag) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    onUpdate(lead.id, { tags: updated });
  };

  return (
    <div className="slide-up" style={{ position:"absolute", inset:0, background:"var(--bg2)", zIndex:100, overflowY:"auto", borderLeft:"1px solid var(--border)" }}>
      <div style={{ padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
          <div style={{ flex:1 }}>
            <h2 style={{ fontFamily:"var(--font-head)", fontSize:18, fontWeight:700, color:"var(--text)", marginBottom:4 }}>{lead.name}</h2>
            <p style={{ fontSize:12, color:"var(--text2)" }}>{lead.vicinity}</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">✕</button>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:20 }}>
          {[{ label:"Status", value:<StatusBadge status={lead.status||"new"} onChange={s => onUpdate(lead.id,{status:s})} /> },
            { label:"Rating", value: lead.rating ? <Stars rating={lead.rating}/> : "—" },
            { label:"Reviews", value: lead.user_ratings_total?.toLocaleString() || "—" }
          ].map(({ label, value }) => (
            <div key={label} style={{ background:"var(--surface)", borderRadius:"var(--r)", padding:"10px 12px" }}>
              <p style={{ fontSize:10, color:"var(--text3)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>{label}</p>
              <div style={{ fontSize:13 }}>{value}</div>
            </div>
          ))}
        </div>

        {loadingDetails ? (
          <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
            {[80,60,100].map((w,i) => <div key={i} className="skeleton" style={{ height:14, width:`${w}%` }} />)}
          </div>
        ) : details && (
          <div style={{ background:"var(--surface)", borderRadius:"var(--r)", padding:14, marginBottom:16, border:"1px solid var(--border)" }}>
            {[
              details.formatted_phone_number && { icon:"📞", label:"Phone", value:<a href={`tel:${details.formatted_phone_number}`} style={{ color:"var(--cyan)", textDecoration:"none" }}>{details.formatted_phone_number}</a> },
              details.website && { icon:"🌐", label:"Website", value:<a href={details.website} target="_blank" rel="noreferrer" style={{ color:"var(--cyan)", textDecoration:"none", fontSize:12 }}>{details.website.replace(/^https?:\/\//,"").split("/")[0]}</a> },
              details.opening_hours && { icon:"🕐", label:"Hours", value:<span style={{ color: details.opening_hours.isOpen?.() ? "var(--green)" : "var(--red)", fontSize:12 }}>{details.opening_hours.isOpen?.() ? "Open now" : "Closed now"}</span> },
              details.price_level !== undefined && { icon:"💰", label:"Price", value:"£".repeat(details.price_level+1) },
            ].filter(Boolean).map(({ icon, label, value }) => (
              <div key={label} style={{ display:"flex", gap:10, alignItems:"center", padding:"6px 0", borderBottom:"1px solid var(--border)" }}>
                <span style={{ fontSize:14, width:20, flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:11, color:"var(--text3)", width:60, flexShrink:0 }}>{label}</span>
                <span style={{ fontSize:13, color:"var(--text)" }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom:16 }}>
          <p style={{ fontSize:11, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Tags</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
            {tags.map(t => (
              <span key={t} style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:11, background:"var(--cyan3)", color:"var(--cyan)", border:"1px solid var(--cyan2)" }}>
                {t}<button onClick={() => handleRemoveTag(t)} style={{ background:"none", border:"none", color:"inherit", cursor:"pointer", padding:0, fontSize:12 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <input className="input-field" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key==="Enter" && handleAddTag()} placeholder="Add tag..." style={{ fontSize:12 }} />
            <button onClick={handleAddTag} className="btn btn-ghost btn-icon">+</button>
          </div>
        </div>

        <div>
          <p style={{ fontSize:11, fontWeight:600, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Notes ({notes.length})</p>
          <div style={{ display:"flex", gap:6, marginBottom:12 }}>
            <textarea className="input-field" value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..." style={{ resize:"none", height:70, fontSize:12, lineHeight:1.5 }} />
            <button onClick={handleAddNote} className="btn btn-primary btn-icon" style={{ alignSelf:"flex-end", padding:"10px 12px" }}>+</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {notes.map(n => (
              <div key={n.id} style={{ background:"var(--surface)", borderRadius:"var(--r)", padding:"10px 12px", border:"1px solid var(--border)" }}>
                <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.5, marginBottom:4 }}>{n.content}</p>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:10, color:"var(--text3)" }}>{n.createdAt?.toDate?.()?.toLocaleDateString?.() || "Now"}</span>
                  <button onClick={async () => { await deleteNote(lead.id, n.id); setNotes(prev => prev.filter(x => x.id !== n.id)); }} className="btn btn-danger btn-icon" style={{ padding:"2px 6px", fontSize:11 }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {details?.url && (
          <div style={{ marginTop:20 }}>
            <a href={details.url} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ width:"100%", justifyContent:"center", textDecoration:"none" }}>🗺 Open in Google Maps ↗</a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Search Panel ──────────────────────────────────────────────────────────────
function SearchPanel({ onResults, onCenterChange }) {
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState(null);
  const [radius, setRadius] = useState(2);
  const [type, setType] = useState("restaurant");
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [resultCount, setResultCount] = useState(null);
  const [history, setHistory] = useState([]);
  const [mapsReady, setMapsReady] = useState(false);
  const inputRef = useRef(null);
  const { saveSearch } = useLeads();

  useEffect(() => {
    loadGoogleMaps().then(() => {
      setMapsReady(true);
      if (inputRef.current) {
        setupAutocomplete(inputRef.current, (place) => {
          setLocation(place.formatted || place.name);
          setCoords({ lat: place.lat, lng: place.lng });
          onCenterChange({ lat: place.lat, lng: place.lng });
        });
      }
    }).catch(() => toast("Maps failed to load. Check your API key.", "error"));
    getSearchHistory().then(setHistory).catch(() => {});
  }, []);

  const doSearch = async () => {
    if (!coords) { toast("Enter a location first", "warning"); return; }
    setSearching(true); setResultCount(null);
    try {
      const latLng = new window.google.maps.LatLng(coords.lat, coords.lng);
      let { results, pagination } = await nearbySearch(latLng, radius * 1000, type, keyword);
      let all = [...results];
      if (pagination?.hasNextPage) {
        const more = await nearbySearchNextPage(pagination);
        all = [...all, ...more];
      }
      setResultCount(all.length);
      onResults(all, coords, radius);
      await saveSearch({ location, coords, radius, type, keyword }, all.length);
      trackEvent("search", { type, radius, resultCount: all.length });
      toast(`Found ${all.length} businesses`, "success");
    } catch (err) {
      toast("Search failed: " + err.message, "error");
    } finally { setSearching(false); }
  };

  return (
    <div style={{ padding:16, display:"flex", flexDirection:"column", gap:12 }}>
      <div>
        <label style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Location</label>
        <input ref={inputRef} className="input-field" value={location} onChange={e => setLocation(e.target.value)} placeholder="City, address, or place..." />
      </div>
      <div>
        <label style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Business Type</label>
        <select className="input-field" value={type} onChange={e => setType(e.target.value)} style={{ background:"var(--surface)" }}>
          {BUSINESS_CATEGORIES.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.types.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", display:"block", marginBottom:6 }}>Keyword <span style={{ fontWeight:400 }}>(optional)</span></label>
        <input className="input-field" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. Italian, luxury..." />
      </div>
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
          <label style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Radius</label>
          <span style={{ fontSize:12, fontWeight:700, color:"var(--cyan)" }}>{radius} km</span>
        </div>
        <input type="range" min="0.5" max="25" step="0.5" value={radius} onChange={e => setRadius(+e.target.value)} style={{ width:"100%", accentColor:"var(--cyan)", cursor:"pointer" }} />
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
          <span style={{ fontSize:10, color:"var(--text3)" }}>0.5 km</span>
          <span style={{ fontSize:10, color:"var(--text3)" }}>25 km</span>
        </div>
      </div>
      <button onClick={doSearch} disabled={searching} className="btn btn-primary" style={{ width:"100%", padding:11, fontSize:13, fontWeight:700 }}>
        {searching ? <><span className="spin" style={{ display:"inline-block", width:14, height:14, border:"2px solid #00000044", borderTop:"2px solid #000", borderRadius:"50%" }} /> Scanning...</> : "🎯 Hunt Leads"}
      </button>
      {resultCount !== null && (
        <div className="fade-in" style={{ background:"var(--cyan3)", border:"1px solid var(--cyan2)", borderRadius:"var(--r)", padding:"10px 14px", textAlign:"center" }}>
          <span style={{ fontSize:22, fontWeight:800, fontFamily:"var(--font-head)", color:"var(--cyan)" }}>{resultCount}</span>
          <p style={{ fontSize:11, color:"var(--text2)", margin:"2px 0 0" }}>businesses found</p>
        </div>
      )}
      {history.length > 0 && (
        <div>
          <p style={{ fontSize:10, fontWeight:700, color:"var(--text3)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>Recent Searches</p>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            {history.slice(0,5).map(h => (
              <button key={h.id} onClick={() => { setLocation(h.location||""); setCoords(h.coords); setRadius(h.radius||2); setType(h.type||"restaurant"); if (h.coords) onCenterChange(h.coords); }} className="btn btn-ghost" style={{ justifyContent:"flex-start", fontSize:11, padding:"6px 10px" }}>
                🕐 {h.location||"Unknown"} · {h.radius}km
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pipeline Stats ────────────────────────────────────────────────────────────
function PipelineStats({ leads }) {
  const counts = useMemo(() => {
    const c = {};
    Object.keys(STATUS_CONFIG).forEach(s => c[s] = 0);
    leads.forEach(l => { const s = l.status||"new"; c[s] = (c[s]||0)+1; });
    return c;
  }, [leads]);
  return (
    <div style={{ display:"flex", gap:8, padding:"10px 16px", borderBottom:"1px solid var(--border)", overflowX:"auto", flexShrink:0 }}>
      {Object.entries(STATUS_CONFIG).map(([s,cfg]) => (
        <div key={s} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:20, background: counts[s]>0 ? cfg.bg : "var(--surface)", border:`1px solid ${counts[s]>0 ? cfg.color+"44" : "var(--border)"}`, flexShrink:0 }}>
          <span style={{ fontSize:15, fontWeight:800, fontFamily:"var(--font-head)", color: counts[s]>0 ? cfg.color : "var(--text3)" }}>{counts[s]}</span>
          <span style={{ fontSize:10, color: counts[s]>0 ? cfg.color : "var(--text3)" }}>{cfg.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const { leads, loading: leadsLoading, saveLeads, updateLead, deleteLead } = useLeads();
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });
  const [mapRadius, setMapRadius] = useState(2);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [activeTab, setActiveTab] = useState("search");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [savingAll, setSavingAll] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);
  const [view, setView] = useState("split");

  useEffect(() => {
    loadGoogleMaps().then(() => setMapsReady(true));
  }, []);

  const handleResults = useCallback((results, coords, radius) => {
    setSearchResults(results);
    setMapCenter(coords);
    setMapRadius(radius);
    setActiveTab("search");
  }, []);

  const handleSaveAll = async () => {
    if (!searchResults.length) return;
    setSavingAll(true);
    try {
      await saveLeads(searchResults.map(r => ({
        name: r.name,
        vicinity: r.vicinity || "",
        rating: r.rating || null,
        user_ratings_total: r.user_ratings_total || null,
        place_id: r.place_id,
        types: r.types || [],
        website: r.website || "",
        phone: r.international_phone_number || "",
        geometry: {
          location: {
            lat: typeof r.geometry?.location?.lat === "function" ? r.geometry.location.lat() : r.geometry?.location?.lat,
            lng: typeof r.geometry?.location?.lng === "function" ? r.geometry.location.lng() : r.geometry?.location?.lng,
          }
        },
      })));
      toast(`${searchResults.length} leads saved!`, "success");
      setActiveTab("leads");
      setSearchResults([]);
    } catch (err) {
      toast("Failed to save: " + err.message, "error");
    } finally { setSavingAll(false); }
  };

  const handleExportCSV = () => {
    const source = activeTab === "search" ? searchResults : filteredLeads;
    if (!source.length) { toast("Nothing to export", "warning"); return; }
    const rows = [["Name","Address","Rating","Reviews","Status","Phone","Website","Tags"]];
    source.forEach(l => rows.push([l.name, l.vicinity||"", l.rating||"", l.user_ratings_total||"", l.status||"new", l.phone||"", l.website||"", (l.tags||[]).join("; ")]));
    const csv = rows.map(r => r.map(c => `"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = `leadhunter-${Date.now()}.csv`;
    a.click();
    toast("CSV exported!", "success");
  };

  const filteredLeads = useMemo(() => leads.filter(l => {
    if (filterStatus !== "all" && (l.status||"new") !== filterStatus) return false;
    if (filterSearch && !l.name?.toLowerCase().includes(filterSearch.toLowerCase()) && !l.vicinity?.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  }), [leads, filterStatus, filterSearch]);

  const displayLeads = activeTab === "search" ? searchResults : filteredLeads;

  return (
    <>
      <style>{CSS}</style>
      <Toaster />
      <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:"var(--bg)", overflow:"hidden" }}>

        {/* Top Bar */}
        <div style={{ height:52, background:"var(--bg2)", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", padding:"0 16px", gap:12, flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"linear-gradient(135deg,var(--cyan),#0077aa)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, boxShadow:"0 0 12px rgba(0,212,255,0.4)" }}>🎯</div>
            <span style={{ fontFamily:"var(--font-head)", fontWeight:800, fontSize:16, color:"var(--text)", letterSpacing:"-0.02em" }}>LeadHunter</span>
          </div>
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ display:"flex", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:"var(--r)", padding:3, gap:3 }}>
              {[["split","⚡ Split"],["map","🗺 Map"],["list","📋 List"]].map(([v,l]) => (
                <button key={v} onClick={() => setView(v)} style={{ background: view===v ? "var(--cyan)" : "transparent", color: view===v ? "#000" : "var(--text2)", border:"none", borderRadius:8, padding:"4px 12px", fontSize:11, fontWeight: view===v ? 700 : 500, cursor:"pointer", transition:"all 0.15s", fontFamily:"var(--font-body)" }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            {searchResults.length > 0 && activeTab === "search" && (
              <button onClick={handleSaveAll} disabled={savingAll} className="btn btn-primary" style={{ fontSize:12, padding:"6px 14px" }}>
                {savingAll ? "Saving..." : `💾 Save ${searchResults.length} Leads`}
              </button>
            )}
            <button onClick={handleExportCSV} className="btn btn-ghost btn-icon" title="Export CSV" style={{ fontSize:14 }}>⬇</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

          {/* Search Sidebar */}
          <div style={{ width:260, flexShrink:0, borderRight:"1px solid var(--border)", overflowY:"auto", background:"var(--bg2)" }}>
            <SearchPanel onResults={handleResults} onCenterChange={setMapCenter} />
          </div>

          {/* Main */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ display:"flex", borderBottom:"1px solid var(--border)", background:"var(--bg2)", flexShrink:0 }}>
              {[["search",`🔍 Results${searchResults.length ? ` (${searchResults.length})` : ""}`],["leads",`💼 Pipeline${leads.length ? ` (${leads.length})` : ""}`]].map(([t,l]) => (
                <button key={t} onClick={() => setActiveTab(t)} style={{ background:"none", border:"none", padding:"10px 18px", cursor:"pointer", color: activeTab===t ? "var(--cyan)" : "var(--text2)", fontSize:12, fontWeight: activeTab===t ? 700 : 500, borderBottom:`2px solid ${activeTab===t ? "var(--cyan)" : "transparent"}`, transition:"all 0.15s", fontFamily:"var(--font-body)" }}>{l}</button>
              ))}
              {activeTab === "leads" && (
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", padding:"0 12px", gap:8 }}>
                  <input className="input-field" value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Filter..." style={{ width:140, height:28, fontSize:12, padding:"4px 10px" }} />
                  <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ width:110, height:28, fontSize:11, padding:"4px 8px", background:"var(--surface)" }}>
                    <option value="all">All Status</option>
                    {Object.entries(STATUS_CONFIG).map(([v,c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            {activeTab === "leads" && <PipelineStats leads={leads} />}

            <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>
              {(view === "split" || view === "map") && mapsReady && (
                <div style={{ flex: view==="map" ? 1 : "0 0 55%", position:"relative", overflow:"hidden" }}>
                  <MapPane center={mapCenter} radius={mapRadius} leads={displayLeads} onSelectLead={setSelectedLead} />
                </div>
              )}
              {(view === "split" || view === "list") && (
                <div style={{ flex:1, overflowY:"auto", background:"var(--bg2)", borderLeft: view==="split" ? "1px solid var(--border)" : "none", position:"relative" }}>
                  {displayLeads.length === 0 ? (
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", color:"var(--text3)", gap:12, padding:40 }}>
                      <div style={{ fontSize:48 }}>{activeTab==="search" ? "🎯" : "💼"}</div>
                      <p style={{ fontSize:14, fontFamily:"var(--font-head)", fontWeight:700, color:"var(--text2)", textAlign:"center" }}>
                        {activeTab==="search" ? "Run a search to find leads" : leadsLoading ? "Loading..." : "No saved leads yet"}
                      </p>
                      <p style={{ fontSize:12, color:"var(--text3)", textAlign:"center", maxWidth:240 }}>
                        {activeTab==="search" ? "Enter a location and business type on the left" : "Search and save businesses to your pipeline"}
                      </p>
                    </div>
                  ) : (
                    <div className="stagger" style={{ padding:12 }}>
                      {displayLeads.map(lead => (
                        <LeadCard key={lead.id||lead.place_id} lead={lead} selected={selectedLead?.place_id===lead.place_id} onClick={() => setSelectedLead(lead)} onStatus={(id,s) => updateLead(id,{status:s})} />
                      ))}
                    </div>
                  )}
                  {selectedLead && (
                    <div style={{ position:"absolute", inset:0 }}>
                      <DetailDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={updateLead} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

