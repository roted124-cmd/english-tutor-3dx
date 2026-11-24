const fs = require('fs');
fs.mkdirSync('public/models', { recursive: true });

function buildGLB(meshes) {
  let binParts = [];
  let bufferViews = [];
  let accessors = [];
  let gltfMeshes = [];
  let nodes = [];
  let materials = [];

  meshes.forEach((m, idx) => {
    const pos = new Float32Array(m.positions);
    const norm = new Float32Array(m.normals);
    const ind = new Uint16Array(m.indices);

    const pad = (buf) => {
      const rem = buf.length % 4;
      return rem === 0 ? buf : Buffer.concat([buf, Buffer.alloc(4 - rem)]);
    };

    const posBuf = pad(Buffer.from(pos.buffer));
    const normBuf = pad(Buffer.from(norm.buffer));
    const indBuf = pad(Buffer.from(ind.buffer));

    const off0 = binParts.reduce((a, b) => a + b.length, 0);
    binParts.push(posBuf);
    const off1 = binParts.reduce((a, b) => a + b.length, 0);
    binParts.push(normBuf);
    const off2 = binParts.reduce((a, b) => a + b.length, 0);
    binParts.push(indBuf);

    const bvBase = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: off0, byteLength: pos.byteLength, target: 34962 });
    bufferViews.push({ buffer: 0, byteOffset: off1, byteLength: norm.byteLength, target: 34962 });
    bufferViews.push({ buffer: 0, byteOffset: off2, byteLength: ind.byteLength, target: 34963 });

    const accBase = accessors.length;
    accessors.push({ bufferView: bvBase, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: m.min, max: m.max });
    accessors.push({ bufferView: bvBase + 1, componentType: 5126, count: norm.length / 3, type: 'VEC3' });
    accessors.push({ bufferView: bvBase + 2, componentType: 5123, count: ind.length, type: 'SCALAR' });

    materials.push({ pbrMetallicRoughness: { baseColorFactor: m.color, metallicFactor: 0.1, roughnessFactor: 0.4 } });
    gltfMeshes.push({ primitives: [{ attributes: { POSITION: accBase, NORMAL: accBase + 1 }, indices: accBase + 2, material: idx }] });
    nodes.push({ mesh: idx });
  });

  const bin = Buffer.concat(binParts);
  const gltf = {
    asset: { version: '2.0', generator: 'KidsTutorGLB' },
    scene: 0,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes: gltfMeshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: bin.length }]
  };

  let jsonBuf = Buffer.from(JSON.stringify(gltf));
  const jRem = jsonBuf.length % 4;
  if (jRem !== 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(4 - jRem, 0x20)]);

  const totalLen = 12 + 8 + jsonBuf.length + 8 + bin.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLen, 8);

  const jHeader = Buffer.alloc(8);
  jHeader.writeUInt32LE(jsonBuf.length, 0);
  jHeader.writeUInt32LE(0x4E4F534A, 4);

  const bHeader = Buffer.alloc(8);
  bHeader.writeUInt32LE(bin.length, 0);
  bHeader.writeUInt32LE(0x004E4942, 4);

  return Buffer.concat([header, jHeader, jsonBuf, bHeader, bin]);
}

function makeBox(cx, cy, cz, sx, sy, sz, color) {
  const x0 = cx - sx/2, x1 = cx + sx/2, y0 = cy - sy/2, y1 = cy + sy/2, z0 = cz - sz/2, z1 = cz + sz/2;
  const positions = [
    x0,y0,z1, x1,y0,z1, x1,y1,z1, x0,y1,z1,
    x1,y0,z0, x0,y0,z0, x0,y1,z0, x1,y1,z0,
    x0,y1,z1, x1,y1,z1, x1,y1,z0, x0,y1,z0,
    x0,y0,z0, x1,y0,z0, x1,y0,z1, x0,y0,z1,
    x1,y0,z1, x1,y0,z0, x1,y1,z0, x1,y1,z1,
    x0,y0,z0, x0,y0,z1, x0,y1,z1, x0,y1,z0
  ];
  const normals = [
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0
  ];
  const indices = [
    0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11,
    12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23
  ];
  return { positions, normals, indices, min: [x0, y0, z0], max: [x1, y1, z1], color };
}

// Generowanie plików .glb (Robot, Lisek, Kaczka, Autko, Awokado)
fs.writeFileSync('public/models/robot.glb', buildGLB([
  makeBox(0, 1.1, 0, 1.2, 1.5, 0.9, [0.23, 0.51, 0.96, 1]),
  makeBox(0, 2.4, 0, 1.1, 1.0, 1.0, [0.98, 0.75, 0.14, 1]),
  makeBox(-0.25, 2.5, 0.52, 0.2, 0.2, 0.08, [0.06, 0.09, 0.16, 1]),
  makeBox(0.25, 2.5, 0.52, 0.2, 0.2, 0.08, [0.06, 0.09, 0.16, 1]),
  makeBox(0, 2.15, 0.52, 0.45, 0.15, 0.08, [0.95, 0.25, 0.37, 1]),
  makeBox(-0.85, 1.2, 0, 0.3, 1.1, 0.3, [0.58, 0.64, 0.72, 1]),
  makeBox(0.85, 1.2, 0, 0.3, 1.1, 0.3, [0.58, 0.64, 0.72, 1])
]));

fs.writeFileSync('public/models/fox.glb', buildGLB([
  makeBox(0, 0, 0, 45, 40, 50, [0.96, 0.45, 0.08, 1]),
  makeBox(-14, 28, 0, 12, 20, 10, [0.96, 0.45, 0.08, 1]),
  makeBox(14, 28, 0, 12, 20, 10, [0.96, 0.45, 0.08, 1]),
  makeBox(0, -6, 28, 22, 16, 18, [1, 1, 1, 1]),
  makeBox(0, -2, 38, 8, 8, 6, [0.06, 0.09, 0.16, 1])
]));

fs.writeFileSync('public/models/duck.glb', buildGLB([
  makeBox(0, -0.1, 0, 0.9, 0.7, 1.1, [0.98, 0.8, 0.08, 1]),
  makeBox(0, 0.45, 0.25, 0.6, 0.55, 0.6, [0.98, 0.8, 0.08, 1]),
  makeBox(0, 0.4, 0.65, 0.3, 0.16, 0.35, [0.98, 0.45, 0.08, 1])
]));

fs.writeFileSync('public/models/car.glb', buildGLB([
  makeBox(0, 0, 0, 0.06, 0.02, 0.035, [0.94, 0.27, 0.27, 1]),
  makeBox(-0.005, 0.018, 0, 0.032, 0.018, 0.03, [0.22, 0.74, 0.97, 1]),
  makeBox(-0.018, -0.012, 0.018, 0.014, 0.014, 0.008, [0.06, 0.09, 0.16, 1]),
  makeBox(0.018, -0.012, 0.018, 0.014, 0.014, 0.008, [0.06, 0.09, 0.16, 1])
]));

fs.writeFileSync('public/models/avocado.glb', buildGLB([
  makeBox(0, 0, 0, 0.055, 0.075, 0.045, [0.13, 0.55, 0.13, 1]),
  makeBox(0, -0.008, 0.02, 0.026, 0.026, 0.015, [0.47, 0.21, 0.06, 1])
]));

console.log('Generated binary .glb models!');
