#!/usr/bin/env bash
# Cuts a single strike out of each source gong recording and writes the
# app-ready samples to public/gongs. Requires ffmpeg.
#
# The source files (gongs/, git-ignored) hold several repetitions of the same
# strike; the offsets below were read off ffmpeg's silencedetect:
#   Gong 1 — 13 strikes, one every 6.86 s, each ~5.0 s long
#   Gong 2 — a single 9.6 s strike
set -euo pipefail

SRC="gongs"
OUT="public/gongs"
TMP=".tmp/gongs"
mkdir -p "$OUT" "$TMP"

# slug|source file|start offset (s)|length (s)|tail fade (s)
ITEMS=(
  "gong-1|Gong 1.mp3|6.885|5.06|0.25"
  "gong-2|Gong 2.mp3|0|9.75|0.35"
)

for item in "${ITEMS[@]}"; do
  IFS='|' read -r slug fname start len fade <<< "$item"
  echo ">> $slug"
  # Trim to one strike, then shave any residual lead-in so the attack sits at t=0.
  ffmpeg -v error -y -ss "$start" -t "$len" -i "$SRC/$fname" \
    -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0:detection=peak" \
    -c:a pcm_s16le "$TMP/$slug.wav"
  # Match loudness across voices, kill the edge clicks (areverse fades the tail
  # without having to know the exact duration), encode.
  ffmpeg -v error -y -i "$TMP/$slug.wav" \
    -af "loudnorm=I=-18:TP=-1.5:LRA=20,afade=t=in:st=0:d=0.005,areverse,afade=t=in:st=0:d=$fade,areverse" \
    -c:a libmp3lame -b:a 96k -ar 44100 -ac 2 "$OUT/$slug.mp3"
done

ls -la "$OUT"
