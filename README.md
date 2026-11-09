# Atlas of Stories

An interactive cultural guide for travellers. Start on a 3D globe, pick a city, then explore a landmark in three ways, each on its own page:

- **Time travel** (`timetravel.html`): drag a slider through the landmark's eras and watch historical photos fade into modern ones, or compare two eras side by side.
- **Stories** (`stories.html`): short narrated chapters on history, legends and culture, with a highlighted transcript. Nine landmarks also have a **film** chapter: a real video streamed from Wikimedia Commons, such as the Lumière company's 1897 film of the Sphinx.
- **Visit** (`visit.html`): opening hours with a live "Open now" badge (in the landmark's own time zone), etiquette dos and don'ts, local tips, and a filterable map.

Not sure where to go? **Discover** (`discover.html`) asks three quick questions (when, what you enjoy, where) and suggests three places with reasons. It also lists places at their best in any month, editor's picks, and places by interest. First-time visitors to the globe get a short welcome that explains the site in three steps (the **?** button opens it again).

Press **Save** (♡) on any landmark to add it to **My trip** (`trip.html`). There you choose a day, an arrival time and how long to stay, and the atlas checks the plan against that day's opening hours. It also warns when two visits overlap or are too far apart for one day, shows the route on a map, and exports the plan as a calendar file (`.ics`) or prints it. The trip is kept in the browser's `localStorage`, so it needs no account or server.

## Pages

| Page | What it is |
|---|---|
| `index.html` | Home: the 3D globe, with search, the World / Vietnam atlases and "Through time" |
| `city.html?id=hanoi` | City or province guide with a satellite map of its landmarks |
| `timetravel.html?id=eiffel-tower` | Landmark: Time travel (`&era=2` opens a given era) |
| `stories.html?id=eiffel-tower` | Landmark: narrated stories |
| `visit.html?id=eiffel-tower` | Landmark: visitor guide |
| `trip.html` | My trip: saved landmarks, a day-by-day plan with opening-hours checks, map, calendar export |
| `discover.html` | Discover: "Help me choose" quiz, places by season, editor's picks, browse by interest |
| `landmark.html` | Redirect that keeps older links (`landmark.html?id=…#story`) working |

The globe has two atlases, switched with the **World / Vietnam** buttons:

- **World:** six cities, each with one fully built landmark. They are Hanoi (Ho Chi Minh Mausoleum), Paris (Eiffel Tower), Cairo (Pyramids of Giza), Kyoto (Kinkaku-ji), Rome (Colosseum) and New York (Statue of Liberty).
- **Vietnam:** all 34 provinces and centrally run cities on the administrative map that took effect on 1 July 2025. Each has a province page, a flagship landmark with Time travel, Stories and Visit pages, and a timeline for "Through time". Provinces merged in 2025 can also be found by their former names, e.g. "Hà Giang" finds Tuyên Quang.

## Tech stack

| Part | Choice |
|---|---|
| Build tool | Vite. Each page is built as a classic script so the site opens straight from disk (see below) |
| UI | Bootstrap 5 compiled from Sass with Material 3–style tokens, Roboto Flex, Material Symbols (only the icons in use are downloaded) |
| Language | Plain JavaScript (ES modules), HTML5, CSS |
| 3D globe | CesiumJS, no key needed. Its images and star map load from the jsDelivr CDN. Far away it shows Sentinel-2 cloudless imagery by EOX (true colour, CC BY-NC-SA 4.0, so non-commercial use only); close up it switches to Esri World Imagery. Esri 3D terrain and a borders/labels layer are added on top. It renders at full screen resolution with MSAA. An optional Cesium ion token or Google Maps key adds photorealistic 3D buildings. |
| Maps | Leaflet with Esri tiles: street map (light/dark) and satellite with labels |
| Narration | Each chapter's own audio/video file, or the browser's built-in text-to-speech |
| Video | Wikimedia Commons videos, streamed as Commons' own 480p WebM copies |
| Saved trip | The browser's `localStorage` (no account, no server) |
| Data | Static JSON in `public/data/` (no backend) |
| Images | Wikimedia Commons, credited automatically on every page |

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
npm run package    # check + build, then copy to submission/website/ (plus readable source)
```

`dist/` is a static site. It works on GitHub Pages or any web server, and also **straight from disk: double-click `dist/index.html`**. An internet connection is still needed for map tiles, fonts, photos and videos.

Browsers block three things on pages opened from disk (`file://`), so the build avoids them:

- **Module scripts.** Each page is built separately as a classic script with `defer` (`scripts/build.mjs`).
- **`fetch()` of the JSON files.** `scripts/bundle-data.mjs` packs every file in `public/data` into one plain script, `data/atlas-data.js`, and `getJSON` reads from it first.
- **Web Workers loaded from files or other sites.** Cesium's own prebuilt bundle of all its workers is embedded in the page, and Cesium's `TaskProcessor` is patched at build time to start each worker with that code inside it. See `cesiumEmbeddedWorkers` in `vite.config.js`.

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

## The world in one year ("Through time")

Museums tell the story of one place through time. This feature tells history *across* places: pick a year and the whole globe shows what each city was like at that moment. For example, in 1889 the Eiffel Tower has just opened, Kyoto is in the Meiji era and Hanoi is under French rule.

- Press **Through time** (top right). A world timeline bar replaces the landmark strip.
- Drag the slider from 2600 BCE to today. The scale is stretched so recent centuries get more room. Or press ▶ for a guided tour of the **key moments**: the globe turns to where history is happening.
- Each city gets a floating card with what was going on there. Cities with something happening that very year (within 5 years) have pulsing red pins.
- The side card lists every city for that year, with each landmark's state: either "its story begins in …", or a link that opens the landmark's Time travel page at the matching era (`timetravel.html?id=eiffel-tower&era=2`).
- Share a year with `index.html#year=1889`. It also works on the 2D map used on devices without WebGL.

## Project structure

```
index.html, city.html,                 page shells (the seven page types)
timetravel.html, stories.html,
visit.html, trip.html, discover.html
src/
  scss/main.scss          Bootstrap theme + all custom styles
  js/common.js            data loading, image credits, theme switch, navbar
  js/cesium-base.js       Cesium setup: embedded workers, CDN base URL, WebGL 1 fix
  js/hours.js             opening-hours / "Open now" logic and planned-visit checks (time-zone aware)
  js/trip.js              My trip: saved places in localStorage, Save buttons, trip counter, toast
  js/season.js            best months and interest tags: month ranges, season badge, tag labels
  js/home-ui.js           Home: first-visit welcome dialog, including the Through time introduction
  js/slides.js            slide decks for City / Time travel / Stories / Visit: sideways slides driven by scrolling, bottom timeline, card carousels
  js/map.js               Leaflet helpers and map categories
  js/world-year.js        "Through time": year scale, per-year snapshot, world timeline bar
  js/pages/               globe.js, city.js, timetravel.js, stories.js, visit.js, trip.js, discover.js (one per page)
  js/landmark/            shell.js (shared landmark header + page switcher),
                          timeline.js, story.js, guide.js (the three landmark views)
public/
  landmark.html           redirect for older landmark links
public/data/
  cities.json             list of cities shown on the globe
  cities/<id>.json        city intro, facts, etiquette, "coming soon" landmarks, timeline
  world-moments.json      key moments and periods for the World timeline
  vietnam-moments.json    key moments, periods and year scale for the Vietnam timeline
  landmarks/<id>.json     eras, story chapters, visitor guide
  media.json              generated: image and video URLs + credits (don't edit by hand)
  atlas-data.js           generated: all the JSON above in one script (not in git)
scripts/
  resolve-media.mjs       npm run media: looks up images and videos on Wikimedia Commons
  check-data.mjs          npm run check: validates all the data files
  bundle-data.mjs         npm run data: builds public/data/atlas-data.js
  build.mjs               npm run build: builds each page as a classic script
  package.mjs             npm run package: copies the build + source to submission/website/
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
   Optional fields:
   - `collections`: the atlases the place appears in, e.g. `["world"]`, `["vietnam"]` or both. Defaults to `["world"]`.
   - `region`: needed for atlases with groups, e.g. `"North"`, `"Central"` or `"South"` for Vietnam.
   - `kind`: `"City"` or `"Province"`. Cities' names win when labels overlap on the map.
   - `formerly`: older names that search should also find.

   The atlases themselves are defined in `collections` at the top of `cities.json`. Each has a `home` view (plus `bounds` for the 2D map), a moments file for "Through time", its `groups`, and `"cards": "events"` to show floating cards only for places with an event that year.

2. **Create `public/data/cities/istanbul.json`.** Copy an existing city file and change `hero`, `facts`, `sections`, `etiquette` and, optionally, `planned`.
   Also give it a `timeline` for the world timeline. Use about 10–15 entries in year order:
   ```json
   { "year": 1453, "text": "Ottoman Sultan Mehmed II takes Constantinople." },
   { "year": 537, "text": "Hagia Sophia is completed.", "landmark": "hagia-sophia", "era": 0 }
   ```
   `year` is negative for BCE, and `"approx": true` shows it as "c. …". `landmark` + `era` (an index into that landmark's `eras`) link the entry to the landmark's Time travel. An optional `image` uses the same format as elsewhere.

3. **Create `public/data/landmarks/hagia-sophia.json`.** Copy an existing landmark and edit it. The key fields:

   | Field | Notes |
   |---|---|
   | `eras[]` | In chronological order. `year` is a number (negative for BCE) used for ordering. `label` is what's shown, e.g. `"c. 2560 BCE"` or `"Today"`. |
   | `eras[].image` | `{ "file": "<Wikimedia Commons file name>", "alt": "…", "focus": "center bottom" }`. `focus` is optional and controls cropping in the before/after view. For your own photos, use `{ "src": "media/my-photo.jpg", "credit": "Photo: …" }` and put the file in `public/media/`. |
   | `story[]` | `type` is `history`, `legend`, `culture` or `film`. `narration` is read aloud by text-to-speech. A `film` chapter has `"video": { "file": "<Commons video>.webm", "alt": "…" }` instead of an image; its `narration` is shown as "About this film" and not read aloud. Add `"audio": "media/x.mp3"` or `"youtube": "<video id>"` to use other recordings. |
   | `bestMonths` | Months (1–12) when the place is at its best, e.g. `[4, 5, 6, 9, 10]`. Drives Discover, the season badge and My trip. |
   | `tags` | Interests: `history`, `architecture`, `nature`, `spiritual`, `local-life`, `adventure`. |
   | `featured` | `true` for an editor's pick on Discover. |
   | `guide.hours.seasons[]` | `months` (1–12) plus `days` with `daily` or `mon`…`sun` set to `[["09:00","17:00"]]`. Leave a day out to mark it closed. A closing time earlier than the opening time means "after midnight". |
   | `guide.hours.closedDates` | `["12-25"]` (MM-DD). |
   | `guide.hours.open24h` | `true` for outdoor places with no gate, such as a bay or a mountain pass. Use it instead of `seasons`. |
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
- **Prototype notes.** Where the prototype differs from the planned product (recorded narration, more landmarks per city), a dashed "Prototype note" box says so.
- **Home first, globe second.** The landing panel is wider on the home page and leads with a large title and large city names; pointing at a city lights up its pin; the globe rests after its opening move instead of spinning. Every other page has a Home button in the top-left corner of the app bar. The globe keeps only zoom and "whole globe" controls; borders and place names appear by themselves when you zoom in.
- **Calm names and a readable Through time.** Place names are laid out again only when the map moves; pointing at a pin shows its name in a dark chip above it and leaves every other name where it was. In Through time, the panel lists this year's events first, keeps older entries in a folded "Earlier history" group and names places with no record in one line; the cards on the map never overlap (each tries a few spots around its pin and is hidden if none is free, at most 5 at once, 2 on a phone).
- **Symbol motifs (pilot: Hanoi and the Ho Chi Minh Mausoleum).** Each slide carries 3–4 gold drawings taken from what it says, drawn like engravings on bronze: a bold outline, finer inner lines, hatching, scales and patterns, in a gold that shades from light to bronze. For example the Turtle Tower and the Thê Húc bridge on the Hanoi cover, a scaled Lý dragon, Khuê Văn Các and a Đông Sơn drum face for its history, a steaming bowl of phở and egg coffee for its culture, the stilt house and the carp pond for 1954–1969, saplings on a hill for the chapter on his last wish. Each draws itself in layer by layer when its slide arrives (outline, then main lines, then fine detail), catches a glint of light once, drifts at its own depth while the slides move, then keeps slow movements of its own in several parts (lotus petals sway apart, three curls of steam rise in turn, a lantern's tassel lags behind it); only the slide in view moves, and with reduced motion they are drawn and still. `src/js/motifs.js` holds the 38 drawings and fits them into the empty parts of each slide, clear of text, buttons and the timeline (2 small ones on a phone). Which motifs a slide shows is set in the data (`motifs` in `cities/hanoi.json` and `landmarks/ho-chi-minh-mausoleum.json`); places without it show none, and `npm run check` rejects unknown names.
- **Vietnamese lacquer details.** The slides use the colours of sơn mài lacquer (lacquer black, son red, gold) with light slides on the cream of giấy dó paper. Ornament appears in three places only: a red seal beside each title holding the slide's number, a band of tangent circles with a centre dot (from the rings of Đông Sơn bronze drums) under titles and between Do and Don't, and the 14-ray star from the centre of a Đông Sơn drum as the timeline marker. The motifs are inline SVG masks, so they take the colour around them and work offline.
- **Slides.** City, Time travel, Stories and Visit are decks of full-screen slides, modelled on egymonuments.gov.eg. Scrolling (wheel, trackpad, Page Down, ← →) moves the slides sideways with an eased animation, and a timeline along the bottom shows each part and jumps to it. Each slide is centred on screen and pairs a title, a large photo and a text panel, with Be Vietnam Pro headings. Behind every slide is a blurred photo of its own (the era, chapter or topic), and the backgrounds cross-fade as you scroll; frames, photos and cards fade in one after another each time a slide arrives. On Time travel every era is a slide, so the bottom timeline is the landmark's own timeline. On phones, short windows and with prefers-reduced-motion the slides stack vertically (`src/js/slides.js`).
- **Text that belongs with its pictures.** Panel content sits in one centred reading column. City sections are photo cards whose image fades into the text, and the Time travel and Stories text blocks sit on a heavily blurred copy of the photo they describe (86% page colour on top, so text keeps at least 4.5:1 contrast in both themes).
- **One layout for every page:** a content panel next to a large viewport (satellite map, era photos, story media or visitor map), as in Google Earth. On phones the viewport sits on top and the panel scrolls below.
- **Accessibility:** skip link, keyboard-operable slider (arrows, Home and End), keyboard search with arrow keys, labelled controls, live region for era changes, transcripts for all narration, reduced-motion support, and light and dark themes.

## Content disclaimer

Opening hours, prices and map marker positions are approximate prototype data. Check official sources before travelling. Images come from Wikimedia Commons under their stated licences, and each page lists its image credits.
