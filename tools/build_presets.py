#!/usr/bin/env python3
"""Genera i modelli di allestimento (PRESETS) di index.html a partire da catalog.js, scegliendo solo combinazioni valide a catalogo.
Uso: python3 tools/build_presets.py   (riscrive la riga 'const PRESETS = ...' in index.html)
Coordinate in L1 (z dalla paratia); r=1 = ancorato al retro/passaruota: in L2 si sposta di +400 mm."""
import json, re, statistics

t = open('catalog.js').read()
CAT = json.loads(t[t.index('window.CAT = ') + 13:t.rindex(';')])
KSI, KDW, XOS = set(CAT['ksi']), set(CAT['kdw']), set(CAT['xos'])
p2 = lambda n: f'{n:02d}'

VAS = {'b': (2, ('XDS', 'KDS')), 'a': (5, ('XDS', 'KDS')), 'p': (5, ('KCP',)), 't': (2, ('KHS',))}
FV = {'a': (7, 16), 'b': (9, 21), 'c': (13, 16), 'd': (5, 11), 'e': (9, 11)}
H_MAX = 1267

def hh_ok(wi, di):
    return sorted({int(c[1:3]) for c in KSI if int(c[0]) == wi and int(c[3:5]) == di and int(c[1:3]) * 36 <= H_MAX})

def opts(wi, di, it):
    t, r = it['t'], {}
    if t == 'v':
        hh, fam = VAS[it['a']]
        for c in CAT['vas']:
            if c[:3] in fam and int(c[3]) == wi and int(c[4:6]) == hh and int(c[6:8]) == di: r[int(c[11:])] = c
    elif t == 'x':
        for c in CAT['kd']:
            if int(c[0]) == wi and int(c[1:3]) == it['a'] and int(c[3:5]) == it['b']: r[int(c[7:9])] = c
    elif t in 'fl':
        hh, dd = (it['a'], 11) if t == 'l' else FV[it['a']]
        for c in CAT['kfd']:
            if int(c[0]) == (1 if t == 'l' else wi) and int(c[1:3]) == hh and int(c[3:5]) == dd: r[int(c[8:10])] = c
    return r

def pick(o, how):
    ks = sorted(o)
    if not ks: raise SystemExit('nessuna opzione')
    if how == 'max': return ks[-1]
    if how == 'min': return ks[0]
    if how == 'mid': return ks[len(ks) // 2]
    return min(ks, key=lambda k: abs(k - how))

def hi_of(it):
    t = it['t']
    return {'s': 1, 'd': it.get('hi'), 'x': it.get('a'), 'l': it.get('a')}.get(t) or (VAS[it['a']][0] if t == 'v' else FV[it['a']][0] if t == 'f' else {'a': 3, 'b': 4, 'c': 5, 'd': 3}[it['a']])

def mod(side, z, y, wi, di, hh, specs, r=0):
    """specs dal basso verso l'alto: ('v','a',n_divisori) ('x',altezza,prof,n) ('f',var,n) ('s',crates) ('d',hi) ('c',var) ('g',passi_vuoti)"""
    assert hh in hh_ok(wi, di), f'fianchi {wi} {di} {hh}'
    items, p, pend = [], 0, 0
    for sp in specs:
        k = sp[0]
        p += pend; pend = 0   # altezza libera sopra un ripiano con contenitori: serve solo se sopra c'e' altro
        if k == 'g': p += sp[1]; continue
        it = {'v': lambda: {'t': 'v', 'a': sp[1]}, 'x': lambda: {'t': 'x', 'a': sp[1], 'b': sp[2]}, 'f': lambda: {'t': 'f', 'a': sp[1]},
              's': lambda: {'t': 's'}, 'd': lambda: {'t': 'd', 'hi': sp[1]}, 'c': lambda: {'t': 'c', 'a': sp[1]}}[k]()
        if k in 'vxf':
            o = opts(wi, di, it); assert o, f'senza opzioni {it} wi{wi} di{di}'
            it['o'] = pick(o, sp[-1] if isinstance(sp[-1], (int, str)) and not (k == 'f' and sp[-1] == it['a']) else 'mid')
        if k == 's' and sp[1]: it['c'] = 1
        if k == 'd': assert f'{wi}{p2(sp[1])}{di}' in KDW, f'KDW {wi} {sp[1]} {di}'
        it['p'] = p; hi = hi_of(it); p += hi; pend = 5 if k == 's' and sp[1] else 0
        items.append(it)
    assert p <= hh, f'altezza {p}>{hh} in {specs}'
    m = {'side': side, 'z': z, 'y': y, 'wi': wi, 'di': di, 'hh': hh, 'items': items}
    if r: m['r'] = 1
    return m

def obj(desc, side, z, w, h, d, y=0, r=1): return {'custom': True, 'code': 'ATTREZZATURA', 'desc': desc, 'side': side, 'z': z, 'y': y, 'w': w, 'h': h, 'd': d, **({'r': 1} if r else {})}
def cobj(code, desc, page, side, z, w, h, d, r=1): return {'code': code, 'desc': desc, 'page': page, 'side': side, 'z': z, 'y': 0, 'w': w, 'h': h, 'd': d, **({'r': 1} if r else {})}

BOMBOLA = lambda side, z: obj('Bombola refrigerante 11 kg (diametro 230)', side, z, 230, 650, 230)
AZOTO = lambda side, z: obj('Bombola azoto 8 l (diametro 160)', side, z, 160, 620, 160)
RECUP = lambda side, z: obj('Recuperatore di refrigerante', side, z, 380, 360, 300)
ROTOLI = lambda side, z: obj('Rotoli di tubo rame isolato', side, z, 420, 420, 420)
CALDAIA = lambda side, z: obj('Caldaia murale di sostituzione (trasporto)', side, z, 420, 720, 330)
BOBINA = lambda side, z: obj('Avvolgicavo / bobina cavo', side, z, 350, 300, 350)
ASPIR = lambda side, z: obj('Aspiratore solidi/liquidi 25 l', side, z, 350, 520, 350)
ARMADIO = lambda side, z: cobj('KCU22131', 'Armadio vuoto 507x756x310 (strumenti e documenti)', 97, side, z, 507, 756, 310)

def x(code, desc, page, n=1): return {'code': code, 'desc': desc, 'page': page, 'n': n}
EXT = {
 'est': x('PT-EST/C', 'Porta estintore universale con omega di fissaggio', 184), 'rot': x('PC250E', 'Porta rotolo di carta in metallo con rotolo da 230 mm', 209),
 'faro': x('FAOR-LED', 'Faro orientabile a led con base magnetica', 201), 'lamp': x('MVL830300', 'Lampada led ricaricabile', 202),
 'rail': x('ROTAL1250', 'Rotaia in alluminio airline per cinghie, L. 1250 mm', 176, 2), 'cin': x('CIN/25A', 'Coppia cinghie h. 25 mm con ganci per rotaia fresata (per le bombole)', 178, 2),
 'vice': x('XVS40136', 'Portamorsa a sfilare 1014x36x360 (nel posto riservato in un modulo)', 153), 'barra': x('KCB00001M900', 'Barra in alluminio L. 900 con molle porta utensili h. 49', 174),
 'gnc': x('GNC-UNI', 'Gancio in ferro regolabile P 140-190 mm', 184, 2), 'aga': x('AGA00004', 'Gancio per piccoli oggetti e cinghia a sgancio rapido', 184, 4),
 'inv': x('INV1000.OS', 'Inverter onda sinusoidale pura 1.000 W 12 V', 194), 'inv600': x('INV600.OS', 'Inverter onda sinusoidale pura 600 W 12 V', 194),
 'scala': x('PS.SFT-1800', 'Porta scala a soffitto L. 1.800 mm (verificare compatibilita col Custom)', 237),
}
BASE = ['est', 'rot', 'faro']
SAFE_GAS = 'Le bombole di refrigeranti infiammabili (es. R32) vanno trasportate in piedi, ancorate e con ventilazione: verifica le norme di trasporto (ADR) e il carico utile.'
ROOF = 'Scala e tubi lunghi sul tetto non sono nel modello (servono barre portapacchi/portascale per il Custom, catalogo pag. 226-235: codici da verificare col rivenditore).'
PESO = 'I pesi non sono calcolati: tieni in basso le parti pesanti e verifica il carico utile.'

# colonna anteriore sinistra, dal pavimento (0-1022 mm): la piu comoda dalla porta scorrevole
def P(name, grp, mods, objs, ext, note, extra_n=None):
    return {'name': name, 'grp': grp, 'note': note, 'mods': mods, 'objs': objs, 'extra': [EXT[k] if isinstance(k, str) else k for k in ext]}

PRESETS = {}

PRESETS['misto'] = P('Manutentore misto: caldaie, clima, elettrico', 'Misto', [
  mod('L', 0, 0, 4, 36, 34, [('v', 'a', 4), ('v', 'a', 8), ('f', 'e', 8), ('x', 7, 26, 8), ('v', 'b', 4), ('s', True)]),
  mod('L', 1030, 350, 4, 36, 24, [('f', 'a'), ('v', 'a', 4), ('s', True), ('v', 'a', 8)], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('x', 7, 26, 4), ('v', 'a', 6), ('v', 'a', 4), ('f', 'a')], r=1)],
  [RECUP('L', 2090), BOMBOLA('R', 2090), BOMBOLA('R', 2335)], BASE + ['rail', 'cin', 'vice', 'barra', 'gnc', 'aga', 'inv'],
  ['<b>Sinistra, colonna anteriore</b> (0-1022 mm dalla paratia): ricambi caldaie in basso perche pesanti, raccorderia, minuteria e componenti elettrici in cassetti trasparenti; si raggiunge dalla porta scorrevole. Sopra il passaruota (350 mm da terra) un secondo modulo.',
   '<b>Destra</b>: i primi 1130 mm restano liberi (porta scorrevole); modulo sospeso sopra il passaruota. <b>Retro</b>: recuperatore a sinistra, due bombole a destra da fissare con cinghie su rotaia.', SAFE_GAS, ROOF + ' ' + PESO])

PRESETS['caldaie-man'] = P('Caldaie: manutenzione programmata e riparazioni', 'Caldaie', [
  mod('L', 0, 0, 4, 41, 34, [('v', 'a', 4), ('v', 'a', 4), ('f', 'e', 8), ('x', 7, 26, 'mid'), ('v', 'b', 4), ('s', True)]),
  mod('L', 1030, 350, 4, 41, 24, [('f', 'a'), ('v', 'a', 4), ('s', True), ('v', 'a', 8)], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('x', 7, 26, 4), ('f', 'b'), ('v', 'a', 4), ('v', 'b', 4)], r=1),
  mod('L', 2085, 0, 2, 41, 32, [('v', 'a', 2)] * 6 + [('v', 'b', 2)], r=1)],
  [CALDAIA('R', 2090)], BASE + ['vice', 'barra', 'aga', 'gnc', 'inv'],
  ['Per chi fa soprattutto <b>assistenza e manutenzione caldaie</b>. Colonna anteriore sinistra con ricambi pesanti (circolatori, valvole gas, scambiatori) in basso, minuteria e ricambi elettrici (sonde, elettrodi, schede) in cassetti trasparenti, contenitori Euronorm per raccordi e guarnizioni.',
   'Colonna posteriore sinistra con vasche profonde per i pezzi piu ingombranti (vasi di espansione, scambiatori). A destra il modulo sospeso sopra il passaruota; dietro la porta scorrevole resta libero. Sul pianale posteriore destro c\'e posto per una caldaia di sostituzione.', 'Un posto da 36 mm in cima al primo modulo e riservato al portamorsa XVS40136. ' + PESO])

PRESETS['caldaie-pi'] = P('Caldaie: pronto intervento (compatto, carico leggero)', 'Caldaie', [
  mod('L', 0, 0, 3, 36, 34, [('v', 'a', 4), ('v', 'a', 4), ('f', 'e', 8), ('x', 7, 26, 'mid'), ('s', True), ('v', 'b', 4)]),
  mod('L', 1030, 350, 3, 36, 24, [('f', 'a'), ('v', 'a', 4), ('x', 7, 26, 4), ('v', 'a', 4)], r=1)],
  [CALDAIA('R', 2090)], BASE + ['aga', 'inv600'],
  ['Per il <b>pronto intervento</b> con un carico leggero e il pianale libero: una sola colonna a sinistra piu un modulo sospeso, nulla sul lato destro.',
   'Tieni a bordo i ricambi che si usano piu spesso (circolatori, sonde, elettrodi, schede, guarnizioni) e la minuteria. Il pianale posteriore destro e libero per una caldaia di sostituzione. ' + PESO])

PRESETS['caldaie-inst'] = P('Caldaie: installazione e sostituzione (idraulico-termico)', 'Caldaie', [
  mod('L', 0, 0, 4, 41, 34, [('v', 'a', 4), ('v', 'a', 4), ('v', 'a', 8), ('f', 'b', 4), ('x', 7, 26, 8), ('v', 'b', 4)]),
  mod('L', 1030, 350, 4, 36, 24, [('s', True), ('v', 'a', 4), ('s', True), ('f', 'd', 8)], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('f', 'b'), ('v', 'a', 4), ('v', 'a', 4), ('x', 4, 26, 'mid')], r=1)],
  [CALDAIA('L', 2090), obj('Rotoli di tubo multistrato/rame (2 rotoli)', 'R', 2090, 450, 400, 450)], BASE + ['vice', 'barra', 'aga', 'gnc', 'inv', 'scala'],
  ['Per <b>installare e sostituire caldaie</b>: tanti raccordi, valvole e tubazioni. La colonna anteriore ha vasche alte profonde 410 mm per raccorderia e valvole, cassettiere per minuteria e componenti elettrici; i moduli sopra il passaruota hanno contenitori Euronorm per i raccordi piccoli.',
   'Sul pianale posteriore: a sinistra una caldaia murale in trasporto, a destra i rotoli di tubo. Le barre rigide (3 m) vanno sul tetto con il portatubi. ' + ROOF + ' ' + PESO])

PRESETS['clima-man'] = P('Clima: manutenzione e ricarica gas', 'Climatizzazione', [
  mod('L', 0, 0, 4, 36, 34, [('v', 'a', 4), ('v', 'a', 4), ('f', 'a'), ('x', 7, 26, 'mid'), ('v', 'a', 8), ('v', 'b', 4), ('v', 'b', 4)]),
  mod('L', 1030, 350, 4, 36, 24, [('f', 'b'), ('v', 'a', 4), ('s', True), ('v', 'b', 2)], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('x', 7, 26, 4), ('f', 'a'), ('v', 'a', 4), ('v', 'a', 4)], r=1)],
  [RECUP('L', 2090), BOMBOLA('R', 2090), BOMBOLA('R', 2335)], BASE + ['rail', 'cin', 'aga', 'gnc', 'inv', 'barra'],
  ['Per <b>manutenzione e ricarica gas</b> dei climatizzatori. La vasca bassa della colonna anteriore tiene manometri e flessibili; pompa del vuoto e bilancia nelle vasche alte. Cassettiere per staffe, viti, condense, pulizia filtri e ricambi elettrici.',
   'Sul retro il recuperatore (sinistra) e due bombole (destra) da fissare con le cinghie sulla rotaia: misure indicative, correggile.', SAFE_GAS, ROOF + ' ' + PESO])

PRESETS['clima-rapido'] = P('Clima: assistenza rapida su split domestici (compatto)', 'Climatizzazione', [
  mod('L', 0, 0, 3, 36, 34, [('v', 'a', 4), ('f', 'a'), ('x', 7, 26, 'mid'), ('v', 'a', 4), ('v', 'b', 4), ('s', True), ('v', 'b', 2)]),
  mod('L', 1030, 350, 3, 36, 24, [('f', 'b'), ('v', 'a', 4), ('x', 7, 26, 4), ('v', 'b', 2)], r=1)],
  [BOMBOLA('R', 2090), RECUP('L', 2090)], BASE + ['rail', 'cin', 'aga'],
  ['Per <b>assistenza rapida su split domestici</b>: una colonna anteriore stretta, un modulo sopra il passaruota, una bombola e il recuperatore dietro. Il lato destro resta libero e si carica facilmente.',
   'Aggiungi una seconda bombola o il modulo destro se lavori su piu gas.', SAFE_GAS + ' ' + PESO])

PRESETS['clima-inst'] = P('Clima: installazione split e multisplit', 'Climatizzazione', [
  mod('L', 0, 0, 4, 41, 34, [('v', 'a', 4), ('v', 'a', 8), ('f', 'b'), ('x', 7, 26, 'mid'), ('v', 'a', 4), ('v', 'b', 4)]),
  mod('L', 1030, 350, 4, 36, 24, [('f', 'a'), ('s', True), ('v', 'a', 4), ('v', 'a', 8)], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('x', 7, 26, 4), ('v', 'a', 4), ('v', 'a', 4), ('f', 'a')], r=1)],
  [ROTOLI('L', 2090), AZOTO('R', 2090), obj('Valigia tassellatore e carotatrice', 'R', 2270, 160, 400, 420)], BASE + ['rail', 'cin', 'aga', 'gnc', 'barra', 'inv', 'scala'],
  ['Per <b>installare split e multisplit</b>: staffe, raccordi, fascette, cavi e minuteria nei moduli; rotoli di rame isolato a sinistra sul pianale posteriore; a destra una bombola di azoto per la prova di tenuta e la valigia con tassellatore e carotatrice. Le unita esterne e interne si consegnano a parte: per trasportarne una serve il pianale centrale (non previsto qui).',
   'Canaline, tubi lunghi e la scala vanno sul tetto o sotto il tetto (portascala interno 1.800 mm: verifica che entri nel Custom). ' + ROOF, SAFE_GAS + ' ' + PESO])

PRESETS['frigo'] = P('Frigorista: refrigerazione commerciale e VRF (carico pesante)', 'Climatizzazione', [
  mod('L', 0, 0, 4, 41, 34, [('v', 'a', 4), ('v', 'a', 4), ('v', 'a', 8), ('f', 'b'), ('x', 7, 26, 'mid'), ('v', 'b', 4)]),
  mod('L', 1030, 350, 4, 41, 24, [('v', 'a', 4), ('f', 'a'), ('s', True), ('v', 'a', 8)], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('x', 7, 26, 4), ('v', 'a', 4), ('v', 'a', 4), ('f', 'a')], r=1)],
  [RECUP('L', 2090), BOMBOLA('R', 2090), AZOTO('R', 2335)], BASE + ['rail', 'cin', 'vice', 'barra', 'aga', 'gnc', 'inv'],
  ['Per <b>refrigerazione commerciale e impianti VRF</b>: ricambi voluminosi (filtri deidratatori, valvole, pressostati) in vasche profonde 410 mm, cassettiere per minuteria e componenti elettrici. Sul retro recuperatore, una bombola di refrigerante e una di azoto.',
   'Il portamorsa XVS40136 occupa il posto riservato in cima al primo modulo. ' + SAFE_GAS + ' ' + ROOF + ' ' + PESO])

PRESETS['elettr-man'] = P('Elettricista: manutenzione impianti civili e industriali', 'Elettrico', [
  mod('L', 0, 0, 4, 36, 34, [('x', 7, 26, 8), ('x', 7, 26, 'mid'), ('f', 'e', 8), ('f', 'a'), ('v', 'b', 4), ('v', 'b', 4)]),
  mod('L', 1030, 350, 4, 36, 24, [('v', 'p', 4), ('v', 'p', 4), ('f', 'b'), ('x', 4, 26, 'mid')], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('x', 7, 26, 8), ('x', 7, 26, 'mid'), ('v', 'a', 4), ('v', 'b', 2)], r=1)],
  [ARMADIO('L', 2085), BOBINA('R', 2090)], BASE + ['inv', 'aga', 'gnc', 'barra', 'vice'],
  ['Per <b>manutenzione elettrica</b> con molti articoli piccoli: la colonna anteriore e quasi tutta cassetti trasparenti (morsetti, interruttori, fusibili, relè), con cassettiere ribaltabili per viti e tasselli e due vasche basse per strumenti di misura.',
   'Sopra il passaruota vasche con pannello posteriore per matasse di cavo e guaine. Sul retro un armadio chiuso per strumenti e documenti, e un avvolgicavo. Inverter a bordo per alimentare gli utensili.', 'Il portamorsa XVS40136 occupa il posto riservato in cima al primo modulo. ' + PESO])

PRESETS['elettr-pi'] = P('Elettricista: pronto intervento (compatto)', 'Elettrico', [
  mod('L', 0, 0, 3, 36, 34, [('x', 7, 26, 4), ('x', 7, 26, 'mid'), ('f', 'e', 8), ('v', 'a', 4), ('v', 'b', 4), ('s', True)]),
  mod('L', 1030, 350, 3, 36, 24, [('f', 'a'), ('v', 'p', 4), ('x', 7, 26, 4), ('v', 'b', 2)], r=1)],
  [BOBINA('R', 2090)], BASE + ['inv600', 'aga'],
  ['Per il <b>pronto intervento elettrico</b>: una colonna anteriore compatta con tre cassettiere per componenti e minuteria, un modulo sopra il passaruota per cavi e strumenti, pianale libero a destra con un avvolgicavo.',
   'E la base piu leggera per un furgone usato anche per altro: aggiungi i moduli di destra se ti serve piu spazio. ' + PESO])

PRESETS['elettr-cant'] = P('Elettricista: installazione e cantieri', 'Elettrico', [
  mod('L', 0, 0, 4, 41, 34, [('v', 'p', 4), ('v', 'p', 4), ('f', 'b'), ('x', 7, 26, 'mid'), ('s', True), ('v', 'b', 4)]),
  mod('L', 1030, 350, 4, 41, 24, [('v', 'a', 4), ('v', 'a', 4), ('s', True), ('x', 4, 26, 'mid')], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('f', 'b'), ('v', 'a', 4), ('x', 7, 26, 4), ('v', 'b', 2)], r=1)],
  [BOBINA('L', 2090), BOBINA('R', 2090), obj('Valigia trapano e tassellatore', 'R', 2450, 160, 400, 420)], BASE + ['inv', 'aga', 'gnc', 'barra', 'scala'],
  ['Per <b>impianti nuovi e cantieri</b>: vasche con pannello posteriore per matasse di cavo e corrugati, cassettiere per frutti, placche e scatole, contenitori Euronorm per viti e tasselli. Due avvolgicavi dietro e una valigia per trapano.',
   'Tubi corrugati lunghi, canaline e scala vanno sul tetto: ' + ROOF + ' ' + PESO])

PRESETS['multiservizi'] = P('Multiservizi per condomini ed edifici (tuttofare)', 'Misto', [
  mod('L', 0, 0, 4, 36, 34, [('x', 7, 26, 'mid'), ('f', 'e', 8), ('v', 'a', 4), ('v', 'a', 4), ('s', True), ('v', 'b', 2)]),
  mod('L', 1030, 350, 4, 36, 24, [('f', 'a'), ('v', 'a', 4), ('v', 'a', 4), ('x', 4, 26, 'mid')], r=1),
  mod('R', 1140, 350, 3, 36, 24, [('v', 'a', 4), ('v', 'a', 4), ('s', True), ('f', 'd', 8), ('v', 'b', 2)], r=1)],
  [ARMADIO('L', 2085), ASPIR('R', 2090)], BASE + ['vice', 'barra', 'aga', 'gnc', 'inv'],
  ['Per la <b>manutenzione di condomini ed edifici</b>: un po\' di idraulica, un po\' di elettrico, piccoli lavori. Moduli versatili con cassetti, vasche e contenitori; armadio chiuso per strumenti e un aspiratore solidi/liquidi sul pianale.',
   'Il portamorsa XVS40136 occupa il posto riservato in cima al primo modulo. ' + ROOF + ' ' + PESO])

# verifica interna di tutti i modelli
for k, p in PRESETS.items():
    for m in p['mods']:
        assert m['hh'] in hh_ok(m['wi'], m['di'])
        for it in m['items']:
            if it['t'] in 'vxfl': assert it['o'] in opts(m['wi'], m['di'], it), (k, it)
s = open('index.html').read()
i = s.index('const PRESETS = '); j = s.index(';\n', i)
s = s[:i] + 'const PRESETS = ' + json.dumps(PRESETS, ensure_ascii=False, separators=(',', ':')) + s[j:]
open('index.html', 'w').write(s)
print(len(PRESETS), 'modelli scritti')
