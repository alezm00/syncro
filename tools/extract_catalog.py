#!/usr/bin/env python3
"""Estrae dal catalogo Syncro (PDF) l'elenco articoli per la scheda "Catalogo" -> catalog-full.js.
Uso: python3 tools/extract_catalog.py Catalogo.pdf [prima_pagina ultima_pagina]   (pagine del visualizzatore PDF)
Risultato indicativo: il testo dei PDF impaginati e' ambiguo, controllare sempre sulla pagina (img/p-NNN.jpg)."""
import re, subprocess, sys, json, collections

pdf = sys.argv[1]
first, last = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (24, 244)

# sezioni dall'indice del catalogo: (pagina stampata, titolo); pagina PDF = stampata + 2
TOC = [(22, 'Pianali e pannellature'), (38, 'Valigette'), (54, 'Fianchi'), (60, 'Angolari'), (66, 'Cassetti'), (80, 'Cassettiere con cassetti trasparenti'),
       (92, 'Armadi'), (98, 'Scaffali'), (108, 'Ripiani aperti'), (116, 'Ripiani con contenitori in plastica'), (122, 'Antine'), (132, 'Grondaie allungabili'),
       (134, 'Ripiani inox raccolta liquidi'), (135, 'Pannelli di copertura'), (136, 'Fermavaligie'), (141, 'Rinforzi'), (144, 'Ripiani di lavoro'),
       (148, 'Morse e portamorsa'), (156, 'Ripiani richiudibili'), (157, 'Cassettiere sottopianale Pick up'), (158, 'Cassettiere con cassetti lunghi'),
       (160, 'Soluzioni sottopianale cassetti lunghi'), (164, 'Accessori'), (215, 'Slitta Pickup'), (216, 'Bauli metallici'), (217, 'Carrello Syncro Trolley'),
       (220, 'Barre per capi appesi'), (222, 'Verande e tendalini'), (224, 'Portascale e portatutto'), (236, 'Rampe di carico')]
SECT = [(p + 2, t) for p, t in TOC]
def section(page):
    cur = None
    for p, t in SECT:
        if page >= p: cur = t
    return cur
HDR = re.compile(r'Codice|Art\.?\s?Nr|misura|Maße|Beschreibung|descrizione|Dimension|Anzahl|Nr\. ', re.I)

CODE = re.compile(r'(?<![\w./-])((?:[A-Z]{2,5}\d{3,}[A-Z0-9]*(?:[./-][A-Z0-9]+)*)|(?:[A-Z]{2,4}[-/][A-Z0-9]{2,}(?:[./-][A-Z0-9]+)*)|(?:Z\d{4}[A-Z0-9]*))(?![\w])')
DIM = re.compile(r'(\d{1,2}[.]\d{3}|\d{1,4})\s*[xX]\s*(\d{1,2}[.]\d{3}|\d{1,4})(?:\s*[xX]\s*(\d{1,2}[.]\d{3}|\d{1,4}))?')
BAD = {'KING', 'ISO', 'GS', 'ECOFLOW'}
def num(s): return int(s.replace('.', ''))

entries, seen = [], set()
for page in range(first, last + 1):
    txt = subprocess.run(['pdftotext', '-f', str(page), '-l', str(page), '-layout', pdf, '-'], capture_output=True, text=True).stdout
    lines = [l.rstrip() for l in txt.splitlines() if l.strip()]
    title = next((re.sub(r'\s+', ' ', l).strip().split(' / ')[0] for l in lines if not re.match(r'\s*(Per i codici|Für nicht|GLI SPECIALISTI|ALLESTIMENTI|DIE SPEZIALISTEN|FAHRZEUG|\d+\s+100\.000)', l) and len(l.strip()) > 4), '')
    prev = heading = ''
    for l in lines:
        if HDR.search(l) and not CODE.search(l):
            heading = prev; continue
        ms = [m for m in CODE.finditer(l) if m.group(1) not in BAD and not re.fullmatch(r'(19|20)\d\d', m.group(1))]
        if not ms:
            s = re.sub(r'\s+', ' ', l).strip()
            if 6 < len(s) < 90 and not DIM.fullmatch(s) and not HDR.search(s): prev = s.split(' / ')[0]
            continue
        for k, m in enumerate(ms):
            seg = l[m.end(): ms[k + 1].start() if k + 1 < len(ms) else len(l)]
            d = DIM.search(seg)
            dims = None
            if d:
                dims = [num(x) for x in d.groups() if x]
            desc = re.sub(r'\s+', ' ', DIM.sub('', seg)).strip(' -/|')
            desc = desc.split(' / ')[0][:80]
            key = (m.group(1), page)
            if key in seen: continue
            seen.add(key)
            e = {'c': m.group(1), 'p': page, 's': section(page)}
            if dims: e['m'] = dims
            e['d'] = desc if re.search(r'[A-Za-z]{3}.*[A-Za-z]{3}', desc) and not HDR.search(desc) else (heading or prev or title)[:80]
            entries.append(e)
secs = [t for _, t in SECT]
by = collections.Counter(e['s'] for e in entries)
print(len(entries), 'articoli;', {s: by[s] for s in secs}, file=sys.stderr)
out = 'window.CATALL = ' + json.dumps({'sec': [[t, p, (SECT[i + 1][0] - 1 if i + 1 < len(SECT) else last)] for i, (p, t) in enumerate(SECT)], 'items': [[e['c'], e['d'], e.get('m'), e['p'], secs.index(e['s']) if e['s'] in secs else -1] for e in entries]}, separators=(',', ':'), ensure_ascii=False) + ';\n'
open('catalog-full.js', 'w').write('// generato da tools/extract_catalog.py: [codice, descrizione, misure[l,h,p], pagina PDF, sezione]\n' + out)
print(len(out), 'byte', file=sys.stderr)
