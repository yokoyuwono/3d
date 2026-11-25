"""Make an episode page from the shared template (s2e1.html) and a spec.
Usage: python3 tools/mkpage.py episodes/<ep>/page.py   (the spec file defines OUT, TITLE, BRAND, END_A, END_B, END_C,
BIG_S, SCRIPT, CSS, PANELS, TEASER)"""
import os, runpy, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
spec = runpy.run_path(sys.argv[1])
s = open(os.path.join(ROOT, 's2e1.html')).read()
a = s.index('  #vol {'); b = s.index('</style>')
teaser_css = s[s.index('  #teaser {'):b]
s = s[:a] + spec['CSS'] + teaser_css + s[b:]
a = s.index('<div class="ov" id="vol">'); b = s.index('<div class="ov" id="note">')
teaser = f'<div class="ov" id="teaser"><div class="a">EPISODE BERIKUTNYA</div><div class="b">{spec["TEASER"]}</div></div>\n  ' if spec.get('TEASER') else ''
s = s[:a] + spec['PANELS'] + '\n  ' + teaser + s[b:]
s = s.replace('<title>Andai Gunung Toba Meletus Lagi</title>', f'<title>{spec["TITLE"]}</title>')
s = s.replace('ANDAI… S2 · EP 1', spec['BRAND'])
s = s.replace('<div class="a">ANDAI… SEASON 2 · EPISODE 1</div><div class="b">Gunung Toba Meletus Lagi</div><div class="c">Berikutnya: Andai Bumi kehilangan oksigen 5 detik</div>',
              f'<div class="a">{spec["END_A"]}</div><div class="b">{spec["END_B"]}</div><div class="c">{spec["END_C"]}</div>')
s = s.replace('<div class="t">Andai Gunung Toba Meletus Lagi</div><div class="s">ANDAI… Season 2 · Episode 1 · nyalakan suara</div>',
              f'<div class="t">{spec["TITLE"]}</div><div class="s">{spec["BIG_S"]} · nyalakan suara</div>')
s = s.replace('./episodes/s2e1/main.js', spec['SCRIPT'])
open(os.path.join(ROOT, spec['OUT']), 'w').write(s)
print('wrote', spec['OUT'])
