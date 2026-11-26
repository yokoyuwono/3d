// subtitles_id.srt cues from timeline.json, with the same text the picture burns in (film.js subText)
import { readFileSync, writeFileSync } from 'fs';
const HERE = new URL('..', import.meta.url).pathname;
const TL = JSON.parse(readFileSync(HERE + 'timeline.json', 'utf8'));
const src = readFileSync(HERE + 'film.js', 'utf8');
const body = src.match(/export function subText\(v\) \{ (return [^\n]*) \}/)[1];
const subText = new Function('v', body);
const cues = TL.voice.map(v => ({ t0: v.t0, t1: +Math.max(v.t1 + .6, v.t0 + 1.8).toFixed(3), text: subText(v) }));
for (let i = 0; i < cues.length - 1; i++) cues[i].t1 = Math.min(cues[i].t1, cues[i + 1].t0 - .05);
writeFileSync(HERE + 'out/cues.json', JSON.stringify(cues, null, 1));
