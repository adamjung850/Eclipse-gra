// 100% Handcrafted Pixel Art Tree Sprites & Procedural Foliage Generators
// Multiple crown shapes, palettes, and organic branch variations

export interface FoliageCluster {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface CrownDef {
  id: number;
  name: string;
  width: number;
  height: number;
  clusters: FoliageCluster[];
}

export interface CrownPalette {
  name: string;
  outline: string;
  deepShadow: string;
  midShadow: string;
  baseLeaf: string;
  sunlit: string;
  highlight: string;
  specular: string;
  particlePrimary: number;
  particleSecondary: number;
}

export const CROWN_PALETTES: CrownPalette[] = [
  // 0: Lush Emerald (Klasyczny Szmaragd)
  {
    name: 'emerald',
    outline: '#0c2610',
    deepShadow: '#13471e',
    midShadow: '#1f6a2e',
    baseLeaf: '#2d8e3f',
    sunlit: '#44bb57',
    highlight: '#77e086',
    specular: '#b2f7bc',
    particlePrimary: 0x2d8e3f,
    particleSecondary: 0x77e086,
  },
  // 1: Warm Olive Forest (Ciepły Dąb / Oliwka)
  {
    name: 'olive',
    outline: '#1a280c',
    deepShadow: '#284313',
    midShadow: '#3c641d',
    baseLeaf: '#528328',
    sunlit: '#72ad37',
    highlight: '#9ed654',
    specular: '#d5f68b',
    particlePrimary: 0x528328,
    particleSecondary: 0x9ed654,
  },
  // 2: Deep Teal Spruce (Głęboki Bór / Świerk)
  {
    name: 'teal',
    outline: '#08231c',
    deepShadow: '#0f3c32',
    midShadow: '#165c4c',
    baseLeaf: '#1f7d67',
    sunlit: '#2ea58d',
    highlight: '#5bdabc',
    specular: '#9ef2df',
    particlePrimary: 0x1f7d67,
    particleSecondary: 0x5bdabc,
  },
  // 3: Golden Summer Apple (Złocisty Letni Gaj)
  {
    name: 'golden',
    outline: '#1e2808',
    deepShadow: '#30420e',
    midShadow: '#496317',
    baseLeaf: '#658821',
    sunlit: '#8ab92e',
    highlight: '#b7df4b',
    specular: '#eaf793',
    particlePrimary: 0x658821,
    particleSecondary: 0xb7df4b,
  }
];

export const CROWN_DEFS: CrownDef[] = [
  // Variant 0: Round Oak (Gęsty, okrągły dąb Terraria z opadającymi płatami po bokach)
  {
    id: 0,
    name: 'round_oak',
    width: 76,
    height: 60,
    clusters: [
      { cx: 38, cy: 26, rx: 22, ry: 19 },
      { cx: 38, cy: 14, rx: 17, ry: 12 },
      { cx: 20, cy: 26, rx: 16, ry: 16 },
      { cx: 56, cy: 26, rx: 16, ry: 16 },
      { cx: 20, cy: 44, rx: 14, ry: 14 },
      { cx: 56, cy: 44, rx: 14, ry: 14 },
      { cx: 38, cy: 38, rx: 12, ry: 11 }
    ]
  },
  // Variant 1: Tall Forest (Wysokie smukłe drzewo leśne)
  {
    id: 1,
    name: 'tall_forest',
    width: 62,
    height: 78,
    clusters: [
      { cx: 31, cy: 15, rx: 13, ry: 12 },
      { cx: 31, cy: 28, rx: 17, ry: 14 },
      { cx: 22, cy: 42, rx: 15, ry: 14 },
      { cx: 40, cy: 41, rx: 15, ry: 14 },
      { cx: 18, cy: 56, rx: 15, ry: 13 },
      { cx: 44, cy: 55, rx: 15, ry: 13 },
      { cx: 31, cy: 61, rx: 14, ry: 10 }
    ]
  },
  // Variant 2: Wide Ancient (Szerokie, rozłożyste prastare drzewo)
  {
    id: 2,
    name: 'wide_ancient',
    width: 90,
    height: 54,
    clusters: [
      { cx: 45, cy: 22, rx: 20, ry: 16 },
      { cx: 33, cy: 15, rx: 14, ry: 11 },
      { cx: 57, cy: 14, rx: 14, ry: 11 },
      { cx: 24, cy: 27, rx: 17, ry: 15 },
      { cx: 66, cy: 26, rx: 17, ry: 15 },
      { cx: 12, cy: 36, rx: 11, ry: 11 },
      { cx: 78, cy: 35, rx: 11, ry: 11 },
      { cx: 32, cy: 38, rx: 15, ry: 10 },
      { cx: 58, cy: 38, rx: 15, ry: 10 }
    ]
  },
  // Variant 3: Split Twin (Rozwidlona, podwójna korona)
  {
    id: 3,
    name: 'split_twin',
    width: 82,
    height: 60,
    clusters: [
      { cx: 26, cy: 25, rx: 18, ry: 17 },
      { cx: 24, cy: 14, rx: 13, ry: 11 },
      { cx: 13, cy: 37, rx: 12, ry: 12 },
      { cx: 56, cy: 25, rx: 18, ry: 17 },
      { cx: 58, cy: 14, rx: 13, ry: 11 },
      { cx: 69, cy: 37, rx: 12, ry: 12 },
      { cx: 41, cy: 34, rx: 13, ry: 12 },
      { cx: 29, cy: 43, rx: 12, ry: 9 },
      { cx: 53, cy: 43, rx: 12, ry: 9 }
    ]
  },
  // Variant 4: Wild Bushy (Asymetryczna, dzika korona)
  {
    id: 4,
    name: 'wild_bushy',
    width: 70,
    height: 56,
    clusters: [
      { cx: 39, cy: 24, rx: 19, ry: 17 },
      { cx: 45, cy: 14, rx: 14, ry: 11 },
      { cx: 20, cy: 30, rx: 16, ry: 14 },
      { cx: 10, cy: 37, rx: 9, ry: 9 },
      { cx: 55, cy: 36, rx: 13, ry: 13 },
      { cx: 26, cy: 42, rx: 13, ry: 10 },
      { cx: 46, cy: 42, rx: 14, ry: 10 }
    ]
  }
];

function hexToRgbaArray(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b, 255];
}

export function renderCrownToContext(
  ctx: CanvasRenderingContext2D,
  crownDef: CrownDef,
  palette: CrownPalette
): void {
  const { width, height, clusters } = crownDef;
  const imgData = ctx.createImageData(width, height);
  const pixels = imgData.data;

  const mask = new Uint8Array(width * height);
  const clusterIdMap = new Int16Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minDist = 999;
      let bestCluster = -1;

      for (let c = 0; c < clusters.length; c++) {
        const cl = clusters[c];
        const dx = (x - cl.cx) / cl.rx;
        const dy = (y - cl.cy) / cl.ry;
        const baseDist = dx * dx + dy * dy;

        // Leafy scalloping contour (bumps around perimeter that look like foliage bunches)
        const angle = Math.atan2(dy, dx);
        const scalloping = Math.sin(angle * 6.0) * 0.08 + Math.cos(angle * 3.0) * 0.04;
        const effectiveDist = baseDist + scalloping;

        if (effectiveDist <= 1.0) {
          if (effectiveDist < minDist) {
            minDist = effectiveDist;
            bestCluster = c;
          }
        }
      }

      const idx = y * width + x;
      if (bestCluster !== -1) {
        mask[idx] = 1;
        clusterIdMap[idx] = bestCluster;
      }
    }
  }

  // Identify outline pixels
  const isOutline = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx]) continue;

      let edge = false;
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        edge = true;
      } else {
        if (!mask[idx - 1] || !mask[idx + 1] || !mask[idx - width] || !mask[idx + width]) {
          edge = true;
        }
      }
      if (edge) isOutline[idx] = 1;
    }
  }

  const cOutline = hexToRgbaArray(palette.outline);
  const cDeepShadow = hexToRgbaArray(palette.deepShadow);
  const cMidShadow = hexToRgbaArray(palette.midShadow);
  const cBaseLeaf = hexToRgbaArray(palette.baseLeaf);
  const cSunlit = hexToRgbaArray(palette.sunlit);
  const cHighlight = hexToRgbaArray(palette.highlight);
  const cSpecular = hexToRgbaArray(palette.specular);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!mask[idx]) continue;

      const pIdx = idx * 4;

      if (isOutline[idx]) {
        pixels[pIdx] = cOutline[0];
        pixels[pIdx + 1] = cOutline[1];
        pixels[pIdx + 2] = cOutline[2];
        pixels[pIdx + 3] = 255;
        continue;
      }

      // Trunk socket: underside leaves overlapping top of wood
      const trunkCenterX = width / 2;
      const distFromTrunk = Math.abs(x - trunkCenterX);
      if (distFromTrunk <= 6 && y >= height - 10) {
        pixels[pIdx] = cDeepShadow[0];
        pixels[pIdx + 1] = cDeepShadow[1];
        pixels[pIdx + 2] = cDeepShadow[2];
        pixels[pIdx + 3] = 255;
        continue;
      }

      const cId = clusterIdMap[idx];
      const cl = clusters[cId];

      const nx = (x - cl.cx) / cl.rx;
      const ny = (y - cl.cy) / cl.ry;

      // Illumination from top-left
      let light = -0.45 * nx - 0.85 * ny;
      const heightGrad = (1.0 - y / height) * 0.40;
      light += heightGrad;

      // Soft cluster shadow: if another cluster is above us, cast shadow down
      let castShadow = 0;
      for (let c = 0; c < clusters.length; c++) {
        if (c === cId) continue;
        const other = clusters[c];
        if (other.cy < cl.cy) {
          const odx = (x - other.cx) / other.rx;
          const ody = (y - (other.cy + other.ry * 0.6)) / (other.ry * 0.7);
          if (odx * odx + ody * ody < 1.0 && y > other.cy) {
            castShadow = 0.45;
          }
        }
      }
      light -= castShadow;

      // Leaf texture flecks (2x2 pixel resolution for chunky retro feel)
      const gx = Math.floor(x / 2);
      const gy = Math.floor(y / 2);
      const dappleVal = ((gx * 374761393 + gy * 668265263) ^ 0x5bf03635) >>> 0;
      const dapple = (dappleVal % 1000) / 1000;

      let dappleMod = 0;
      if (dapple > 0.75) dappleMod = +0.26;
      else if (dapple < 0.22) dappleMod = -0.26;

      const totalIllum = light + dappleMod;

      let col: [number, number, number, number];
      if (totalIllum < -0.32) {
        col = cDeepShadow;
      } else if (totalIllum < 0.08) {
        col = cMidShadow;
      } else if (totalIllum < 0.58) {
        col = cBaseLeaf;
      } else if (totalIllum < 1.08) {
        col = cSunlit;
      } else if (totalIllum < 1.48) {
        col = cHighlight;
      } else {
        col = cSpecular;
      }

      pixels[pIdx] = col[0];
      pixels[pIdx + 1] = col[1];
      pixels[pIdx + 2] = col[2];
      pixels[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

export function renderBranchSpriteToContext(
  ctx: CanvasRenderingContext2D,
  side: 'L' | 'R',
  pal: CrownPalette
): void {
  const W = 40;
  const H = 32;
  ctx.clearRect(0, 0, W, H);

  const WOOD = {
    hi: '#c28859',
    lt: '#9e6c44',
    mid: '#7a4f2e',
    dk: '#54321c',
    out: '#331c0e'
  };

  const px = (gx: number, gy: number, hex: string) => {
    if (gx < 0 || gx >= 10 || gy < 0 || gy >= 8) return;
    ctx.fillStyle = hex;
    ctx.fillRect(gx * 4, gy * 4, 4, 4);
  };

  if (side === 'L') {
    // 1. Thick wooden limb branching up-left from trunk (gx=9 connects to trunk at x=6)
    px(9, 7, WOOD.out); px(9, 6, WOOD.mid); px(9, 5, WOOD.lt);
    px(8, 6, WOOD.out); px(8, 5, WOOD.mid); px(8, 4, WOOD.lt);
    px(7, 5, WOOD.out); px(7, 4, WOOD.mid);
    px(6, 5, WOOD.out); px(6, 4, WOOD.mid);
    px(5, 4, WOOD.out); px(5, 3, WOOD.mid);

    // 2. Large round leaf crown on branch tip (centered at gx=3, gy=3)
    px(2, 0, pal.outline); px(3, 0, pal.outline); px(4, 0, pal.outline);
    px(1, 1, pal.outline); px(2, 1, pal.sunlit);  px(3, 1, pal.sunlit);  px(4, 1, pal.baseLeaf); px(5, 1, pal.outline);
    px(0, 2, pal.outline); px(1, 2, pal.sunlit);  px(2, 2, pal.sunlit);  px(3, 2, pal.baseLeaf); px(4, 2, pal.midShadow); px(5, 2, pal.outline);
    px(0, 3, pal.outline); px(1, 3, pal.baseLeaf); px(2, 3, pal.baseLeaf); px(3, 3, pal.midShadow); px(4, 3, pal.deepShadow); px(5, 3, pal.outline);
    px(0, 4, pal.outline); px(1, 4, pal.midShadow); px(2, 4, pal.midShadow); px(3, 4, pal.deepShadow); px(4, 4, pal.outline);
    px(1, 5, pal.outline); px(2, 5, pal.deepShadow); px(3, 5, pal.outline);
  } else {
    // 1. Thick wooden limb branching up-right from trunk (gx=0 connects to trunk at x=18)
    px(0, 7, WOOD.out); px(0, 6, WOOD.mid); px(0, 5, WOOD.lt);
    px(1, 6, WOOD.out); px(1, 5, WOOD.mid); px(1, 4, WOOD.lt);
    px(2, 5, WOOD.out); px(2, 4, WOOD.mid);
    px(3, 5, WOOD.out); px(3, 4, WOOD.mid);
    px(4, 4, WOOD.out); px(4, 3, WOOD.mid);

    // 2. Large round leaf crown on branch tip (centered at gx=6, gy=3)
    px(5, 0, pal.outline); px(6, 0, pal.outline); px(7, 0, pal.outline);
    px(4, 1, pal.outline); px(5, 1, pal.sunlit);  px(6, 1, pal.sunlit);  px(7, 1, pal.baseLeaf); px(8, 1, pal.outline);
    px(4, 2, pal.outline); px(5, 2, pal.sunlit);  px(6, 2, pal.baseLeaf); px(7, 2, pal.midShadow); px(8, 2, pal.deepShadow); px(9, 2, pal.outline);
    px(4, 3, pal.outline); px(5, 3, pal.baseLeaf); px(6, 3, pal.midShadow); px(7, 3, pal.deepShadow); px(8, 3, pal.deepShadow); px(9, 3, pal.outline);
    px(5, 4, pal.outline); px(6, 4, pal.midShadow); px(7, 4, pal.deepShadow); px(8, 4, pal.deepShadow); px(9, 4, pal.outline);
    px(6, 5, pal.outline); px(7, 5, pal.deepShadow); px(8, 5, pal.outline);
  }
}

export function drawTreeTrunk(ctx: CanvasRenderingContext2D, T: number): void {
  // Centered tree trunk (width 14px in 24px tile)
  ctx.fillStyle = '#382012'; ctx.fillRect(5, 0, 1, T); ctx.fillRect(18, 0, 1, T);
  ctx.fillStyle = '#54321c'; ctx.fillRect(6, 0, 1, T); ctx.fillRect(17, 0, 1, T);
  ctx.fillStyle = '#855331'; ctx.fillRect(7, 0, 10, T);
  // Vertical bark grain
  ctx.fillStyle = '#54321c'; ctx.fillRect(8, 0, 1, T); ctx.fillRect(13, 0, 1, T);
  ctx.fillStyle = '#b3774c'; ctx.fillRect(10, 0, 1, T); ctx.fillRect(15, 0, 1, T);
  // Bark knot
  ctx.fillStyle = '#382012'; ctx.fillRect(9, 11, 2, 1);
  ctx.fillStyle = '#54321c'; ctx.fillRect(9, 10, 2, 1); ctx.fillRect(9, 12, 1, 1);
  ctx.fillStyle = '#d69e70'; ctx.fillRect(11, 11, 1, 1);
}

export function drawTreeRoot(ctx: CanvasRenderingContext2D, T: number): void {
  // Flared root base expanding to width 22-24 at bottom
  for (let y = 0; y < T; y++) {
    const flare = Math.floor(Math.max(0, (y - 10) * 0.45));
    const leftX = 5 - flare;
    const rightX = 18 + flare;
    ctx.fillStyle = '#382012';
    ctx.fillRect(leftX, y, 1, 1);
    ctx.fillRect(rightX, y, 1, 1);
    ctx.fillStyle = '#54321c';
    if (leftX + 1 < rightX) ctx.fillRect(leftX + 1, y, 1, 1);
    if (rightX - 1 > leftX) ctx.fillRect(rightX - 1, y, 1, 1);
    ctx.fillStyle = '#855331';
    ctx.fillRect(leftX + 2, y, Math.max(0, rightX - leftX - 3), 1);
    // Vertical grain
    ctx.fillStyle = '#54321c'; ctx.fillRect(8, y, 1, 1); ctx.fillRect(13, y, 1, 1);
    ctx.fillStyle = '#b3774c'; ctx.fillRect(10, y, 1, 1); ctx.fillRect(15, y, 1, 1);
  }
  // Root tips anchoring into soil
  ctx.fillStyle = '#382012';
  ctx.fillRect(1, 22, 1, 2); ctx.fillRect(2, 21, 1, 1);
  ctx.fillRect(22, 22, 1, 2); ctx.fillRect(21, 21, 1, 1);
  ctx.fillRect(11, 23, 2, 1);
  ctx.fillStyle = '#54321c';
  ctx.fillRect(2, 22, 1, 1); ctx.fillRect(21, 22, 1, 1);
  ctx.fillStyle = '#855331';
  ctx.fillRect(2, 23, 1, 1); ctx.fillRect(21, 23, 1, 1);
}

export function drawTreeBranchL(ctx: CanvasRenderingContext2D, T: number): void {
  drawTreeTrunk(ctx, T);

  // 1. Sturdy diagonal wooden limb extending left from trunk
  const bWood = [
    [5, 12, 2, 4], [4, 11, 2, 4], [3, 10, 2, 4], [2, 9, 2, 3], [1, 8, 2, 3], [0, 8, 2, 2]
  ];
  ctx.fillStyle = '#855331';
  for (const [x, y, w, h] of bWood) ctx.fillRect(x, y, w, h);

  // Bark shading & grain:
  ctx.fillStyle = '#54321c';
  ctx.fillRect(5, 12, 1, 3);
  ctx.fillStyle = '#b3774c';
  ctx.fillRect(3, 10, 1, 3);
  ctx.fillRect(1, 8, 1, 2);

  // Bottom dark outline of limb:
  ctx.fillStyle = '#382012';
  ctx.fillRect(5, 16, 2, 1);
  ctx.fillRect(3, 14, 2, 1);
  ctx.fillRect(1, 12, 2, 1);
  ctx.fillRect(0, 10, 1, 1);
  // Top dark outline of limb:
  ctx.fillRect(4, 10, 1, 1);
  ctx.fillRect(2, 8, 1, 1);

  // 2. Substantial, lush rounded foliage cluster on left branch tip (x: 0..8, y: 0..9)
  // Dark emerald silhouette outline:
  ctx.fillStyle = '#0c2610';
  const foliageOutline = [
    [2, 0, 4, 1], [1, 1, 1, 2], [0, 3, 1, 5], [1, 8, 2, 1],
    [6, 1, 2, 1], [8, 2, 1, 3], [7, 5, 2, 1], [6, 6, 2, 1], [3, 9, 3, 1]
  ];
  for (const [x, y, w, h] of foliageOutline) ctx.fillRect(x, y, w, h);

  // Foliage midtone body:
  ctx.fillStyle = '#2d8e3f';
  ctx.fillRect(2, 1, 4, 7);
  ctx.fillRect(1, 3, 2, 4);
  ctx.fillRect(6, 2, 2, 3);

  // Sunlit highlights (top-left of cluster):
  ctx.fillStyle = '#77e086';
  ctx.fillRect(2, 1, 3, 2);
  ctx.fillStyle = '#b2f7bc';
  ctx.fillRect(3, 2, 1, 1);
  ctx.fillStyle = '#44bb57';
  ctx.fillRect(2, 3, 3, 2);
  ctx.fillRect(5, 2, 2, 2);

  // Deep foliage shadows (bottom):
  ctx.fillStyle = '#13471e';
  ctx.fillRect(1, 7, 3, 1);
  ctx.fillRect(3, 8, 3, 1);
  ctx.fillStyle = '#1f6a2e';
  ctx.fillRect(2, 6, 4, 1);
}

export function drawTreeBranchR(ctx: CanvasRenderingContext2D, T: number): void {
  drawTreeTrunk(ctx, T);

  // 1. Sturdy diagonal wooden limb extending right from trunk
  const bWood = [
    [17, 12, 2, 4], [18, 11, 2, 4], [19, 10, 2, 4], [20, 9, 2, 3], [21, 8, 2, 3], [22, 8, 2, 2]
  ];
  ctx.fillStyle = '#855331';
  for (const [x, y, w, h] of bWood) ctx.fillRect(x, y, w, h);

  // Bark shading & grain:
  ctx.fillStyle = '#54321c';
  ctx.fillRect(18, 12, 1, 3);
  ctx.fillStyle = '#b3774c';
  ctx.fillRect(20, 10, 1, 3);
  ctx.fillRect(22, 8, 1, 2);

  // Bottom dark outline:
  ctx.fillStyle = '#382012';
  ctx.fillRect(17, 16, 2, 1);
  ctx.fillRect(19, 14, 2, 1);
  ctx.fillRect(21, 12, 2, 1);
  ctx.fillRect(23, 10, 1, 1);
  // Top dark outline:
  ctx.fillRect(19, 10, 1, 1);
  ctx.fillRect(21, 8, 1, 1);

  // 2. Substantial, lush rounded foliage cluster on right branch tip (x: 15..23, y: 0..9)
  // Dark emerald silhouette outline:
  ctx.fillStyle = '#0c2610';
  const foliageOutline = [
    [18, 0, 4, 1], [16, 1, 2, 1], [15, 2, 1, 3], [16, 5, 2, 1],
    [22, 1, 1, 2], [23, 3, 1, 5], [21, 8, 2, 1], [18, 9, 3, 1]
  ];
  for (const [x, y, w, h] of foliageOutline) ctx.fillRect(x, y, w, h);

  // Foliage midtone body:
  ctx.fillStyle = '#2d8e3f';
  ctx.fillRect(18, 1, 4, 7);
  ctx.fillRect(16, 2, 2, 3);
  ctx.fillRect(21, 3, 2, 4);

  // Sunlit highlights (top of cluster):
  ctx.fillStyle = '#77e086';
  ctx.fillRect(18, 1, 3, 2);
  ctx.fillStyle = '#b2f7bc';
  ctx.fillRect(19, 2, 1, 1);
  ctx.fillStyle = '#44bb57';
  ctx.fillRect(17, 2, 2, 2);
  ctx.fillRect(18, 3, 3, 2);

  // Deep foliage shadows (bottom):
  ctx.fillStyle = '#13471e';
  ctx.fillRect(20, 7, 3, 1);
  ctx.fillRect(18, 8, 3, 1);
  ctx.fillStyle = '#1f6a2e';
  ctx.fillRect(18, 6, 4, 1);
}

export function drawTreeSapling(ctx: CanvasRenderingContext2D, T: number): void {
  // Roots at bottom (y: 21..23)
  ctx.fillStyle = '#382012'; ctx.fillRect(11, 23, 2, 1);
  ctx.fillStyle = '#54321c'; ctx.fillRect(10, 22, 1, 1); ctx.fillRect(13, 22, 1, 1);
  ctx.fillStyle = '#855331'; ctx.fillRect(11, 22, 2, 1);
  // Slender wood stem (y: 13..21)
  ctx.fillStyle = '#54321c'; ctx.fillRect(11, 13, 1, 9);
  ctx.fillStyle = '#855331'; ctx.fillRect(12, 13, 1, 9);
  ctx.fillStyle = '#b3774c'; ctx.fillRect(12, 13, 1, 5);
  // Left baby leaf
  ctx.fillStyle = '#0c2610';
  for (const [x, y] of [[8,11],[7,12],[6,13],[6,14],[7,15],[8,16],[9,16]]) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#2d8e3f'; ctx.fillRect(7, 13, 3, 2); ctx.fillRect(8, 12, 3, 1); ctx.fillRect(8, 15, 2, 1);
  ctx.fillStyle = '#77e086'; ctx.fillRect(8, 13, 1, 1);
  ctx.fillStyle = '#44bb57'; ctx.fillRect(9, 12, 1, 1);
  // Right baby leaf
  ctx.fillStyle = '#0c2610';
  for (const [x, y] of [[13,8],[14,8],[15,9],[16,10],[17,11],[16,12],[15,13],[14,14]]) ctx.fillRect(x, y, 1, 1);
  ctx.fillStyle = '#2d8e3f'; ctx.fillRect(13, 10, 3, 3); ctx.fillRect(13, 9, 2, 1); ctx.fillRect(16, 11, 1, 1);
  ctx.fillStyle = '#77e086'; ctx.fillRect(14, 10, 1, 1); ctx.fillRect(15, 11, 1, 1);
  ctx.fillStyle = '#44bb57'; ctx.fillRect(14, 11, 1, 1);
  // Top sprout bud
  ctx.fillStyle = '#0c2610'; ctx.fillRect(11, 9, 2, 1);
  ctx.fillStyle = '#44bb57'; ctx.fillRect(11, 10, 1, 1);
  ctx.fillStyle = '#77e086'; ctx.fillRect(12, 10, 1, 1);
}

export function drawLushLeaves(ctx: CanvasRenderingContext2D, T: number): void {
  // Beautiful seamless organic pixel art leaf block
  ctx.fillStyle = '#2d8e3f';
  ctx.fillRect(0, 0, T, T);

  // Layered foliage clusters
  // 1. Shaded underside crevices
  ctx.fillStyle = '#13471e';
  ctx.fillRect(0, 7, 3, 3); ctx.fillRect(8, 9, 4, 3);
  ctx.fillRect(18, 6, 4, 3); ctx.fillRect(10, 18, 5, 4);
  ctx.fillRect(0, 19, 4, 3); ctx.fillRect(19, 18, 3, 4);

  // 2. Mid shadow
  ctx.fillStyle = '#1f6a2e';
  ctx.fillRect(2, 5, 5, 3); ctx.fillRect(11, 7, 6, 3);
  ctx.fillRect(4, 16, 6, 3); ctx.fillRect(14, 15, 5, 3);

  // 3. Vibrant sunlit leaf clusters
  ctx.fillStyle = '#44bb57';
  ctx.fillRect(3, 2, 6, 4); ctx.fillRect(13, 3, 7, 4);
  ctx.fillRect(6, 11, 6, 4); ctx.fillRect(15, 12, 6, 4);

  // 4. Bright sunlit highlights
  ctx.fillStyle = '#77e086';
  ctx.fillRect(4, 2, 3, 2); ctx.fillRect(14, 3, 4, 2);
  ctx.fillRect(7, 11, 3, 2); ctx.fillRect(16, 12, 3, 2);

  // 5. Specular leaf tip glints
  ctx.fillStyle = '#b2f7bc';
  ctx.fillRect(5, 2, 1, 1); ctx.fillRect(15, 3, 1, 1);
  ctx.fillRect(8, 11, 1, 1); ctx.fillRect(17, 12, 1, 1);

  // 6. Deep inner leaf gaps (dark accents)
  ctx.fillStyle = '#0c2610';
  ctx.fillRect(1, 8, 2, 1); ctx.fillRect(9, 10, 2, 1);
  ctx.fillRect(19, 7, 2, 1); ctx.fillRect(11, 19, 2, 1);
}

export function drawWoodBlock(ctx: CanvasRenderingContext2D, T: number): void {
  // Crafted / harvested wood block for building
  ctx.fillStyle = '#54321c';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#855331';
  ctx.fillRect(2, 1, T - 4, T - 2);
  // Bark texture grooves
  ctx.fillStyle = '#382012';
  ctx.fillRect(0, 0, 1, T); ctx.fillRect(T - 1, 0, 1, T);
  ctx.fillRect(6, 0, 1, T); ctx.fillRect(14, 0, 1, T);
  ctx.fillStyle = '#b3774c';
  ctx.fillRect(8, 0, 2, T); ctx.fillRect(16, 0, 2, T);
  ctx.fillStyle = '#d69e70';
  ctx.fillRect(9, 6, 1, 4); ctx.fillRect(17, 14, 1, 4);
}
