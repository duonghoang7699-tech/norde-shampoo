// A pump bottle built from a superellipse cross-section, so the front reads flat
// like the reference while the sides and shoulder stay soft.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { labelTexture } from './textures.js';

const A = 0.45, B = 0.25, N = 4.2; // half width, half depth, superellipse power
const BODY_H = 1.62, SHOULDER = 0.3, NECK_R = 0.115;
export const BOTTLE_HEIGHT = 2.42;

function sePoint(t, a, b, n) {
  const c = Math.cos(t), s = Math.sin(t);
  return [a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n)];
}

function bodyGeometry() {
  const SEG = 160, RINGS = 120;
  // perimeter + arc-length table on the base section (for undistorted label u)
  const base = [];
  for (let i = 0; i <= SEG; i++) base.push(sePoint(-Math.PI / 2 + (i / SEG) * Math.PI * 2, A, B, N));
  const cum = [0];
  for (let i = 1; i <= SEG; i++) cum.push(cum[i - 1] + Math.hypot(base[i][0] - base[i - 1][0], base[i][1] - base[i - 1][1]));
  const perim = cum[SEG];
  const totalH = BODY_H + SHOULDER;

  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= RINGS; j++) {
    const y = (j / RINGS) * totalH;
    let a = A, b = B, n = N, s = 1;
    if (y < 0.07) s = 0.9 + 0.1 * Math.sqrt(1 - (1 - y / 0.07) ** 2); // rounded foot
    if (y > BODY_H) {
      const t = (y - BODY_H) / SHOULDER;
      const f = 1 - Math.sqrt(Math.max(0, 1 - t * t));
      a = THREE.MathUtils.lerp(A, NECK_R, f);
      b = THREE.MathUtils.lerp(B, NECK_R, f);
      n = THREE.MathUtils.lerp(N, 2, f);
    }
    for (let i = 0; i <= SEG; i++) {
      const [x, z] = sePoint(-Math.PI / 2 + (i / SEG) * Math.PI * 2, a * s, b * s, n);
      pos.push(x, y, z);
      uv.push(1 - cum[i] / perim, y / totalH);
    }
  }
  const row = SEG + 1;
  for (let j = 0; j < RINGS; j++) for (let i = 0; i < SEG; i++) {
    const p = j * row + i;
    idx.push(p, p + row, p + 1, p + 1, p + row, p + row + 1);
  }
  // bottom cap
  const c0 = pos.length / 3;
  pos.push(0, 0, 0); uv.push(0.5, 0);
  for (let i = 0; i < SEG; i++) idx.push(c0, i + 1, i);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, perim, totalH };
}

function ribbedCylinder(r, h, ribs, depth) {
  const g = new THREE.CylinderGeometry(r, r, h, ribs * 4, 1, false);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const ang = Math.atan2(z, x), rr = Math.hypot(x, z);
    if (rr < r * 0.5) continue;
    const k = 1 + (Math.cos(ang * ribs) > 0 ? depth : 0);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

export function createBottle(renderer) {
  const group = new THREE.Group();
  const { geo, perim, totalH } = bodyGeometry();
  const map = labelTexture(renderer, perim, totalH);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    map, roughness: 0.46, metalness: 0, clearcoat: 0.55, clearcoatRoughness: 0.28, envMapIntensity: 1.0,
  });
  const body = new THREE.Mesh(geo, bodyMat);
  body.castShadow = true; body.receiveShadow = true;
  group.add(body);

  const pumpMat = new THREE.MeshPhysicalMaterial({ color: 0x232326, roughness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.3 });

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(NECK_R, NECK_R, 0.08, 48), pumpMat);
  neck.position.y = totalH + 0.04;
  const collar = new THREE.Mesh(ribbedCylinder(0.165, 0.2, 36, 0.035), pumpMat);
  collar.position.y = totalH + 0.16;
  const collarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 48), pumpMat);
  collarTop.position.y = totalH + 0.275;
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 32), pumpMat);
  stem.position.y = totalH + 0.35;

  // pump head: rounded block + nozzle
  const headShape = new THREE.Shape();
  const hw = 0.13, hh = 0.11, rr = 0.04;
  headShape.moveTo(-hw + rr, -hh); headShape.lineTo(hw - rr, -hh); headShape.quadraticCurveTo(hw, -hh, hw, -hh + rr);
  headShape.lineTo(hw, hh - rr); headShape.quadraticCurveTo(hw, hh, hw - rr, hh); headShape.lineTo(-hw + rr, hh);
  headShape.quadraticCurveTo(-hw, hh, -hw, hh - rr); headShape.lineTo(-hw, -hh + rr); headShape.quadraticCurveTo(-hw, -hh, -hw + rr, -hh);
  const headGeo = new THREE.ExtrudeGeometry(headShape, { depth: 0.18, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 4, curveSegments: 10 });
  headGeo.translate(0, 0, -0.09);
  const head = new THREE.Mesh(headGeo, pumpMat);
  head.position.y = totalH + 0.52;

  const nozzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.34, 8, 24), pumpMat);
  nozzle.rotation.z = Math.PI / 2;
  nozzle.position.set(-0.26, totalH + 0.585, 0);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 20), pumpMat);
  tip.position.set(-0.45, totalH + 0.555, 0);

  for (const m of [neck, collar, collarTop, stem, head, nozzle, tip]) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  return group;
}

export { mergeGeometries };
