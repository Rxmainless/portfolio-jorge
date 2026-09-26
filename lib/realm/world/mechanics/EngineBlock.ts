import * as THREE from 'three';
import { materials } from '../../scene/materials';
import { bake, box, mesh } from '../geometry';
import { Gear, GearTrain } from './Gear';

const deg = THREE.MathUtils.degToRad;

/**
 * Casa de máquinas: parede de engrenagens que aciona o canteiro.
 * Plano das engrenagens = XY local, voltado para +Z.
 * `stages` (1–3) controla quantos estágios de redução existem — cidades mais
 * complexas têm trens de engrenagem maiores.
 */
export class EngineBlock extends THREE.Group {
  readonly train = new GearTrain();
  readonly lamps: THREE.Mesh[] = [];

  constructor(lampMaterial: THREE.MeshStandardMaterial, stages = 3) {
    super();
    const m = 0.1;
    const t = 0.32;
    const main = this.train.addRoot(new Gear({ teeth: 40, module: m, thickness: t, spokes: true }), 0, 3.3, 0);
    const g2 = this.train.addMeshed(new Gear({ teeth: 16, module: m, thickness: t, material: materials.steelLight }), main, deg(-28));
    const g3 = this.train.addMeshed(new Gear({ teeth: 28, module: m, thickness: t, spokes: true }), main, deg(162));
    if (stages >= 2) {
      this.train.addMeshed(new Gear({ teeth: 12, module: m, thickness: t, material: materials.steelLight }), g3, deg(248));
      const g5 = this.train.addMeshed(new Gear({ teeth: 22, module: m, thickness: t, spokes: true }), g2, deg(48));
      if (stages >= 3) {
        // Estágio composto: pinhão coaxial à frente, acionando uma engrenagem menor
        const c1 = this.train.addCoaxial(new Gear({ teeth: 10, module: m, thickness: t, material: materials.steelLight }), g5, t + 0.02);
        this.train.addMeshed(new Gear({ teeth: 18, module: m, thickness: t }), c1, deg(-70));
      }
    }
    this.add(this.train);

    const stat = new THREE.Group();
    const plinth = mesh(box(12, 0.6, 2), materials.iron);
    plinth.position.set(0, 0.3, -0.5);
    const back = mesh(box(11.4, 6.6, 0.2), materials.iron);
    back.position.set(0, 3.6, -0.75);
    const beam = mesh(box(12, 0.4, 0.7), materials.darkSteel);
    beam.position.set(0, 7.1, -0.5);
    stat.add(plinth, back, beam);
    for (const x of [-5.8, 5.8]) {
      const post = mesh(box(0.45, 6.8, 0.7), materials.darkSteel);
      post.position.set(x, 3.7, -0.5);
      stat.add(post);
      const lamp = mesh(box(0.2, 0.2, 0.12), lampMaterial, false, false);
      lamp.position.set(x, 6.4, -0.08);
      this.lamps.push(lamp);
      this.add(lamp);
    }
    for (const g of this.train.gears) stat.add(g.axleMesh());
    this.add(bake(stat));
  }

  setDrive(angle: number): void {
    this.train.setDrive(angle);
  }
}
