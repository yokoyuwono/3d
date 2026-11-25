"""Retention check for an episode: flags shots that hold too long (no new picture), the hook timing,
and long stretches without a 'pattern interrupt' (cut). Usage: python3 tools/retention.py build/<ep>_events.json [max_shot_s]"""
import json, sys
ev = json.load(open(sys.argv[1])); mx = float(sys.argv[2]) if len(sys.argv) > 2 else 6.0
sh = ev['shots'] + [ev['duration']]
lens = [(round(sh[i], 1), round(sh[i + 1] - sh[i], 1)) for i in range(len(sh) - 1)]
long = [x for x in lens if x[1] > mx and x[0] < ev.get('end', ev['duration'])]
print(f"duration {ev['duration']}s, {len(lens)} shots, mean {sum(l for _, l in lens) / len(lens):.1f}s, first cut after hook at {sh[4] if len(sh) > 4 else '?'}s")
print('shots longer than', mx, 's:', long or 'none')
