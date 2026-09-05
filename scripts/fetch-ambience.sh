#!/usr/bin/env bash
# Rebuilds public/ambience/*.mp3 from the CC0 "Nature Sounds" collection
# on the Internet Archive. Requires curl + ffmpeg. Run from the repo root.
set -euo pipefail
BASE="https://archive.org/download/naturesounds-soundtheraphy"
RAW=".tmp/raw"  # scratch, git-ignored
OUT="public/ambience"
nmkdir -p "$RAW" "$OUT"

# slug|remote filename|start offset (s)|duration (s)
ITEMS=(
  "forest|Relaxing Nature Sounds - Birdsong Sound.ogg|30|240"
  "ocean|Birds With Ocean Waves on the Beach.ogg|120|240"
  "rain|Light Gentle Rain.ogg|180|240"
  "stream|Relaxing Nature Sounds - Trickling Stream Sounds & Birds.ogg|120|240"
  "storm|Sound Therapy - Sea Storm.ogg|600|240"
)

for item in "${ITEMS[@]}"; do
  IFS='|' read -r slug fname start dur <<< "$item"
  src="$RAW/$slug.ogg"
  if [ ! -s "$src" ]; then
    echo ">> download $slug"
    curl -sSL --retry 3 --fail -o "$src" "$BASE/$(printf '%s' "$fname" | sed 's/ /%20/g')"
  fi
  echo ">> encode $slug"
  ffmpeg -v error -y -ss "$start" -t "$dur" -i "$src" \
    -af "loudnorm=I=-20:TP=-2.0:LRA=11,afade=t=in:st=0:d=1.5" \
    -c:a libmp3lame -b:a 80k -ar 44100 -ac 2 "$OUT/$slug.mp3"
done
ls -la "$OUT"
