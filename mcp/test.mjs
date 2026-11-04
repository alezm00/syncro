// Test end-to-end: avvia il server via stdio e prova i tool principali. Uso: node test.mjs
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import * as core from './core.mjs';

// 1) tutti i modelli di allestimento: nessun avviso, in L1 e L2
for (const k of Object.keys(core.PRESETS)) for (const len of ['L1', 'L2']) assert.deepEqual(core.analyze(core.presetToConfig(k, len)).warnings, [], `${k} ${len}`);

// 2) server MCP
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'syncro-'));
const c = new Client({ name: 'test', version: '1' });
await c.connect(new StdioClientTransport({ command: 'node', args: ['server.mjs'], env: { ...process.env, SYNCRO_SAVE_DIR: dir } }));
const call = async (name, args = {}) => { const r = await c.callTool({ name, arguments: args }); const t = r.content[0].text; return { err: !!r.isError, t, j: r.isError ? null : JSON.parse(t) }; };
const names = (await c.listTools()).tools.map(t => t.name);
for (const n of ['load_preset', 'add_module', 'add_component', 'validate_configuration', 'get_bom', 'save_configuration']) assert(names.includes(n), n);

await call('reset_configuration', { len: 'L1' });
let r = await call('add_module', { side: 'L', z: 0, y: 0, wi: 4, di: 36, hh: 34 });
assert.equal(r.j.moduli.length, 1);
r = await call('add_component', { module: 1, t: 'v', a: 'a', o: 4 }); assert(!r.err, r.t);
r = await call('add_component', { module: 1, t: 'v', a: 'b' }); assert(!r.err, r.t);
r = await call('add_component', { module: 1, t: 'v', a: 'a', o: 99 }); assert(r.err, 'opzione inesistente deve essere rifiutata');
r = await call('add_component', { module: 1, t: 's' }); assert(!r.err, r.t);
r = await call('add_module', { side: 'L', z: 100, y: 0, wi: 4, di: 36, hh: 10 }); assert(r.j.avvisi.some(a => a.includes('interseca')), 'collisione attesa');
await call('remove_module', { n: 2 });
r = await call('add_module', { side: 'R', z: 200, y: 0, wi: 4, di: 36, hh: 10 }); assert(r.j.avvisi.some(a => a.includes('porta scorrevole')), 'porta scorrevole');
await call('remove_module', { n: 2 });
r = await call('get_bom'); assert(r.j.distinta.some(x => x.codice.startsWith('KSI')));
r = await call('load_preset', { key: 'clima-inst', len: 'L2' }); assert.equal(r.j.avvisi.length, 0);
r = await call('save_configuration', { name: 'prova' }); assert(fs.existsSync(r.j.salvato));
r = await call('load_configuration', { name: 'prova' }); assert.equal(r.j.passo, 'L2');
r = await call('list_options', { wi: 4, di: 36, type: 'v' }); assert(r.j.componenti.length > 0);
r = await call('search_catalog', { query: 'KSI', limit: 3 }); assert(r.j.total > 0);
console.log('OK:', names.length, 'tool,', Object.keys(core.PRESETS).length, 'modelli x 2 passi senza avvisi');
await c.close();
