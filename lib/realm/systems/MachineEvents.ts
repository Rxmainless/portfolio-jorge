/**
 * Barramento de eventos da máquina. Hoje alimenta a UI; no futuro, o áudio.
 * Ex.: machineEvents.on('gearStart', () => sfx.play('gear-start'))
 */
export type MachineEventMap = {
  gearStart: void;
  mechanismActivate: void;
  cablesTension: void;
  hatchOpen: void;
  platformRise: void;
  platformLock: void;
  foundationRise: void;
  towerRise: void;
  buildingsRise: void;
  cityComplete: void;
  stage: { index: number; label: string; siteId: string };
  playState: { playing: boolean };
  reset: { siteId: string };
  worldState: { state: string };
  hover: { siteId: string | null };
  select: { siteId: string | null };
  built: { count: number; total: number };
};

type Handler<T> = (payload: T) => void;

export class MachineEvents {
  private handlers: { [K in keyof MachineEventMap]?: Set<Handler<MachineEventMap[K]>> } = {};

  on<K extends keyof MachineEventMap>(type: K, fn: Handler<MachineEventMap[K]>): () => void {
    let set = this.handlers[type] as Set<Handler<MachineEventMap[K]>> | undefined;
    if (!set) {
      set = new Set();
      (this.handlers as Record<string, unknown>)[type] = set;
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof MachineEventMap>(type: K, ...payload: MachineEventMap[K] extends void ? [] : [MachineEventMap[K]]): void {
    const set = this.handlers[type] as Set<Handler<MachineEventMap[K]>> | undefined;
    set?.forEach((fn) => fn(payload[0] as MachineEventMap[K]));
  }

  clear(): void {
    this.handlers = {};
  }
}

export const machineEvents = new MachineEvents();

// Ganchos nomeados para o futuro sistema de áudio.
export const onGearStart = (fn: () => void) => machineEvents.on('gearStart', fn);
export const onPlatformRise = (fn: () => void) => machineEvents.on('platformRise', fn);
export const onCityComplete = (fn: () => void) => machineEvents.on('cityComplete', fn);
