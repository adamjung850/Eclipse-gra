import fs from 'fs';

function createBmpBuffer(width, height, rgbaBuffer) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const imageSize = rowSize * height;
  const fileSize = 54 + imageSize;
  const buf = Buffer.alloc(fileSize);

  buf.write('BM', 0);
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(54, 10);
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);
  buf.writeUInt32LE(imageSize, 34);

  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y;
    const rowOffset = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 4;
      const r = rgbaBuffer[srcIdx];
      const g = rgbaBuffer[srcIdx + 1];
      const b = rgbaBuffer[srcIdx + 2];
      const a = rgbaBuffer[srcIdx + 3];

      // Alpha blend onto sky background (#4a9eff)
      const bgR = 74, bgG = 158, bgB = 255;
      const alpha = a / 255;
      const finalR = Math.round(r * alpha + bgR * (1 - alpha));
      const finalG = Math.round(g * alpha + bgG * (1 - alpha));
      const finalB = Math.round(b * alpha + bgB * (1 - alpha));

      const dstIdx = rowOffset + x * 3;
      buf[dstIdx] = finalB;
      buf[dstIdx + 1] = finalG;
      buf[dstIdx + 2] = finalR;
    }
  }

  return buf;
}

// 24x24 tile branch renderer test
function renderBranchTile(type = 'L') {
  const T = 24;
  const pixels = new Uint8Array(T * T * 4);

  function setPx(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= T || y < 0 || y >= T) return;
    const idx = (y * T + x) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = a;
  }

  function setHex(x, y, hex, a = 255) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    setPx(x, y, r, g, b, a);
  }

  function fillHex(x, y, w, h, hex) {
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        setHex(cx, cy, hex);
      }
    }
  }

  // 1. Draw standard trunk column
  fillHex(5, 0, 1, T, '#382012'); fillHex(18, 0, 1, T, '#382012');
  fillHex(6, 0, 1, T, '#54321c'); fillHex(17, 0, 1, T, '#54321c');
  fillHex(7, 0, 10, T, '#855331');
  fillHex(8, 0, 1, T, '#54321c'); fillHex(13, 0, 1, T, '#54321c');
  fillHex(10, 0, 1, T, '#b3774c'); fillHex(15, 0, 1, T, '#b3774c');

  if (type === 'L') {
    // Sturdy, thick diagonal branch extending to left (3-4px thick bark)
    // Wood body:
    const bWood = [
      [5, 12, 2, 4], [4, 11, 2, 4], [3, 10, 2, 4], [2, 9, 2, 3], [1, 8, 2, 3], [0, 8, 2, 2]
    ];
    for (const [x, y, w, h] of bWood) fillHex(x, y, w, h, '#855331');

    // Bark shading & grain:
    fillHex(5, 12, 1, 3, '#54321c');
    fillHex(3, 10, 1, 3, '#b3774c');
    fillHex(1, 8, 1, 2, '#b3774c');

    // Bottom dark outline of branch:
    fillHex(5, 16, 2, 1, '#382012');
    fillHex(3, 14, 2, 1, '#382012');
    fillHex(1, 12, 2, 1, '#382012');
    fillHex(0, 10, 1, 1, '#382012');

    // Top dark outline of branch:
    fillHex(4, 10, 1, 1, '#382012');
    fillHex(2, 8, 1, 1, '#382012');

    // Substantial, lush rounded foliage cluster on left branch tip (x: 0..8, y: 1..10)
    // Dark outline:
    const foliageOutline = [
      [2, 0, 4, 1], [1, 1, 1, 2], [0, 3, 1, 5], [1, 8, 2, 1],
      [6, 1, 2, 1], [8, 2, 1, 3], [7, 5, 2, 1], [6, 6, 2, 1], [3, 9, 3, 1]
    ];
    for (const [x, y, w, h] of foliageOutline) fillHex(x, y, w, h, '#0c2610');

    // Foliage body:
    fillHex(2, 1, 4, 7, '#2d8e3f');
    fillHex(1, 3, 2, 4, '#2d8e3f');
    fillHex(6, 2, 2, 3, '#2d8e3f');

    // Sunlit highlights (top-left of cluster):
    fillHex(2, 1, 3, 2, '#77e086');
    fillHex(3, 2, 1, 1, '#b2f7bc'); // glint
    fillHex(2, 3, 3, 2, '#44bb57');
    fillHex(5, 2, 2, 2, '#44bb57');

    // Deep shadows (bottom of foliage):
    fillHex(1, 7, 3, 1, '#13471e');
    fillHex(3, 8, 3, 1, '#13471e');
    fillHex(2, 6, 4, 1, '#1f6a2e');
  } else {
    // Right branch
    const bWood = [
      [17, 12, 2, 4], [18, 11, 2, 4], [19, 10, 2, 4], [20, 9, 2, 3], [21, 8, 2, 3], [22, 8, 2, 2]
    ];
    for (const [x, y, w, h] of bWood) fillHex(x, y, w, h, '#855331');

    fillHex(18, 12, 1, 3, '#54321c');
    fillHex(20, 10, 1, 3, '#b3774c');
    fillHex(22, 8, 1, 2, '#b3774c');

    fillHex(17, 16, 2, 1, '#382012');
    fillHex(19, 14, 2, 1, '#382012');
    fillHex(21, 12, 2, 1, '#382012');
    fillHex(23, 10, 1, 1, '#382012');

    fillHex(19, 10, 1, 1, '#382012');
    fillHex(21, 8, 1, 1, '#382012');

    // Foliage on right:
    const foliageOutline = [
      [18, 0, 4, 1], [16, 1, 2, 1], [15, 2, 1, 3], [16, 5, 2, 1],
      [22, 1, 1, 2], [23, 3, 1, 5], [21, 8, 2, 1], [18, 9, 3, 1]
    ];
    for (const [x, y, w, h] of foliageOutline) fillHex(x, y, w, h, '#0c2610');

    fillHex(18, 1, 4, 7, '#2d8e3f');
    fillHex(16, 2, 2, 3, '#2d8e3f');
    fillHex(21, 3, 2, 4, '#2d8e3f');

    fillHex(18, 1, 3, 2, '#77e086');
    fillHex(19, 2, 1, 1, '#b2f7bc');
    fillHex(17, 2, 2, 2, '#44bb57');
    fillHex(18, 3, 3, 2, '#44bb57');

    fillHex(20, 7, 3, 1, '#13471e');
    fillHex(18, 8, 3, 1, '#13471e');
    fillHex(18, 6, 4, 1, '#1f6a2e');
  }

  return pixels;
}

// Draw a composite tree: root, trunk, branch L, trunk, branch R, crown
const W = 100, H = 140;
const treeImg = new Uint8Array(W * H * 4);

function blitTile(srcPixels, dstX, dstY) {
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const sIdx = (y * 24 + x) * 4;
      const dIdx = ((dstY + y) * W + (dstX + x)) * 4;
      if (srcPixels[sIdx + 3] > 0) {
        treeImg[dIdx] = srcPixels[sIdx];
        treeImg[dIdx + 1] = srcPixels[sIdx + 1];
        treeImg[dIdx + 2] = srcPixels[sIdx + 2];
        treeImg[dIdx + 3] = srcPixels[sIdx + 3];
      }
    }
  }
}

const bL = renderBranchTile('L');
const bR = renderBranchTile('R');
blitTile(bL, 38, 60);
blitTile(bR, 38, 36);

const bmp = createBmpBuffer(W, H, treeImg);
fs.writeFileSync('scratch/tree_branches_preview.bmp', bmp);
console.log('Successfully wrote tree_branches_preview.bmp');
