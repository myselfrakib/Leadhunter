# 🎯 LeadHunter — Production Setup Guide

The ultimate business lead search engine. Google Maps × Firebase × React.

---

## ⚡ Quick Start

```bash
cd leadhunter
npm install
npm run dev
```

Opens at http://localhost:3000

---

## 🔑 API Keys You Need

### 1. Firebase (already configured)
Your Firebase config is already in `src/lib/firebase.js`.

**Enable these Firebase features in your console:**
- Authentication → Sign-in methods → Enable **Email/Password** and **Google**
- Firestore Database → Create database (start in production mode)
- Analytics (already enabled)

**Deploy Firestore rules:**
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

### 2. Google Maps API
In `src/lib/maps.js`, replace:
```js
export const GOOGLE_MAPS_KEY = "YOUR_MAPS_KEY_HERE";
```

**Enable these APIs in Google Cloud Console (console.cloud.google.com):**
| API | Used For |
|-----|---------|
| Maps JavaScript API | Interactive map |
| Places API | Business search, autocomplete, details |
| Geocoding API | Address → coordinates |
| Distance Matrix API | Travel time calculations |
| Directions API | Route planning |
| Street View Static API | Location previews |
| Elevation API | Terrain data |

**Restrict your key** (important for production):
- Application restrictions → HTTP referrers → add your domain
- API restrictions → restrict to the 7 APIs above

---

## 📁 Project Structure

```
leadhunter/
├── src/
│   ├── lib/
│   │   ├── firebase.js      ← Firebase SDK, all Firestore operations
│   │   └── maps.js          ← 25 Google Maps API integrations
│   ├── hooks/
│   │   ├── useAuth.jsx      ← Authentication context
│   │   └── useLeads.js      ← Real-time Firestore lead sync
│   ├── App.jsx              ← Full UI: search, map, pipeline, detail
│   └── main.jsx             ← React entry point
├── index.html
├── vite.config.js
├── firestore.rules          ← Security rules (deploy these!)
└── package.json
```

---

## 🔥 Firebase APIs Used (25 total)

| # | API | Purpose |
|---|-----|---------|
| 1 | `initializeApp` | Bootstrap Firebase |
| 2 | `getAnalytics` + `logEvent` | Event tracking |
| 3 | `getFirestore` | Database instance |
| 4 | `collection` | Reference collections |
| 5 | `doc` | Reference documents |
| 6 | `addDoc` | Create leads/notes |
| 7 | `updateDoc` | Update lead status/fields |
| 8 | `deleteDoc` | Delete leads/notes |
| 9 | `getDocs` | Fetch all leads |
| 10 | `getDoc` | Fetch user profile |
| 11 | `setDoc` | Create user profile |
| 12 | `query` | Build queries |
| 13 | `where` | Filter by status/tag |
| 14 | `orderBy` | Sort leads |
| 15 | `serverTimestamp` | Timestamps |
| 16 | `onSnapshot` | Real-time lead updates |
| 17 | `limit` | Paginate search history |
| 18 | `getAuth` | Auth instance |
| 19 | `signInWithEmailAndPassword` | Email login |
| 20 | `createUserWithEmailAndPassword` | Registration |
| 21 | `signOut` | Logout |
| 22 | `onAuthStateChanged` | Auth state listener |
| 23 | `updateProfile` | Set display name |
| 24 | `sendPasswordResetEmail` | Password reset |
| 25 | `signInWithPopup` + `GoogleAuthProvider` | Google OAuth |

---

## 🗺️ Google Maps APIs Used (25 total)

| # | API | Purpose |
|---|-----|---------|
| 1 | SDK Loader | Dynamic script injection |
| 2 | Geocoder | Address → coordinates |
| 3 | Reverse Geocoder | Coordinates → address |
| 4 | Nearby Search | Radius business search |
| 5 | Pagination | Load page 2 of results |
| 6 | Text Search | Free-text queries |
| 7 | Place Details | Full business info |
| 8 | Autocomplete (bound) | Location input suggestions |
| 9 | AutocompleteService | Unbound predictions |
| 10 | Distance Matrix | Drive times |
| 11 | Geometry: spherical | Distance computation |
| 12 | Map init | Dark-themed map |
| 13 | Circle overlay | Radius visualizer |
| 14 | Marker | Business pins |
| 15 | InfoWindow | Popup on pin click |
| 16 | fitBounds | Auto-zoom to results |
| 17 | findPlaceFromQuery | Entity lookup |
| 18 | QueryAutocomplete | Search-as-you-type |
| 19 | StreetViewService | 360° availability check |
| 20 | HeatmapLayer | Density visualization |
| 21 | DirectionsService | Route planning |
| 22 | ElevationService | Terrain analysis |
| 23 | Data layer | GeoJSON import |
| 24 | Polygon bounds | Area selection |
| 25 | Place Photo URL | Business images |

---

## 🚀 Deploy to Production

### Vercel (recommended)
```bash
npm install -g vercel
vercel --prod
```

### Firebase Hosting
```bash
npm run build
firebase init hosting
firebase deploy
```

---

## 💡 Features

- 🔐 **Auth** — Email + Google OAuth, persistent sessions
- 🎯 **Search** — Radius search with type, keyword, pagination
- 🗺️ **Dark Map** — Custom styled Google Map with color-coded pins
- 💼 **Pipeline** — 6-stage lead pipeline (New → Won/Lost)
- 📝 **Notes** — Per-lead note history with timestamps
- 🏷️ **Tags** — Custom tag system for filtering
- 📊 **Analytics** — Search, save, and status change events
- 📤 **CSV Export** — Download leads with all fields
- 🕐 **Search History** — Re-run recent searches in one click
- ⚡ **Real-time** — Firestore onSnapshot keeps data live
- 📱 **Responsive** — Split/Map/List view toggle

---

## 🔒 Security Notes

1. **Never commit API keys to git** — move them to `.env`:
   ```
   VITE_MAPS_KEY=your_key_here
   ```
   Then in `maps.js`: `const GOOGLE_MAPS_KEY = import.meta.env.VITE_MAPS_KEY;`

2. **Deploy Firestore rules** — users can only access their own data

3. **Restrict your Maps key** to your production domain

4. **Enable App Check** in Firebase console for additional protection
