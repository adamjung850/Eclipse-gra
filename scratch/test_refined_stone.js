const fs = require('fs');

// We will generate BMP files directly without external libraries
function createBMP(width, height, getPixelRGBA) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buf = Buffer.alloc(fileSize);
  // Header
  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  // DIB Header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22); // positive = bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28); // 24-bit RGB
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);

  for (let y = 0; y < height; y++) {
    // bottom-up: BMP row 0 is image bottom (height - 1 - y)
    const imgY = height - 1 - y;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixelRGBA(x, imgY);
      const pxOffset = rowOffset + x * 3;
      buf[pxOffset] = b;
      buf[pxOffset + 1] = g;
      buf[pxOffset + 2] = r;
    }
  }
  return buf;
}

// 24x24 Canvas emulator
class MiniCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.pixels = new Uint32Array(w * h);
  }

  setPixel(x, y, hex) {
    // wrap coordinates for seamless tiling!
    const wx = ((x % this.w) + this.w) % this.w;
    const wy = ((y % this.h) + this.h) % this.h;
    const c = parseInt(hex.replace('#', ''), 16);
    const r = (c >> 16) & 0xff;
    const g = (c >> 8) & 0xff;
    const b = c & 0xff;
    this.pixels[wy * this.w + wx] = (255 << 24) | (r << 16) | (g << 8) | b;
  }

  fillRect(x, y, w, h, hex) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, hex);
      }
    }
  }

  getRGB(x, y) {
    const val = this.pixels[y * this.w + x];
    const r = (val >> 16) & 0xff;
    const g = (val >> 8) & 0xff;
    const b = val & 0xff;
    return [r, g, b];
  }
}

// Let's design stone pixel art on 24x24
// Terraria-style stone:
// Neutral natural slate grey palette:
// #9ca4af (bright highlight)
// #858d98 (soft highlight)
// #6f7682 (light midtone)
// #5b626c (main base rock)
// #494e57 (medium shade)
// #373b42 (dark crevice)
// #292c32 (deepest crack)

function renderStone(c) {
  const T = 24;
  // Base rock tone
  c.fillRect(0, 0, T, T, '#5b626c');

  // We design 3 natural rounded rock boulders nestled together with organic boundaries:
  // Boulder 1 (upper left / center, large, ~14x12)
  // Boulder 2 (bottom right, medium, ~12x11)
  // Boulder 3 (bottom left / upper right wrap, ~10x9)

  // 1. Organic rock body midtones (#6f7682)
  // Boulder 1:
  c.fillRect(2, 2, 12, 9, '#6f7682');
  c.fillRect(1, 4, 14, 6, '#6f7682');
  c.fillRect(3, 1, 10, 11, '#6f7682');

  // Boulder 2 (bottom-right):
  c.fillRect(13, 13, 9, 8, '#6f7682');
  c.fillRect(12, 15, 11, 5, '#6f7682');
  c.fillRect(14, 12, 7, 10, '#6f7682');

  // Boulder 3 (wrapping across edges to be seamless!):
  // Let's do top-right wrap:
  c.fillRect(17, 1, 7, 8, '#6f7682');
  c.fillRect(16, 3, 8, 5, '#6f7682');
  // Bottom-left wrap:
  c.fillRect(1, 15, 9, 7, '#6f7682');
  c.fillRect(2, 14, 7, 9, '#6f7682');

  // 2. Soft top-left highlights (#858d98) on rounded boulder tops
  // Boulder 1 highlight:
  c.fillRect(3, 2, 7, 3, '#858d98');
  c.fillRect(2, 4, 8, 3, '#858d98');
  c.fillRect(4, 5, 6, 2, '#858d98');

  // Boulder 2 highlight:
  c.fillRect(14, 13, 6, 3, '#858d98');
  c.fillRect(13, 15, 6, 2, '#858d98');

  // Boulder 3 highlights:
  c.fillRect(18, 2, 5, 3, '#858d98');
  c.fillRect(2, 15, 6, 3, '#858d98');

  // 3. Crisp spec/bright highlights (#9ca4af)
  c.fillRect(4, 2, 4, 1, '#9ca4af');
  c.fillRect(3, 3, 3, 1, '#9ca4af');
  c.fillRect(15, 13, 3, 1, '#9ca4af');
  c.fillRect(19, 2, 3, 1, '#9ca4af');
  c.fillRect(3, 15, 3, 1, '#9ca4af');

  // 4. Subtle micro-grain texture / stony specks (#5b626c & #494e57 inside lit areas)
  c.setPixel(6, 4, '#5b626c');
  c.setPixel(8, 3, '#6f7682');
  c.setPixel(5, 7, '#494e57');
  c.setPixel(10, 6, '#494e57');
  c.setPixel(16, 15, '#5b626c');
  c.setPixel(18, 16, '#494e57');
  c.setPixel(5, 17, '#5b626c');
  c.setPixel(20, 4, '#5b626c');

  // 5. Crevice seams between boulders (#494e57) - organic, NOT diagonal lines!
  // Seam between Boulder 1 and Boulder 2 (curved horizontal-ish S-curve):
  c.fillRect(7, 12, 5, 2, '#494e57');
  c.fillRect(11, 11, 4, 2, '#494e57');
  c.fillRect(14, 10, 3, 2, '#494e57');
  c.fillRect(2, 12, 6, 2, '#494e57');

  // Seam between Boulder 1 and Boulder 3 (vertical-ish gentle curve):
  c.fillRect(15, 3, 2, 4, '#494e57');
  c.fillRect(16, 6, 2, 4, '#494e57');
  c.fillRect(15, 9, 2, 3, '#494e57');

  // Seam at bottom edge:
  c.fillRect(8, 22, 5, 2, '#494e57');
  c.fillRect(12, 21, 4, 2, '#494e57');
  c.fillRect(21, 10, 3, 2, '#494e57');

  // 6. Deep shadow cracks (#373b42 and #292c32)
  c.fillRect(9, 12, 3, 1, '#373b42');
  c.fillRect(12, 11, 2, 1, '#292c32');
  c.fillRect(15, 5, 1, 3, '#373b42');
  c.fillRect(16, 7, 1, 2, '#292c32');
  c.fillRect(3, 13, 3, 1, '#373b42');
  c.fillRect(13, 22, 2, 1, '#373b42');
  c.fillRect(22, 11, 2, 1, '#373b42');

  // Deepest pits (1-2 px accent)
  c.setPixel(13, 11, '#292c32');
  c.setPixel(16, 8, '#292c32');
  c.setPixel(4, 13, '#292c32');
}

// Function to render Ore nodules embedded in stone
function renderOre(c, palette) {
  // First draw base stone
  renderStone(c);

  // Discrete, chunky mineral clusters nestled inside the rock crevices and faces:
  // Cluster A: (5, 5) - size ~6x5
  // Cluster B: (15, 14) - size ~5x5
  // Cluster C: (18, 5) - size ~4x3

  const clusters = [
    // Cluster A
    {
      shadows: [[4, 4, 7, 6], [5, 3, 5, 8]],
      base:    [[5, 5, 5, 4], [6, 4, 3, 6]],
      bright:  [[5, 5, 3, 3], [6, 4, 2, 2]],
      hi:      [[5, 5, 2, 1], [6, 4, 1, 1]],
      sparkle: [[5, 5]]
    },
    // Cluster B
    {
      shadows: [[14, 13, 6, 6], [15, 12, 4, 8]],
      base:    [[15, 14, 4, 4], [16, 13, 2, 6]],
      bright:  [[15, 14, 2, 3], [16, 13, 2, 1]],
      hi:      [[15, 14, 1, 2]],
      sparkle: [[15, 14]]
    },
    // Cluster C
    {
      shadows: [[17, 4, 5, 4]],
      base:    [[18, 5, 3, 2], [19, 4, 2, 3]],
      bright:  [[18, 5, 2, 1]],
      hi:      [[18, 5, 1, 1]],
      sparkle: [[18, 5]]
    }
  ];

  clusters.forEach(cl => {
    // 1. Dark rock socket / shadow contour around ore
    cl.shadows.forEach(([x, y, w, h]) => c.fillRect(x, y, w, h, palette.shadow));
    // 2. Base ore body
    cl.base.forEach(([x, y, w, h]) => c.fillRect(x, y, w, h, palette.base));
    // 3. Bright facet
    cl.bright.forEach(([x, y, w, h]) => c.fillRect(x, y, w, h, palette.bright));
    // 4. Highlight
    cl.hi.forEach(([x, y, w, h]) => c.fillRect(x, y, w, h, palette.hi));
    // 5. Gem sparkle glint
    cl.sparkle.forEach(([x, y]) => c.fillRect(x, y, 1, 1, palette.sparkle));
  });
}

// Palettes:
const orePalettes = {
  copper: {
    shadow: '#3d1c06',
    base: '#c85e28',
    bright: '#e97e3c',
    hi: '#ffa86b',
    sparkle: '#ffe2c7'
  },
  iron: {
    shadow: '#2e2825',
    base: '#9e8a7c',
    bright: '#baaa9c',
    hi: '#ded5cc',
    sparkle: '#ffffff'
  },
  coal: {
    shadow: '#151618',
    base: '#26282b',
    bright: '#3b3e44',
    hi: '#595d66',
    sparkle: '#7b818c'
  },
  gold: {
    shadow: '#4d3a00',
    base: '#d4a017',
    bright: '#f5c32c',
    hi: '#ffe668',
    sparkle: '#ffffff'
  },
  diamond: {
    shadow: '#0a3642',
    base: '#1fb5cf',
    bright: '#4de4f7',
    hi: '#a3f6ff',
    sparkle: '#ffffff'
  }
};

// Now generate a composite image to test tiling!
// A 4x4 grid of Stone (96x96 pixels), next to 2x2 grids of each ore!
const T = 24;
const stoneCanvas = new MiniCanvas(T, T);
renderStone(stoneCanvas);

const copperCanvas = new MiniCanvas(T, T);
renderOre(copperCanvas, orePalettes.copper);

const ironCanvas = new MiniCanvas(T, T);
renderOre(ironCanvas, orePalettes.iron);

const coalCanvas = new MiniCanvas(T, T);
renderOre(coalCanvas, orePalettes.coal);

const goldCanvas = new MiniCanvas(T, T);
renderOre(goldCanvas, orePalettes.gold);

const diamondCanvas = new MiniCanvas(T, T);
renderOre(diamondCanvas, orePalettes.diamond);

// Big preview:
// Row 1: Stone 4x4 (96x96)
// Row 2: Copper (48x48), Iron (48x48), Coal (48x48), Gold (48x48), Diamond (48x48)
const previewW = 96 * 4; // 384
const previewH = 96 * 4; // 384
const scale = 2; // upscale for crisp inspection

const outW = (96 + 48 * 2) * scale;
const outH = (96 + 48) * scale;

const composite = new MiniCanvas(outW, outH);
composite.fillRect(0, 0, outW, outH, '#1e2025');

// Helper to blit a tile onto composite
function blit(canvas, destX, destY) {
  for (let y = 0; y < T; y++) {
    for (let x = 0; x < T; x++) {
      const [r, g, b] = canvas.getRGB(x, y);
      const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          composite.setPixel((destX + x) * scale + sx, (destY + y) * scale + sy, hex);
        }
      }
    }
  }
}

// 1. Draw 4x4 stone
for (let ty = 0; ty < 4; ty++) {
  for (let tx = 0; tx < 4; tx++) {
    blit(stoneCanvas, tx * T, ty * T);
  }
}

// 2. Draw 2x2 for each ore
function draw2x2(canvas, startX, startY) {
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      blit(canvas, startX + tx * T, startY + ty * T);
    }
  }
}

draw2x2(copperCanvas, 104, 0);
draw2x2(ironCanvas, 104 + 52, 0);
draw2x2(coalCanvas, 104, 52);
draw2x2(goldCanvas, 104 + 52, 52);

const bmpBuf = createBMP(outW, outH, (x, y) => composite.getRGB(x, y));
fs.writeFileSync('scratch/refined_stone_test.bmp', bmpBuf);
console.log('Saved scratch/refined_stone_test.bmp');
