#!/usr/bin/env python3
"""Rigenera catalog.js (codici validi per i componenti dei moduli) dal catalogo Syncro in PDF.
Uso: python3 tools/extract_codes.py Catalogo.pdf   (pagine del visualizzatore PDF)"""
import re, sys, json, subprocess

pdf = sys.argv[1]
def page(a, b): return subprocess.run(['pdftotext', '-f', str(a), '-l', str(b), '-layout', pdf, '-'], capture_output=True, text=True).stdout
def grab(txt, pat): return sorted(set(re.findall(pat, txt)))
p_ksi, p_xos, p_kdw, p_kdu, p_kfd, p_lat, p_vas, p_pan, p_kmh, p_kgu = page(55, 62), page(108, 112), page(72, 76), page(86, 86), page(91, 91), page(92, 92), page(102, 105), page(107, 107), page(141, 141), page(135, 135)
cat = {
 'ksi': [c[3:] for c in grab(p_ksi, r'\b(KSI\d{5})\b')],            # coppie di fianchi: larghezza, altezza (passi da 36), profondita
 'ysi': [c[3:] for c in grab(p_ksi, r'\b(YSI\d{5})\b')],            # fianchi singoli: altezza (3 cifre, passi da 36), profondita
 'xos': [c[3:] for c in grab(p_xos, r'\b(XOS\d{5})\b')],
 'kdw': [c[3:] for c in grab(p_kdw, r'\b(KDW\d{5})\b')],
 'kd': [c[3:] for c in grab(p_kdu, r'\b(KDU\d{5}KD\d{3})\b')],
 'kfd': sorted(set(c[3:] for c in grab(p_kfd, r'\b(KDU\d{5}KFD\d{2,4})\b')) | set(c[3:] for c in grab(p_lat, r'\b(KDU1\d{4}KFD\d{2,4})\b'))),
 'vas': grab(p_vas, r'\b((?:XDS|KDS|KCP|KHS)\d{5}KMD\d{2})\b'),
 'pan': grab(p_pan, r'\b((?:XCP|XSP)\d{5})\b'),
 'kmh': grab(p_kmh, r'\b(KMH\d{5})\b'),                              # fermavaligie con cinghia (barra Syncroblock)
}
old = {}
try:
    t = open('catalog.js').read(); old = json.loads(t[t.index('window.CAT = ') + 13:t.rindex(';')])
except Exception: pass
for k, v in cat.items(): print(k, len(v), '(prima: %s)' % (len(old[k]) if k in old else '-'), 'UGUALE' if old.get(k) == v else 'diverso' if k in old else 'nuovo')
head = '// codici validi dal catalogo Syncro 26-1 (PDF p. 55-62 fianchi KSI/YSI, 72-76 cassetti KDW, 86 cassettiere KDU...KD, 91-92 ribaltabili e laterali KDU...KFD, 102-105 vasche, 107 pannelli, 108-112 ripiani XOS, 141 fermavaligie KMH)\n// generato da tools/extract_codes.py; formato: codice senza prefisso famiglia (ksi, ysi, xos, kdw, kd, kfd) oppure completo (vas, pan, kmh)\n'
open('catalog.js', 'w').write(head + 'window.CAT = ' + json.dumps(cat, separators=(',', ':')) + ';\n')
