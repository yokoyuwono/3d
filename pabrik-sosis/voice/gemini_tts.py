#!/usr/bin/env python3
"""Generate narration lines with Gemini TTS.
Usage: gemini_tts.py <narration.json> <outdir> <voice> [id ...]
The API key is added by the environment's network proxy (header x-goog-api-key)."""
import base64, json, os, sys, time, urllib.request, urllib.error
src, outdir, voice = sys.argv[1], sys.argv[2], sys.argv[3]
only = set(sys.argv[4:])
lines = json.load(open(src))
os.makedirs(outdir, exist_ok=True)
URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
for ln in lines:
    if only and ln["id"] not in only: continue
    out = os.path.join(outdir, ln["id"] + ".wav")
    if os.path.exists(out) and not only: continue
    item = {"type": "text", "text": ln["text"]}
    if ln.get("style"):
        item["annotations"] = [{"type": "speech_metadata", "style": ln["style"]}]
    body = {"model": os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts"),
            "input": [{"type": "user_input", "content": [item]}],
            "response_format": {"type": "audio"},
            "generation_config": {"speech_config": [{"voice": voice}]}}
    for attempt in range(6):
        req = urllib.request.Request(URL, json.dumps(body).encode(), {"Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=120))
            if isinstance(d, list): d = d[0]
            audio = [c for s in d["steps"] for c in s.get("content", []) if c.get("type") == "audio"]
            open(out, "wb").write(base64.b64decode(audio[-1]["data"]))
            print("ok", ln["id"]); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code == 429 or e.code >= 500:
                wait = 20 * (attempt + 1); print("retry", ln["id"], e.code, "in", wait, "s"); time.sleep(wait)
            else:
                sys.exit(f"error {ln['id']}: {e.code} {msg}")
    else:
        sys.exit(f"gave up on {ln['id']}")
