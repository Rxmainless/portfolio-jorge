import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { palette } from './materials';

/** Fundo, neblina e mapa de ambiente (reflexos discretos para o metal). */
export function setupEnvironment(scene: THREE.Scene, renderer: THREE.WebGLRenderer): () => void {
  scene.background = new THREE.Color(palette.background);
  scene.fog = new THREE.FogExp2(palette.fog, 0.022);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.32;
  room.dispose();
  pmrem.dispose();

  return () => envRT.dispose();
}
