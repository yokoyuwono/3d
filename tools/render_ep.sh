#!/usr/bin/env bash
# Render one ANDAI… episode to a 9:16 MP4 with its soundtrack.
# Usage: EP=1 N=4 ./tools/render_ep.sh   -> output/andai_ep1_9x16.mp4
set -e
cd "$(dirname "$0")/.."
EP=${EP:?set EP}; N=${N:-4}; FPS=${FPS:-30}
D=build/ep${EP}_parts; mkdir -p $D output
DUR=$(python3 -c "import json;print(json.load(open('build/ep${EP}_events.json'))['duration'])")
pids=()
for i in $(seq 0 $((N-1))); do
  a=$(python3 -c "print($DUR*$i/$N)"); b=$(python3 -c "print($DUR*($i+1)/$N)")
  node tools/render.mjs --page ep${EP}.html --from $a --to $b --fps $FPS --out $D/p$i.mp4 > $D/p$i.log 2>&1 &
  pids+=($!)
done
for p in "${pids[@]}"; do wait $p; done
: > $D/list.txt
for i in $(seq 0 $((N-1))); do echo "file 'p$i.mp4'" >> $D/list.txt; done
ffmpeg -y -loglevel error -f concat -safe 0 -i $D/list.txt -c copy $D/video.mp4
# two-pass ~3.8 Mbps keeps a 3-minute episode under GitHub's 100 MB limit (fine for TikTok/Reels/Shorts)
ffmpeg -y -loglevel error -i $D/video.mp4 -c:v libx264 -preset slow -b:v 3800k -pass 1 -passlogfile $D/pass -an -f null /dev/null
ffmpeg -y -loglevel error -i $D/video.mp4 -i episodes/ep${EP}/assets/soundtrack.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -b:v 3800k -pass 2 -passlogfile $D/pass -pix_fmt yuv420p \
  -c:a aac -b:a 192k -shortest -movflags +faststart output/andai_ep${EP}_9x16.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact output/andai_ep${EP}_9x16.mp4
