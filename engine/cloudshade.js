// cloudshade.js — BÓNG MÂY TRÔI trên mặt đất, dùng chung gió (engine/wind.js: cloudOpen, uCloud, uWindScroll).
// Học từ Painted Valley (openAt): mây trôi theo gió, bóng cỡ cánh đồng, mép mềm. Tất định: chỉ phụ thuộc uWindScroll = dir·speed·t.
//
// Cách dùng:
//   wind.set({ cloud: [0.45, 60, 2.6, 0.45] });                 // độ tối, cỡ mây (m), nhân tốc độ trôi, độ che phủ
//   const cs = createCloudShade(THREE, wind, { far: 260 });
//   cs.add(geometry, { y, x, z, rotX })                          // tấm phủ (mặt đất phẳng: PlaneGeometry/CircleGeometry) nhân màu xuống cảnh
//   cs.lightFrom(sunLight)                                       // ban đêm (nắng yếu) → không có bóng mây; gọi trong onBeforeRender
//   group.add(cs.group);  cs.set({ visible })
// 1 ShaderMaterial (1 program) dùng chung mọi tấm. Nhân (DstColor·src) nên chỉ làm TỐI, không cần đèn; cỏ (grass.js) tự đọc cloudOpen.
import * as THREE_NS from 'three';

export function createCloudShade(THREE = THREE_NS, wind, { far = 260, tint = '#c9d4ee' } = {}) {
  if (!wind) throw new Error('createCloudShade: cần wind (createWind)');
  const group = new THREE.Group(); group.name = 'cloud_shade';
  const u = { ...wind.uniforms, uSunK: { value: 1 }, uFar: { value: far }, uTint: { value: new THREE.Color(tint) } };
  const mat = new THREE.ShaderMaterial({
    name: 'cloud_shade_mat', uniforms: u, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4,
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      ${wind.glsl}
      uniform float uSunK, uFar; uniform vec3 uTint;
      varying vec3 vW;
      void main() {
        float sh = (1.0 - cloudOpen(vW.xz)) * uSunK;
        sh *= 1.0 - smoothstep(uFar * 0.6, uFar, distance(vW, cameraPosition));   // xa thì tan vào sương
        gl_FragColor = vec4(mix(vec3(1.0), uTint * (1.0 - 0.55 * sh) , min(1.0, sh * 2.0)), 1.0);
      }`,
  });
  const meshes = [];
  return {
    group, material: mat, uniforms: u,
    add(geo, { x = 0, y = 0, z = 0, rotX = -Math.PI / 2, name } = {}) {
      const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.x = rotX; m.renderOrder = 2;
      m.name = name || `cloud_shade_${meshes.length}`; m.userData.noAO = true; m.receiveShadow = false; m.castShadow = false;
      meshes.push(m); group.add(m); return m;
    },
    // ánh nắng mạnh (ngày) → có bóng; trăng/đêm (cường độ thấp) → không
    lightFrom(sun) { u.uSunK.value = sun ? Math.min(1, Math.max(0, (sun.intensity - 1.5) / 1.1)) : 0; },
    onRender(fn) { for (const m of meshes) m.onBeforeRender = fn; },
    set(p = {}) { if (p.visible != null) group.visible = !!p.visible; if (p.far != null) u.uFar.value = p.far; },
    dispose() { for (const m of meshes) m.geometry.dispose(); mat.dispose(); },
  };
}
