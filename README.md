# Atlas of Stories

An interactive cultural guide for travellers. Start on a 3D globe, pick a city, then explore a landmark in three ways:

- **Time travel**: drag a slider through the landmark's eras and watch historical photos fade into modern ones, or compare two eras side by side.
- **Story mode**: short narrated chapters on history, legends and culture, with a highlighted transcript.
- **Visitor guide**: opening hours with a live "Open now" badge (in the landmark's own time zone), etiquette dos and don'ts, local tips, and a filterable map.

The prototype covers six cities, each with one fully built landmark:
Hanoi (Ho Chi Minh Mausoleum), Paris (Eiffel Tower), Cairo (Pyramids of Giza), Kyoto (Kinkaku-ji), Rome (Colosseum) and New York (Statue of Liberty).

## Tech stack

| Part | Choice |
|---|---|
| Build tool | Vite (multi-page: `index.html`, `city.html`, `landmark.html`) |
| UI | Bootstrap 5 compiled from Sass with Material 3–style tokens, Roboto Flex, Material Symbols (only the icons in use are downloaded) |
| Language | Plain JavaScript (ES modules), HTML5, CSS |
| 3D globe | CesiumJS, no key needed. Far away it shows Sentinel-2 cloudless imagery by EOX (true colour, CC BY-NC-SA 4.0, so non-commercial use only); close up it switches to Esri World Imagery. Esri 3D terrain and a borders/labels layer are added on top. It renders at full screen resolution with MSAA. An optional Cesium ion token or Google Maps key adds photorealistic 3D buildings. |
| Maps | Leaflet with Esri tiles: street map (light/dark) and satellite with labels |
| Narration | Each chapter's own audio/video file, or the browser's built-in text-to-speech |
| Data | Static JSON in `public/data/` (no backend) |
| Images | Wikimedia Commons, credited automatically on every page |

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
```

`dist/` is a static site, so it can be hosted on GitHub Pages, Netlify or any web server. Paths are relative, so it also works from a sub-folder.
It must be served over `http(s)://`. Opening `index.html` straight from disk won't work, because browsers block the data files and Cesium's workers.

## Deploy

The site is published to **GitHub Pages** by `.github/workflows/deploy.yml`. Every push to `main` checks the data, builds, and deploys automatically in about 1–2 minutes.

- First-time setup: in the repo, go to Settings → Pages and set "Source" to **GitHub Actions**.
- Optional 3D buildings: add `VITE_CESIUM_ION_TOKEN` or `VITE_GOOGLE_MAPS_API_KEY` under Settings → Secrets and variables → Actions, then re-run the workflow.

### Optional: photorealistic 3D cities

The globe works without any account: satellite imagery, 3D terrain, borders and labels all come from Esri's public services.
For real 3D buildings, like Google Earth's 3D cities, add one of these to a `.env` file (see `.env.example`):

```
VITE_CESIUM_ION_TOKEN=...      # free token from https://ion.cesium.com (also gives Cesium World Terrain)
VITE_GOOGLE_MAPS_API_KEY=...   # a Google Maps Platform key with the Map Tiles API enabled
```

With either one, the globe loads Google Photorealistic 3D Tiles. This path hasn't been tested without a key, so check it once you have one.

## How the globe works

The design follows Google Earth: a search box, a knowledge card on the left, map controls on the right (compass, 2D/3D tilt, zoom, whole globe), a strip of featured landmarks, and a status bar with cursor coordinates and camera height.
Clicking a city or landmark (on the globe, in the list, in search or in the strip) flies the camera there and opens its card. The card links to the full city guide or landmark page.
You can link straight to a place with `index.html#kyoto` or `index.html#colosseum`. The back arrow on the city page uses this to return to the same spot.

## Project structure

```
index.html, city.html, landmark.html   page shells
src/
  scss/main.scss          Bootstrap theme + all custom styles
  js/common.js            data loading, image credits, theme switch, navbar
  js/cesium-base.js       tells Cesium where its static files live
  js/hours.js             opening-hours / "Open now" logic (time-zone aware)
  js/map.js               Leaflet helpers and map categories
  js/pages/               globe.js, city.js, landmark.js (one per page)
  js/landmark/            timeline.js, story.js, guide.js (one per tab)
public/data/
  cities.json             list of cities shown on the globe
  cities/<id>.json        city intro, facts, etiquette, "coming soon" landmarks
  landmarks/<id>.json     eras, story chapters, visitor guide
  media.json              generated: image URLs + credits (don't edit by hand)
scripts/
  resolve-media.mjs       npm run media: looks up images on Wikimedia Commons
  check-data.mjs          npm run check: validates all the data files
```

## Adding a new city

No code changes are needed.

1. **Add the city to `public/data/cities.json`**:
   ```json
   { "id": "istanbul", "name": "Istanbul", "country": "Türkiye", "continent": "Europe",
     "lat": 41.0082, "lon": 28.9784, "timezone": "Europe/Istanbul",
     "tagline": "Where two continents meet", "landmarks": ["hagia-sophia"] }
   ```
   `timezone` must be an IANA name. It drives the local clock and the "Open now" badge.

2. **Create `public/data/cities/istanbul.json`.** Copy an existing city file and change `hero`, `facts`, `sections`, `etiquette` and, optionally, `planned`.

3. **Create `public/data/landmarks/hagia-sophia.json`.** Copy an existing landmark and edit it. The key fields:

   | Field | Notes |
   |---|---|
   | `eras[]` | In chronological order. `year` is a number (negative for BCE) used for ordering. `label` is what's shown, e.g. `"c. 2560 BCE"` or `"Today"`. |
   | `eras[].image` | `{ "file": "<Wikimedia Commons file name>", "alt": "…", "focus": "center bottom" }`. `focus` is optional and controls cropping in the before/after view. For your own photos, use `{ "src": "media/my-photo.jpg", "credit": "Photo: …" }` and put the file in `public/media/`. |
   | `story[]` | `type` is `history`, `legend` or `culture`. `narration` is read aloud by text-to-speech. Add `"audio": "media/x.mp3"`, `"video": "media/x.mp4"` or `"youtube": "<video id>"` to use real recordings instead. |
   | `guide.hours.seasons[]` | `months` (1–12) plus `days` with `daily` or `mon`…`sun` set to `[["09:00","17:00"]]`. Leave a day out to mark it closed. A closing time earlier than the opening time means "after midnight". |
   | `guide.hours.closedDates` | `["12-25"]` (MM-DD). |
   | `guide.pois[]` | `category` is `entrance`, `transport`, `food`, `sights` or `services`. |

4. **Run the helpers:**
   ```bash
   npm run media   # fetches image URLs and credits for any new Commons files
   npm run check   # flags missing fields, bad times, unknown images, wrong ordering…
   ```

The new city will appear on the globe, in the Cities menu and in the city list.

## Design notes

- **The time slider steps through eras, not years.** Eras are spaced evenly so that a 4,500-year history (Giza) and a 140-year one (Statue of Liberty) are equally easy to explore. While you drag, neighbouring images cross-fade. On release, the slider snaps to the nearest era.
- **Opening hours are always calculated in the landmark's time zone**, so a visitor browsing from anywhere sees the correct status.
- **Content and code are separate.** Every landmark uses the same template, filled from JSON, so the JSON could later come from a CMS or an API without changing the pages.
- **One layout for every page:** a content panel next to a large viewport (satellite map, era photos, story media or visitor map), as in Google Earth. On phones the viewport sits on top and the panel scrolls below.
- **Accessibility:** skip link, keyboard-operable slider (arrows, Home and End), keyboard search with arrow keys, arrow-key tabs, labelled controls, live region for era changes, transcripts for all narration, reduced-motion support, and light and dark themes.

## Content disclaimer

Opening hours, prices and map marker positions are approximate prototype data. Check official sources before travelling. Images come from Wikimedia Commons under their stated licences, and each page lists its image credits.
