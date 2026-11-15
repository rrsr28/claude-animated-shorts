#!/usr/bin/env bash
# Re-render only part of the video after a change.   bash rerender.sh 1200 1400
set -e; cd "$(dirname "$0")"; [ -n "$2" ] || { echo "usage: bash rerender.sh FIRST_FRAME LAST_FRAME   (frame = seconds x 30)"; exit 1; }
. .venv/bin/activate
for f in $(seq $1 $2); do rm -f "frames/f$(printf %04d $f).jpg"; done
node render_local.mjs frames $1-$2
bash finish.sh "$(cat title.txt)"
