import { GAME_CONSTANTS } from '../types/index.js';
import { WorldManager } from '../world/WorldManager.js';
import { Player } from '../entities/Player.js';

/**
 * DarknessSystem manages subterranean fog-of-war and dynamic lighting.
 * 
 * Rules:
 * - On the surface, the player sees sky, trees, and grass.
 * - Beneath the grass, the first dirt block is visible in daylight.
 * - From the 2nd dirt block downward, a mega-smooth vertical gradient smoothly transitions
 *   from daylight (alpha 0.0) into deep subterranean atmospheric gloom (alpha 0.86).
 * - Light sources softly illuminate through the gloom with smooth quadratic falloff:
 *   - Player personal aura (~140px radius, or ~230px with a held torch).
 *   - Placed torches (~180px radius).
 *   - Vormak boss glowing cyan neon joints (~100px radius).
 * - Renders directly in world coordinates on a single Graphics layer, maintaining 100%
 *   pixel alignment across all camera zooms (1.55x) and viewports.
 */
export class DarknessSystem {
  private scene: Phaser.Scene;
  private worldManager: WorldManager;
  private player: Player;
  private darknessGraphic: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, worldManager: WorldManager, player: Player) {
    this.scene = scene;
    this.worldManager = worldManager;
    this.player = player;

    this.darknessGraphic = scene.add.graphics();
    // Depth: 16 (Above world tiles and tree branches, but below player tool, combat float text and UI)
    this.darknessGraphic.setDepth(16);
  }

  public update(): void {
    this.darknessGraphic.clear();

    const cam = this.scene.cameras.main;
    const T = GAME_CONSTANTS.TILE_SIZE; // 24

    // Visible tile bounds in world coordinates (respecting camera zoom and viewport)
    const minX = Math.max(0, Math.floor(cam.worldView.x / T));
    const maxX = Math.min(GAME_CONSTANTS.WORLD_WIDTH - 1, Math.ceil((cam.worldView.x + cam.worldView.width) / T));
    const minY = Math.max(0, Math.floor(cam.worldView.y / T));
    const maxY = Math.min(GAME_CONSTANTS.WORLD_HEIGHT - 1, Math.ceil((cam.worldView.y + cam.worldView.height) / T) + 1);

    const playerX = this.player.x;
    const playerY = this.player.y;

    const activeItem = this.player.getSelectedItem();
    const isHoldingTorch = activeItem?.id === 'torch';
    const playerRadius = isHoldingTorch ? 230 : 140;
    const playerRadiusSq = playerRadius * playerRadius;

    // Placed torches in visible area
    const torchPositions: { x: number; y: number }[] = [];
    const torchRadius = 180;
    const torchRadiusSq = torchRadius * torchRadius;

    this.worldManager.placedTorches.forEach((encoded) => {
      const tx = encoded % this.worldManager.width;
      const ty = Math.floor(encoded / this.worldManager.width);
      if (tx >= minX - 8 && tx <= maxX + 8 && ty >= minY - 8 && ty <= maxY + 8) {
        torchPositions.push({ x: tx * T + T / 2, y: ty * T + T / 2 });
      }
    });

    const gloomColor = 0x030612; // Deep midnight slate/obsidian gloom
    const maxGloomAlpha = 0.86;  // Dark ambient gloom (not pitch black void)
    const gradHeight = 144;      // ~6 blocks smooth vertical transition (144px)

    for (let x = minX; x <= maxX; x++) {
      const surfaceY = this.worldManager.surfaceYCache[x];
      // Surface (block 0: grass) and Block 1 (first dirt block) remain daylight-visible.
      // The mega-smooth transition begins at the 2nd dirt block: surfaceY + 2
      const gradStartWorldY = (surfaceY + 2) * T;
      const gradEndWorldY = gradStartWorldY + gradHeight;
      const colWorldX = x * T;
      const colCenterX = colWorldX + T / 2;

      // Check if any light source affects this column
      let colHasLight = false;
      if (Math.abs(colCenterX - playerX) < playerRadius + T) {
        colHasLight = true;
      }
      if (!colHasLight) {
        for (let i = 0; i < torchPositions.length; i++) {
          if (Math.abs(colCenterX - torchPositions[i].x) < torchRadius + T) {
            colHasLight = true;
            break;
          }
        }
      }

      const colBottomWorldY = (maxY + 1) * T;

      if (!colHasLight) {
        // Fast path: No lights in this column!
        // 1. Smooth linear GPU gradient from 0.0 alpha to 0.86 alpha
        if (gradEndWorldY > cam.worldView.y && gradStartWorldY < cam.worldView.y + cam.worldView.height) {
          this.darknessGraphic.fillGradientStyle(
            gloomColor, gloomColor, gloomColor, gloomColor,
            0.0, 0.0, maxGloomAlpha, maxGloomAlpha
          );
          this.darknessGraphic.fillRect(colWorldX, gradStartWorldY, T + 0.5, gradHeight);
        }

        // 2. Uniform subterranean dark gloom below the gradient
        if (gradEndWorldY < colBottomWorldY) {
          const solidStartY = Math.max(gradEndWorldY, Math.floor(cam.worldView.y));
          const solidHeight = colBottomWorldY - solidStartY;
          if (solidHeight > 0) {
            this.darknessGraphic.fillStyle(gloomColor, maxGloomAlpha);
            this.darknessGraphic.fillRect(colWorldX, solidStartY, T + 0.5, solidHeight);
          }
        }
      } else {
        // Light-affected column: calculate smooth radial lighting per tile in world space
        const startTileY = Math.max(minY, surfaceY + 2);

        for (let y = startTileY; y <= maxY; y++) {
          const worldY = y * T + T / 2;

          // 1. Base ambient darkness from smooth gradient
          let ambientDarkness: number;
          if (worldY < gradStartWorldY) {
            ambientDarkness = 0;
          } else if (worldY < gradEndWorldY) {
            const progress = (worldY - gradStartWorldY) / gradHeight;
            ambientDarkness = progress * maxGloomAlpha;
          } else {
            ambientDarkness = maxGloomAlpha;
          }

          let darkness = ambientDarkness;

          // 2. Player light aura
          const pdx = colCenterX - playerX;
          const pdy = worldY - playerY;
          const pdistSq = pdx * pdx + pdy * pdy;
          if (pdistSq < playerRadiusSq) {
            const factor = 1.0 - Math.sqrt(pdistSq) / playerRadius;
            const light = factor * factor; // Smooth quadratic falloff
            darkness = Math.max(0, darkness - light * 0.92);
          }

          // 3. Placed torches
          for (let i = 0; i < torchPositions.length; i++) {
            const tdx = colCenterX - torchPositions[i].x;
            const tdy = worldY - torchPositions[i].y;
            const tdistSq = tdx * tdx + tdy * tdy;
            if (tdistSq < torchRadiusSq) {
              const factor = 1.0 - Math.sqrt(tdistSq) / torchRadius;
              const light = factor * factor * 1.15;
              darkness = Math.max(0, darkness - light * 0.95);
            }
          }

          if (darkness > 0.02) {
            this.darknessGraphic.fillStyle(gloomColor, darkness);
            this.darknessGraphic.fillRect(colWorldX, y * T, T + 0.5, T + 0.5);
          }
        }
      }
    }
  }

  public destroy(): void {
    this.darknessGraphic.destroy();
  }
}
