import * as THREE from 'three';

export interface SceneLights {
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
}

const KEY_OFFSET = new THREE.Vector3(-14, 22, 12);

export function createLighting(scene: THREE.Scene): SceneLights {
  const ambient = new THREE.AmbientLight(0x8a8f99, 0.35);

  // Luz principal quente e rasante: dá leitura de volume às peças metálicas.
  const key = new THREE.DirectionalLight(0xffe2bf, 2.6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 140;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;

  // Contraluz fria e fraca.
  const fill = new THREE.DirectionalLight(0x9fb3d1, 0.55);
  fill.position.set(16, 8, -14);

  scene.add(ambient, key, key.target, fill);
  const lights = { ambient, key, fill };
  focusShadow(lights, new THREE.Vector3(), 18);
  return lights;
}

/**
 * Concentra o frustum de sombra onde a câmera está olhando: resolução alta
 * numa cidade, cobertura ampla no mapa, tudo com um único shadow map.
 */
export function focusShadow(lights: SceneLights, center: THREE.Vector3, radius: number): void {
  const { key } = lights;
  key.target.position.copy(center);
  key.position.copy(center).add(KEY_OFFSET.clone().multiplyScalar(Math.max(1, radius / 18)));
  const cam = key.shadow.camera;
  cam.left = -radius;
  cam.right = radius;
  cam.top = radius;
  cam.bottom = -radius;
  cam.far = 60 + radius * 3;
  cam.updateProjectionMatrix();
  // Texel de sombra cresce com o frustum: o bias precisa acompanhar, senão surge acne
  const k = radius / 18;
  key.shadow.normalBias = 0.025 * k;
  key.shadow.bias = -0.0005 * k;
  key.target.updateMatrixWorld();
}
