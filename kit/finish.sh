#!/usr/bin/env bash
# Encode frames + mix -> mp4, then QA.   bash finish.sh "Title Of Short"
set -e; T="${1:-short}"; F="out/${T// /-}.mp4"
LI=$(ffmpeg -hide_banner -i mix_raw.wav -af loudnorm=I=-14:print_format=json -f null - 2>&1 | python3 -c "import sys,json,re; t=sys.stdin.read(); print(json.loads(re.search(r'\{.*\}',t,re.S).group(0))['input_i'])")
G=$(python3 -c "print(round(-14-float('$LI'),2))"); echo "linear gain ${G} dB (input ${LI} LUFS)"
ffmpeg -v error -y -i mix_raw.wav -af "volume=${G}dB,alimiter=limit=0.891:attack=5:release=50:level=disabled" -ar 48000 -ac 2 mix.wav
ffmpeg -v error -y -framerate ${FPS:-30} -i frames/f%04d.jpg -i mix.wav -map 0:v:0 -map 1:a:0 -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart "$F"
ffprobe -v error -show_entries format=duration -show_entries stream=width,height,r_frame_rate -of compact "$F"
echo "--- QA (empty = no black/frozen spans)"; ffmpeg -i "$F" -vf "freezedetect=n=0.0005:d=0.4,blackdetect=d=0.05" -an -f null - 2>&1 | grep -E "freeze_start|black_start" || true
ffmpeg -i "$F" -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | tail -1
ffmpeg -v error -y -i "$F" -vf "fps=2,scale=180:-1,tile=10x4" -frames:v 1 out/qa_sheet.jpg; echo "$F"
