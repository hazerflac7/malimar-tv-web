# Malimar TV Web v3

TV-remote-oriented web interface for Malimar's web service.

V3 avoids browser CORS failures by mirroring Malimar's publicly readable XML catalog during the GitHub Pages deployment workflow. The browser reads those XML snapshots from the same GitHub Pages origin. Images remain on Malimar's CDN, and premium playback is handed to Malimar's normal episode webpage so account/session authorization remains with Malimar.

Controls: D-pad/arrow keys move focus, Enter/OK selects, Back/Escape returns.
