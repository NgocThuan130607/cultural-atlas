# Atlas of Stories

An interactive cultural guide for travellers. Start on a 3D globe, pick a city, then explore a landmark in three ways, each on its own page:

- **Time travel** (`timetravel.html`): the landmark's eras, one slide each, from the oldest photo to today, along the timeline at the bottom of the page.
- **Stories** (`stories.html`): short narrated chapters on history, legends and culture, with a highlighted transcript. Nine landmarks also have a **film** chapter: a real video streamed from Wikimedia Commons, such as the Lumière company's 1897 film of the Sphinx.
- **Visit** (`visit.html`): opening hours with a live "Open now" badge (in the landmark's own time zone), etiquette dos and don'ts, local tips, and a filterable map.

Not sure where to go? **Discover** (`discover.html`) asks three quick questions (when, what you enjoy, and anywhere or Vietnam) and suggests three places with reasons. It also lists places at their best in any month, editor's picks, and places by interest. First-time visitors to the globe get a short welcome that explains the site in three steps (the **?** button opens it again).

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

The panel on the left lists every place in both atlases, in two sections: **World** (Paris, Cairo, Kyoto, Rome, New York) and **Vietnam** (all 34, under North, Central and South, Hà Nội included), the atlas on screen first. Choosing a place from the other section switches to its atlas.

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

- Press **Through time** (top right). A world timeline bar replaces the landmark strip, and the Lạc bird is put away until you leave the mode. It starts at the first moment of the timeline (c. 2560 BCE for the World, c. 500 BCE for Vietnam). Switching it on turns the page of an old book printed with that year, while dust, scratches and grain like those of an old film flicker over the screen and settle (`src/js/time-turn.js`, about 3.8 s; not with reduced motion, nor when the mode is opened from a shared link).
- Under the title of the side card, a small box, How to travel through time, explains it in two steps (choose a year; read what happened). It is open the first time and folded to one line after that.
- Drag the slider from 2600 BCE to today. The scale is stretched so recent centuries get more room. Or press ▶ for a guided tour of the **key moments**: the globe turns to where history is happening, always staying far enough out for the whole Earth to be in view, so every event can be followed. On the Vietnam atlas, where the whole country is already in view, the globe stays still as the years change.
- **A city's book.** Click a city (in the side card, its floating card or its dot) and a book opens with its whole story (`src/js/city-book.js`): a lacquer cover with the city's name in gold opens by itself; the first spread has the city's photo and a title page ("Cairo through time") with a short note on how to read the book and its contents; then each period of history (Ancient, Medieval…, or for Vietnam Early kingdoms, Chinese rule…) is a page with its name on top and the city's changes in that period as a timeline below, with links to the landmarks at that moment. Tabs on the book's left edge jump to a period; the arrows, the ← → keys, the mouse wheel, a click on a page or a swipe turn the pages; turning the pages turns only the book, and the year bar and the globe behind it stay where they were. A period too long for a page goes on over the next. The book looks thick and old: it lies tilted back as on a table, so the edges of its pages show along the bottom as a block, thin on the left at the start and thick on the right, the other way round at the end, with the lacquer-brown boards of the cover under them and the end of the stitched spine, with its red and gold headband, between them; the leaves turn in that space and the tabs stick out of its edge like bookmarks. The paper is dark and crumpled, creased, foxed and stained, speckled with dust, darker at its edges and smudged where a thumb turns the pages, stitched along the gutter, with a faint drum face printed in a corner; specks of dust drift in a beam of light over the book. On a phone the book shows one page at a time.
- Each city gets a floating card with what was going on there. Cities with something happening that very year (within 5 years) have pulsing red pins.
- The side card lists every city for that year, with each landmark's state: either "its story begins in …", or a link that opens the landmark's Time travel page at the matching era (`timetravel.html?id=eiffel-tower&part=era-2`).
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
  js/home-ui.js           Home: first-visit welcome dialog, including the Through time introduction; closing, it shrinks into the "?" button, which glows
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
  resolve-media.mjs       npm run media: looks up images and videos on Wikimedia Commons (covers 1920px wide, others 1280px)
  check-links.mjs         npm run links: checks that the official and other outside links answer
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
   | `eras[].image` | `{ "file": "<Wikimedia Commons file name>", "alt": "…", "focus": "center bottom" }`. `focus` is optional: the part of the photo to keep when it is cropped to fill its frame (a CSS `object-position`), for a photo whose subject is not in its middle (any image reference can have one). For your own photos, use `{ "src": "media/my-photo.jpg", "credit": "Photo: …" }` and put the file in `public/media/`. |
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

- **Time travel goes era by era.** Each era of a landmark is a slide of its own, so the timeline along the bottom of the page is the landmark's timeline and the one way through time; the Overview shows the landmark's own picture, as on its Stories and Visit pages (since the twentieth round; before, it showed one of its eras). (The Overview's own time slider, its before / after comparison and the "See it on the time slider" and "Compare with …" buttons were taken out in the nineteenth round.)
- **Opening hours are always calculated in the landmark's time zone**, so a visitor browsing from anywhere sees the correct status.
- **Content and code are separate.** Every landmark uses the same template, filled from JSON, so the JSON could later come from a CMS or an API without changing the pages.
- **Prototype notes.** Where the prototype differs from the planned product (recorded narration, more landmarks per city), a dashed "Prototype note" box says so.
- **Home first, globe second.** The landing panel is wider on the home page and leads with a large title and large city names; pointing at a city lights up its pin; the globe rests after its opening move instead of spinning. Every other page has a Home button in the top-left corner of the app bar. The globe keeps only zoom and "whole globe" controls; borders and place names appear by themselves when you zoom in.
- **Calm names and a readable Through time.** Place names are laid out again only when the map moves; pointing at a pin shows its name in a dark chip above it and leaves every other name where it was. In Through time, the panel lists this year's events first, keeps older entries in a folded "Earlier history" group and names places with no record in one line; the cards on the map never overlap (each tries a few spots around its pin and is hidden if none is free, at most 5 at once, 2 on a phone).
- **Symbol motifs (every city and landmark).** Each slide shows at most two gold drawings taken from what it says (one on a phone; thirty-eighth round, so that with the drum band under the title a slide has no more than three gold ornaments), drawn like engravings on bronze: a bold outline, finer inner lines, hatching, scales and patterns, in a gold that shades from light to bronze. For example the Turtle Tower and the Thê Húc bridge on the Hanoi cover, a scaled Lý dragon, Khuê Văn Các and a Đông Sơn drum face for its history, a steaming bowl of phở and egg coffee for its culture, the stilt house and the carp pond for 1954–1969, saplings on a hill for the chapter on his last wish. Each draws itself in layer by layer when its slide arrives (outline, then main lines, then fine detail), catches a glint of light once, drifts at its own depth while the slides move, then keeps slow movements of its own in several parts (lotus petals sway apart, three curls of steam rise in turn, a lantern's tassel lags behind it); only the slide in view moves, and with reduced motion they are drawn and still. Every landmark has its own signature drawing (the Eiffel Tower, Hạ Long Bay's junks among the islets, Po Nagar's Cham tower, the floating market's boat with its sample pole…), and a shared library covers landscapes, village life, crafts, history and nature, 153 drawings in all. War memorials are drawn without weapons and religious sites by their architecture. `src/js/motifs.js` places them in the empty parts of each slide, clear of text, buttons and the timeline (one small one on a phone); the drawings live in `src/js/motif-art/`. Which motifs a slide shows is set in the data (`motifs` fields in `public/data/cities/*.json` and `public/data/landmarks/*.json`), and `npm run check` rejects unknown names.
- **Redraw the symbols.** A motif glows when the mouse is over it, and clicking or tapping it (or Enter, after tabbing to it) redraws it: its lines vanish and draw themselves in again, outline first, then the main lines and the fine detail, and the glint runs over the gold once more. Each motif is a button, and screen readers say what it shows in a name and one sentence (the Eiffel Tower, built for the 1889 World's Fair; the stakes of Bạch Đằng…); these captions are in `src/js/motif-art/captions.js`, and `npm run check` makes sure every drawing has one. The behaviour is in `src/js/motif-redraw.js`; with reduced motion nothing redraws.
- **Moving between pages.** Choosing City guide, Explore, Time travel, Stories or Visit on the globe sends the camera diving towards the place (0.6 s), then the card becomes the page: its photo grows into the cover, the city's name into the big title, its line into the cover's lead, the local time into the clock and the card itself into the cream panel, while the Lạc ship flies into the cover's first gold drawing and the globe falls away behind it (cross-document view transitions, set up by `src/inline/view-transitions.js`, which the build inlines into every page). Going back to the globe reverses it, and Time travel, Stories and Visit slide left or right in the order of their tabs while the app bar and tabs stay put. This needs Chrome or Edge 126+, or Safari 18.2+, and a site served over http(s); opened from disk the pages change as before.
- **Photos that develop.** On Time travel a new era's photo comes up like a print in a darkroom, from a pale sepia blur to its true colours under a film grain that is heavier for older eras, and the year rolls like a mechanical counter.
- **Light that follows the clock.** City and landmark pages have the deep indigo background of a city at night, warmed a little at dawn and dusk for the time of day at the place, and show the local time with a sun or moon, e.g. "Night in Hanoi" (`src/js/daylight.js`). The globe itself is evenly lit.
- **Gold threads.** Each place chosen on the globe is joined to the one before by a glowing gold thread that draws itself along the great circle; the last three stay. My trip draws its route the same way, in the order of the visits.
- **Landmarks open straight away.** Choosing a landmark on the home page (in a city's card, the strip along the bottom, a pin or the search) dives to it and opens its Time travel page; there is no landmark card on the globe. A link to a landmark on the globe (`index.html#hue-imperial-city`) shows its city's card instead.
- **Opening status → opening hours.** The "Open now" / "Closed · opens …" line on a landmark's first slide opens the Opening hours slide of its Visit page (`visit.html?id=…&part=plan`; `?part=` opens any slide by its id).
- **No drawing behind the pages.** Until the thirty-eighth round each city and landmark page had its cover motif drawn very large and faint behind the slides, and Discover and My trip a drum face; they were taken out so that nothing gold lies behind the words.
- **Zooming out stays on the place.** The camera goes no further out than 40,000 km, and zooming out from a city or a landmark (seen tilted) levels the view as it rises, centred on the place that was in view, until it looks straight down at the whole Earth, as at home (`globe.js`). North stays up: a view from straight above (as in Through time) keeps its own heading while zooming.
- **The landmark strip is centred** in the space between the panel and the zoom buttons, the same gap on both sides; when it has more cards than fit, it starts at the left and scrolls.
- **Photos that fail.** A photo that cannot load shows a sheet of old paper with the drum's star instead of an empty frame (`common.js`).
- **Touchpads.** Pinching on a touchpad zooms the globe and the maps smoothly about the point between the fingers (it used to zoom the whole page), and a two-finger slide moves them as dragging does: on the globe it turns the Earth under the fingers with north kept up, on a map it pans, and a map settles on a whole zoom level when the fingers stop so its tiles stay sharp. A mouse wheel still zooms. On the slides a two-finger slide over a map still moves the slides, as the wheel does there, while a pinch zooms the map. In a city's book one flick turns one page, however long the touchpad keeps gliding. A mouse wheel and a touchpad are told apart by their first movement (a wheel turns in whole notches, a touchpad starts with small uneven amounts, often with some sideways movement); Safari's own pinch events on a Mac are handled too (`src/js/touchpad.js`).
- **Gold that keeps clear.** No gold ornament lies over words, photos or another ornament. The symbol motifs keep a little way off photos and panels instead of tucking half behind them, keep clear of the red seal, the drum band and the photo credits, and on a city's cover stay on the shaded side by the title, off the place in the photo. The photo credits and the chapter strip on Stories sit inside the photos' gold line, which closes above the strip. On Discover and My trip the faint drum is a small whole drum at the end of the title's line, and on the home panel a quarter drum in the corner (none in Through time, where the close button is). In a city's book the drum is half a drum on the page's outer edge, above the page number, and only on pages whose words do not reach it; the stains no longer show a lighter rectangle. The city guide's gold sheen passes behind its words, and the Lạc bird keeps its cloud trail as well as itself clear of the city names.
- **Balanced city covers.** On a city's cover, where the photo fills the screen, the gold motifs are spread round the title (above it, below the panel and on both sides) instead of being stacked along the left edge. The photo is looked at once, small, in the browser: where it has strong shapes (a tower, minarets, a roof against the sky) the motifs keep away, and they go to its calm parts, the sky, the water, the shade. What counts as strong is measured against the photo itself, so a photo full of leaves still gets its motifs (`placeMotifs` in `src/js/motifs.js`; the photos come from Wikimedia Commons, which allows this, and if one cannot be read the motifs are placed without it).
- **The Lạc bird stays over the middle of the globe.** On the home page the bird hovers at the middle of the globe and may fly over a city's pin or name (thirty-ninth round; before that it stepped aside from them, which took it off towards the sides). It only moves a short way from the middle when the middle is off the globe.
- **Steady names on the globe.** Pointing at a city's dot or name lights the name where it is, on a dark chip; nothing moves.
- **Turning the globe.** Two buttons above the landmark strip turn the globe (hold to keep turning), as do the ← → keys, with the line "Drag or use ← → to turn the globe · Click a dot to open a city".
- **Lacquer colours on every page.** The home page wears the colours of the slides (`src/scss/_lacquer-ui.scss`), and since the thirty-second round so do the other pages' app bar, buttons, chips, cards and maps (`src/scss/_lacquer-pages.scss`): flat giấy dó cream panels in the light theme and flat lacquer black in the dark one, son red for the main actions and for what is switched on, gold for what is chosen and for a fine line along the top of the panel, and titles in Be Vietnam Pro. Shapes are kept plain: flat tablets with corners barely rounded, no inlaid lines or corner pieces. In the left panel, a line with the drum's star separates the head from the list (the drum face behind the title and the Lạc birds beside the section names were taken out in the thirty-eighth round). Elsewhere the ornament stays on and round the globe: the city pins are the 14-ray star from the centre of a Đông Sơn drum, and two faint gold rings of the drum turn slowly round the Earth (`src/js/drum-halo.js`). On the other pages, the drum's star stands before the site's name in the app bar, over a gold line along its bottom; the page in view is marked in son red; Discover and My trip have a small faint drum at the end of their title and the line with the drum's star between their parts; the blurred photo behind the slides is warmed to the lacquer's brown.
- **The left panel as a journey.** The places are stops along a gold thread, the thread the Lạc bird pulls across the globe: each stop is a round photo like a coin, with the place's name large and the time there now with a sun or moon. Pointing at a stop lights its pin on the globe; the globe itself stays still until a place is chosen. A city's card is a magazine cover: its photo fills the top of the card with the name set large over it, and its landmarks follow as photo cards side by side. The way into the city's guide is a large card with a gold frame and a round gold seal showing the centre of a Đông Sơn drum, its 14-ray star with hatched triangles between the rays inside rings of ticks and tangent circles ("City Guide · History · landmarks · customs"); the mouse makes the frame glow, the seal turn half way round and a gold sheen cross the card. The panel has no close button: it always stays open, and the arrow on the photo goes back to the list.
- **The Lạc bird.** The bird of the Đông Sơn drums hovers over the part of the globe in view (`src/js/ship.js`; the files keep the name "ship" from when it was a spaceship). It is drawn from the side, as on the drums, in bronze engraved with gold: a long straight beak, a small round head with a big round eye, a crest with a drum sun, a long curved neck with the drums' chain of circles, chevrons on the body, a fan of long tail feathers and a striped wing that beats. It keeps its place on screen while the globe is turned, so the ground slides beneath it: it faces the way it is flying (its beak never tipped more than 30°) and beats its wings harder and faster the faster the globe turns (at rest it glides). Gold cloud scrolls stream out behind it (`src/js/ship-clouds.js`). Choose a city and it flies there along the great circle while the globe turns, pulling the gold thread behind it as its trail, then comes down over the city as the camera zooms in; rings of light mark the landing. To keep the ship and the city in view, flights to a place are run by the page in two parts (turn, then zoom) instead of Cesium's default flight. The ship is decoration only: it never takes clicks, and with reduced motion it stays still.
- **Vietnamese lacquer details.** The slides use the colours of sơn mài lacquer (lacquer black, son red, gold) with light slides on the cream of giấy dó paper. Ornament appears in three places only: a red seal beside each title holding the slide's number, a band of tangent circles with a centre dot (from the rings of Đông Sơn bronze drums) under titles and between Do and Don't, and the 14-ray star from the centre of a Đông Sơn drum as the timeline marker. The motifs are inline SVG masks, so they take the colour around them and work offline.
- **Slides.** City, Time travel, Stories and Visit are decks of full-screen slides, modelled on egymonuments.gov.eg. Scrolling (wheel, trackpad, Page Down, ← →) moves the slides sideways with an eased animation, and a timeline along the bottom shows each part and jumps to it. Each slide is centred on screen and pairs a title, a large photo and a text panel, with Be Vietnam Pro headings. Behind every slide is a blurred photo of its own (the era, chapter or topic), and the backgrounds cross-fade as you scroll; frames, photos and cards fade in one after another each time a slide arrives. On Time travel every era is a slide, so the bottom timeline is the landmark's own timeline. On phones, short windows and with prefers-reduced-motion the slides stack vertically (`src/js/slides.js`).
- **Text that belongs with its pictures.** Panel content sits in one centred reading column. City sections are photo cards whose image fades into the text, and the Time travel and Stories text blocks sit on a heavily blurred copy of the photo they describe (86% page colour on top, so text keeps at least 4.5:1 contrast in both themes).
- **One layout for every page:** a content panel next to a large viewport (satellite map, era photos, story media or visitor map), as in Google Earth. On phones the viewport sits on top and the panel scrolls below.
- **Accessibility:** skip link, keyboard-operable slider (arrows, Home and End), keyboard search with arrow keys, labelled controls, live region for era changes, transcripts for all narration, reduced-motion support, and light and dark themes.

## Content disclaimer

Opening hours, prices and map marker positions are approximate prototype data. Check official sources before travelling. Images come from Wikimedia Commons under their stated licences, and each page lists its image credits.
