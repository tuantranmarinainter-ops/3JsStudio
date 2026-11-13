// nen-model.mjs: nén tại chỗ, đánh dấu "nen" để không nén chồng, giữ số đỉnh + hộp bao.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { nenModel } from '../nen-model.mjs';

const DIR = path.join(process.cwd(), 'output', '_tmp', 'nen-model-test-' + process.pid);

async function taoLuoi(file, n = 60) {   // lưới n×n đỉnh, float32, có pháp tuyến + UV
  const doc = new Document(); const buf = doc.createBuffer();
  const pos = [], nor = [], uv = [], idx = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { pos.push(i * 0.1, Math.sin(i * j) * 0.2, j * 0.1); nor.push(0, 1, 0); uv.push(i / n, j / n); }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) { const a = i * n + j; idx.push(a, a + 1, a + n, a + 1, a + n + 1, a + n); }
  const acc = (arr, type, T = Float32Array) => doc.createAccessor().setArray(new T(arr)).setType(type).setBuffer(buf);
  const prim = doc.createPrimitive().setAttribute('POSITION', acc(pos, 'VEC3')).setAttribute('NORMAL', acc(nor, 'VEC3')).setAttribute('TEXCOORD_0', acc(uv, 'VEC2')).setIndices(acc(idx, 'SCALAR', Uint32Array));
  doc.createScene('s').addChild(doc.createNode('luoi').setMesh(doc.createMesh('luoi').addPrimitive(prim)));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await new NodeIO().write(file, doc);
}
const doc = (f) => new NodeIO().registerExtensions(ALL_EXTENSIONS).read(f);

test('nenModel: nhỏ hơn, giữ số đỉnh + tên nút, đánh dấu và không nén chồng', async () => {
  const f = path.join(DIR, 'luoi.glb');
  try {
    await taoLuoi(f);
    const truoc = fs.statSync(f).size;
    const thu = await nenModel(f, { thu: true });
    assert.equal(fs.statSync(f).size, truoc, '--thu không được ghi');
    assert.ok(thu.sau < truoc);
    const r = await nenModel(f, { luuGoc: false });
    assert.ok(!r.boQua && r.sau < truoc * 0.8, `chỉ giảm ${r.giam}%`);
    assert.equal(fs.statSync(f).size, r.sau);
    assert.deepEqual(r.dinh, [3600, 3600]);
    const d = await doc(f); const root = d.getRoot();
    assert.ok(root.getAsset().extras.nen);
    assert.ok(root.listExtensionsUsed().some((e) => e.extensionName === 'KHR_mesh_quantization'));
    assert.equal(root.listNodes()[0].getName(), 'luoi');
    const r2 = await nenModel(f, { luuGoc: false });
    assert.match(r2.boQua || '', /đã nén/);
  } finally { fs.rmSync(DIR, { recursive: true, force: true }); }
});
