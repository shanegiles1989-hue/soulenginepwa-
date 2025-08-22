SOUL ENGINE — PWA (Phone‑First Writing App)

What you have:
- Scenes + Lore editor, offline, installable.
- Pre-seeded with Soul Engine canon, plus placeholders to paste your exact Prologue + Chapter One word‑for‑word.
- Word counts, Stats, Speak (built-in or ElevenLabs via Settings), JSON backups.

Deploy from a PC (GitHub Pages):
1) Create a public repo named `soulengine-pwa` on GitHub.
2) Upload ALL files from this zip: index.html, script.js, seed.js, manifest.json, sw.js, /icons.
3) In the repo: Settings → Pages → Source: Deploy from branch (main) and root (/). Save.
4) After it builds, open the Pages URL in Safari on your iPhone.
5) Safari → Share → Add to Home Screen. You now have the app installed.

First use:
- Open the app → Scenes → open **Prologue – The Rise of the Soul Arc** and **Chapter One – White Petals in Grey Dust**.
- Paste your exact drafts (word‑for‑word) into each scene body to replace the placeholders.
- Tap Save. Now it’s stored locally on the phone.

Backups:
- Settings → Export JSON to save a snapshot (Downloads). Keep copies in Files or iCloud.
- Restore any time with Import JSON.

Notes:
- Data is local to each device (IndexedDB). Clearing Safari data removes app data — export first.
- ElevenLabs: paste your API key + Voice ID in Settings to use the in‑app Speak. Otherwise, use iOS Speak Selection.
