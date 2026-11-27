/**
 * Kryształ 0/1 z intra gry — wspólne źródło prawdy dla IntraScene i wskaźnika ładowania.
 * Ten sam mesh, ta sama projekcja 3D, ten sam rasteryzator i ta sama paleta
 * (cyjan -> biel, z bloomem na jasnych komórkach), żeby każdy podgląd wyglądał jak w intra.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Tri3D {
  a: number;
  b: number;
  c: number;
  hueShift: number;
}

export interface CrystalMesh {
  vertices: Vec3[];
  triangles: Tri3D[];
}

let cachedMesh: CrystalMesh | null = null;

/** Siatka kryształu: cztery sześciokątne słupy o różnych przechyłach — dokładnie jak w intra. */
export function getBinaryCrystalMesh(): CrystalMesh {
  if (cachedMesh) return cachedMesh;

  const vertices: Vec3[] = [];
  const triangles: Tri3D[] = [];

  const addCrystalPillar = (
    offsetX: number,
    offsetY: number,
    offsetZ: number,
    tiltZ: number,
    tiltX: number,
    radius: number,
    bodyH: number,
    tipH: number,
    hueShift: number
  ) => {
    const sides = 6;
    const baseIdx = vertices.length;
    const cosZ = Math.cos(tiltZ), sinZ = Math.sin(tiltZ);
    const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);

    const pushV = (x: number, y: number, z: number) => {
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;
      const x2 = x * cosZ - y1 * sinZ;
      const y2 = x * sinZ + y1 * cosZ;
      vertices.push({ x: x2 + offsetX, y: y2 + offsetY, z: z1 + offsetZ });
    };

    pushV(0, -(bodyH + tipH), 0);
    pushV(0, bodyH + tipH, 0);

    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pushV(Math.cos(a) * radius, -bodyH, Math.sin(a) * radius);
    }
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pushV(Math.cos(a) * radius, bodyH, Math.sin(a) * radius);
    }

    const topTip = baseIdx;
    const botTip = baseIdx + 1;
    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      const t1 = baseIdx + 2 + i;
      const t2 = baseIdx + 2 + next;
      const b1 = baseIdx + 2 + sides + i;
      const b2 = baseIdx + 2 + sides + next;

      const h = hueShift + i * 0.22;
      triangles.push({ a: topTip, b: t1, c: t2, hueShift: h });
      triangles.push({ a: t1, b: b1, c: t2, hueShift: h + 0.1 });
      triangles.push({ a: t2, b: b1, c: b2, hueShift: h + 0.1 });
      triangles.push({ a: botTip, b: b2, c: b1, hueShift: h + 0.2 });
    }
  };

  addCrystalPillar(0, 0.2, 0, 0.02, 0, 2.2, 2.8, 3.8, 0.0);
  addCrystalPillar(-3.0, 1.4, 0.5, -0.58, 0.16, 1.4, 1.8, 2.5, 0.9);
  addCrystalPillar(3.1, 1.1, -0.5, 0.54, -0.14, 1.5, 2.0, 2.7, 1.7);
  addCrystalPillar(-0.8, 2.6, 1.6, -0.24, 0.35, 1.0, 1.1, 1.5, 2.4);

  cachedMesh = { vertices, triangles };
  return cachedMesh;
}

export interface CrystalFrameOptions {
  /** Bok kwadratowego obrazka wynikowego (px). */
  size: number;
  rotY: number;
  tiltX: number;
  /** Skala bryły w jednostkach siatki (1 = wielkość z intra). */
  scaleFactor?: number;
  /** Faza koloru (ms) — przesuwa cyjan/biel między klatkami. */
  time?: number;
}

/** Siatka rasteryzacji: tyle komórek mieści się na bok — proporcje cyfr jak w intra. */
const GRID = 24;

const zBuf = new Float32Array(GRID * GRID);
const shadeBuf = new Float32Array(GRID * GRID);
const hueBuf = new Float32Array(GRID * GRID);

/**
 * Renderuje jedną klatkę kryształu 0/1 do samodzielnego canvasa (np. 112x112 na ikonę).
 * Kolejność operacji jest identyczna jak w IntroScene.renderBinaryCrystal.
 */
export function renderBinaryCrystalFrame(options: CrystalFrameOptions): HTMLCanvasElement {
  const { size, rotY, tiltX, scaleFactor = 1, time = 0 } = options;
  const mesh = getBinaryCrystalMesh();
  const { vertices, triangles } = mesh;

  zBuf.fill(-1e9);
  shadeBuf.fill(0);
  hueBuf.fill(0);

  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);

  const count = vertices.length;
  const projX = new Float32Array(count);
  const projY = new Float32Array(count);
  const camZ = new Float32Array(count);
  const transX = new Float32Array(count);
  const transY = new Float32Array(count);
  const transZ = new Float32Array(count);

  const fov = 26;
  const camDist = 21;
  const halfW = GRID * 0.5;
  const halfH = GRID * 0.5;

  for (let i = 0; i < count; i++) {
    const v = vertices[i];
    const vx = v.x * scaleFactor;
    const vy = v.y * scaleFactor;
    const vz = v.z * scaleFactor;

    const rx = vx * cosY - vz * sinY;
    const rz1 = vx * sinY + vz * cosY;
    const ry = vy * cosX - rz1 * sinX;
    const rz = vy * sinX + rz1 * cosX;

    transX[i] = rx;
    transY[i] = ry;
    transZ[i] = rz;
    const depth = Math.max(1.2, camDist - rz);
    const persp = fov / depth;
    projX[i] = halfW + rx * persp;
    projY[i] = halfH + ry * persp * 0.92;
    camZ[i] = rz;
  }

  const lx = -0.45, ly = -0.60, lz = 0.66;

  for (let ti = 0; ti < triangles.length; ti++) {
    const tri = triangles[ti];
    const ax = projX[tri.a], ay = projY[tri.a], az = camZ[tri.a];
    const bx = projX[tri.b], by = projY[tri.b], bz = camZ[tri.b];
    const cx = projX[tri.c], cy = projY[tri.c], cz = camZ[tri.c];

    const ux = transX[tri.b] - transX[tri.a], uy = transY[tri.b] - transY[tri.a], uz = transZ[tri.b] - transZ[tri.a];
    const wx = transX[tri.c] - transX[tri.a], wy = transY[tri.c] - transY[tri.a], wz = transZ[tri.c] - transZ[tri.a];
    let nx = uy * wz - uz * wy;
    let ny = uz * wx - ux * wz;
    let nz = ux * wy - uy * wx;
    const nLen = Math.hypot(nx, ny, nz) || 1;
    nx /= nLen; ny /= nLen; nz /= nLen;

    const faceNz = nz < 0 ? -nz : nz;
    const faceNx = nz < 0 ? -nx : nx;
    const faceNy = nz < 0 ? -ny : ny;

    const diff = Math.max(0, faceNx * lx + faceNy * ly + faceNz * lz);
    const spec = Math.pow(Math.max(0, faceNz * 0.85 + diff * 0.35), 4) * 0.42;
    const shade = Math.min(1.05, Math.max(0.32, 0.38 + diff * 0.56 + spec));

    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxX = Math.min(GRID - 1, Math.ceil(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxY = Math.min(GRID - 1, Math.ceil(Math.max(ay, by, cy)));

    const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denom) < 1e-4) continue;
    const invDenom = 1 / denom;

    for (let py = minY; py <= maxY; py++) {
      for (let px = minX; px <= maxX; px++) {
        const sx = px + 0.5;
        const sy = py + 0.5;
        const w1 = ((by - cy) * (sx - cx) + (cx - bx) * (sy - cy)) * invDenom;
        const w2 = ((cy - ay) * (sx - cx) + (ax - cx) * (sy - cy)) * invDenom;
        const w3 = 1 - w1 - w2;

        if (w1 >= -0.02 && w2 >= -0.02 && w3 >= -0.02) {
          const z = w1 * az + w2 * bz + w3 * cz;
          const idx = py * GRID + px;
          if (z > zBuf[idx]) {
            zBuf[idx] = z;
            shadeBuf[idx] = shade;
            hueBuf[idx] = tri.hueShift + (w1 - w2) * 0.25;
          }
        }
      }
    }
  }

  // Zakres zajętych komórek — kryształ wpisujemy w ikonę bez pustych marginesów
  let minCol = GRID, maxCol = -1, minRow = GRID, maxRow = -1;
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (zBuf[row * GRID + col] < -1e8) continue;
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;
    }
  }

  const out = document.createElement('canvas');
  out.width = size;
  out.height = size;
  const ctx = out.getContext('2d');
  if (!ctx || maxCol < 0) return out;

  const cols = maxCol - minCol + 1;
  const rows = maxRow - minRow + 1;
  const cellPx = Math.max(2, Math.floor((size - 4) / Math.max(cols, rows)));
  const ox = (size - cols * cellPx) / 2;
  const oy = (size - rows * cellPx) / 2;

  // Bufor bloomu (1/4) — jak w intra: płynna poświata bez rozmywania przez CPU
  const glow = document.createElement('canvas');
  glow.width = Math.max(8, Math.ceil(size / 4));
  glow.height = glow.width;
  const glowCtx = glow.getContext('2d');
  const glowScale = glow.width / size;

  ctx.imageSmoothingEnabled = false;
  ctx.font = `bold ${Math.max(3, cellPx)}px Consolas, "Courier New", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const idx = row * GRID + col;
      if (zBuf[idx] < -1e8) continue;

      const shade = shadeBuf[idx];
      const hueMix = Math.min(1, Math.max(0, 0.5 + 0.5 * Math.sin(hueBuf[idx] * 2.6 + time * 0.0022)));

      const baseR = 16 + hueMix * 214;
      const baseG = 195 - hueMix * 125;
      const baseB = 255 - hueMix * 25;

      const hi = Math.max(0, shade - 0.75) * 0.55;
      const r = Math.min(255, Math.round(baseR * shade + 165 * hi));
      const g = Math.min(255, Math.round(baseG * shade + 225 * hi));
      const b = Math.min(255, Math.round(baseB * shade + 255 * hi));

      const x = ox + (col - minCol + 0.5) * cellPx;
      const y = oy + (row - minRow + 0.5) * cellPx;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillText(Math.random() < 0.5 ? '1' : '0', x, y);

      if (glowCtx && shade > 0.52) {
        glowCtx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.4, shade * 0.32).toFixed(2)})`;
        glowCtx.fillRect(x * glowScale - 1, y * glowScale - 1, 2, 2);
      }
    }
  }

  if (glowCtx) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.55;
    ctx.drawImage(glow, 0, 0, size, size);
    ctx.restore();
  }

  return out;
}
