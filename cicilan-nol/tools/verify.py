"""Transcribe each narration line (voice/lines/*.wav) with Gemini to check the batch was cut in the right places.
Usage: python3 tools/verify.py [id,id,...]"""
import sys, json, base64, urllib.request, os, time
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
L = json.load(open(os.path.join(HERE, 'voice', 'narration.json')))
only = set(sys.argv[1].split(',')) if len(sys.argv) > 1 else None
for l in L:
    if only and l['id'] not in only: continue
    b = base64.b64encode(open(os.path.join(HERE, 'voice', 'lines', l['id'] + '.wav'), 'rb').read()).decode()
    body = {"contents": [{"parts": [{"inline_data": {"mime_type": "audio/wav", "data": b}}, {"text": "Transcribe this Indonesian audio verbatim. Output only the words."}]}]}
    r = None
    for k in range(4):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/" + os.environ.get("VMODEL", "gemini-3.5-transcribe") + ":generateContent", json.dumps(body).encode(), {"Content-Type": "application/json"}), timeout=60)); break
        except Exception as e: print('   retry:', str(e)[:80], flush=True); time.sleep(20)
    if r is None: print(l['id'], '| FAILED'); continue
    print(f"{l['id']} | {r['candidates'][0]['content']['parts'][0]['text'].strip()}\n    | {l['text']}", flush=True)
    time.sleep(12)
