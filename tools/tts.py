"""Synthesize narration offline with an Indonesian Piper voice, sentence by sentence,
and write exact sentence timings (for captions) to build/voice/timing.json.
Usage: python3 tools/tts.py <voice.onnx> <narration.json> <out_dir> [length_scale]"""
import json, sys, os, re, wave
import numpy as np
from piper import PiperVoice, SynthesisConfig

onnx, nar_path, out_dir = sys.argv[1:4]
ls = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
voice = PiperVoice.load(onnx)
cfg = SynthesisConfig(length_scale=ls, noise_scale=0.6, noise_w_scale=0.7)
SR = voice.config.sample_rate
GAP = 0.22  # pause between sentences (s)
os.makedirs(out_dir, exist_ok=True)
timing = []
for s in json.load(open(nar_path)):
    sentences = [x.strip() for x in re.findall(r'[^.!?]+[.!?]?', s['text']) if x.strip()]
    pieces, t, sents = [], 0.0, []
    for sent in sentences:
        audio = np.concatenate([c.audio_float_array for c in voice.synthesize(sent, syn_config=cfg)])
        # trim leading/trailing near-silence so timings are tight
        nz = np.where(np.abs(audio) > 0.01)[0]
        audio = audio[max(0, nz[0] - 200): nz[-1] + 400] if len(nz) else audio
        d = len(audio) / SR
        sents.append({"text": sent, "start": round(s['start'] + t, 3), "end": round(s['start'] + t + d, 3)})
        pieces += [audio, np.zeros(int(GAP * SR), np.float32)]
        t += d + GAP
    x = np.concatenate(pieces[:-1])
    with wave.open(os.path.join(out_dir, f"seg{s['id']}.wav"), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes())
    d = len(x) / SR
    print(f"seg{s['id']}: start {s['start']:5.1f}  dur {d:5.2f}  end {s['start']+d:5.2f}")
    timing.append({"id": s['id'], "start": s['start'], "dur": round(d, 3), "sentences": sents})
json.dump(timing, open(os.path.join(out_dir, 'timing.json'), 'w'), ensure_ascii=False, indent=1)
