#!/usr/bin/env bash
# Render the video in parallel chunks, then concatenate (video only).
set -e
cd "$(dirname "$0")/.."
mkdir -p build/parts
N=${N:-4}; FPS=${FPS:-30}; DUR=${DUR:-160}
pids=()
for i in $(seq 0 $((N-1))); do
  a=$(python3 -c "print($DUR*$i/$N)"); b=$(python3 -c "print($DUR*($i+1)/$N)")
  node tools/render.mjs --from $a --to $b --fps $FPS --out build/parts/p$i.mp4 > build/parts/p$i.log 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait $p; done
: > build/parts/list.txt
for i in $(seq 0 $((N-1))); do echo "file 'p$i.mp4'" >> build/parts/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i build/parts/list.txt -c copy build/video_noaudio.mp4
echo done
