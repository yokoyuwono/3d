"""Rebuild the full batch take from voice/lines (contiguous slices), ask gemini-3.8-flash where each line ends,
then cut again with tools/cut_at.py (snaps to pauses). No TTS request is used. Check the result with tools/verify.py."""
import json, os, sys, base64, io, urllib.request, subprocess
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = json.load(open(os.path.join(HERE, 'voice', 'narration.json')))
p = os.path.join(HERE, 'voice', 'full_take.wav')
if not os.path.exists(p):        # keep the first rebuild: later runs must not rebuild from already-recut lines
    xs = []; sr = None
    for l in L: x, sr = sf.read(os.path.join(HERE, 'voice', 'lines', l['id'] + '.wav'), dtype='float32'); xs.append(x)
    sf.write(p, np.concatenate(xs), sr, subtype='PCM_16')
full, sr = sf.read(p, dtype='float32')
script = "\n".join(f"{i + 1}. {l['text']}" for i, l in enumerate(L))
prompt = (f"The audio is a narrator reading these {len(L)} numbered lines in order:\n{script}\n\nFor each line, give the time in seconds "
          f"(two decimals, from the start of the audio) when the narrator FINISHES saying it. Reply with JSON only: a list of {len(L)} numbers.")
body = {"contents": [{"parts": [{"inline_data": {"mime_type": "audio/wav", "data": base64.b64encode(open(p, 'rb').read()).decode()}}, {"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}}
import time
for k in range(5):
    try: d = json.load(urllib.request.urlopen(urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', json.dumps(body).encode(), {'Content-Type': 'application/json'}), timeout=600)); break
    except Exception as e: print('retry', e); time.sleep(20 * (k + 1))
else: sys.exit('align failed')
ends = json.loads(d['candidates'][0]['content']['parts'][-1]['text'])
print('take', round(len(full) / sr, 2), 's · ends', ends)
subprocess.run([sys.executable, os.path.join(HERE, 'tools', 'cut_at.py'), p] + [str(e) for e in ends[:-1]], env={**os.environ, 'VERIFY': 'none'})
