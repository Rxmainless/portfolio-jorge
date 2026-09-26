import gsap from 'gsap';
import type { SkillSite } from '../world/SkillSite';
import type { MechanicalPart } from '../world/city/MechanicalPart';
import { machineEvents, type MachineEventMap } from './MachineEvents';

export type StageId = 'gears' | 'mechanism' | 'cables' | 'hatch' | 'platform' | 'foundation' | 'tower' | 'buildings' | 'complete';

export interface Stage {
  id: StageId;
  label: string;
  at: number;
}

export const STAGE_LABELS: Record<StageId, string> = {
  gears: 'Engrenagens',
  mechanism: 'Mecanismo ativa',
  cables: 'Cabos tensionam',
  hatch: 'Escotilha abre',
  platform: 'Plataforma sobe',
  foundation: 'Fundação sobe',
  tower: 'Torre sobe',
  buildings: 'Edifícios sobem',
  complete: 'Cidade completa',
};
export const STAGE_ORDER = Object.keys(STAGE_LABELS) as StageId[];

/** Velocidade de regime da engrenagem motriz (rad/s). */
const OMEGA = 1.1;

/**
 * Move uma peça de initialPosition → finalPosition com assentamento mecânico:
 * leve sobrecurso e travamento (o "clunk" de um mecanismo chegando ao batente).
 */
function travel(tl: gsap.core.Timeline, p: MechanicalPart, at: number, duration: number, ease = 'power2.inOut', overshoot = 0.05): number {
  const pos = p.object.position;
  const { initialPosition: a, finalPosition: b } = p;
  const dir = b.clone().sub(a).normalize();
  tl.fromTo(pos, { x: a.x, y: a.y, z: a.z }, { x: b.x + dir.x * overshoot, y: b.y + dir.y * overshoot, z: b.z + dir.z * overshoot, duration, ease }, at);
  tl.to(pos, { x: b.x, y: b.y, z: b.z, duration: 0.28, ease: 'power3.out' }, at + duration);
  return at + duration + 0.28;
}

export interface ConstructionHooks {
  onPlatformLock?: () => void;
  onStage?: (stage: Stage) => void;
}

/**
 * Timeline de construção gerada a partir do StagePlan da cidade. A mesma
 * função constrói qualquer skill.
 *
 *   ENGRENAGENS → MECANISMO ATIVA → CABOS TENSIONAM → (escotilha) →
 *   PLATAFORMA SOBE → FUNDAÇÃO SOBE → TORRE SOBE → EDIFÍCIOS SOBEM → CIDADE COMPLETA
 */
export function buildConstructionTimeline(site: SkillSite, hooks: ConstructionHooks = {}) {
  const s = site.state;
  const plan = site.city.plan;
  const P = (id: string) => site.part(id);
  const tl = gsap.timeline({ paused: true });
  const stages: Stage[] = [];
  const stage = (id: StageId, at: number, event?: keyof MachineEventMap) => {
    const st: Stage = { id, label: STAGE_LABELS[id], at };
    stages.push(st);
    tl.addLabel(id, at);
    tl.call(() => {
      machineEvents.emit('stage', { index: STAGE_ORDER.indexOf(id), label: st.label, siteId: site.config.id });
      if (event) (machineEvents.emit as (e: string) => void)(event);
      hooks.onStage?.(st);
    }, undefined, at);
  };

  // 1. ENGRENAGENS: a casa de máquinas acelera até a velocidade de regime
  stage('gears', 0, 'gearStart');
  const spinUp = 2.2;
  tl.fromTo(s, { drive: 0 }, { drive: (OMEGA * spinUp) / 2, duration: spinUp, ease: 'power2.in' }, 0);

  // 2. MECANISMO ATIVA: lâmpadas acendem em sequência, freios liberam
  stage('mechanism', 1.8, 'mechanismActivate');
  tl.to(s, { lamps: 1, duration: 0.6, ease: 'steps(3)' }, 1.8);
  site.winches.forEach((_, i) => travel(tl, P(`brake-${i}`), 2.1 + i * 0.18, 0.35, 'power2.out', 0.02));

  // 3. CABOS TENSIONAM: folga → tensão, com vibração amortecida
  stage('cables', 3.0, 'cablesTension');
  tl.fromTo(s, { slack: 1 }, { slack: 0, duration: 1.4, ease: 'elastic.out(1, 0.45)' }, 3.0);

  // 3b. escotilha destrava (desce) e desliza para dentro do terreno
  stage('hatch', 4.3, 'hatchOpen');
  for (const id of ['door-left', 'door-right']) {
    const p = P(id);
    const pos = p.object.position;
    tl.fromTo(pos, { x: p.initialPosition.x, y: p.initialPosition.y }, { y: p.finalPosition.y, duration: 0.3, ease: 'power2.in' }, 4.3);
    tl.to(pos, { x: p.finalPosition.x, duration: 1.7, ease: 'power2.inOut' }, 4.65);
  }
  tl.to(s, { shaftLight: 1, markers: 1, duration: 1.4, ease: 'power1.in' }, 4.5);

  // 4. PLATAFORMA SOBE: os quatro guinchos recolhem cabo
  stage('platform', 6.3, 'platformRise');
  const platformDur = 5.2;
  const platformEnd = travel(tl, P(plan.deck), 6.3, platformDur, 'power2.inOut', 0.08);
  tl.call(() => {
    machineEvents.emit('platformLock');
    hooks.onPlatformLock?.();
  }, undefined, 6.3 + platformDur);
  tl.to(s, { shaftLight: 0, duration: 0.8 }, 6.3 + platformDur);

  // 5. FUNDAÇÃO SOBE pelo vão do deck
  stage('foundation', platformEnd + 0.2, 'foundationRise');
  const foundationEnd = travel(tl, P(plan.foundation), platformEnd + 0.2, 2.0, 'power2.inOut', 0.05);

  // 6. TORRE SOBE: seções telescópicas, uma saindo de dentro da outra
  stage('tower', foundationEnd + 0.15, 'towerRise');
  let t = foundationEnd + 0.15;
  plan.core.forEach((id, i) => {
    const last = i === plan.core.length - 1;
    const dur = Math.max(0.9, 1.6 - i * 0.18);
    t = travel(tl, P(id), t, dur, last ? 'power2.out' : 'power2.inOut', last ? 0.03 : 0.05) - 0.1;
  });
  const towerEnd = t + 0.1;

  // 7. EDIFÍCIOS SOBEM (escalonados), depois conectores sobem/deslizam e travam
  stage('buildings', towerEnd + 0.1, 'buildingsRise');
  const stagger = Math.min(0.55, 2.2 / Math.max(1, plan.satellites.length));
  let bEnd = towerEnd;
  plan.satellites.forEach((id, i) => {
    bEnd = Math.max(bEnd, travel(tl, P(id), towerEnd + 0.1 + i * stagger, 1.5, 'power2.inOut', 0.05));
  });
  let cEnd = bEnd;
  const cStagger = Math.min(0.3, 1.6 / Math.max(1, plan.connectors.length));
  plan.connectors.forEach((id, i) => {
    cEnd = Math.max(cEnd, travel(tl, P(id), bEnd - 0.2 + i * cStagger, 0.9, 'power2.out', 0.02));
  });
  // Travas: todas avançam juntas depois que a última ponte chega
  const latchStart = cEnd - 0.05;
  plan.latches.forEach((id, i) => {
    cEnd = Math.max(cEnd, travel(tl, P(id), latchStart + (i % 2) * 0.06, 0.35, 'power2.out', 0.01));
  });

  // 8. CIDADE COMPLETA: janelas acendem, máquina desacelera
  const done = cEnd + 0.2;
  tl.to(s, { windows: 1, duration: 1.2, ease: 'power1.inOut' }, done - 0.4);
  stage('complete', done, 'cityComplete');

  // Engrenagem motriz: aceleração → regime constante → desaceleração
  const driveAtCruiseStart = (OMEGA * spinUp) / 2;
  const driveAtCruiseEnd = driveAtCruiseStart + OMEGA * (done - spinUp);
  tl.to(s, { drive: driveAtCruiseEnd, duration: done - spinUp, ease: 'none' }, spinUp);
  const spinDown = 1.8;
  tl.to(s, { drive: driveAtCruiseEnd + (OMEGA * spinDown) / 2, duration: spinDown, ease: 'power2.out' }, done);

  return { timeline: tl, stages, duration: tl.duration() };
}
