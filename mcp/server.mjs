#!/usr/bin/env node
// Server MCP (stdio) per configurare l'allestimento Syncro di un Ford Transit Custom MK1.5 (2023).
// La configurazione vive in memoria durante la sessione; usa save_configuration / load_configuration per salvarla su file
// (stesso formato dell'export/import JSON del configuratore web, index.html).
import fs from 'node:fs';
import path from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as core from './core.mjs';

const { LEN, HGT, W, WID, DEPTHS, VAS, FV, PAN, LAT, TYPES, ARCH, DOOR, PRESETS } = core;
let cfg = core.emptyConfig();
const SAVE_DIR = process.env.SYNCRO_SAVE_DIR || path.resolve(process.cwd(), 'configurazioni');

const text = o => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 1) }] });
const fail = msg => ({ isError: true, content: [{ type: 'text', text: msg }] });
const ctx = () => core.makeCtx(cfg);
const modIdx = n => { if (!Number.isInteger(n) || n < 1 || n > cfg.mods.length) throw new Error(`modulo ${n} inesistente (ce ne sono ${cfg.mods.length}, numerati da 1)`); return n - 1; };
const tool = (name, description, shape, fn) => server.tool(name, description, shape, async a => { try { return text(await fn(a ?? {})); } catch (e) { return fail(e.message); } });

/** Riepilogo compatto + avvisi dopo ogni modifica. */
function status(extra = {}) {
  const r = core.analyze(cfg);
  return { ...extra, passo: cfg.len, moduli: r.mods, oggetti: r.objs.map(o => ({ n: o.n, desc: o.desc, warnings: o.warnings })), avvisi: r.warnings, codici_da_verificare: r.unverified, ok: r.ok };
}
const refit = () => { const c = ctx(); cfg.mods.forEach(c.fit); cfg.objs.forEach(c.fitObj); };
const checkItem = (m, it) => { const c = ctx(); c.fit(m); const s = c.spec(m, it); if (!s.code) throw new Error(`Combinazione non a catalogo: ${s.desc}. Usa list_options per vedere le varianti valide per larghezza ${WID[m.wi]} / profondita ${m.di * 10}.`); };

const server = new McpServer({ name: 'syncro-configuratore', version: '1.0.0' }, {
  instructions: `Configuratore di allestimenti Syncro (catalogo 26-1) per Ford Transit Custom MK1.5 2023, passo L1 (2470 mm) o L2 (2870 mm), altezza H1 (1267 mm), larghezza utile 1777 mm.
Convenzioni: z = mm dalla paratia verso i portelloni; y = quota da terra (mm); lato L = guidatore (sinistra), R = porta scorrevole (destra). Altezze dei moduli in passi da 36 mm.
Un modulo e' una coppia di fianchi con componenti impilati dal basso (p = passo di partenza, 0 = in basso). Tipi componente: ${Object.entries(TYPES).map(([k, v]) => `${k}=${v}`).join(', ')}.
Flusso consigliato: get_vehicle_info -> (list_presets/load_preset oppure add_module + add_component) -> validate_configuration -> correggi gli avvisi -> get_bom -> save_configuration (file JSON importabile nel configuratore web).
Usa SEMPRE list_options prima di scegliere varianti di vasche/cassettiere: solo le combinazioni a catalogo hanno un codice. Non inventare codici.`,
});

tool('get_vehicle_info', 'Dati del furgone e regole di configurazione (misure, passaruota, porta scorrevole, passi altezza, larghezze e profondita valide).', {}, () => ({
  veicolo: 'Ford Transit Custom MK1.5 (2023)', passo: LEN, altezza: HGT, larghezza_utile_mm: W,
  passaruota: { z_inizio_L1: ARCH.z1, lunghezza: ARCH.l, ingombro_laterale_mm: ARCH.in, altezza_max_mm: 340, nota: 'in L2 si sposta di +400 mm' },
  porta_scorrevole: { lato: 'R', z_da: DOOR.z, z_a: DOOR.z + DOOR.l, altezza_mm: DOOR.h },
  corridoio_minimo_mm: 600, passo_altezza_mm: 36, larghezze_modulo_mm: WID, profondita_valide: DEPTHS.map(d => ({ di: d, mm: d * 10 })),
  tipi_componente: TYPES,
  varianti: { vasca_a: Object.fromEntries(Object.entries(VAS).map(([k, v]) => [k, `${v[0]} (${v[1]} passi)`])), ribaltabile_a: Object.fromEntries(Object.entries(FV).map(([k, v]) => [k, `${v[0]} (${v[1]} passi, prof. ${v[2] * 10})`])), pannello_a: Object.fromEntries(Object.entries(PAN).map(([k, v]) => [k, `${v[0]} (${v[1]} passi)`])) },
  laterale: `cassettiera laterale ${LAT.w} mm di larghezza, ${LAT.th} mm di spessore, fuori dai fianchi (e: 'f' anteriore, 'r' posteriore)`,
  attenzione: 'Misure da schede tecniche e modello 3D: verificare col metro. Documento indicativo.',
}));

tool('list_presets', 'Elenca i modelli di allestimento pronti (manutenzione e installazione: caldaie, climatizzazione, elettrico, misto).', {}, () =>
  Object.entries(PRESETS).map(([key, p]) => ({ key, gruppo: p.grp, nome: p.name, moduli: p.mods.length, oggetti: p.objs.length, note: p.note.map(n => n.replace(/<[^>]+>/g, '')) })));

tool('load_preset', 'Sostituisce la configurazione corrente con un modello pronto, adattato al passo scelto (L1/L2).',
  { key: z.string().describe('chiave da list_presets'), len: z.enum(['L1', 'L2']).default('L1') }, ({ key, len }) => {
    const c = core.presetToConfig(key, len); if (!c) throw new Error(`modello "${key}" inesistente: vedi list_presets`);
    cfg = core.sanitize(c).cfg; refit(); return status({ caricato: key });
  });

tool('get_configuration', 'Configurazione corrente (JSON completo) con avvisi.', {}, () => ({ configurazione: cfg, ...status() }));
tool('reset_configuration', 'Svuota la configurazione e imposta il passo.', { len: z.enum(['L1', 'L2']).default('L1') }, ({ len }) => { cfg = core.emptyConfig(len); return status(); });
tool('set_wheelbase', 'Cambia il passo (L1/L2). I moduli ancorati al retro/passaruota NON si spostano da soli: controlla gli avvisi.', { len: z.enum(['L1', 'L2']) }, ({ len }) => { cfg.len = len; refit(); return status(); });

tool('list_options', 'Opzioni valide a catalogo per un componente in un modulo di data larghezza/profondita: varianti, codici, passi occupati. Chiamalo prima di add_component per vasche (v), estraibili (x), ribaltabili (f), laterali (l).', {
  wi: z.number().int().describe('indice larghezza 2..6 (507,760,1014,1268,1521 mm)'), di: z.number().int().describe('profondita: 21,26,31,36,41 (x10 mm)'),
  type: z.enum(['v', 'x', 'f', 'l', 'c', 's', 'd']),
}, ({ wi, di, type }) => {
  if (!WID[wi]) throw new Error('wi non valido'); const c = core.makeCtx({ len: 'L1', hgt: 'H1', mods: [], objs: [], extra: [] }), m = { wi, di, items: [] };
  const ksi = c.ksiH(wi, di), alt = c.hhOpts({ wi, di, y: 0 });
  const mod = { fianchi_altezze_catalogo_passi: ksi, altezze_modulo_possibili_passi: alt, larghezza_mm: WID[wi], profondita_mm: di * 10 };
  const rows = [];
  const probe = (it, label) => { const o = c.opts(m, it); if (!o?.size) return; rows.push({ ...label, passi: (normed => (c.fit({ ...m, hh: 1, y: 0, z: 0, items: [normed] }), normed.hi))({ ...it }), opzioni: [...o].map(([k, v]) => ({ o: k, codice: v.code, descrizione: v.label })) }); };
  if (type === 'v') for (const a of Object.keys(VAS)) probe({ t: 'v', a }, { a, nome: VAS[a][0] });
  else if (type === 'f') for (const a of Object.keys(FV)) probe({ t: 'f', a }, { a, nome: FV[a][0], profondita_mm: FV[a][2] * 10 });
  else if (type === 'l') for (const a of [5, 7, 9, 13]) probe({ t: 'l', a, e: 'r' }, { a, nome: `laterale ${a * 36} mm`, nota: `passi occupati = a (${a})` });
  else if (type === 'x') {
    const seen = new Set(); for (const code of core.CAT.kd) if (code[0] === String(wi)) { const a = +code.slice(1, 3), b = +code.slice(3, 5), k = a + '/' + b; if (!seen.has(k)) { seen.add(k); probe({ t: 'x', a, b }, { a, b, nome: `estraibile ${a * 36} mm x prof. ${b * 10}` }); } }
  } else if (type === 'c') for (const a of Object.keys(PAN)) { const code = `${PAN[a][2]}${wi}${String(PAN[a][1]).padStart(2, '0')}00`; rows.push({ a, nome: PAN[a][0], passi: PAN[a][1], codice: code, a_catalogo: core.CAT.pan.includes(code) }); }
  else if (type === 's') rows.push({ passi: 1, codice: `XOS${wi}01${di}`, a_catalogo: core.CAT.xos.includes(`${wi}01${di}`), nota: 'campo c:1 = con contenitori Euronorm (codice da verificare)' });
  else rows.push({ hi_valide: [2, 3, 4, 5, 6].filter(h => core.CAT.kdw.includes(`${wi}${String(h).padStart(2, '0')}${di}`)), nota: 'cassetto frontale: hi = passi di altezza' });
  return { modulo: mod, componenti: rows };
});

const itemShape = {
  t: z.enum(['s', 'd', 'v', 'x', 'f', 'l', 'c']).describe(Object.entries(TYPES).map(([k, v]) => `${k}=${v}`).join(', ')),
  a: z.union([z.string(), z.number()]).optional().describe('variante: v/f/c = lettera (vedi get_vehicle_info); x = altezza in passi (es. 4, 7); l = altezza in passi (5,7,9,13)'),
  b: z.number().int().optional().describe('solo x: profondita estraibile in codice (21,26,31,...)'),
  o: z.number().int().optional().describe('opzione (n. divisori / n. cassetti piccoli): vedi list_options. Se omessa o non valida si usa la prima'),
  hi: z.number().int().optional().describe('solo d (cassetto frontale): altezza in passi 2..6'),
  e: z.enum(['f', 'r']).optional().describe('solo l: f = anteriore, r = posteriore'),
  c: z.boolean().optional().describe('solo s: ripiano con contenitori Euronorm'),
  p: z.number().int().min(0).optional().describe('passo di partenza dal basso (0 = fondo). Se omesso: primo posto libero'),
};

tool('add_module', 'Aggiunge un modulo (coppia di fianchi KSI). Ritorna il numero (da 1) e gli avvisi.', {
  side: z.enum(['L', 'R']).describe('L = guidatore, R = porta scorrevole'), z: z.number().describe('mm dalla paratia al bordo anteriore'), y: z.number().default(0).describe('quota da terra (mm)'),
  wi: z.number().int().min(2).max(6), di: z.number().int(), hh: z.number().int().min(1).describe('altezza in passi da 36 mm (es. 34 = 1224 mm)'),
  lf: z.boolean().optional().describe('sostegno a terra anteriore (se y>0)'), lr: z.boolean().optional().describe('sostegno a terra posteriore (se y>0)'), stop: z.boolean().optional().describe('barra fermavaligie (se y>0)'),
}, a => {
  if (!DEPTHS.includes(a.di)) throw new Error(`di deve essere uno tra ${DEPTHS.join(', ')}`);
  const m = { side: a.side, z: a.z, y: a.y, wi: a.wi, di: a.di, hh: a.hh, items: [], ...(a.lf ? { lf: 1 } : {}), ...(a.lr ? { lr: 1 } : {}), ...(a.stop ? { stop: 1 } : {}) };
  const before = a.hh; ctx().fit(m); cfg.mods.push(m);
  return status({ aggiunto: cfg.mods.length, ...(m.hh !== before ? { nota: `altezza adattata da ${before} a ${m.hh} passi (non disponibile a catalogo / non entra)` } : {}) });
});
tool('update_module', 'Modifica un modulo (posizione, quota, misure, sostegni).', {
  n: z.number().int(), side: z.enum(['L', 'R']).optional(), z: z.number().optional(), y: z.number().optional(), wi: z.number().int().optional(), di: z.number().int().optional(), hh: z.number().int().optional(),
  lf: z.boolean().optional(), lr: z.boolean().optional(), stop: z.boolean().optional(),
}, ({ n, lf, lr, stop, ...f }) => {
  const m = cfg.mods[modIdx(n)];
  if (f.wi && !WID[f.wi]) throw new Error('wi non valido'); if (f.di && !DEPTHS.includes(f.di)) throw new Error('di non valido');
  Object.assign(m, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)));
  for (const [k, v] of [['lf', lf], ['lr', lr], ['stop', stop]]) if (v !== undefined) v ? m[k] = 1 : delete m[k];
  refit(); return status({ aggiornato: n });
});
tool('remove_module', 'Elimina un modulo (i successivi si rinumerano).', { n: z.number().int() }, ({ n }) => { cfg.mods.splice(modIdx(n), 1); return status({ rimosso: n }); });

tool('add_component', 'Aggiunge un componente a un modulo. Rifiuta combinazioni non a catalogo o che non entrano.', { module: z.number().int().describe('n. modulo (da 1)'), ...itemShape }, ({ module, ...f }) => {
  const m = cfg.mods[modIdx(module)], c = ctx(), it = Object.fromEntries(Object.entries(f).filter(([k, v]) => v !== undefined && !(k === 'c' && !v)));
  if (it.c) it.c = 1; if (it.t === 'l' && !it.e) it.e = 'r';
  if (it.t === 'x') { it.a ??= 4; it.b ??= m.di; } if (it.t === 'l') it.a ??= 9;
  if (it.t === 'v' || it.t === 'f' || it.t === 'c') { it.a ??= it.t === 'f' ? 'a' : it.t === 'c' ? 'a' : 'b'; if (typeof it.a !== 'string' || !({ v: VAS, f: FV, c: PAN })[it.t][it.a]) throw new Error(`variante "${it.a}" non valida per ${it.t}`); }
  if (it.t === 'd') it.hi ??= 3;
  c.fit(m); const probe = { ...it, p: 0 }; c.fit({ ...m, items: [probe] }); it.hi = probe.hi; if (it.o !== undefined) it.o = probe.o === it.o ? it.o : (() => { throw new Error(`opzione ${it.o} non a catalogo: usa list_options (valida: ${[...(c.opts(m, it)?.keys() ?? [])].join(', ')})`); })(); else if (probe.o !== undefined) it.o = probe.o;
  const p = it.p ?? c.free(m, { ...it, p: 0 }); if (p < 0) throw new Error(`nessun posto libero di ${it.hi} passi nel modulo ${module} (altezza ${m.hh} passi)`);
  it.p = p; if (p + it.hi > m.hh) throw new Error(`il componente (${it.hi} passi) a p=${p} supera l'altezza del modulo (${m.hh} passi)`);
  m.items.push(it); checkItem(m, it);
  return status({ aggiunto: { modulo: module, componente: m.items.length, ...it, ...c.spec(m, it) } });
});
tool('update_component', 'Modifica un componente (n. da 1 dentro il modulo). Passa solo i campi da cambiare.', { module: z.number().int(), n: z.number().int(), ...Object.fromEntries(Object.entries(itemShape).filter(([k]) => k !== 't')) }, ({ module, n, ...f }) => {
  const m = cfg.mods[modIdx(module)], it = m.items[n - 1]; if (!it) throw new Error(`componente ${n} inesistente nel modulo ${module}`);
  for (const [k, v] of Object.entries(f)) if (v !== undefined) it[k] = k === 'c' ? (v ? 1 : undefined) : v;
  if (f.a !== undefined && f.o === undefined) delete it.o; ctx().fit(m); checkItem(m, it);
  return status({ aggiornato: { modulo: module, componente: n, ...it } });
});
tool('remove_component', 'Rimuove un componente.', { module: z.number().int(), n: z.number().int() }, ({ module, n }) => { const m = cfg.mods[modIdx(module)]; if (!m.items[n - 1]) throw new Error('componente inesistente'); m.items.splice(n - 1, 1); return status({ rimosso: { modulo: module, componente: n } }); });

tool('add_object', 'Posiziona nel vano un oggetto: attrezzatura personale (custom, es. bombola, recuperatore) o articolo del catalogo con ingombro. Controlla collisioni come i moduli.', {
  desc: z.string(), side: z.enum(['L', 'R', 'C']), z: z.number().describe('mm dalla paratia'), y: z.number().default(0), w: z.number().describe('lunghezza lungo z (mm)'), h: z.number(), d: z.number().describe('profondita in larghezza (mm)'),
  code: z.string().optional().describe('codice catalogo; se omesso e\' attrezzatura non a catalogo'),
}, ({ code, ...o }) => {
  const obj = code ? { code, page: core.CATALL.items.find(i => i[0] === code)?.[3], ...o } : { custom: true, code: 'ATTREZZATURA', ...o };
  if (code && !core.CATALL.items.some(i => i[0] === code)) throw new Error(`codice ${code} assente dal catalogo: usa search_catalog`);
  cfg.objs.push(obj); refit(); return status({ aggiunto: cfg.objs.length });
});
tool('update_object', 'Modifica posizione/misure di un oggetto.', { n: z.number().int(), side: z.enum(['L', 'R', 'C']).optional(), z: z.number().optional(), y: z.number().optional(), w: z.number().optional(), h: z.number().optional(), d: z.number().optional() }, ({ n, ...f }) => {
  const o = cfg.objs[n - 1]; if (!o) throw new Error('oggetto inesistente'); Object.assign(o, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined))); refit(); return status({ aggiornato: n });
});
tool('remove_object', 'Rimuove un oggetto dal vano.', { n: z.number().int() }, ({ n }) => { if (!cfg.objs[n - 1]) throw new Error('oggetto inesistente'); cfg.objs.splice(n - 1, 1); return status({ rimosso: n }); });

tool('add_to_bom', 'Aggiunge alla sola distinta un articolo del catalogo (senza posizionarlo). Quantita sommata se gia presente.', { code: z.string(), n: z.number().int().min(1).default(1) }, ({ code, n }) => {
  const it = core.CATALL.items.find(i => i[0] === code); if (!it) throw new Error(`codice ${code} assente dal catalogo: usa search_catalog`);
  const x = cfg.extra.find(r => r.code === code); x ? x.n += n : cfg.extra.push({ code, desc: it[1], page: it[3], n }); return status({ distinta_extra: cfg.extra });
});
tool('remove_from_bom', 'Toglie un articolo aggiunto con add_to_bom.', { code: z.string() }, ({ code }) => { cfg.extra = cfg.extra.filter(x => x.code !== code); return status({ distinta_extra: cfg.extra }); });

tool('search_catalog', 'Cerca nel catalogo Syncro 26-1 (codice o descrizione). Le pagine restituite sono quelle stampate sul catalogo.', {
  query: z.string().optional(), section: z.number().int().optional().describe('indice sezione (vedi list_catalog_sections)'), limit: z.number().int().min(1).max(100).default(20),
}, ({ query, section, limit }) => core.searchCatalog(query, section, limit));
tool('list_catalog_sections', 'Sezioni del catalogo con indice e pagine.', {}, () => core.CATALL.sec.map(([t, a, b], i) => ({ section: i, titolo: t, pagine: `${a - 2}-${b - 2}` })));

tool('validate_configuration', 'Controllo completo: struttura, collisioni, corridoio minimo, passaruota, porta scorrevole, codici a catalogo. Elenca cosa correggere.', {}, () => {
  const r = core.analyze(cfg); return { ok: r.ok, errori_struttura: r.errors, avvisi: r.warnings, codici_da_verificare: r.unverified, moduli: r.mods.length, oggetti: r.objs.length };
});
tool('get_bom', 'Distinta con codici catalogo, quantita e pagina del catalogo.', {}, () => { const r = core.analyze(cfg); return { righe: r.bom.length, pezzi: r.bom.reduce((a, x) => a + x.n, 0), distinta: r.bom.map(x => ({ q: x.n, codice: x.code, descrizione: x.desc, pagina_catalogo: x.page ? x.page - 2 : null })), avvisi: r.warnings }; });

tool('save_configuration', 'Salva la configurazione in un file JSON importabile col pulsante "Importa" del configuratore web (index.html).', { name: z.string().default('allestimento').describe('nome file senza estensione') }, ({ name }) => {
  const safe = name.replace(/[^\w.-]+/g, '_'); fs.mkdirSync(SAVE_DIR, { recursive: true }); const f = path.join(SAVE_DIR, safe + '.json');
  fs.writeFileSync(f, JSON.stringify({ app: 'syncro-configuratore', version: 1, ...cfg }, null, 1)); return { salvato: f, avvisi: core.analyze(cfg).warnings };
});
tool('load_configuration', 'Carica una configurazione salvata (nome in cartella configurazioni, oppure JSON passato direttamente).', { name: z.string().optional(), json: z.string().optional().describe('contenuto JSON') }, ({ name, json }) => {
  const src = json ?? fs.readFileSync(path.join(SAVE_DIR, name.replace(/[^\w.-]+/g, '_') + '.json'), 'utf8'), { cfg: c, errors } = core.sanitize(JSON.parse(src));
  cfg = c; refit(); return status({ errori_struttura: errors });
});
tool('list_saved_configurations', 'Elenca i file salvati.', {}, () => fs.existsSync(SAVE_DIR) ? fs.readdirSync(SAVE_DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : []);

await server.connect(new StdioServerTransport());
