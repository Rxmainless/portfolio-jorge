import * as THREE from 'three';
import { createLampMaterial, materials, palette } from '../scene/materials';
import type { SkillCityConfig } from '../types/skill';
import { bake, box, mesh } from './geometry';
import { createBlueprint, type Blueprint } from './city/Blueprint';
import { part, resetParts, type MechanicalPart } from './city/MechanicalPart';
import { DECK_START_Y, SkillCity } from './city/SkillCity';
import { EngineBlock } from './mechanics/EngineBlock';
import { DRUM_R, Winch } from './mechanics/Winch';
import { Shaft } from './terrain/Shaft';

/**
 * Estado contínuo da máquina — escrito pela timeline GSAP, lido a cada frame.
 * Posições das peças vivem nos próprios Object3D (MechanicalPart).
 */
export interface MachineState {
  /** Ângulo acumulado da engrenagem motriz (rad). */
  drive: number;
  /** Rotação ociosa após a conclusão. */
  idle: number;
  /** 1 = cabos frouxos, 0 = tensionados. */
  slack: number;
  lamps: number;
  markers: number;
  windows: number;
  shaftLight: number;
}

const initialState = (): MachineState => ({ drive: 0, idle: 0, slack: 1, lamps: 0, markers: 0, windows: 0, shaftLight: 0 });

export const GROUND_T = 1;

/**
 * Canteiro de uma skill: poço + escotilha + 4 guinchos + casa de máquinas + cidade.
 * Tudo é derivado do SkillCityConfig; nada aqui é específico de uma skill.
 */
export class SkillSite extends THREE.Group {
  readonly state: MachineState = initialState();
  readonly blueprint: Blueprint;
  readonly shaft: Shaft;
  readonly winches: Winch[] = [];
  readonly engine: EngineBlock;
  readonly city: SkillCity;
  readonly parts = new Map<string, MechanicalPart>();
  /** Volume invisível usado para hover/clique. */
  readonly pickProxy: THREE.Mesh;
  /** Meia-largura do poço. */
  readonly pitHalf: number;
  /** Raio aproximado do canteiro inteiro (enquadramento de câmera). */
  readonly radius: number;
  built = false;
  /** Verdadeiro enquanto a timeline de construção desta cidade existe. */
  constructing = false;

  private readonly lampMat = createLampMaterial(palette.amber);
  private readonly markerMat = createLampMaterial(palette.amber);
  private readonly windowMat = createLampMaterial(palette.warmWhite);
  private readonly accentMat: THREE.MeshStandardMaterial;
  private highlight = 0;
  private highlightTarget = 0;

  constructor(readonly config: SkillCityConfig) {
    super();
    this.name = config.id;
    this.position.set(config.position.x, config.position.y, config.position.z);
    this.accentMat = createLampMaterial(new THREE.Color(config.color).getHex());
    this.blueprint = createBlueprint(config);
    const F = this.blueprint.foundation.half;
    const P = (this.pitHalf = +(F + 1.4).toFixed(3));
    const M = P + 1.1; // posição dos mastros
    this.radius = M + 4;

    // Borda do poço + anel de identificação na cor da skill
    const lip = new THREE.Group();
    for (const [x, z, w, d] of [[0, P + 0.15, 2 * P + 0.6, 0.3], [0, -P - 0.15, 2 * P + 0.6, 0.3], [P + 0.15, 0, 0.3, 2 * P], [-P - 0.15, 0, 0.3, 2 * P]] as const) {
      const l = mesh(box(w, 0.06, d), materials.terrainEdge);
      l.position.set(x, 0.03, z);
      lip.add(l);
    }
    const r = P + 0.5;
    for (const [x, z, w, d] of [[0, r, 2 * r + 0.08, 0.08], [0, -r, 2 * r + 0.08, 0.08], [r, 0, 0.08, 2 * r], [-r, 0, 0.08, 2 * r]] as const) {
      const l = mesh(box(w, 0.03, d), this.accentMat, false, false);
      l.position.set(x, 0.015, z);
      lip.add(l);
    }
    this.add(bake(lip, false, true));

    this.shaft = new Shaft({ half: P, depth: 16, chamfer: 1.3, groundThickness: GROUND_T, markerMaterial: this.markerMat });
    this.add(this.shaft);

    const anchors: THREE.Vector3[] = [];
    for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
      const w = new Winch({ lampMaterial: this.lampMat });
      w.position.set(sx * M, 0, sz * M);
      w.rotation.y = Math.atan2(-sz, sx);
      this.add(w);
      this.winches.push(w);
      anchors.push(w.anchorInParent());
    }

    this.engine = new EngineBlock(this.lampMat, THREE.MathUtils.clamp(config.complexity - 2, 1, 3));
    this.engine.scale.setScalar(0.8);
    this.engine.position.set(0, 0, -(P + 3.6));
    this.add(this.engine);

    this.city = new SkillCity(this.blueprint, anchors, this.windowMat, this.accentMat);
    this.add(this.city.deck);
    this.city.parts.forEach((p) => this.parts.set(p.id, p));

    this.register(part('door-left', this.shaft.doorLeft, { x: 0, y: -0.34, z: 0 }, { x: -(P + 0.1), y: -0.46, z: 0 }));
    this.register(part('door-right', this.shaft.doorRight, { x: 0, y: -0.34, z: 0 }, { x: P + 0.1, y: -0.46, z: 0 }));
    this.winches.forEach((w, i) => {
      const p = w.brake.position;
      this.register(part(`brake-${i}`, w.brake, p, { x: p.x + 0.28, y: p.y, z: p.z }));
    });

    const size = 2 * (M + 1.2);
    this.pickProxy = new THREE.Mesh(new THREE.BoxGeometry(size, 9, size + 5), new THREE.MeshBasicMaterial());
    this.pickProxy.position.set(0, 4.5, -2);
    this.pickProxy.visible = false;
    this.pickProxy.userData.siteId = config.id;
    this.add(this.pickProxy);

    this.update(0);
  }

  private register(p: MechanicalPart): void {
    this.parts.set(p.id, p);
  }

  part(id: string): MechanicalPart {
    const p = this.parts.get(id);
    if (!p) throw new Error(`Unknown part ${id} in ${this.config.id}`);
    return p;
  }

  /** 0 = normal, 1 = hover, 2 = selecionada. */
  setHighlight(level: number): void {
    this.highlightTarget = level;
  }

  reset(): void {
    resetParts(this.parts.values());
    Object.assign(this.state, initialState());
    this.built = false;
    this.update(0);
  }

  /** Estado final sem animação (usado quando a cidade já foi construída). */
  complete(): void {
    for (const p of this.parts.values()) p.object.position.copy(p.finalPosition);
    Object.assign(this.state, { slack: 0, lamps: 1, markers: 0, windows: 1, shaftLight: 0 });
    this.built = true;
    this.update(0);
  }

  /** Sincroniza mecanismos derivados (engrenagens, tambores, cabos, luzes) com o estado. */
  update(dt: number): void {
    const s = this.state;
    const drive = s.drive + s.idle;
    this.engine.setDrive(drive);
    for (const g of this.city.roofGears) g.angle = drive * 2.5;

    const deck = this.city.deck;
    const travel = deck.position.y - DECK_START_Y;
    const takeUp = (1 - s.slack) * 0.9; // tensionar recolhe cabo
    const drumAngle = -(travel + takeUp) / DRUM_R;
    const anchorY = deck.position.y + 0.3;
    for (const w of this.winches) w.update(anchorY, s.slack, drumAngle);

    this.highlight += (this.highlightTarget - this.highlight) * Math.min(1, dt * 8);
    this.lampMat.emissiveIntensity = s.lamps * 2.4;
    this.markerMat.emissiveIntensity = s.markers * 2.0;
    this.windowMat.emissiveIntensity = s.windows * 0.7;
    this.accentMat.emissiveIntensity = 0.12 + this.highlight * 0.7 + s.windows * 0.25;

    // Oculta o que não pode ser visto (economiza ~metade das draw calls do mapa):
    // cidade recolhida sob a escotilha fechada, interior do poço tampado, folhas guardadas no terreno.
    this.city.deck.visible = this.built || this.constructing;
    this.shaft.interior.visible = this.constructing;
    this.shaft.doorLeft.visible = this.shaft.doorRight.visible = !this.built || this.constructing;
  }

  dispose(): void {
    this.winches.forEach((w) => w.dispose());
    [this.lampMat, this.markerMat, this.windowMat, this.accentMat].forEach((m) => m.dispose());
    (this.pickProxy.material as THREE.Material).dispose();
    this.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
  }
}
