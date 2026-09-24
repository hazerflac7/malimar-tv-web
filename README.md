# Malimar TV Web Prototype

TV-first HTML/CSS/JS prototype with D-pad navigation.

## Run
Serve the folder over HTTP (opening index.html as file:// can block fetch):

    python -m http.server 8080

Then open http://DEVICE-IP:8080/ or http://127.0.0.1:8080/.

## Controls
Arrow/D-pad = move, Enter/OK = select/play, Escape/Backspace/Android BACK = back.

## Notes
The app attempts the known Malimar XML catalog endpoints. If browser CORS blocks those XML requests it falls back to two demo catalog cards so remote navigation can still be tested. Episode playback intentionally opens the Malimar episode webpage rather than fetching the raw HLS stream directly.
