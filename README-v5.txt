Malimar TV Web v5 overlay
1. Copy this overlay into the existing malimar-tv-web repo.
2. Run: python3 apply_v5.py
3. Commit and push.
Changes:
- XML crawler depth raised from 3 to 7 so episode feeds are cached.
- Leaf items with an id use Malimar's normal web episode route.
- Leaf items with only a public streamUrl are handed to the WebView.
