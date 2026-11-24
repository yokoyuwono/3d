#!/usr/bin/env bash
# Combine the rendered video with the soundtrack -> output/gempa_tsunami_9x16.mp4
set -e
cd "$(dirname "$0")/.."
mkdir -p output
ffmpeg -y -loglevel error -i build/video_noaudio.mp4 -i assets/soundtrack.wav -map 0:v -map 1:a \
  -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart output/gempa_tsunami_9x16.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate -of compact output/gempa_tsunami_9x16.mp4
