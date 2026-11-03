// Converte un modello STEP in glb (mm -> m, Z-up -> Y-up) per il configuratore. Richiede: npm i occt-import-js @gltf-transform/core
// Uso: node --max-old-space-size=6000 tools/step_to_glb.mjs modello.step transit.glb [tolleranza_mm=8]
import fs from 'node:fs';
import occtimport from 'occt-import-js';
import { Document, NodeIO } from '@gltf-transform/core';

const [,, inp, out, defl = '8'] = process.argv;
const occt = await occtimport();
console.time('read');
const r = occt.ReadStepFile(new Uint8Array(fs.readFileSync(inp)), { linearUnit: 'millimeter', linearDeflectionType: 'absolute_value', linearDeflection: +defl, angularDeflection: 0.4 });
console.timeEnd('read');
if (!r.success) throw new Error('read failed');
const doc = new Document(), buf = doc.createBuffer(), mesh = doc.createMesh('van'), node = doc.createNode('van').setMesh(mesh).setScale([.001, .001, .001]).setRotation([-Math.SQRT1_2, 0, 0, Math.SQRT1_2]); // mm -> m, Z-up -> Y-up
doc.createScene().addChild(node);
let tris = 0, bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
const mats = new Map();
r.meshes.forEach((m, mi) => {
  // un materiale per colore di faccia (brep_faces); se manca, colore della mesh
  const groups = (m.brep_faces?.length ? m.brep_faces : [{ first: 0, last: m.index.array.length / 3 - 1, color: m.color }]);
  const pos = new Float32Array(m.attributes.position.array), nor = m.attributes.normal ? new Float32Array(m.attributes.normal.array) : null;
  const P = doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buf);
  const N = nor && doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buf);
  for (let i = 0; i < pos.length; i += 3) for (let k = 0; k < 3; k++) { bb[k] = Math.min(bb[k], pos[i + k]); bb[k + 3] = Math.max(bb[k + 3], pos[i + k]); }
  const byColor = new Map();
  for (const g of groups) {
    const c = (g.color || m.color || [.7, .7, .7]).map(v => Math.round(v * 20) / 20), key = c.join();
    (byColor.get(key) || byColor.set(key, { c, idx: [] }).get(key)).idx.push(...m.index.array.slice(g.first * 3, (g.last + 1) * 3));
  }
  for (const { c, idx } of byColor.values()) {
    const key = c.join();
    if (!mats.has(key)) mats.set(key, doc.createMaterial(key).setBaseColorFactor([...c, 1]).setMetallicFactor(.1).setRoughnessFactor(.6));
    const prim = doc.createPrimitive().setAttribute('POSITION', P).setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(idx)).setBuffer(buf)).setMaterial(mats.get(key));
    if (N) prim.setAttribute('NORMAL', N);
    mesh.addPrimitive(prim); tris += idx.length / 3;
  }
  console.log(mi, m.name, m.attributes.position.array.length / 3, 'verts', m.color);
});
console.log('tris', tris, 'bbox mm', bb.map(Math.round));
await new NodeIO().write(out, doc);
console.log('written', out, (fs.statSync(out).size / 1e6).toFixed(1), 'MB');
