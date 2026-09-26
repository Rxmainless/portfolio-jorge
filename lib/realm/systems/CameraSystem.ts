import * as THREE from 'three';
import gsap from 'gsap';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Shot {
  at: number;
  duration: number;
  position: THREE.Vector3Tuple;
  target: THREE.Vector3Tuple;
  ease?: string;
}

/**
 * Câmera: OrbitControls para exploração livre + trilhas GSAP para planos
 * cinematográficos. Qualquer arrasto/zoom do usuário cancela o plano atual.
 */
export class CameraSystem {
  readonly controls: OrbitControls;
  private cinematic: gsap.core.Timeline | null = null;
  private fly: gsap.core.Timeline | null = null;
  private userActive = false;
  private shakeAmp = 0;
  private readonly shakeOffset = new THREE.Vector3();

  constructor(readonly camera: THREE.PerspectiveCamera, dom: HTMLElement) {
    this.controls = new OrbitControls(camera, dom);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 48;
    this.controls.maxPolarAngle = Math.PI * 0.47; // não passa para baixo do terreno
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.addEventListener('start', () => (this.userActive = true));
    this.controls.addEventListener('end', () => (this.userActive = false));
    this.controls.addEventListener('change', () => {
      if (this.userActive) this.cancelCinematic();
    });
  }

  get isCinematic(): boolean {
    return !!this.cinematic?.isActive() || !!this.fly?.isActive();
  }

  set(position: THREE.Vector3Tuple, target: THREE.Vector3Tuple): void {
    this.camera.position.set(...position);
    this.controls.target.set(...target);
    this.controls.update();
  }

  /** Trilha de planos sincronizada com a timeline de construção. */
  playCinematic(shots: Shot[]): gsap.core.Timeline {
    this.cancelCinematic();
    const tl = gsap.timeline();
    for (const s of shots) {
      const ease = s.ease ?? 'power2.inOut';
      tl.to(this.camera.position, { x: s.position[0], y: s.position[1], z: s.position[2], duration: s.duration, ease }, s.at);
      tl.to(this.controls.target, { x: s.target[0], y: s.target[1], z: s.target[2], duration: s.duration, ease }, s.at);
    }
    this.cinematic = tl;
    return tl;
  }

  flyTo(position: THREE.Vector3Tuple, target: THREE.Vector3Tuple, duration = 1.6, ease = 'power3.inOut'): gsap.core.Timeline {
    this.cancelCinematic();
    const tl = gsap.timeline();
    tl.to(this.camera.position, { x: position[0], y: position[1], z: position[2], duration, ease }, 0);
    tl.to(this.controls.target, { x: target[0], y: target[1], z: target[2], duration, ease }, 0);
    return this.lockDuring(tl);
  }

  /**
   * Voo em arco: a câmera sobe no meio do trajeto (curva de Bézier quadrática)
   * e desce sobre o destino, para transmitir a escala do território.
   */
  flyArc(position: THREE.Vector3Tuple, target: THREE.Vector3Tuple, duration = 2.6, lift = 0.35): gsap.core.Timeline {
    this.cancelCinematic();
    const p0 = this.camera.position.clone();
    const p2 = new THREE.Vector3(...position);
    const t0 = this.controls.target.clone();
    const t2 = new THREE.Vector3(...target);
    const dist = p0.distanceTo(p2);
    const p1 = p0.clone().lerp(p2, 0.5);
    p1.y = Math.max(p0.y, p2.y) + dist * lift;
    const t1 = t0.clone().lerp(t2, 0.5);
    const proxy = { u: 0 };
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const tl = gsap.timeline();
    tl.to(proxy, {
      u: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const u = proxy.u;
        a.copy(p0).lerp(p1, u);
        b.copy(p1).lerp(p2, u);
        this.camera.position.copy(a.lerp(b, u));
        a.copy(t0).lerp(t1, u);
        b.copy(t1).lerp(t2, u);
        this.controls.target.copy(a.lerp(b, u));
      },
    });
    return this.lockDuring(tl);
  }

  /** Voos de transição não são interrompíveis: controles desligados até o fim. */
  private lockDuring(tl: gsap.core.Timeline): gsap.core.Timeline {
    this.controls.enabled = false;
    tl.call(() => {
      this.controls.enabled = true;
    });
    this.fly = tl;
    return tl;
  }

  cancelCinematic(): void {
    this.cinematic?.kill();
    this.fly?.kill();
    this.cinematic = null;
    this.fly = null;
    this.controls.enabled = true;
  }

  seekCinematic(time: number): void {
    this.cinematic?.seek(time, false);
  }

  setPaused(paused: boolean): void {
    this.cinematic?.paused(paused);
    this.fly?.paused(paused);
  }

  shake(amplitude = 0.12, duration = 0.5): void {
    this.shakeAmp = amplitude;
    gsap.to(this, { shakeAmp: 0, duration, ease: 'power2.out' });
  }

  update(): void {
    // Remove o tremor do frame anterior antes de o OrbitControls ler a posição
    this.camera.position.sub(this.shakeOffset);
    this.controls.update();
    if (this.shakeAmp > 0.0005) {
      this.shakeOffset.set((Math.random() - 0.5) * this.shakeAmp, (Math.random() - 0.5) * this.shakeAmp, (Math.random() - 0.5) * this.shakeAmp);
    } else {
      this.shakeOffset.set(0, 0, 0);
    }
    this.camera.position.add(this.shakeOffset);
  }

  dispose(): void {
    this.cancelCinematic();
    this.controls.dispose();
  }
}
