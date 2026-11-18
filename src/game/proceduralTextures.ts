import * as THREE from 'three';

/**
 * Generates a realistic 2-lane highway asphalt color texture with lane markings,
 * tire wear tracks, subtle aggregate grain, and rumble shoulder edges.
 */
export function createAsphaltTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const width = 512;
  const height = 1024;

  // Color canvas
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  // Base dark asphalt
  ctx.fillStyle = '#2a2d33';
  ctx.fillRect(0, 0, width, height);

  // Subtle shoulder tone on outer edges (mapped to road width + shoulder)
  ctx.fillStyle = '#36393f';
  ctx.fillRect(0, 0, 56, height);
  ctx.fillRect(width - 56, 0, 56, height);

  // Subtle tire wear lanes
  const laneCenters = [148, 210, 302, 364];
  for (const lx of laneCenters) {
    const grad = ctx.createLinearGradient(lx - 18, 0, lx + 18, 0);
    grad.addColorStop(0, 'rgba(18, 20, 24, 0)');
    grad.addColorStop(0.5, 'rgba(18, 20, 24, 0.28)');
    grad.addColorStop(1, 'rgba(18, 20, 24, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(lx - 18, 0, 36, height);
  }

  // Asphalt aggregate speckle
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < data.length; i += 4) {
    const n = (rand() - 0.5) * 20;
    data[i] = Math.max(0, Math.min(255, data[i] + n));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Outer solid white edge lines
  ctx.fillStyle = '#d8dce2';
  ctx.fillRect(62, 0, 9, height);
  ctx.fillRect(width - 71, 0, 9, height);

  // Center dashed highway dividing line (two subtle amber/white highway stripes or crisp white dashes)
  ctx.fillStyle = '#e4b443';
  const dashCount = 4;
  const segmentLen = height / dashCount;
  for (let i = 0; i < dashCount; i++) {
    ctx.fillRect(width / 2 - 5, i * segmentLen + 24, 10, segmentLen * 0.48);
  }

  // Roughness canvas (linear space)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#c8c8c8';
  rCtx.fillRect(0, 0, 256, 256);
  const rData = rCtx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < rData.data.length; i += 4) {
    const v = 175 + Math.floor(rand() * 55);
    rData.data[i] = v;
    rData.data[i + 1] = v;
    rData.data[i + 2] = v;
  }
  rCtx.putImageData(rData, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(2, 1);
  roughnessMap.anisotropy = maxAnisotropy;

  return { map, roughnessMap };
}

/**
 * Generates a natural valley meadow/grass texture for the terrain ground.
 */
export function createGrassTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3f5a36';
  ctx.fillRect(0, 0, size, size);

  let seed = 4242;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // Organic dry-earth & lush grass patches
  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 8 + rand() * 26;
    const shade = rand();
    ctx.fillStyle =
      shade > 0.65
        ? 'rgba(79, 107, 58, 0.16)'
        : shade > 0.3
          ? 'rgba(52, 78, 43, 0.18)'
          : 'rgba(92, 86, 56, 0.12)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fine blade grain
  for (let i = 0; i < 4000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(110,140,75,0.18)' : 'rgba(35,52,28,0.2)';
    ctx.fillRect(x, y, 2, 4);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(95, 95);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Soft radial contact shadow plane placed directly underneath the vehicle.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.12,
    size / 2,
    size / 2,
    size * 0.48,
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.38)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
