# Malimar TV Web v2

TV-first HTML/CSS/JavaScript interface for navigating Malimar with a D-pad remote.

## v2 changes
- Loads Malimar's real `HomeGrid.xml`.
- Loads each HomeGrid row feed instead of using the v1 demo/fallback catalog.
- Uses each show's native XML episode feed (for example `TreasureLovers26.xml`).
- Uses Malimar episode IDs such as `EP284043` to open the normal Malimar website episode page.
- Does not attempt to play the raw premium HLS URL; Malimar's website remains responsible for subscription/session authorization.
- D-pad/arrow, Enter/OK and Back/Escape navigation remain browser-native.

## Files
- `index.html`
- `tv.css`
- `app.js`

Serve these files over HTTP/HTTPS (for example GitHub Pages). Opening `index.html` directly as `file://` may trigger browser cross-origin restrictions.

## GitHub Pages

This repository includes `.github/workflows/pages.yml`. A push to `main` deploys the static TV interface with GitHub Pages.
