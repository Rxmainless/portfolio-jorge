import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface RectHole {
  x: number;
  z: number;
  w: number;
  d: number;
  /** Rotação em torno de Y (rad). */
  rot?: number;
}

/** Cantos (x, z) de um retângulo possivelmente rotacionado. */
export function rectCorners(h: RectHole): [number, number][] {
  const c = Math.cos(h.rot ?? 0);
  const s = Math.sin(h.rot ?? 0);
  return [
    [-h.w / 2, -h.d / 2],
    [h.w / 2, -h.d / 2],
    [h.w / 2, h.d / 2],
    [-h.w / 2, h.d / 2],
  ].map(([x, z]) => [h.x + x * c + z * s, h.z - x * s + z * c]);
}

/**
 * Laje horizontal com furos retangulares (topo em y=0, base em y=-thickness).
 * Usada para terreno, deck da plataforma e fundação: as peças emergem pelos furos.
 */
export function slabWithHoles(width: number, depth: number, thickness: number, holes: RectHole[] = []): THREE.BufferGeometry {
  const shape = rectShape(0, 0, width, depth);
  for (const h of holes) {
    // Shape y = -z (por causa da rotação abaixo).
    const pts = rectCorners(h).map(([x, z]) => new THREE.Vector2(x, -z));
    if (!THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    shape.holes.push(new THREE.Path(pts));
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thickness, 0);
  return geo;
}

export function rectShape(cx: number, cy: number, w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(cx - w / 2, cy - h / 2);
  s.lineTo(cx + w / 2, cy - h / 2);
  s.lineTo(cx + w / 2, cy + h / 2);
  s.lineTo(cx - w / 2, cy + h / 2);
  s.closePath();
  return s;
}

/** Polígono no plano XZ extrudado para cima (y de 0 a thickness). Pontos (x, z) em sentido anti-horário visto de cima. */
export function polygonSlab(points: [number, number][], thickness: number): THREE.BufferGeometry {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/** Cache de geometrias primitivas: peças idênticas compartilham a mesma geometria. */
const boxCache = new Map<string, THREE.BoxGeometry>();
export function box(w: number, h: number, d: number): THREE.BoxGeometry {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}`;
  let g = boxCache.get(key);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    boxCache.set(key, g);
  }
  return g;
}

const cylCache = new Map<string, THREE.CylinderGeometry>();
export function cylinder(rTop: number, rBottom: number, h: number, seg = 20): THREE.CylinderGeometry {
  const key = `${rTop}|${rBottom}|${h}|${seg}`;
  let g = cylCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(rTop, rBottom, h, seg);
    cylCache.set(key, g);
  }
  return g;
}

export function disposeGeometryCaches(): void {
  boxCache.forEach((g) => g.dispose());
  cylCache.forEach((g) => g.dispose());
  boxCache.clear();
  cylCache.clear();
}

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, cast = true, receive = true): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

/**
 * Funde todos os meshes de um grupo em um mesh por material (menos draw calls).
 * Usado para estruturas estáticas e para rotores compostos de várias peças.
 * O grupo original é esvaziado e recebe os meshes fundidos.
 */
export function bake(group: THREE.Group, cast = true, receive = true): THREE.Group {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const meshes: THREE.Mesh[] = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) meshes.push(m);
  });
  for (const m of meshes) {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const mat = m.material as THREE.Material;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(g);
  }
  group.clear();
  byMat.forEach((geos, mat) => {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (merged) group.add(mesh(merged, mat, cast, receive));
  });
  return group;
}

/** Libera geometrias de uma subárvore. */
export function disposeTree(root: THREE.Object3D): void {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
}
