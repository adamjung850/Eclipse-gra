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

      // Alpha blend onto midnight sky background (#0b0e1a)
      const bgR = 11, bgG = 14, bgB = 26;
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

function renderMoon(size = 72) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = 35;
  const cy = 35;
  const R = 25.0;

  // Cutout circle for crescent (offset up-right)
  const cutX = cx + 11.5;
  const cutY = cy - 4.5;
  const cutR = 23.0;

  // Soft craters on the crescent
  const craters = [
    [-10, 5, 4.0],
    [-4, 14, 3.5],
    [-13, -6, 3.2],
    [-5, -14, 2.5]
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const cutDx = x - cutX;
      const cutDy = y - cutY;
      const cutDist = Math.sqrt(cutDx * cutDx + cutDy * cutDy);

      const pIdx = (y * size + x) * 4;

      // Inside main circle
      const inMain = dist <= R;
      const inCut = cutDist <= cutR;

      if (inMain && !inCut) {
        // Pixel is inside the crescent!
        const edgeDist = Math.min(R - dist, cutDist - cutR);

        // Check if in crater
        let inCrater = false;
        let cDepth = 0;
        for (const [crX, crY, crR] of craters) {
          const cdx = dx - crX;
          const cdy = dy - crY;
          const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
          if (cDist <= crR) {
            inCrater = true;
            cDepth = 1.0 - cDist / crR;
            break;
          }
        }

        let r = 255, g = 255, b = 255;

        // Silhouette outline
        if (edgeDist < 1.2) {
          // Warm amber/slate outline
          r = 75; g = 85; b = 115;
        } else if (inCrater) {
          // Lunar mare crater shading (soft blue-gray)
          if (cDepth > 0.5) {
            r = 160; g = 175; b = 205;
          } else {
            r = 195; g = 210; b = 230;
          }
        } else {
          // Light gradient: outer rim is brilliant pearlescent white/cream
          const outerFactor = (-dx * 0.7 - dy * 0.5) / R;
          if (outerFactor > 0.35) {
            // Pure glowing white crest
            r = 255; g = 255; b = 255;
          } else if (outerFactor > -0.1) {
            // Warm pale pearl / cream
            r = 245; g = 248; b = 255;
          } else if (outerFactor > -0.5) {
            // Soft silver
            r = 220; g = 230; b = 248;
          } else {
            // Inner crescent twilight shade
            r = 185; g = 200; b = 225;
          }
        }

        pixels[pIdx] = r;
        pixels[pIdx + 1] = g;
        pixels[pIdx + 2] = b;
        pixels[pIdx + 3] = 255;
      } else if (inMain && inCut) {
        // Unlit / earthshine part of the moon (dark translucent silhouette of the rest of the sphere!)
        // Gives that magical realistic look where you can faintly see the rest of the moon globe
        const shade = Math.floor(18 + (1.0 - dist / R) * 14);
        pixels[pIdx] = 40;
        pixels[pIdx + 1] = 48;
        pixels[pIdx + 2] = 75;
        pixels[pIdx + 3] = shade;
      } else if (dist <= R + 6.0) {
        // Celestial moon aura (soft golden-silver halo around crescent)
        const haloDist = dist - R;
        // Stronger glow on the lit crescent side (left/bottom-left)
        const angleFactor = Math.max(0, (-dx * 0.7 - dy * 0.5) / dist);
        const alpha = Math.floor((1.0 - haloDist / 6.0) * (50 + angleFactor * 60));
        if (alpha > 0) {
          pixels[pIdx] = 220;
          pixels[pIdx + 1] = 235;
          pixels[pIdx + 2] = 255;
          pixels[pIdx + 3] = Math.min(255, alpha);
        }
      }
    }
  }

  return pixels;
}

const moonBuf = renderMoon(72);
const bmp = createBmpBuffer(72, 72, moonBuf);
fs.writeFileSync('scratch/crescent_moon_preview.bmp', bmp);
console.log('Successfully wrote crescent_moon_preview.bmp');
