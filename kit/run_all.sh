#!/usr/bin/env bash
# One command for everything:   bash run_all.sh          (full video)
#                               bash run_all.sh test     (renders 8 frames first so you can check speed + look)
set -e; cd "$(dirname "$0")"
say() { printf "\n\033[1;36m== %s\033[0m\n" "$1"; }
TOTAL=$(node -e "import('./web/story.js').then(m=>console.log(m.TOTAL))" 2>/dev/null || echo 0)
FPS=${FPS:-30}; export FPS; OUTN=$((TOTAL*FPS/30))
TITLE=$(cat title.txt 2>/dev/null || echo "My Cartoon Short")
say "1/6  Checking tools"
echo "This may install (only if missing): Node, ffmpeg, Python packages numpy+pillow (in a local .venv), the Playwright npm package and a private Chromium used only to draw frames."
echo "Everything stays inside this folder or Homebrew; remove with: rm -rf node_modules .venv ~/Library/Caches/ms-playwright   (and brew uninstall ffmpeg node if you want)."
read -p "OK to install what's missing? [y/N] " ok; [ "$ok" = "y" ] || [ "$ok" = "Y" ] || { echo "Stopped. Nothing installed."; exit 1; }
if ! command -v brew >/dev/null; then echo "Homebrew is missing. Install it from https://brew.sh (one line in Terminal), then run this again."; exit 1; fi
command -v node >/dev/null || brew install node
command -v ffmpeg >/dev/null || brew install ffmpeg
command -v python3 >/dev/null || brew install python
say "2/6  Installing the renderer (first time only, a few minutes)"
npm install --no-audit --no-fund
npx playwright install chromium
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate; pip install -q numpy pillow
mkdir -p frames out
if [ "$1" = "test" ]; then
  say "TEST: rendering 8 frames"
  node render_local.mjs stills $(node -e "import('./web/story.js').then(m=>console.log([0.01,0.14,0.23,0.41,0.55,0.67,0.82,0.999].map(x=>Math.floor(x*m.TOTAL)).join(',')))")
  python3 sheet.py stills stills/contact_sheet.jpg 8
  echo; echo "Open stills/contact_sheet.jpg to check the look. Speed is printed above (s/frame per window)."; exit 0
fi
say "3/6  Building music + sound effects"
python3 audio.py && python3 mix.py voice.mp3 music.wav sfx.wav
say "4/6  Rendering $OUTN frames at $FPS fps (safe to stop with Ctrl+C and run again: it resumes)"
node render_local.mjs frames 0-$((OUTN-1))
n=$(ls frames/*.jpg | wc -l | tr -d ' '); [ "$n" -eq "$OUTN" ] || { echo "Only $n/$OUTN frames exist; run this again to finish."; exit 1; }
say "5/6  Encoding the video with sound"
bash finish.sh "$TITLE"
say "6/6  Done"
echo "Your video is in: $(pwd)/out"; open out 2>/dev/null || true
