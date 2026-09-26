import * as THREE from 'three';
import { materials } from '../../scene/materials';
import { bake, box, cylinder, mesh } from '../geometry';

/**
 * Polia com canal (dois flanges + miolo) e raios visíveis. Gira em torno de Z local.
 * O rotor é fundido num único mesh; o eixo fica a cargo da estrutura do dono.
 */
export class Pulley extends THREE.Group {
  readonly rotor = new THREE.Group();

  constructor(readonly radius: number, width = 0.16) {
    super();
    const disc = new THREE.Group();
    const f1 = mesh(cylinder(radius * 1.2, radius * 1.2, width * 0.22, 28), materials.steel);
    const f2 = f1.clone();
    f1.position.y = width / 2;
    f2.position.y = -width / 2;
    const core = mesh(cylinder(radius, radius, width, 28), materials.darkSteel);
    const spoke = mesh(box(radius * 2.1, width * 1.3, radius * 0.2), materials.steel);
    const spoke2 = spoke.clone();
    spoke2.rotation.y = Math.PI / 2;
    disc.add(f1, f2, core, spoke, spoke2);
    disc.rotation.x = Math.PI / 2; // eixo do cilindro → Z
    this.rotor.add(disc);
    bake(this.rotor);
    this.add(this.rotor);
  }

  set angle(a: number) {
    this.rotor.rotation.z = a;
  }
}
