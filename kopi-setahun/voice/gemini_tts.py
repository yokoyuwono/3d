#!/usr/bin/env python3
"""Gemini TTS with a free-first quota scheme.

Usage:
  gemini_tts.py <narration.json> <outdir> <voice> [--batch N] [--only id,id] [--model M] [--force]

How keys are used
- FREE key: saved as a network secret on the cloud environment (header x-goog-api-key, prefix empty);
  the proxy adds it to every request, so this script never sees it.
- PAID key (optional): environment variable GEMINI_PAID_API_KEY. It is only used after the free daily
  quota is exhausted; it is sent as ?key=… (which takes precedence over the header) and never printed.

How requests are saved
- --batch N puts up to N lines (each with its own style) into ONE request; the returned audio is cut
  back into one WAV per line at the pauses between lines. --batch 0 = the whole script in one request.
  One request per video means the free tier (10 requests/day for gemini-3.8-flash-tts) covers ~10 videos/day.
- Lines whose WAV already exists are skipped (use --force or --only to redo specific lines).
- --align: cut the batch at content-based line ends (a Gemini model reads the take), snapped to pauses; falls back to pauses.
- Every request is logged in <outdir>/../quota_log.json (date, model, tier, lines, seconds of audio)."""
import base64, io, json, os, sys, time, urllib.request, urllib.error, wave, datetime
import numpy as np

URL = 'https://generativelanguage.googleapis.com/v1beta/interactions'
args = sys.argv[1:]
def opt(name, default=None):
    if name in args: i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default
batch = int(opt('--batch', '1')); only = opt('--only'); model = opt('--model', 'gemini-3.8-flash-tts')
force = '--force' in args; args = [a for a in args if a != '--force']
resplit = '--resplit' in args; args = [a for a in args if a != '--resplit']
align = '--align' in args; args = [a for a in args if a != '--align']
src, outdir, voice = args[0], args[1], args[2]
PAID = os.environ.get('GEMINI_PAID_API_KEY', '').strip()
lines = json.load(open(src)); os.makedirs(outdir, exist_ok=True)
want = [l for l in lines if (only and l['id'] in only.split(',')) or (not only and (force or not os.path.exists(os.path.join(outdir, l['id'] + '.wav'))))]
LOG = os.path.join(os.path.dirname(os.path.abspath(outdir)), 'quota_log.json')
log = json.load(open(LOG)) if os.path.exists(LOG) else []
tier = 'free'

def request(items):
    """One TTS request for a list of lines → (wav bytes, tier used). Free first, paid on daily quota."""
    global tier
    content = [{'type': 'text', 'text': l['text'], **({'annotations': [{'type': 'speech_metadata', 'style': l['style']}]} if l.get('style') else {})} for l in items]
    body = json.dumps({'model': model, 'input': [{'type': 'user_input', 'content': content}], 'response_format': {'type': 'audio'},
                       'generation_config': {'speech_config': [{'voice': voice}]}}).encode()
    for attempt in range(6):
        url = URL + ('?key=' + PAID if tier == 'paid' else '')
        try:
            d = json.load(urllib.request.urlopen(urllib.request.Request(url, body, {'Content-Type': 'application/json'}), timeout=180))
            d = d[0] if isinstance(d, list) else d
            audio = [c for s in d['steps'] for c in s.get('content', []) if c.get('type') == 'audio']
            return base64.b64decode(audio[-1]['data'])
        except urllib.error.HTTPError as e:
            msg = e.read().decode(errors='replace')
            daily = e.code == 429 and ('per day' in msg or 'requests per day' in msg)
            if (daily or e.code == 402) and tier == 'free':
                if PAID: print(f'  free quota exhausted ({e.code}) → switching to the paid key'); tier = 'paid'; continue
                sys.exit(f'STOP: free daily quota for {model} is used up and no GEMINI_PAID_API_KEY is set.\n  {msg[:220]}')
            if e.code == 429 or e.code >= 500:
                w = 15 * (attempt + 1); print(f'  busy ({e.code}), retry in {w}s'); time.sleep(w); continue
            sys.exit(f'error {e.code}: {msg[:300]}')
    sys.exit('gave up after retries')

def pcm(b):
    w = wave.open(io.BytesIO(b)); sr = w.getframerate()
    return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768, sr
def write(path, x, sr):
    w = wave.open(path, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()

def align_cuts(x, sr, items):
    """Content-based cuts: ask a Gemini model when each line ends, then snap to the nearest pause. None on failure."""
    try:
        buf = io.BytesIO(); w = wave.open(buf, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
        script = "\n".join(f"{i + 1}. {l['text']}" for i, l in enumerate(items))
        prompt = (f"The audio is a narrator reading these {len(items)} numbered lines in order:\n" + script +
                  f"\n\nFor each line, give the time in seconds (two decimals, from the start of the audio) when the narrator FINISHES saying it. Reply with JSON only: a list of {len(items)} numbers.")
        body = {"contents": [{"parts": [{"inline_data": {"mime_type": "audio/wav", "data": base64.b64encode(buf.getvalue()).decode()}}, {"text": prompt}]}], "generationConfig": {"responseMimeType": "application/json"}}
        d = json.load(urllib.request.urlopen(urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent' + ('?key=' + PAID if tier == 'paid' else ''), json.dumps(body).encode(), {'Content-Type': 'application/json'}), timeout=180))
        ends = json.loads(d['candidates'][0]['content']['parts'][-1]['text'])[:len(items) - 1]
        env = np.convolve(np.abs(x), np.ones(480) / 480, 'same'); q = 20 * np.log10(np.maximum(env, 1e-6)) < -40
        gaps = []; i = 0
        while i < len(q):
            if q[i]:
                j = i
                while j < len(q) and q[j]: j += 1
                if (j - i) / sr >= .1: gaps.append((i + j) / 2 / sr)
                i = j
            else: i += 1
        cuts = [min(gaps, key=lambda g: abs(g - e)) for e in ends]
        if any(b <= a for a, b in zip(cuts, cuts[1:])): return None
        print('  aligned by content:', [round(c, 2) for c in cuts])
        return cuts
    except Exception as e:
        print('  align failed, falling back to pauses:', str(e)[:120]); return None

def split(x, sr, items):
    """Cut one batch take into len(items) lines. All cuts are chosen together (dynamic programming):
    prefer long pauses near where each line should end (by its share of the characters), in order."""
    n = len(items)
    if n == 1: return [x]
    if align and n > 2:
        cuts = align_cuts(x, sr, items)
        if cuts: edges = [0] + [int(c * sr) for c in cuts] + [len(x)]; return [x[edges[k]:edges[k + 1]] for k in range(n)]
    env = np.convolve(np.abs(x), np.ones(480) / 480, 'same'); quiet = 20 * np.log10(np.maximum(env, 1e-6)) < -40
    gaps = []; i = 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            if (j - i) / sr >= .12: gaps.append(((i + j) / 2 / sr, (j - i) / sr))
            i = j
        else: i += 1
    L = len(x) / sr; ch = np.cumsum([len(l['text']) for l in items]) / sum(len(l['text']) for l in items)
    G = len(gaps); K = n - 1
    if G < K: sys.exit('could not split the batch: too few pauses (try a smaller --batch)')
    def score(k, gi):   # cut k (0-based) placed at gap gi
        pos, dur = gaps[gi]; dev = (pos - ch[k] * L) / max(L, 1)
        return dur * 3.0 - (dev * 12) ** 2
    NEG = -1e18; best = [[NEG] * G for _ in range(K)]; prev = [[-1] * G for _ in range(K)]
    for gi in range(G): best[0][gi] = score(0, gi)
    for k in range(1, K):
        run, arg = NEG, -1
        for gi in range(G):
            if gi - 1 >= 0 and best[k - 1][gi - 1] > run: run, arg = best[k - 1][gi - 1], gi - 1
            if arg >= 0: best[k][gi] = run + score(k, gi); prev[k][gi] = arg
    gi = max(range(G), key=lambda q: best[K - 1][q]); cuts = []
    for k in range(K - 1, -1, -1): cuts.append(gaps[gi][0]); gi = prev[k][gi]
    cuts = cuts[::-1]
    edges = [0] + [int(c * sr) for c in cuts] + [len(x)]
    return [x[edges[k]:edges[k + 1]] for k in range(n)]

if resplit:   # re-cut existing lines (consecutive slices of one take) without a new request
    xs = []; sr = 24000
    for l in lines: y, sr = pcm(open(os.path.join(outdir, l['id'] + '.wav'), 'rb').read()); xs.append(y)
    parts = split(np.concatenate(xs), sr, lines)
    for l, p in zip(lines, parts): write(os.path.join(outdir, l['id'] + '.wav'), p, sr); print('ok', l['id'], f'{len(p) / sr:.2f}s')
    sys.exit(0)
groups = [want] if batch == 0 else [want[i:i + batch] for i in range(0, len(want), max(1, batch))]
for grp in groups:
    if not grp: continue
    b = request(grp); x, sr = pcm(b)
    parts = split(x, sr, grp)
    for l, p in zip(grp, parts): write(os.path.join(outdir, l['id'] + '.wav'), p, sr); print('ok', l['id'], f'{len(p) / sr:.2f}s')
    log.append({'date': datetime.date.today().isoformat(), 'model': model, 'tier': tier, 'lines': [l['id'] for l in grp], 'seconds': round(len(x) / sr, 2)})
    json.dump(log, open(LOG, 'w'), indent=1)
today = datetime.date.today().isoformat()
free_today = sum(1 for r in log if r['date'] == today and r['tier'] == 'free' and r['model'] == model)
paid_sec = sum(r['seconds'] for r in log if r['tier'] == 'paid')
print(f'requests today on the free tier ({model}): {free_today} · paid audio so far: {paid_sec:.0f}s ≈ ${paid_sec * 25 * 9e-6:.3f} (2026 rate)')
