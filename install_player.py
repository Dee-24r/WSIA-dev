"""Run inside a clone of WSIA-dev after copying wsia-player.js/css alongside it."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent
files = sorted(ROOT.glob('*.html'))
if not files:
    raise SystemExit('No HTML pages found. Copy the add-on files into the WSIA-dev root before running.')
for file in files:
    s = file.read_text(encoding='utf-8')
    if 'wsia-player.js' not in s:
        s = s.replace('</body>', '<script src="wsia-player.js" defer></script>\n</body>')
    if 'wsia-player.css' not in s:
        s = s.replace('</head>', '<link rel="stylesheet" href="wsia-player.css">\n</head>')
    file.write_text(s, encoding='utf-8')
    print('Integrated:', file.name)
print('Finished. Set STREAM_URL in wsia-player.js and serve using http://localhost, not file://')
