import * as THREE from 'three';
import { materials } from '../../scene/materials';

/**
 * Cabo 3D real: tubo ao longo de uma CatmullRomCurve3.
 * A geometria é alocada uma vez; quando os pontos mudam, os vértices são
 * recalculados no lugar (nunca se recria a BufferGeometry por frame).
 */
export class Cable extends THREE.Mesh<THREE.BufferGeometry, THREE.Material> {
  readonly curve: THREE.CatmullRomCurve3;
  private readonly segments: number;
  private readonly radial: number;
  private readonly radius: number;
  private dirty = true;
  private readonly tmpP = new THREE.Vector3();
  private readonly tmpN = new THREE.Vector3();

  constructor(points: THREE.Vector3[], radius = 0.035, segments = 72, radial = 6, material: THREE.Material = materials.cable) {
    super(new THREE.BufferGeometry(), material);
    this.curve = new THREE.CatmullRomCurve3(points.map((p) => p.clone()), false, 'centripetal');
    this.segments = segments;
    this.radial = radial;
    this.radius = radius;

    const count = (segments + 1) * (radial + 1);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const index: number[] = [];
    for (let j = 1; j <= segments; j++) {
      for (let i = 1; i <= radial; i++) {
        const a = (radial + 1) * (j - 1) + (i - 1);
        const b = (radial + 1) * j + (i - 1);
        const c = (radial + 1) * j + i;
        const d = (radial + 1) * (j - 1) + i;
        index.push(a, b, d, b, c, d);
      }
    }
    this.geometry.setIndex(index);
    this.castShadow = true;
    this.frustumCulled = false; // pontos mudam; evita recomputar bounding sphere
    this.commit();
  }

  setPoint(i: number, v: THREE.Vector3): void {
    const p = this.curve.points[i];
    if (p.distanceToSquared(v) > 1e-10) {
      p.copy(v);
      this.dirty = true;
    }
  }

  /** Recalcula vértices apenas se algum ponto mudou. */
  commit(): void {
    if (!this.dirty) return;
    this.dirty = false;
    this.curve.updateArcLengths();
    const frames = this.curve.computeFrenetFrames(this.segments, false);
    const pos = this.geometry.attributes.position as THREE.BufferAttribute;
    const nor = this.geometry.attributes.normal as THREE.BufferAttribute;
    let k = 0;
    for (let i = 0; i <= this.segments; i++) {
      this.curve.getPointAt(i / this.segments, this.tmpP);
      const N = frames.normals[i];
      const B = frames.binormals[i];
      for (let j = 0; j <= this.radial; j++) {
        const v = (j / this.radial) * Math.PI * 2;
        const sin = Math.sin(v);
        const cos = -Math.cos(v);
        this.tmpN.set(cos * N.x + sin * B.x, cos * N.y + sin * B.y, cos * N.z + sin * B.z).normalize();
        nor.setXYZ(k, this.tmpN.x, this.tmpN.y, this.tmpN.z);
        pos.setXYZ(k, this.tmpP.x + this.radius * this.tmpN.x, this.tmpP.y + this.radius * this.tmpN.y, this.tmpP.z + this.radius * this.tmpN.z);
        k++;
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
  }
}
