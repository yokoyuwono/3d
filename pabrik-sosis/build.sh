#!/bin/sh
# Rebuild the film from scratch: sh build.sh   (needs the Lemo-Opuscar library; LIB below)
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
# 0. (optional) narration, free tier first: python3 voice/gemini_tts.py voice/narration.json voice/lines Sulafat --batch 0   (GEMINI_PAID_API_KEY = fallback)
"$PY" "$HERE/tools/prep.py"                                   # 1. trim voice, timeline.json
"$PY" "$LIB/core/audio/sampler.py" --need vcsl karoryfer || true
cd "$LIB"
node core/render/events.mjs "$HERE" --size 1080x1920           # 2. picture events
"$PY" "$HERE/tools/score.py"                                  # 3. score
"$PY" "$HERE/tools/mix.py"                                    # 4. voice + score + ambience + foley
node "$HERE/tools/subs.mjs" && "$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_id.srt"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --size 1080x1920 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/pabrik-sosis.mp4" 24 0
node core/render/still.mjs "$HERE" 99.5 --size 1080x1920 --out "$HERE/out/poster" --prefix p_ >/dev/null && cp "$HERE/out/poster/p_99.5.jpg" "$HERE/poster.jpg"
