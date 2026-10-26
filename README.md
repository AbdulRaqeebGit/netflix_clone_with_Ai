# Cineflix

A Netflix-inspired movie & TV streaming demo built with plain HTML, CSS and
JavaScript (plus Bootstrap 5). No build step and no backend — accounts,
profiles and My List live in `localStorage`.

## Run it

```bash
node server.cjs          # http://127.0.0.1:8080
node server.cjs 3000     # custom port
```

Then open <http://127.0.0.1:8080/index.html>.

## Structure

```
.
├── index.html              Landing page (hero, reasons, trending, FAQ)
├── login.html              Sign in
├── signup.html             Create account
├── forgot-password.html    2-step local password reset
├── browse.html             App shell: Home / TV / Movies / New / My List,
│                           search, detail modal, player, notifications
├── server.cjs              Zero-dependency static file server
├── assets/
│   ├── css/
│   │   ├── styles.css      Shared theme, landing + auth pages
│   │   └── browse.css      Browse app, rows, modals, responsive rules
│   ├── js/
│   │   ├── data.js         Curated catalogue (45 films & series)
│   │   ├── store.js        localStorage: users, session, profiles, My List
│   │   ├── common.js       Shared helpers, toasts, footer year
│   │   ├── auth.js         Landing / login / signup / reset flows
│   │   ├── browse.js       Rows, search, detail modal, player, profile menu
│   │   └── omdb.js         Live OMDb search with local-catalogue fallback
│   ├── fonts/              Self-hosted Bebas Neue + Inter (fonts.css)
│   ├── img/
│   │   ├── posters/        One poster per catalogue title
│   │   ├── backdrops/      Hero / ambient background artwork
│   │   ├── avatars/        Profile avatars
│   │   ├── backdrop-desert-2.jpg   Dune detail-view fallback
│   │   └── favicon.svg
│   └── vendor/             Bootstrap CSS + JS (served locally)
└── tools/                  One-off maintenance scripts (not part of the site)
    ├── download-fonts.cjs        Re-fetch Google Fonts → assets/fonts/
    ├── download-posters.cjs      Re-fetch posters → assets/img/posters/
    ├── download-vendor.cjs       Re-fetch Bootstrap → assets/vendor/
    ├── fetch-poster-sources.cjs  Collect Wikipedia poster URLs
    ├── extract-unsplash.cjs      Find Unsplash image URLs for a photo page
    ├── optimize-images.py        Re-encode posters/backdrops (needs Pillow)
    └── poster-sources.json       Source URLs consumed by download-posters
```

## Tools

All scripts resolve paths from the project root, so run them from anywhere:

```bash
node tools/download-vendor.cjs
node tools/fetch-poster-sources.cjs   # writes tools/poster-sources.json
node tools/download-posters.cjs
node tools/download-fonts.cjs
python tools/optimize-images.py       # requires: pip install pillow
```

## Credits

Poster artwork belongs to the respective studios and is used for demonstration
only. Photography is from Unsplash. This project is not affiliated with Netflix.
`omdb.js` reads its API key from the `omdbKey` entry in localStorage; without a
key, search falls back to the local catalogue.
