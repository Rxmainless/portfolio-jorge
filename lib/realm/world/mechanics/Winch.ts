import * as THREE from 'three';
import { materials } from '../../scene/materials';
import { bake, box, cylinder, mesh } from '../geometry';
import { Cable } from './Cable';
import { Gear, GearTrain } from './Gear';
import { Pulley } from './Pulley';

export interface WinchOptions {
  mastHeight?: number;
  /** Distância (para dentro) do mastro até a saída do cabo na polia. */
  reach?: number;
  lampMaterial: THREE.MeshStandardMaterial;
}

export const CABLE_Z = 0.28;
export const DRUM_R = 0.3;
const PULLEY_R = 0.3;

/**
 * Mastro de içamento: tambor + par de engrenagens + freio na base,
 * braço com polia no topo, cabo descendo até a âncora da plataforma.
 *
 * Frame local: +X aponta para FORA do poço; o cabo vive no plano z = CABLE_Z.
 * Estrutura estática fundida por material; só as partes móveis são objetos próprios.
 */
export class Winch extends THREE.Group {
  readonly cable: Cable;
  readonly pulley: Pulley;
  readonly drum = new THREE.Group();
  readonly train = new GearTrain();
  /** Sapata do freio: parte mecânica com posição inicial → final. */
  readonly brake = new THREE.Group();
  readonly lamp: THREE.Mesh;

  private readonly drumC = new THREE.Vector2(0.95, 0.8);
  private readonly pulleyC: THREE.Vector2;
  private readonly exitX: number;
  private readonly p0 = new THREE.Vector3();
  private readonly pEntry = new THREE.Vector3();
  private readonly arc: THREE.Vector3[] = [];
  private readonly pts: THREE.Vector3[] = [];

  constructor(opts: WinchOptions) {
    super();
    const H = opts.mastHeight ?? 7.6;
    const reach = opts.reach ?? 2.3;
    this.pulleyC = new THREE.Vector2(-(reach - PULLEY_R), H - 0.6);
    this.exitX = -reach;

    const stat = new THREE.Group();
    this.buildMast(stat, H, reach);

    // Polia no topo
    this.pulley = new Pulley(PULLEY_R);
    this.pulley.position.set(this.pulleyC.x, this.pulleyC.y, CABLE_Z);
    this.add(this.pulley);
    const pAxle = mesh(cylinder(0.06, 0.06, 0.42, 10), materials.iron);
    pAxle.rotation.x = Math.PI / 2;
    pAxle.position.set(this.pulleyC.x, this.pulleyC.y, CABLE_Z - 0.1);
    stat.add(pAxle);

    // Tambor (rotor fundido)
    const drumAxis = new THREE.Group();
    const flange = mesh(cylinder(DRUM_R + 0.1, DRUM_R + 0.1, 0.05, 24), materials.steel);
    const flange2 = flange.clone();
    flange.position.y = 0.3;
    flange2.position.y = -0.3;
    const stripe = mesh(box(0.05, 0.58, 0.05), materials.steel);
    stripe.position.x = DRUM_R;
    drumAxis.add(mesh(cylinder(DRUM_R, DRUM_R, 0.56, 24), materials.darkSteel), flange, flange2, stripe);
    drumAxis.rotation.x = Math.PI / 2;
    this.drum.add(drumAxis);
    bake(this.drum);
    this.drum.position.set(this.drumC.x, this.drumC.y, CABLE_Z);
    this.add(this.drum);

    for (const z of [CABLE_Z - 0.38, CABLE_Z + 0.38]) {
      const stand = mesh(box(0.5, this.drumC.y, 0.08), materials.iron);
      stand.position.set(this.drumC.x, this.drumC.y / 2, z);
      stat.add(stand);
    }

    // Par de engrenagens: coroa no tambor + pinhão do motor
    const crown = new Gear({ teeth: 24, module: 0.05, thickness: 0.1, spokes: true });
    const pinion = new Gear({ teeth: 10, module: 0.05, thickness: 0.1, material: materials.steelLight });
    this.train.addRoot(crown);
    this.train.addMeshed(pinion, crown, THREE.MathUtils.degToRad(50));
    this.train.position.set(this.drumC.x, this.drumC.y, CABLE_Z + 0.5);
    this.add(this.train);

    const mp = pinion.position.clone().add(this.train.position);
    const motor = mesh(box(0.5, 0.45, 0.42), materials.darkSteel);
    motor.position.set(mp.x, mp.y, mp.z + 0.3);
    const pedestal = mesh(box(0.36, mp.y - 0.22, 0.36), materials.iron);
    pedestal.position.set(mp.x, (mp.y - 0.22) / 2, mp.z + 0.3);
    stat.add(motor, pedestal);

    // Freio: sapata encostada no tambor; ao liberar, recua em +X
    const shoe = mesh(box(0.1, 0.42, 0.5), materials.steel);
    const shoeArm = mesh(box(0.08, 0.7, 0.08), materials.steel);
    shoeArm.position.set(0.06, -0.45, 0);
    this.brake.add(shoe, shoeArm);
    bake(this.brake);
    this.brake.position.set(this.drumC.x + DRUM_R + 0.05, this.drumC.y, CABLE_Z);
    this.add(this.brake);

    this.lamp = mesh(box(0.16, 0.16, 0.16), opts.lampMaterial, false, false);
    this.lamp.position.set(0, H + 0.1, 0);
    this.add(this.lamp);

    this.add(bake(stat));

    // Cabo: tambor → (catenária) → polia (arco) → saída → (arco) → âncora
    const dir = new THREE.Vector2().subVectors(this.pulleyC, this.drumC).normalize();
    const n = new THREE.Vector2(dir.y, -dir.x); // perpendicular do lado externo
    const rd = DRUM_R + 0.035;
    this.p0.set(this.drumC.x + n.x * rd, this.drumC.y + n.y * rd, CABLE_Z);
    this.pEntry.set(this.pulleyC.x + n.x * PULLEY_R, this.pulleyC.y + n.y * PULLEY_R, CABLE_Z);
    const a0 = Math.atan2(n.y, n.x);
    for (let i = 1; i <= 3; i++) {
      const a = a0 + ((Math.PI - a0) * i) / 4;
      this.arc.push(new THREE.Vector3(this.pulleyC.x + Math.cos(a) * PULLEY_R, this.pulleyC.y + Math.sin(a) * PULLEY_R, CABLE_Z));
    }
    for (let i = 0; i < 9; i++) this.pts.push(new THREE.Vector3());
    this.cable = new Cable(this.cablePoints(-8, 1), 0.035);
    this.add(this.cable);
  }

  /** Posição (no frame do pai) onde o cabo toca a plataforma, no nível y=0. */
  anchorInParent(target = new THREE.Vector3()): THREE.Vector3 {
    this.updateMatrix();
    return target.set(this.exitX, 0, CABLE_Z).applyMatrix4(this.matrix);
  }

  /**
   * @param anchorY altura da âncora na plataforma (winch e plataforma compartilham o mesmo pai)
   * @param slack   0 = cabo tensionado; 1 = frouxo
   * @param drumAngle ângulo do tambor (rad)
   */
  update(anchorY: number, slack: number, drumAngle: number): void {
    this.drum.rotation.z = drumAngle;
    this.train.setDrive(drumAngle);
    this.pulley.angle = drumAngle * (DRUM_R / PULLEY_R);
    const pts = this.cablePoints(anchorY, slack);
    for (let i = 0; i < pts.length; i++) this.cable.setPoint(i, pts[i]);
    this.cable.commit();
  }

  private cablePoints(anchorY: number, slack: number): THREE.Vector3[] {
    const [p0, s1, entry, a1, a2, a3, exit, s2, anchor] = this.pts;
    p0.copy(this.p0);
    entry.copy(this.pEntry);
    a1.copy(this.arc[0]);
    a2.copy(this.arc[1]);
    a3.copy(this.arc[2]);
    s1.copy(this.p0).lerp(this.pEntry, 0.5);
    s1.y -= slack * 1.1;
    s1.x += slack * 0.25;
    exit.set(this.exitX, this.pulleyC.y, CABLE_Z);
    anchor.set(this.exitX, anchorY, CABLE_Z);
    s2.copy(exit).lerp(anchor, 0.5);
    s2.x -= slack * 0.45;
    return this.pts;
  }

  private buildMast(stat: THREE.Group, H: number, reach: number): void {
    const base = mesh(box(1.3, 0.2, 1.3), materials.iron);
    base.position.set(0.3, 0.1, 0.1);
    stat.add(base);

    const s = 0.17;
    for (const [x, z] of [[-s, -s], [s, -s], [s, s], [-s, s]]) {
      const bar = mesh(box(0.07, H, 0.07), materials.darkSteel);
      bar.position.set(x, H / 2, z);
      stat.add(bar);
    }
    const levels = 8;
    const step = H / levels;
    const diagLen = Math.hypot(2 * s, step);
    const diagAng = Math.atan2(2 * s, step);
    for (let i = 0; i <= levels; i++) {
      const tie = mesh(box(0.42, 0.05, 0.42), materials.darkSteel);
      tie.position.set(0, i * step + 0.02, 0);
      stat.add(tie);
      if (i === levels) break;
      for (const z of [-s, s]) {
        const d = mesh(box(0.035, diagLen, 0.035), materials.darkSteel);
        d.position.set(0, i * step + step / 2, z);
        d.rotation.z = (i % 2 === 0 ? 1 : -1) * diagAng;
        stat.add(d);
      }
    }
    const armLen = reach + 0.2;
    const arm = mesh(box(armLen, 0.2, 0.18), materials.darkSteel);
    arm.position.set(-armLen / 2 + 0.2, H - 0.12, 0);
    stat.add(arm);
    const bx0 = 0;
    const by0 = H - 1.5;
    const bx1 = -reach * 0.7;
    const by1 = H - 0.2;
    const blen = Math.hypot(bx1 - bx0, by1 - by0);
    const brace = mesh(box(0.08, blen, 0.08), materials.darkSteel);
    brace.position.set((bx0 + bx1) / 2, (by0 + by1) / 2, 0);
    brace.rotation.z = Math.atan2(-(bx1 - bx0), by1 - by0);
    stat.add(brace);
    const hanger = mesh(box(0.1, 0.5, 0.36), materials.iron);
    hanger.position.set(this.pulleyC.x, H - 0.4, CABLE_Z / 2);
    stat.add(hanger);
  }

  dispose(): void {
    this.cable.dispose();
  }
}
