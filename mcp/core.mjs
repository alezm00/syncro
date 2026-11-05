// Nucleo del configuratore Syncro senza browser: stesse regole di ../index.html (catalogo, fianchi sovrapposti,
// collisioni, corridoio, passaruota, porta scorrevole, distinta). Usato dal server MCP (server.mjs).
// Se cambi una regola in index.html, riportala qui (vedi docs/architettura.md).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loadWindow = f => { const w = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), { window: w }); return w; };

export const CAT = loadWindow('catalog.js').CAT;
export const CATALL = loadWindow('catalog-full.js').CATALL;
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const presetLine = html.split('\n').find(l => l.startsWith('const PRESETS = '));
export const PRESETS = JSON.parse(presetLine.slice(presetLine.indexOf('=') + 1).trim().replace(/;$/, ''));

export const LEN = { L1: 2470, L2: 2870 }, HGT = { H1: 1267 }, W = 1777;
export const ARCH = { z1: 1200, l: 880, in: 207 };
const ARCH_HALF = [[0, 175], [20, 183], [40, 169], [60, 148], [80, 130], [105, 130], [140, 317], [160, 331], [180, 338], [200, 340]];
ARCH.pts = [[0, 0], ...ARCH_HALF, ...ARCH_HALF.slice().reverse().map(([z, h]) => [ARCH.l - z, h]), [ARCH.l, 0]];
export const DOOR = { z: 100, l: 1030, h: 1301 };
export const WID = { 2: 507, 3: 760, 4: 1014, 5: 1268, 6: 1521 };
export const DEPTHS = [21, 26, 31, 36, 41];
export const VAS = { b: ['bassa 72', 2, ['XDS', 'KDS']], a: ['alta 180', 5, ['XDS', 'KDS']], p: ['alta 180 con pannello posteriore', 5, ['KCP']], t: ['terminale 72 con fianchi', 2, ['KHS']] };
export const FV = { a: ['H252 una fila', 7, 16], b: ['H324 una fila', 9, 21], c: ['H468 due file', 13, 16], d: ['H180 stretti/larghi', 5, 11], e: ['H324 due file stretti/larghi', 9, 11] };
export const PAN = { a: ['108 mm (XCP)', 3, 'XCP'], b: ['144 mm (XCP)', 4, 'XCP'], c: ['180 mm (XCP)', 5, 'XCP'], d: ['108 mm con aggancio per vasche (XSP)', 3, 'XSP'] };
export const LAT = { w: 263, th: 110 };
export const TYPES = { s: 'Ripiano aperto', d: 'Cassetto frontale', v: 'Vasca scaffale', x: 'Cassettiera estraibile', f: 'Cassettiera ribaltabile', l: 'Cassettiera laterale', c: 'Pannello di chiusura' };
const F = 4, MIN_AISLE = 600;
const SET = Object.fromEntries(Object.entries(CAT).map(([k, v]) => [k, new Set(v)]));
const p2 = n => String(n).padStart(2, '0');
const cl = (v, a, b) => Math.min(Math.max(+v || 0, a), Math.max(a, b));
const uniq = a => [...new Set(a)].sort((x, y) => y - x);

export const makeCtx = S => {
  const L = () => LEN[S.len], H = () => HGT[S.hgt];
  const archZ = () => ARCH.z1 + L() - LEN.L1;
  const grp = it => it.t === 'l' ? 'l' + it.e : 'm';
  const ext = (m, e) => m.items.some(it => it.t === 'l' && it.e === e) ? LAT.th : 0;
  const ksiH = (wi, di) => uniq(CAT.ksi.filter(c => c[0] == wi && +c.slice(3, 5) === di).map(c => +c.slice(1, 3)));
  const ysiH = di => uniq(CAT.ysi.filter(c => +c.slice(3, 5) === di).map(c => +c.slice(0, 3)));
  function partsFor(hs, n) {
    if (n <= 0) return [];
    const best = [0, ...Array(n).fill(Infinity)], from = Array(n + 1).fill(0);
    for (let i = 1; i <= n; i++) for (const h of hs) if (h <= i && best[i - h] + 1 < best[i]) { best[i] = best[i - h] + 1; from[i] = h; }
    if (!isFinite(best[n])) return null;
    const r = []; for (let i = n; i > 0; i -= from[i]) r.push(from[i]); return r;
  }
  const ksiParts = m => partsFor(ksiH(m.wi, m.di), m.hh);
  const legParts = m => partsFor(ysiH(m.di), Math.ceil(m.y / 36));
  const hhOpts = m => { const hs = ksiH(m.wi, m.di), r = []; for (let n = 1; n * 36 <= H() - m.y; n++) if (partsFor(hs, n)) r.push(n); return r; };

  function opts(m, it) {
    const r = new Map(), wi = String(m.wi);
    if (it.t === 'v') {
      const [, hh, fam] = VAS[it.a];
      for (const c of CAT.vas) if (fam.includes(c.slice(0, 3)) && c[3] === wi && +c.slice(4, 6) === hh && +c.slice(6, 8) === m.di)
        r.set(+c.slice(11), { code: c, label: `${+c.slice(11)} divisori` });
    } else if (it.t === 'x') {
      for (const c of CAT.kd) if (c[0] === wi && +c.slice(1, 3) === it.a && +c.slice(3, 5) === it.b) {
        const ss = +c.slice(7, 9), big = +c[9]; r.set(ss, { code: 'KDU' + c, label: `${ss} piccoli + ${big} grandi` });
      }
    } else if (it.t === 'f' || it.t === 'l') {
      const lat = it.t === 'l', [, hh, dd] = lat ? [0, it.a, 11] : FV[it.a], w1 = lat ? '1' : wi;
      for (const c of CAT.kfd) if (c[0] === w1 && +c.slice(1, 3) === hh && +c.slice(3, 5) === dd) {
        const q = c.slice(8), n = +q.slice(0, 2), wd = q.length > 2 ? +q.slice(2) : 0, uniform = !lat && 'abc'.includes(it.a);
        r.set(n, { code: 'KDU' + c, label: uniform ? `${n} cassetti` : `${n} stretti + ${wd} larghi` });
      }
    } else return null;
    return r;
  }
  function normItem(m, it) {
    it.hi = it.t === 's' ? 1 : it.t === 'v' ? VAS[it.a][1] : it.t === 'x' || it.t === 'l' ? it.a : it.t === 'f' ? FV[it.a][1] : it.t === 'c' ? PAN[it.a][1] : it.hi;
    const o = opts(m, it);
    if (o && !o.has(it.o)) it.o = o.keys().next().value;
  }
  function spec(m, it) {
    const w = WID[m.wi], d = m.di * 10, o = opts(m, it)?.get(it.o);
    if (it.t === 's') { const c = `XOS${m.wi}01${m.di}`; return { code: SET.xos.has(c.slice(3)) ? c : null, desc: `Ripiano aperto ${w}x36x${d}`, dep: d }; }
    if (it.t === 'd') { const c = `KDW${m.wi}${p2(it.hi)}${m.di}`; return { code: SET.kdw.has(c.slice(3)) ? c : null, desc: `Cassetto frontale ${w}x${it.hi * 36}x${d}`, dep: d }; }
    if (it.t === 'v') return { code: o?.code ?? null, desc: `Vasca ${VAS[it.a][0]} ${w}x${it.hi * 36}x${d}, ${it.o ?? '?'} divisori`, dep: d };
    if (it.t === 'x') return { code: o?.code ?? null, desc: `Cassettiera estraibile MultiBox ${w}x${it.hi * 36}x${it.b * 10}${o ? ', ' + o.label : ''}`, dep: it.b * 10 };
    if (it.t === 'c') { const c = `${PAN[it.a][2]}${m.wi}${p2(it.hi)}00`; return { code: SET.pan.has(c) ? c : null, desc: `Pannello di chiusura ${PAN[it.a][0]} ${w}x${it.hi * 36}`, dep: 4 }; }
    if (it.t === 'l') return { code: o?.code ?? null, desc: `Cassettiera laterale MultiBox ${LAT.w}x${it.hi * 36}x${LAT.th} (${it.e === 'r' ? 'posteriore' : 'anteriore'})${o ? ', ' + o.label : ''}`, dep: LAT.w };
    return { code: o?.code ?? null, desc: `Cassettiera ribaltabile MultiBox ${FV[it.a][0]} ${w}x${it.hi * 36}x${FV[it.a][2] * 10}${o && !'abc'.includes(it.a) ? ', ' + o.label : ''}`, dep: FV[it.a][2] * 10 };
  }
  function fit(m) {
    const hs = hhOpts(m); if (hs.length && !hs.includes(m.hh)) m.hh = hs.filter(v => v <= m.hh).pop() ?? hs[0];
    m.items.forEach(it => normItem(m, it));
    m.z = cl(m.z, ext(m, 'f'), L() - WID[m.wi] - 2 * F - ext(m, 'r')); m.y = cl(m.y, 0, H() - m.hh * 36);
    m.items.forEach(it => it.p = Math.round(cl(it.p, 0, m.hh - it.hi)));
  }
  const fitObj = o => { o.w = cl(o.w, 10, L()); o.h = cl(o.h, 10, H()); o.d = cl(o.d, 10, W); o.z = cl(o.z, 0, L() - o.w); o.y = cl(o.y, 0, H() - o.h); };

  const boxHit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1 && a.y0 < b.y1 && b.y0 < a.y1;
  const fp = m => { const d = m.di * 10, left = m.side === 'L'; return { x0: left ? -W / 2 : W / 2 - d, x1: left ? -W / 2 + d : W / 2, z0: m.z - ext(m, 'f'), z1: m.z + WID[m.wi] + 2 * F + ext(m, 'r'), y0: m.y, y1: m.y + m.hh * 36 }; };
  const fpObj = o => { const x0 = o.side === 'L' ? -W / 2 : o.side === 'R' ? W / 2 - o.d : -o.d / 2; return { x0, x1: x0 + o.d, z0: o.z, z1: o.z + o.w, y0: o.y, y1: o.y + o.h }; };
  const obst = () => [...S.mods.map((m, i) => ({ r: m, f: fp(m), n: `modulo ${i + 1}` })), ...S.objs.map((o, i) => ({ r: o, f: fpObj(o), n: `oggetto ${i + 1}` }))];
  function aisleAt(z, all) {
    const iv = all.filter(o => z >= o.f.z0 && z <= o.f.z1).map(o => [o.f.x0, o.f.x1]);
    if (z >= archZ() && z <= archZ() + ARCH.l) iv.push([-W / 2, -W / 2 + ARCH.in], [W / 2 - ARCH.in, W / 2]);
    iv.sort((a, b) => a[0] - b[0]);
    let best = 0, x = -W / 2;
    for (const [a, b] of iv) { best = Math.max(best, a - x); x = Math.max(x, b); }
    return Math.round(Math.max(best, W / 2 - x));
  }
  const aisleMin = (z0, z1, all = obst()) => { let w = W; for (let z = z0; z <= z1; z += 25) w = Math.min(w, aisleAt(z, all)); return w; };
  const archH = (a, b) => {
    const lo = Math.max(a, archZ()) - archZ(), hi = Math.min(b, archZ() + ARCH.l) - archZ();
    if (lo >= hi) return 0;
    const at = z => { for (let i = 1; i < ARCH.pts.length; i++) { const [z0, h0] = ARCH.pts[i - 1], [z1, h1] = ARCH.pts[i]; if (z1 > z0 && z >= z0 && z <= z1) return h0 + (h1 - h0) * (z - z0) / (z1 - z0); } return 0; };
    return Math.max(at(lo), at(hi), ...ARCH.pts.filter(([z]) => z > lo && z < hi).map(p => p[1]));
  };
  function hazards(self, f) {
    const w = [];
    obst().forEach(o => { if (o.r !== self && boxHit(f, o.f)) w.push(`interseca il ${o.n}`); });
    if (f.z0 < 0 || f.z1 > L()) w.push('fuori dal vano');
    const ai = aisleMin(Math.max(0, f.z0), Math.min(L(), f.z1));
    if (ai < MIN_AISLE) w.push(`corridoio ridotto a ${ai} mm (minimo ${MIN_AISLE})`);
    if (f.x1 >= W / 2 - 1 && f.y0 < DOOR.h && f.z0 < DOOR.z + DOOR.l && f.z1 > DOOR.z) w.push('ostruisce la porta scorrevole');
    if ((f.x0 < -W / 2 + ARCH.in || f.x1 > W / 2 - ARCH.in) && f.y0 < archH(f.z0, f.z1)) w.push('interferisce col passaruota: alza la quota da terra');
    return w;
  }
  function warns(m) {
    const w = hazards(m, fp(m));
    if (!ksiParts(m)) w.push('fianchi non a catalogo');
    if (m.y > 0 && (m.lf || m.lr) && !legParts(m)) w.push('sostegni a terra non a catalogo per questa quota');
    if (m.stop && !SET.kmh.has(`KMH${m.wi}00${m.di}`)) w.push('fermavaligie non a catalogo per questa larghezza');
    if (m.items.some((o, i) => m.items.some((q, j) => j > i && grp(o) === grp(q) && o.p < q.p + q.hi && q.p < o.p + o.hi))) w.push('componenti sovrapposti');
    m.items.forEach((it, i) => { const s = spec(m, it); if (!s.code) w.push(`componente ${i + 1}: non a catalogo in questa combinazione`); if (s.dep > m.di * 10) w.push(`componente ${i + 1}: piu profondo del modulo`); });
    return w;
  }
  const warnsObj = o => hazards(o, fpObj(o));
  const crateGrid = (d, w) => ({ n: d < 310 ? 0 : Math.floor(w / (d >= 410 ? 290 : 400)) });

  const PGMAP = new Map(CATALL.items.map(i => [i[0], i[3]]));
  function bomRows() {
    const bom = new Map();
    const add = (code, desc, n = 1, page) => { const r = bom.get(code) || { desc, n: 0, page: page ?? PGMAP.get(code) }; r.n += n; bom.set(code, r); };
    S.mods.forEach(m => {
      const w = WID[m.wi], d = m.di * 10, kp = ksiParts(m);
      if (kp) kp.forEach((h, i) => add(`KSI${m.wi}${p2(h)}${m.di}`, `Coppia fianchi ${w}x${h * 36}x${d}${kp.length > 1 ? ` (parte ${i + 1} di ${kp.length}, altezza totale ${m.hh * 36})` : ''}`));
      else add(`da verificare (fianchi ${w}x${m.hh * 36}x${d})`, `Coppia fianchi ${w}x${m.hh * 36}x${d}`);
      if (m.y > 0 && (m.lf || m.lr)) { const lp = legParts(m), n = (m.lf ? 1 : 0) + (m.lr ? 1 : 0);
        if (lp) lp.forEach(h => add(`YSI${String(h).padStart(3, '0')}${m.di}`, `Fianco singolo ${h * 36}x${d} (sostegno a terra)`, n));
        else add('da verificare (sostegni a terra)', `Sostegni a terra per quota ${m.y}`); }
      if (m.y > 0 && m.stop) { const kc = `KMH${m.wi}00${m.di}`; add(SET.kmh.has(kc) ? kc : `da verificare (fermavaligie ${w}x${d})`, `Kit fermavaligie con barra Syncroblock, navetta e cinghie, vano ${w}x${d}`, 1, 141); }
      m.items.forEach(it => {
        const sp = spec(m, it); add(sp.code || `da verificare (${sp.desc})`, sp.desc);
        if (it.t === 's' && it.c) for (let n = crateGrid(d, w).n; n--;) add('Euronorm (codice da verificare)', 'Contenitore Euronorm 400x290x170');
      });
    });
    S.objs.forEach(o => { if (!o.custom) add(o.code, `${o.desc} - nel vano ${o.w}x${o.h}x${o.d}`, 1, o.page); });
    S.extra.forEach(x => add(x.code, x.desc, x.n, x.page));
    return [...bom].map(([code, r]) => ({ code, ...r }));
  }
  const free = (m, it) => { for (let p = 0; p + it.hi <= m.hh; p++) if (!m.items.some(o => o !== it && grp(o) === grp(it) && p < o.p + o.hi && o.p < p + it.hi)) return p; return -1; };
  return { free, L, H, partsFor, ksiH, ksiParts, hhOpts, opts, spec, fit, fitObj, fp, fpObj, hazards, warns, warnsObj, bomRows, aisleMin, archH };
};

// ---- stato della configurazione (stesso formato di localStorage 'syncro-cfg2' e dell'export JSON del configuratore)
export const emptyConfig = (len = 'L1') => ({ len, hgt: 'H1', mods: [], objs: [], extra: [] });

/** Normalizza e valida un oggetto configurazione; ritorna { cfg, errors } (errors = problemi strutturali, non avvisi di progetto). */
export function sanitize(input) {
  const errors = [], S = emptyConfig(LEN[input?.len] ? input.len : 'L1');
  if (input?.len && !LEN[input.len]) errors.push(`passo "${input.len}" sconosciuto: uso L1`);
  for (const [i, m] of (input?.mods ?? []).entries()) {
    if (!WID[m.wi]) { errors.push(`modulo ${i + 1}: wi ${m.wi} non valido (${Object.keys(WID).join(', ')})`); continue; }
    if (!DEPTHS.includes(m.di)) { errors.push(`modulo ${i + 1}: di ${m.di} non valido (${DEPTHS.join(', ')})`); continue; }
    if (!['L', 'R'].includes(m.side)) { errors.push(`modulo ${i + 1}: side deve essere L o R`); continue; }
    const items = [];
    for (const [j, it] of (m.items ?? []).entries()) {
      if (!TYPES[it.t]) { errors.push(`modulo ${i + 1} componente ${j + 1}: tipo "${it.t}" sconosciuto`); continue; }
      items.push({ ...it, p: +it.p || 0 });
    }
    S.mods.push({ side: m.side, z: +m.z || 0, y: +m.y || 0, wi: +m.wi, di: +m.di, hh: +m.hh || 1, items, ...(m.lf ? { lf: 1 } : {}), ...(m.lr ? { lr: 1 } : {}), ...(m.stop ? { stop: 1 } : {}) });
  }
  for (const [i, o] of (input?.objs ?? []).entries()) {
    if (![o.w, o.h, o.d].every(v => +v > 0)) { errors.push(`oggetto ${i + 1}: w/h/d devono essere > 0`); continue; }
    S.objs.push({ ...o, side: ['L', 'R', 'C'].includes(o.side) ? o.side : 'L', z: +o.z || 0, y: +o.y || 0, w: +o.w, h: +o.h, d: +o.d });
  }
  for (const x of input?.extra ?? []) S.extra.push({ code: String(x.code), desc: String(x.desc ?? ''), page: x.page, n: Math.max(1, Math.round(+x.n) || 1) });
  return { cfg: S, errors };
}

/** Analisi completa: applica fit() (come il configuratore), calcola avvisi e distinta. */
export function analyze(cfgIn) {
  const { cfg, errors } = sanitize(cfgIn), c = makeCtx(cfg);
  cfg.mods.forEach(c.fit); cfg.objs.forEach(c.fitObj);
  const mods = cfg.mods.map((m, i) => ({ n: i + 1, side: m.side, size: `${WID[m.wi]}x${m.hh * 36}x${m.di * 10}`, z: m.z, y: m.y, fianchi: (c.ksiParts(m) ?? []).map(h => `KSI${m.wi}${p2(h)}${m.di}`), warnings: c.warns(m) }));
  const objs = cfg.objs.map((o, i) => ({ n: i + 1, desc: o.desc, warnings: c.warnsObj(o) }));
  const bom = c.bomRows();
  const warnings = [...mods.flatMap(m => m.warnings.map(w => `modulo ${m.n}: ${w}`)), ...objs.flatMap(o => o.warnings.map(w => `oggetto ${o.n}: ${w}`))];
  const unverified = bom.filter(r => r.code.includes('verificare')).map(r => r.code);
  return { cfg, errors, mods, objs, bom, warnings, unverified, ok: !errors.length && !warnings.length };
}

export const catalogCodes = () => Object.fromEntries(Object.entries(CAT).map(([k, v]) => [k, v.length]));
export function searchCatalog(q, section, limit = 20) {
  const s = (q ?? '').toLowerCase().trim();
  const res = CATALL.items.filter(it => (section == null || it[4] === section) && (!s || it[0].toLowerCase().includes(s) || it[1].toLowerCase().includes(s)));
  return { total: res.length, items: res.slice(0, limit).map(([code, desc, dim, page, sec]) => ({ code, desc, dim, page: page - 2, section: CATALL.sec[sec]?.[0] })) };
}
export const presetToConfig = (key, len = 'L1') => {
  const p = PRESETS[key]; if (!p) return null;
  const c = JSON.parse(JSON.stringify(p)), dz = LEN[len] - LEN.L1;
  c.objs = c.objs.filter(o => !o.l2 || dz > 0);
  [...c.mods, ...c.objs].forEach(o => { if (o.r) o.z += dz; delete o.r; delete o.l2; });
  return { len, hgt: 'H1', mods: c.mods, objs: c.objs, extra: c.extra };
};
