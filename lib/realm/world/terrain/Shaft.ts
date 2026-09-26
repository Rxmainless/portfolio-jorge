import * as THREE from 'three';
import { materials } from '../../scene/materials';
import { bake, box, mesh, polygonSlab } from '../geometry';

export interface ShaftOptions {
  /** Meia-largura do poço. */
  half: number;
  depth: number;
  /** Chanfro dos cantos da escotilha (passagem dos cabos). */
  chamfer: number;
  /** Espessura do terreno ao redor (o poço começa abaixo dela). */
  groundThickness: number;
  markerMaterial: THREE.MeshStandardMaterial;
}

/**
 * Poço de elevação sob o terreno: paredes, trilhos-guia, marcadores de nível
 * e escotilha de duas folhas que desliza para dentro do terreno.
 * Origem = centro do poço, y=0 no nível do solo.
 */
export class Shaft extends THREE.Group {
  readonly doorLeft = new THREE.Group();
  readonly doorRight = new THREE.Group();
  /** Paredes, trilhos e marcadores, só visíveis com a escotilha aberta. */
  readonly interior: THREE.Group;

  constructor(readonly opts: ShaftOptions) {
    super();
    const { half: h, depth, chamfer: c } = opts;
    const top = -opts.groundThickness;
    const wallH = depth + top;
    const t = 0.4;
    const stat = new THREE.Group();

    const walls: [number, number, number, number][] = [
      [0, -(h + t / 2), 2 * h + 2 * t, t],
      [0, h + t / 2, 2 * h + 2 * t, t],
      [-(h + t / 2), 0, t, 2 * h],
      [h + t / 2, 0, t, 2 * h],
    ];
    for (const [x, z, w, d] of walls) {
      const wall = mesh(box(w, wallH, d), materials.shaft);
      wall.position.set(x, top - wallH / 2, z);
      stat.add(wall);
    }
    const floor = mesh(box(2 * h, 0.3, 2 * h), materials.shaft);
    floor.position.y = -depth - 0.15;
    stat.add(floor);

    // Anéis horizontais e trilhos verticais: referência de movimento durante a subida
    for (let y = top - 1.2; y > -depth; y -= 1.6) {
      for (const [x, z, w, d] of walls) {
        const band = mesh(box(w === t ? 0.06 : w - 2 * t, 0.12, d === t ? 0.06 : d), materials.darkSteel);
        band.position.set(x === 0 ? 0 : x - Math.sign(x) * (t / 2 + 0.03), y, z === 0 ? 0 : z - Math.sign(z) * (t / 2 + 0.03));
        stat.add(band);
      }
    }
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rail = mesh(box(sx ? 0.14 : 0.3, wallH, sz ? 0.14 : 0.3), materials.steel);
      rail.position.set(sx * (h - 0.07), top - wallH / 2, sz * (h - 0.07));
      stat.add(rail);
    }
    // Marcadores âmbar nos cantos (acendem quando a escotilha abre)
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      for (let i = 0; i < 4; i++) {
        const mk = mesh(box(0.12, 0.3, 0.12), opts.markerMaterial, false, false);
        mk.position.set(sx * (h - 0.1), top - 0.6 - i * 2.4, sz * (h - 0.1));
        stat.add(mk);
      }
    }
    this.interior = bake(stat, false, true);
    this.add(this.interior);

    // Escotilha: duas folhas com cantos chanfrados, topo em -0.04
    const g = 0.01;
    const left: [number, number][] = [[-g, h], [-(h - c), h], [-h, h - c], [-h, -(h - c)], [-(h - c), -h], [-g, -h]];
    const right: [number, number][] = left.map(([x, z]) => [-x, z] as [number, number]);
    for (const [door, poly, sgn] of [[this.doorLeft, left, -1], [this.doorRight, right, 1]] as const) {
      door.add(mesh(polygonSlab(poly as [number, number][], 0.3), materials.darkSteel));
      for (let i = 0; i < 3; i++) {
        const strip = mesh(box(0.12, 0.02, 2 * h - 2 * c - 0.4), materials.steel, false, true);
        strip.position.set(sgn * (0.5 + i * ((h - 1) / 3)), 0.31, 0);
        door.add(strip);
      }
      bake(door);
      door.position.y = -0.34;
      this.add(door);
    }
  }
}
