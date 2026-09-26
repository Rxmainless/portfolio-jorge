import * as THREE from 'three';
import { materials } from '../../scene/materials';
import { bake, box, cylinder, mesh, slabWithHoles } from '../geometry';
import { Gear } from '../mechanics/Gear';
import { connectorGeometry, foundationHoles, type Blueprint, type SatelliteSpec } from './Blueprint';
import { part, type MechanicalPart } from './MechanicalPart';

/** Ordem de montagem, derivada do blueprint. A timeline só lê isto. */
export interface StagePlan {
  deck: string;
  foundation: string;
  core: string[];
  satellites: string[];
  connectors: string[];
  latches: string[];
}

const DECK_T = 0.5;
const HULL_H = 7;
export const DECK_START_Y = -(HULL_H + DECK_T);

/**
 * Cidade genérica construída a partir de um Blueprint.
 *
 * Tudo começa aninhado dentro da plataforma, no fundo do poço:
 *   deck ⊃ fundação ⊃ núcleo(s0 ⊃ s1 ⊃ … ⊃ agulha) + satélites + conectores
 * Cada peça sai fisicamente de dentro da peça que a contém — por um furo,
 * uma fenda ou de dentro da seção anterior.
 *
 * Para trocar por GLTF: substitua o conteúdo de qualquer grupo registrado em
 * `parts` mantendo o grupo (as posições inicial/final continuam valendo).
 */
export class SkillCity {
  readonly deck = new THREE.Group();
  readonly foundation = new THREE.Group();
  readonly parts = new Map<string, MechanicalPart>();
  readonly roofGears: Gear[] = [];
  readonly plan: StagePlan = { deck: 'deck', foundation: 'foundation', core: [], satellites: [], connectors: [], latches: [] };
  readonly deckHalf: number;
  /** Altura final do topo da cidade (acima do solo) — usada pela câmera. */
  readonly topHeight: number;

  constructor(readonly bp: Blueprint, anchors: THREE.Vector3[], readonly windowMaterial: THREE.MeshStandardMaterial, readonly accentMaterial: THREE.MeshStandardMaterial) {
    const F = bp.foundation.half;
    this.deckHalf = F + 1.2;
    this.buildDeck(anchors);
    this.register(part('deck', this.deck, { x: 0, y: DECK_START_Y, z: 0 }, { x: 0, y: 0.02, z: 0 }));

    // Fundação: laje espessa com furos (núcleo, satélites) e fendas (pontes)
    const fh = bp.foundation.height;
    this.foundation.add(mesh(slabWithHoles(2 * F, 2 * F, fh, foundationHoles(bp)), materials.concrete));
    const band = new THREE.Group();
    for (const [x, z, w, d] of [[0, F, 2 * F + 0.1, 0.12], [0, -F, 2 * F + 0.1, 0.12], [F, 0, 0.12, 2 * F - 0.1], [-F, 0, 0.12, 2 * F - 0.1]] as const) {
      const b = mesh(box(w, 0.14, d), materials.steel);
      b.position.set(x, -0.07, z);
      band.add(b);
    }
    this.foundation.add(bake(band));
    this.deck.add(this.foundation);
    const foundationTop = 1.2;
    this.register(part('foundation', this.foundation, { x: 0, y: -0.9, z: 0 }, { x: 0, y: foundationTop, z: 0 }));

    // Núcleo telescópico
    let parent: THREE.Object3D = this.foundation;
    let parentH = 0;
    let topY = foundationTop - 0.6;
    const sections = bp.core.sections;
    sections.forEach((s, i) => {
      const parentW = i === 0 ? s.w + 0.3 : sections[i - 1].w;
      const g = this.coreSection(s.w, s.h, s.w + Math.min(0.16, (parentW - s.w) * 0.6));
      parent.add(g);
      const id = `core-${i}`;
      if (i === 0) this.register(part(id, g, { x: 0, y: -(s.h + 0.1), z: 0 }, { x: 0, y: -0.6, z: 0 }));
      else {
        this.register(part(id, g, { x: 0, y: 0.1, z: 0 }, { x: 0, y: parentH - 0.6, z: 0 }));
        topY += parentH - 0.6;
      }
      this.plan.core.push(id);
      parent = g;
      parentH = s.h;
    });
    topY += parentH;
    if (bp.core.spire) {
      const len = Math.min(2.2, parentH - 0.45);
      const spire = new THREE.Group();
      const needle = mesh(cylinder(0.05, 0.11, len, 10), materials.steelLight);
      needle.position.y = len / 2;
      const tip = mesh(box(0.1, 0.1, 0.1), this.accentMaterial, false, false);
      tip.position.y = len + 0.02;
      spire.add(needle, tip);
      parent.add(spire);
      this.register(part('core-spire', spire, { x: 0, y: 0.3, z: 0 }, { x: 0, y: parentH - 0.3, z: 0 }));
      this.plan.core.push('core-spire');
      topY += len - 0.3;
    }
    this.topHeight = topY + 0.02;

    // Satélites
    bp.satellites.forEach((s, i) => {
      const g = this.satellite(s);
      g.rotation.y = s.rot ?? 0;
      this.foundation.add(g);
      const id = `sat-${i}`;
      this.register(part(id, g, { x: s.x, y: -0.45 - s.h, z: s.z }, { x: s.x, y: -0.3, z: s.z }));
      this.plan.satellites.push(id);
    });

    // Conectores
    const core0 = this.parts.get('core-0')!;
    bp.connectors.forEach((c, i) => {
      const geo = connectorGeometry(bp, c);
      const id = `conn-${i}`;
      if (c.kind === 'pipe') {
        const g = this.pipe(geo.length, geo.rot);
        core0.object.add(g);
        const y = c.y - core0.finalPosition.y;
        this.register(part(id, g, { x: geo.startX, y, z: geo.startZ }, { x: geo.x, y, z: geo.z }));
      } else {
        const { group, latches } = this.bridge(geo.length, c.y, geo.latchA, geo.latchB);
        group.rotation.y = geo.rot;
        this.foundation.add(group);
        this.register(part(id, group, { x: geo.x, y: -0.35, z: geo.z }, { x: geo.x, y: c.y, z: geo.z }));
        latches.forEach((l, j) => {
          const lid = `${id}-latch-${j}`;
          this.register(part(lid, l.object, l.initial, l.final));
          this.plan.latches.push(lid);
        });
      }
      this.plan.connectors.push(id);
    });
  }

  private register(p: MechanicalPart): void {
    this.parts.set(p.id, p);
  }

  private buildDeck(anchors: THREE.Vector3[]): void {
    const D = this.deckHalf;
    const F = this.bp.foundation.half;
    const open = F + 0.1;
    const stat = new THREE.Group();
    stat.add(mesh(slabWithHoles(2 * D, 2 * D, DECK_T, [{ x: 0, z: 0, w: 2 * open, d: 2 * open }]), materials.darkSteel));
    for (const [x, z, w, d] of [[0, open + 0.08, 2 * open + 0.32, 0.16], [0, -open - 0.08, 2 * open + 0.32, 0.16], [open + 0.08, 0, 0.16, 2 * open], [-open - 0.08, 0, 0.16, 2 * open]] as const) {
      const rim = mesh(box(w, 0.1, d), materials.steel);
      rim.position.set(x, 0.05, z);
      stat.add(rim);
    }
    const hw = D - 0.15;
    for (const [x, z, w, d] of [[0, hw, 2 * hw + 0.2, 0.2], [0, -hw, 2 * hw + 0.2, 0.2], [hw, 0, 0.2, 2 * hw - 0.2], [-hw, 0, 0.2, 2 * hw - 0.2]] as const) {
      const wall = mesh(box(w, HULL_H, d), materials.iron);
      wall.position.set(x, -DECK_T - HULL_H / 2, z);
      stat.add(wall);
    }
    const floor = mesh(box(2 * hw, 0.3, 2 * hw), materials.iron);
    floor.position.y = -DECK_T - HULL_H;
    stat.add(floor);
    for (const a of anchors) {
      const lug = mesh(box(0.34, 0.22, 0.34), materials.steel);
      lug.position.set(a.x, 0.11, a.z);
      const ring = mesh(cylinder(0.06, 0.06, 0.2, 10), materials.steelLight);
      ring.position.set(a.x, 0.3, a.z);
      stat.add(lug, ring);
    }
    this.deck.add(bake(stat));
  }

  private coreSection(w: number, h: number, collarW: number): THREE.Group {
    const cyl = this.bp.core.shape === 'cyl';
    const g = new THREE.Group();
    const body = mesh(cyl ? cylinder(w / 2, w / 2, h, 28) : box(w, h, w), materials.architecture);
    body.position.y = h / 2;
    const collar = mesh(cyl ? cylinder(collarW / 2, collarW / 2, 0.16, 28) : box(collarW, 0.16, collarW), materials.steel);
    collar.position.y = h - 0.08;
    g.add(body, collar);
    // Fendas verticais (janelas)
    const slitH = h * 0.42;
    const n = cyl ? 6 : 8;
    for (let k = 0; k < n; k++) {
      let ang: number;
      let off = 0;
      if (cyl) ang = (k / n) * Math.PI * 2;
      else {
        ang = Math.floor(k / 2) * (Math.PI / 2);
        off = (k % 2 === 0 ? -1 : 1) * w * 0.22;
      }
      const slit = mesh(box(0.07, slitH, 0.02), this.windowMaterial, false, false);
      const r = w / 2 + 0.005;
      slit.position.set(Math.cos(ang) * r - Math.sin(ang) * off, h * 0.5, Math.sin(ang) * r + Math.cos(ang) * off);
      slit.rotation.y = -ang + Math.PI / 2;
      g.add(slit);
    }
    return bake(g);
  }

  private satellite(s: SatelliteSpec): THREE.Group {
    const g = new THREE.Group();
    if (s.shape === 'gate') {
      const pw = 0.28;
      for (const sx of [-1, 1]) {
        const pillar = mesh(box(pw, s.h - 0.3, s.d), materials.architecture);
        pillar.position.set(sx * (s.w / 2 - pw / 2), (s.h - 0.3) / 2, 0);
        g.add(pillar);
      }
      const lintel = mesh(box(s.w, 0.3, s.d), materials.steel);
      lintel.position.y = s.h - 0.15;
      const scan = mesh(box(s.w - 2 * pw, 0.04, s.d * 0.5), this.windowMaterial, false, false);
      scan.position.y = s.h - 0.32;
      g.add(lintel, scan);
    } else {
      const tierH = s.h / s.tiers;
      const cyl = s.shape === 'cyl';
      for (let i = 0; i < s.tiers; i++) {
        const top = i === s.tiers - 1;
        const tw = top && !cyl ? s.w * 0.82 : s.w;
        const td = top && !cyl ? s.d * 0.82 : s.d;
        const block = mesh(cyl ? cylinder(tw / 2, tw / 2, tierH - 0.08, 24) : box(tw, tierH - 0.08, td), materials.architecture);
        block.position.y = i * tierH + (tierH - 0.08) / 2;
        const joint = mesh(cyl ? cylinder(s.w * 0.46, s.w * 0.46, 0.08, 24) : box(s.w * 0.9, 0.08, s.d * 0.9), materials.iron);
        joint.position.y = i * tierH + tierH - 0.04;
        const win = mesh(cyl ? cylinder(tw / 2 + 0.006, tw / 2 + 0.006, 0.06, 24) : box(tw + 0.01, 0.06, td + 0.01), this.windowMaterial, false, false);
        win.position.y = i * tierH + tierH * 0.55;
        g.add(block, joint, win);
      }
    }
    bake(g);
    if (s.roofGear) {
      const gear = new Gear({ teeth: 14, module: 0.04, thickness: 0.08, material: materials.steelLight });
      gear.rotation.x = -Math.PI / 2;
      gear.position.set(0, s.h - 0.12, 0);
      g.add(gear);
      this.roofGears.push(gear);
    }
    return g;
  }

  private pipe(length: number, rot: number): THREE.Group {
    const g = new THREE.Group();
    const inner = new THREE.Group();
    inner.add(mesh(cylinder(0.1, 0.1, length, 14), materials.steel), mesh(cylinder(0.15, 0.15, 0.06, 14), materials.darkSteel));
    inner.rotation.z = Math.PI / 2; // eixo → X local
    g.add(inner);
    bake(g);
    g.rotation.y = rot;
    return g;
  }

  /** Ponte-elevador: tabuleiro + dois pilares, sobe de uma fenda; travas avançam até as faces. */
  private bridge(len: number, y: number, latchA: number, latchB: number) {
    const group = new THREE.Group();
    const body = new THREE.Group();
    const deck = mesh(box(len, 0.2, 0.3), materials.steel);
    const strip = mesh(box(len - 0.1, 0.012, 0.04), this.windowMaterial, false, false);
    strip.position.y = 0.106;
    body.add(deck, strip);
    const colH = y + 0.4;
    for (const sx of [-1, 1]) {
      const col = mesh(box(0.12, colH, 0.12), materials.darkSteel);
      col.position.set(sx * (len / 2 - 0.12), -0.1 - colH / 2, 0);
      body.add(col);
    }
    group.add(bake(body));

    const latches: { object: THREE.Object3D; initial: THREE.Vector3; final: THREE.Vector3 }[] = [];
    for (const [sgn, L0] of [[-1, latchA], [1, latchB]] as const) {
      const L = Math.min(L0, len - 0.12);
      if (L <= 0.02) continue;
      const latch = mesh(box(L + 0.06, 0.12, 0.2), materials.darkSteel);
      const initial = new THREE.Vector3(sgn * (len / 2 - L / 2 - 0.04), 0, 0);
      const final = new THREE.Vector3(sgn * (len / 2 + L / 2 - 0.03), 0, 0);
      group.add(latch);
      latches.push({ object: latch, initial, final });
    }
    return { group, latches };
  }
}
