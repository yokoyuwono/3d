#!/bin/sh
# Rebuild "Kasus #2: Cicilan 0% yang Nggak Pernah 0%": sh build.sh   (LIB = Lemo-Opuscar library folder)
set -e
LIB=${LIB:-$HOME/lemo-opuscar}; HERE=$(cd "$(dirname "$0")" && pwd); export LIB
PY="$LIB/.venv/bin/python"
# 0. (optional) narration, 1 batched Gemini request: python3 voice/gemini_tts.py voice/narration.json voice/lines id-id-podcaster-1 --batch 0  (then: python3 tools/realign.py)
"$PY" "$HERE/tools/prep.py"
cd "$LIB"
node core/render/events.mjs "$HERE" --size 1080x1920
"$PY" "$HERE/tools/score.py"
"$PY" "$HERE/tools/mix.py"
node core/render/video.mjs "$HERE" --fps 30 --workers 4 --size 1080x1920 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/cicilan-nol.mp4" 30 0
node core/render/readcheck.mjs "$HERE" --size 1080x1920
"$PY" core/render/srt.py "$HERE/cues.json" "$HERE/subtitles_id.srt"
