import { BlockId, GAME_CONSTANTS } from '../types/index.js';

export class TextureGenerator {
  public static generateAll(scene: Phaser.Scene): void {
    const T = GAME_CONSTANTS.TILE_SIZE;

    // 1. Generate Block Tiles
    this.createBlockTextures(scene, T);

    // 1.1 Generate Unified Tileset Texture for Phaser Tilemap
    this.createTilesetTexture(scene, T);

    // 2. Generate Crack Textures
    this.createCrackTextures(scene, T);

    // 3. Generate Player Sprites
    this.createPlayerTextures(scene);

    // 4. Generate Tool & Icon Textures
    this.createItemIcons(scene);

    // 5. Generate Reticle & Particles
    this.createUtilityTextures(scene, T);
  }

  private static createBlockTextures(scene: Phaser.Scene, T: number): void {
    // Helper to draw single tile canvas
    const drawTile = (key: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, T, T);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx);
      canvas.refresh();
    };

    // 1. DIRT
    drawTile(`tile_${BlockId.DIRT}`, (ctx) => {
      ctx.fillStyle = '#6e4527';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#825432';
      ctx.fillRect(2, 2, T - 4, T - 4);
      // Noise grains
      const spots = [
        [3, 4, '#54341c', 3], [12, 6, '#9c663d', 4], [8, 14, '#54341c', 4],
        [18, 16, '#9c663d', 3], [5, 18, '#432915', 3], [15, 10, '#54341c', 2]
      ];
      spots.forEach(([x, y, col, s]) => {
        ctx.fillStyle = col as string;
        ctx.fillRect(x as number, y as number, s as number, s as number);
      });
      // Edge shading
      ctx.fillStyle = '#482a13';
      ctx.fillRect(0, T - 2, T, 2);
      ctx.fillRect(T - 2, 0, 2, T);
    });

    // 2. GRASS
    drawTile(`tile_${BlockId.GRASS}`, (ctx) => {
      // Base dirt
      ctx.fillStyle = '#6e4527';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#825432';
      ctx.fillRect(2, 2, T - 4, T - 4);
      // Dirt noise
      ctx.fillStyle = '#54341c';
      ctx.fillRect(6, 14, 4, 3);
      ctx.fillRect(16, 17, 3, 3);

      // Lush grass top
      ctx.fillStyle = '#327a24';
      ctx.fillRect(0, 0, T, 8);
      ctx.fillStyle = '#48a336';
      ctx.fillRect(0, 0, T, 6);
      ctx.fillStyle = '#68cc4f';
      ctx.fillRect(1, 1, T - 2, 2);

      // Grass hanging blades/fringes
      const blades = [[2, 7, 3], [6, 9, 4], [11, 8, 3], [15, 10, 4], [19, 7, 3], [22, 9, 2]];
      ctx.fillStyle = '#3f912e';
      blades.forEach(([x, y, h]) => {
        ctx.fillRect(x, 6, 2, h);
      });
      ctx.fillStyle = '#48a336';
      blades.forEach(([x, y, h]) => {
        ctx.fillRect(x, 6, 1, h - 1);
      });
    });

    // 3. STONE
    drawTile(`tile_${BlockId.STONE}`, (ctx) => {
      ctx.fillStyle = '#5b616b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#737982';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Highlights & cracks
      ctx.fillStyle = '#8d95a1';
      ctx.fillRect(2, 2, 8, 6);
      ctx.fillRect(14, 10, 7, 6);
      ctx.fillStyle = '#474b54';
      // Crack lines
      ctx.fillRect(7, 3, 2, 5);
      ctx.fillRect(9, 7, 5, 2);
      ctx.fillRect(13, 8, 2, 6);
      ctx.fillRect(4, 15, 8, 2);
      // Shadow bottom-right
      ctx.fillStyle = '#3c4047';
      ctx.fillRect(0, T - 2, T, 2);
      ctx.fillRect(T - 2, 0, 2, T);
    });

    // 4. WOOD
    drawTile(`tile_${BlockId.WOOD}`, (ctx) => {
      ctx.fillStyle = '#4e331c';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#6b4929';
      ctx.fillRect(2, 0, T - 4, T);
      // Vertical bark grain
      ctx.fillStyle = '#52371d';
      ctx.fillRect(4, 0, 2, T);
      ctx.fillRect(11, 0, 3, T);
      ctx.fillRect(18, 0, 2, T);
      ctx.fillStyle = '#7e5733';
      ctx.fillRect(2, 0, 2, T);
      ctx.fillRect(14, 0, 2, T);
    });

    // 5. LEAVES
    drawTile(`tile_${BlockId.LEAVES}`, (ctx) => {
      ctx.fillStyle = '#1c6625';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#2e8b39';
      ctx.fillRect(2, 2, T - 4, T - 4);
      // Leaf highlights
      ctx.fillStyle = '#44b050';
      ctx.fillRect(4, 4, 5, 4);
      ctx.fillRect(13, 5, 6, 4);
      ctx.fillRect(7, 13, 6, 5);
      ctx.fillRect(16, 14, 4, 4);
      // Deep shade gaps
      ctx.fillStyle = '#144d1c';
      ctx.fillRect(9, 2, 3, 3);
      ctx.fillRect(3, 10, 3, 3);
      ctx.fillRect(14, 11, 2, 3);
    });

    // 6. COPPER ORE
    drawTile(`tile_${BlockId.COPPER_ORE}`, (ctx) => {
      // Stone base
      ctx.fillStyle = '#5b616b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#737982';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Copper clusters
      const copperVeins = [[4, 4, 5, 4], [13, 6, 6, 5], [6, 13, 7, 5], [16, 14, 5, 4]];
      copperVeins.forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#9e431e';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#d97441';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#f59a67';
        ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), 2);
      });
    });

    // 7. IRON ORE
    drawTile(`tile_${BlockId.IRON_ORE}`, (ctx) => {
      ctx.fillStyle = '#5b616b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#737982';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Iron veins
      const ironVeins = [[5, 5, 6, 4], [14, 7, 5, 5], [7, 14, 6, 5], [15, 14, 6, 4]];
      ironVeins.forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#7a6657';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#baa08a';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#e8d8cb';
        ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), 2);
      });
    });

    // 8. COAL ORE
    drawTile(`tile_${BlockId.COAL_ORE}`, (ctx) => {
      ctx.fillStyle = '#5b616b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#737982';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Coal chunks
      const coalVeins = [[4, 4, 6, 5], [13, 5, 6, 6], [6, 12, 7, 6], [15, 14, 6, 5]];
      coalVeins.forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#17181c';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#2c2d30';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#464850';
        ctx.fillRect(x + 1, y + 1, Math.max(1, w - 3), 2);
      });
    });

    // 9. GOLD ORE
    drawTile(`tile_${BlockId.GOLD_ORE}`, (ctx) => {
      ctx.fillStyle = '#5b616b';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#737982';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Gold veins
      const goldVeins = [[5, 4, 6, 5], [14, 6, 5, 5], [7, 13, 6, 5], [15, 14, 5, 4]];
      goldVeins.forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#b08419';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#f5c838';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#fff08a';
        ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), 2);
      });
    });

    // 10. CRYSTAL ORE
    drawTile(`tile_${BlockId.CRYSTAL_ORE}`, (ctx) => {
      ctx.fillStyle = '#3c254d';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#52346b';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Glowing amethyst crystals
      const crystals = [[6, 3, 5, 8], [13, 6, 6, 10], [5, 12, 6, 7], [14, 15, 5, 6]];
      crystals.forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#6f23a3';
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = '#aa44f0';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#e294ff';
        ctx.fillRect(x + 1, y + 1, Math.max(1, w - 2), 2);
      });
    });

    // 11. BRICK
    drawTile(`tile_${BlockId.BRICK}`, (ctx) => {
      ctx.fillStyle = '#363940';
      ctx.fillRect(0, 0, T, T);
      // Row 1
      ctx.fillStyle = '#5a5e66';
      ctx.fillRect(1, 1, 10, 5);
      ctx.fillRect(12, 1, 11, 5);
      // Row 2
      ctx.fillRect(1, 7, 5, 5);
      ctx.fillRect(7, 7, 10, 5);
      ctx.fillRect(18, 7, 5, 5);
      // Row 3
      ctx.fillRect(1, 13, 10, 5);
      ctx.fillRect(12, 13, 11, 5);
      // Row 4
      ctx.fillRect(1, 19, 5, 4);
      ctx.fillRect(7, 19, 10, 4);
      ctx.fillRect(18, 19, 5, 4);
      // Highlights
      ctx.fillStyle = '#737982';
      ctx.fillRect(2, 2, 8, 1);
      ctx.fillRect(13, 2, 9, 1);
      ctx.fillRect(8, 8, 8, 1);
      ctx.fillRect(2, 14, 8, 1);
    });

    // 12. PLANK
    drawTile(`tile_${BlockId.PLANK}`, (ctx) => {
      ctx.fillStyle = '#614324';
      ctx.fillRect(0, 0, T, T);
      // 3 horizontal boards
      const boards = [[1, 1, T - 2, 6], [1, 8, T - 2, 7], [1, 16, T - 2, 7]];
      boards.forEach(([x, y, w, h]) => {
        ctx.fillStyle = '#9c6d3b';
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ba854d';
        ctx.fillRect(x, y, w, 2);
        // Nail dots
        ctx.fillStyle = '#382512';
        ctx.fillRect(x + 2, y + 3, 2, 2);
        ctx.fillRect(x + w - 4, y + 3, 2, 2);
      });
    });

    // 13. GLASS
    drawTile(`tile_${BlockId.GLASS}`, (ctx) => {
      ctx.fillStyle = '#6abdc7';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = 'rgba(162, 226, 232, 0.45)';
      ctx.fillRect(2, 2, T - 4, T - 4);
      // Glare reflection lines
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(4, 18);
      ctx.lineTo(18, 4);
      ctx.lineTo(20, 4);
      ctx.lineTo(4, 20);
      ctx.fill();
    });

    // 14. OBSIDIAN
    drawTile(`tile_${BlockId.OBSIDIAN}`, (ctx) => {
      ctx.fillStyle = '#0f0c17';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#1c1729';
      ctx.fillRect(2, 2, T - 4, T - 4);
      ctx.fillStyle = '#392a54';
      ctx.fillRect(4, 4, 8, 5);
      ctx.fillRect(14, 12, 7, 7);
      ctx.fillStyle = '#654896';
      ctx.fillRect(5, 5, 2, 2);
      ctx.fillRect(16, 13, 2, 2);
    });

    // 15. BEDROCK
    drawTile(`tile_${BlockId.BEDROCK}`, (ctx) => {
      ctx.fillStyle = '#0a0a0c';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#1a1b21';
      ctx.fillRect(3, 3, 6, 6);
      ctx.fillRect(14, 5, 7, 7);
      ctx.fillRect(6, 14, 8, 7);
      ctx.fillStyle = '#2b2d38';
      ctx.fillRect(4, 4, 2, 2);
      ctx.fillRect(15, 6, 2, 2);
      ctx.fillRect(7, 15, 2, 2);
    });

    // 16. WALL TILES (Darker versions)
    drawTile(`tile_${BlockId.DIRT_WALL}`, (ctx) => {
      ctx.fillStyle = '#402714';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#52341d';
      ctx.fillRect(2, 2, T - 4, T - 4);
      ctx.fillStyle = '#2e1c0e';
      ctx.fillRect(5, 5, 3, 3);
      ctx.fillRect(14, 13, 4, 3);
    });

    drawTile(`tile_${BlockId.STONE_WALL}`, (ctx) => {
      ctx.fillStyle = '#2e3036';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#41444a';
      ctx.fillRect(2, 2, T - 4, T - 4);
      ctx.fillStyle = '#1e1f24';
      ctx.fillRect(6, 4, 3, 3);
      ctx.fillRect(13, 14, 4, 3);
    });

    drawTile(`tile_${BlockId.WOOD_WALL}`, (ctx) => {
      ctx.fillStyle = '#362312';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#4a321a';
      ctx.fillRect(1, 1, T - 2, T - 2);
      ctx.fillStyle = '#29190c';
      ctx.fillRect(6, 0, 2, T);
      ctx.fillRect(16, 0, 2, T);
    });

    // 19. TORCH
    drawTile(`tile_${BlockId.TORCH}`, (ctx) => {
      // Clear background
      ctx.clearRect(0, 0, T, T);
      // Wooden shaft
      ctx.fillStyle = '#614324';
      ctx.fillRect(10, 8, 4, 14);
      ctx.fillStyle = '#875d33';
      ctx.fillRect(10, 8, 2, 14);
      // Flame core
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(9, 4, 6, 6);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(10, 3, 4, 6);
      ctx.fillStyle = '#ffff66';
      ctx.fillRect(11, 2, 2, 4);
    });

    // 20. WORKBENCH
    drawTile(`tile_${BlockId.WORKBENCH}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      // Tabletop
      ctx.fillStyle = '#85582f';
      ctx.fillRect(1, 4, T - 2, 6);
      ctx.fillStyle = '#a16d3b';
      ctx.fillRect(2, 4, T - 4, 2);
      // Legs
      ctx.fillStyle = '#54361c';
      ctx.fillRect(3, 10, 4, 14);
      ctx.fillRect(T - 7, 10, 4, 14);
      // Cross support
      ctx.fillStyle = '#452b14';
      ctx.fillRect(3, 17, T - 6, 3);
      // Vise & Tools on top
      ctx.fillStyle = '#7a808c';
      ctx.fillRect(3, 2, 4, 3);
      ctx.fillStyle = '#d97441';
      ctx.fillRect(14, 2, 5, 2);
    });

    // 21. FURNACE
    drawTile(`tile_${BlockId.FURNACE}`, (ctx) => {
      ctx.fillStyle = '#3c4047';
      ctx.fillRect(0, 0, T, T);
      ctx.fillStyle = '#5b616b';
      ctx.fillRect(1, 1, T - 2, T - 2);
      // Chimney / Cobble bricks
      ctx.fillStyle = '#737982';
      ctx.fillRect(2, 2, 9, 4);
      ctx.fillRect(13, 2, 9, 4);
      // Smelting Hearth Opening
      ctx.fillStyle = '#17191c';
      ctx.fillRect(5, 10, 14, 12);
      // Glowing Embers
      ctx.fillStyle = '#ff4400';
      ctx.fillRect(7, 14, 10, 7);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(8, 16, 8, 4);
      ctx.fillStyle = '#ffff55';
      ctx.fillRect(10, 17, 4, 2);
    });

    // 22. ANVIL
    drawTile(`tile_${BlockId.ANVIL}`, (ctx) => {
      ctx.clearRect(0, 0, T, T);
      // Base pedestal
      ctx.fillStyle = '#1e2129';
      ctx.fillRect(4, 18, 16, 6);
      ctx.fillStyle = '#3a3f4d';
      ctx.fillRect(5, 18, 14, 2);
      // Middle stem
      ctx.fillStyle = '#2b2e38';
      ctx.fillRect(8, 11, 8, 7);
      // Top horn & face
      ctx.fillStyle = '#474d5e';
      ctx.fillRect(2, 6, 20, 5);
      ctx.fillStyle = '#6b748c';
      ctx.fillRect(4, 6, 17, 2);
      // Horn tip
      ctx.fillStyle = '#474d5e';
      ctx.fillRect(0, 7, 2, 3);
    });
  }

  private static createTilesetTexture(scene: Phaser.Scene, T: number): void {
    const TOTAL_TILES = 32;
    const canvas = scene.textures.createCanvas('world_tileset', TOTAL_TILES * T, T);
    if (!canvas) return;
    const ctx = canvas.context;
    ctx.imageSmoothingEnabled = false;

    // Tile 0 is transparent (Air)
    // Copy each tile_X texture into corresponding slot
    for (let id = 1; id < TOTAL_TILES; id++) {
      const tileKey = `tile_${id}`;
      if (scene.textures.exists(tileKey)) {
        const srcCanvas = (scene.textures.get(tileKey).getSourceImage() as unknown) as CanvasImageSource;
        if (srcCanvas) {
          ctx.drawImage(srcCanvas, id * T, 0, T, T);
        }
      }
    }
    canvas.refresh();
  }

  private static createCrackTextures(scene: Phaser.Scene, T: number): void {
    const crackStages = [
      // 0: 25% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(6, 4); ctx.lineTo(11, 11); ctx.lineTo(9, 17);
        ctx.stroke();
      },
      // 1: 50% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(6, 4); ctx.lineTo(11, 11); ctx.lineTo(9, 17);
        ctx.moveTo(11, 11); ctx.lineTo(18, 9); ctx.lineTo(21, 15);
        ctx.stroke();
      },
      // 2: 75% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, 4); ctx.lineTo(11, 11); ctx.lineTo(9, 17);
        ctx.moveTo(11, 11); ctx.lineTo(18, 9); ctx.lineTo(21, 15);
        ctx.moveTo(11, 11); ctx.lineTo(13, 21);
        ctx.moveTo(4, 15); ctx.lineTo(9, 17);
        ctx.stroke();
      },
      // 3: 95% damage
      (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, 3); ctx.lineTo(11, 11); ctx.lineTo(8, 22);
        ctx.moveTo(11, 11); ctx.lineTo(20, 8); ctx.lineTo(22, 18);
        ctx.moveTo(11, 11); ctx.lineTo(15, 22);
        ctx.moveTo(2, 14); ctx.lineTo(8, 22);
        ctx.moveTo(18, 2); ctx.lineTo(20, 8);
        ctx.stroke();
      }
    ];

    crackStages.forEach((fn, idx) => {
      const key = `crack_${idx}`;
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, T, T);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;
      fn(ctx);
      canvas.refresh();
    });
  }

  private static createPlayerTextures(scene: Phaser.Scene): void {
    const W = 24;
    const H = 40;

    // Helper to draw player frame
    const drawPlayer = (key: string, legOffset: number, armAngle: number) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, W, H);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;

      // 1. Cape / Back scarf
      ctx.fillStyle = '#611b2b';
      ctx.fillRect(5, 12, 5, 16);
      ctx.fillStyle = '#8f2940';
      ctx.fillRect(6, 13, 3, 14);

      // 2. Head & Helmet (Astral explorer cowl)
      ctx.fillStyle = '#1f293d';
      ctx.fillRect(6, 3, 12, 10);
      ctx.fillStyle = '#2f3e5c';
      ctx.fillRect(7, 4, 10, 8);
      // Visor (Glowing cyan)
      ctx.fillStyle = '#38e1ff';
      ctx.fillRect(12, 6, 6, 3);
      ctx.fillStyle = '#d2f9ff';
      ctx.fillRect(14, 7, 3, 1);

      // 3. Torso / Armor tunic
      ctx.fillStyle = '#28334a';
      ctx.fillRect(6, 13, 12, 14);
      ctx.fillStyle = '#3a4b6e';
      ctx.fillRect(7, 14, 10, 11);
      // Gold chest emblem
      ctx.fillStyle = '#e8b838';
      ctx.fillRect(11, 17, 3, 4);

      // 4. Belt & Pouch
      ctx.fillStyle = '#54361e';
      ctx.fillRect(6, 26, 12, 3);
      ctx.fillStyle = '#c79632';
      ctx.fillRect(10, 26, 4, 3);

      // 5. Legs & Boots (animated with legOffset)
      // Left leg
      ctx.fillStyle = '#1b2233';
      ctx.fillRect(7, 29, 4, 7 - legOffset);
      ctx.fillStyle = '#3d2b1b'; // boot
      ctx.fillRect(6, 35 - legOffset, 5, 5);

      // Right leg
      ctx.fillStyle = '#141a26';
      ctx.fillRect(13, 29, 4, 7 + legOffset);
      ctx.fillStyle = '#2b1f13'; // boot
      ctx.fillRect(13, 35 + legOffset, 5, 5);

      // 6. Arm / Shoulder
      ctx.save();
      ctx.translate(11, 16);
      ctx.rotate((armAngle * Math.PI) / 180);
      ctx.fillStyle = '#2f3e5c';
      ctx.fillRect(-2, 0, 4, 10);
      ctx.fillStyle = '#6e4527'; // glove
      ctx.fillRect(-2, 8, 4, 4);
      ctx.restore();

      canvas.refresh();
    };

    drawPlayer('player_idle', 0, 0);
    drawPlayer('player_walk_0', -2, 15);
    drawPlayer('player_walk_1', 0, 0);
    drawPlayer('player_walk_2', 2, -15);
    drawPlayer('player_walk_3', 0, 0);
    drawPlayer('player_jump', -3, -35);
  }

  private static createItemIcons(scene: Phaser.Scene): void {
    const S = 24;

    const drawIcon = (key: string, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, S, S);
      if (!canvas) return;
      const ctx = canvas.context;
      ctx.imageSmoothingEnabled = false;
      drawFn(ctx);
      canvas.refresh();
    };

    // Pickaxe Icon
    drawIcon('icon_pickaxe', (ctx) => {
      // Handle
      ctx.strokeStyle = '#6e4527';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(4, 20); ctx.lineTo(17, 7);
      ctx.stroke();
      // Copper Pickaxe Head
      ctx.fillStyle = '#d97441';
      ctx.beginPath();
      ctx.moveTo(11, 3);
      ctx.lineTo(21, 5);
      ctx.lineTo(20, 15);
      ctx.lineTo(16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f59a67';
      ctx.fillRect(17, 6, 3, 2);
    });

    // Sword Icon
    drawIcon('icon_sword', (ctx) => {
      // Handle & pommel
      ctx.fillStyle = '#e8b838';
      ctx.fillRect(3, 20, 4, 4);
      ctx.fillStyle = '#6e4527';
      ctx.fillRect(5, 17, 3, 4);
      // Guard
      ctx.fillStyle = '#e8b838';
      ctx.fillRect(4, 15, 8, 3);
      // Copper blade
      ctx.fillStyle = '#d97441';
      ctx.beginPath();
      ctx.moveTo(7, 15);
      ctx.lineTo(19, 3);
      ctx.lineTo(21, 4);
      ctx.lineTo(9, 16);
      ctx.closePath();
      ctx.fill();
      // Edge shine
      ctx.fillStyle = '#f59a67';
      ctx.fillRect(15, 6, 2, 2);
    });

    // Torch Icon
    drawIcon('icon_torch', (ctx) => {
      ctx.fillStyle = '#614324';
      ctx.fillRect(10, 8, 4, 14);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(9, 4, 6, 5);
      ctx.fillStyle = '#ffff66';
      ctx.fillRect(11, 2, 2, 4);
    });

    // Ore / Block Icons
    drawIcon('icon_dirt', (ctx) => {
      ctx.fillStyle = '#825432'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#54341c'; ctx.fillRect(6, 6, 5, 5); ctx.fillRect(13, 11, 4, 4);
    });

    drawIcon('icon_stone', (ctx) => {
      ctx.fillStyle = '#737982'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#8d95a1'; ctx.fillRect(5, 5, 7, 5);
      ctx.fillStyle = '#474b54'; ctx.fillRect(12, 10, 6, 6);
    });

    drawIcon('icon_wood', (ctx) => {
      ctx.fillStyle = '#6b4929'; ctx.fillRect(5, 4, 14, 16);
      ctx.fillStyle = '#52371d'; ctx.fillRect(8, 4, 2, 16); ctx.fillRect(13, 4, 2, 16);
    });

    drawIcon('icon_plank', (ctx) => {
      ctx.fillStyle = '#9c6d3b'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#614324'; ctx.fillRect(4, 9, 16, 1); ctx.fillRect(4, 15, 16, 1);
    });

    drawIcon('icon_brick', (ctx) => {
      ctx.fillStyle = '#5a5e66'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#363940'; ctx.fillRect(4, 11, 16, 2); ctx.fillRect(11, 4, 2, 7);
    });

    drawIcon('icon_glass', (ctx) => {
      ctx.fillStyle = '#6abdc7'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; ctx.fillRect(8, 8, 8, 2);
    });

    drawIcon('icon_copper_ore', (ctx) => {
      ctx.fillStyle = '#737982'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#d97441'; ctx.fillRect(7, 7, 10, 8);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(9, 8, 4, 3);
    });

    drawIcon('icon_iron_ore', (ctx) => {
      ctx.fillStyle = '#737982'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#baa08a'; ctx.fillRect(7, 7, 9, 8);
      ctx.fillStyle = '#e8d8cb'; ctx.fillRect(9, 8, 4, 3);
    });

    drawIcon('icon_coal', (ctx) => {
      ctx.fillStyle = '#2c2d30'; ctx.fillRect(5, 5, 14, 14);
      ctx.fillStyle = '#464850'; ctx.fillRect(7, 7, 5, 5);
    });

    drawIcon('icon_gold_ore', (ctx) => {
      ctx.fillStyle = '#737982'; ctx.fillRect(4, 4, 16, 16);
      ctx.fillStyle = '#f5c838'; ctx.fillRect(7, 6, 9, 9);
      ctx.fillStyle = '#fff08a'; ctx.fillRect(9, 7, 4, 3);
    });

    drawIcon('icon_crystal', (ctx) => {
      ctx.fillStyle = '#aa44f0'; ctx.beginPath();
      ctx.moveTo(12, 3); ctx.lineTo(19, 10); ctx.lineTo(16, 20); ctx.lineTo(8, 20); ctx.lineTo(5, 10);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e294ff'; ctx.fillRect(10, 6, 4, 7);
    });

    drawIcon('icon_obsidian', (ctx) => {
      ctx.fillStyle = '#1c1729'; ctx.fillRect(5, 5, 14, 14);
      ctx.fillStyle = '#654896'; ctx.fillRect(8, 7, 5, 5);
    });

    drawIcon('icon_sapling', (ctx) => {
      ctx.fillStyle = '#6b4929'; ctx.fillRect(11, 12, 2, 9);
      ctx.fillStyle = '#3cb04a'; ctx.fillRect(8, 5, 8, 8);
    });

    // --- NEW ETAP 2 ICONS ---
    // Stations
    drawIcon('icon_workbench', (ctx) => {
      ctx.fillStyle = '#85582f'; ctx.fillRect(2, 6, 20, 6);
      ctx.fillStyle = '#a16d3b'; ctx.fillRect(3, 6, 18, 2);
      ctx.fillStyle = '#54361c'; ctx.fillRect(4, 12, 4, 10); ctx.fillRect(16, 12, 4, 10);
      ctx.fillStyle = '#7a808c'; ctx.fillRect(5, 3, 4, 3);
    });

    drawIcon('icon_furnace', (ctx) => {
      ctx.fillStyle = '#4a4d52'; ctx.fillRect(3, 3, 18, 18);
      ctx.fillStyle = '#737982'; ctx.fillRect(4, 4, 16, 2);
      ctx.fillStyle = '#17191c'; ctx.fillRect(7, 10, 10, 9);
      ctx.fillStyle = '#ff5500'; ctx.fillRect(8, 13, 8, 5);
      ctx.fillStyle = '#ffff55'; ctx.fillRect(10, 15, 4, 2);
    });

    drawIcon('icon_anvil', (ctx) => {
      ctx.fillStyle = '#2b2e38'; ctx.fillRect(5, 17, 14, 5);
      ctx.fillStyle = '#3a3f4d'; ctx.fillRect(8, 11, 8, 6);
      ctx.fillStyle = '#5a6275'; ctx.fillRect(3, 6, 18, 5);
      ctx.fillStyle = '#7b859e'; ctx.fillRect(5, 6, 15, 2);
    });

    // Ingots / Bars
    drawIcon('icon_copper_bar', (ctx) => {
      ctx.fillStyle = '#9e431e'; ctx.fillRect(4, 8, 16, 9);
      ctx.fillStyle = '#d97441'; ctx.fillRect(5, 9, 14, 6);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(6, 9, 12, 2);
    });

    drawIcon('icon_iron_bar', (ctx) => {
      ctx.fillStyle = '#555b66'; ctx.fillRect(4, 8, 16, 9);
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(5, 9, 14, 6);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(6, 9, 12, 2);
    });

    drawIcon('icon_gold_bar', (ctx) => {
      ctx.fillStyle = '#b08419'; ctx.fillRect(4, 8, 16, 9);
      ctx.fillStyle = '#f5c838'; ctx.fillRect(5, 9, 14, 6);
      ctx.fillStyle = '#fff08a'; ctx.fillRect(6, 9, 12, 2);
    });

    // Advanced Tools
    drawIcon('icon_iron_pickaxe', (ctx) => {
      ctx.strokeStyle = '#6e4527'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#8c94a3'; ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(21, 5); ctx.lineTo(20, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(17, 6, 3, 2);
    });

    drawIcon('icon_gold_pickaxe', (ctx) => {
      ctx.strokeStyle = '#6e4527'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#f5c838'; ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(21, 5); ctx.lineTo(20, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff08a'; ctx.fillRect(17, 6, 3, 2);
    });

    drawIcon('icon_astral_pickaxe', (ctx) => {
      ctx.strokeStyle = '#4a2569'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#aa44f0'; ctx.beginPath();
      ctx.moveTo(11, 3); ctx.lineTo(21, 5); ctx.lineTo(20, 15); ctx.lineTo(16, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e294ff'; ctx.fillRect(17, 6, 3, 2);
    });

    // Weapons
    drawIcon('icon_stone_sword', (ctx) => {
      ctx.fillStyle = '#54361c'; ctx.fillRect(4, 18, 4, 4);
      ctx.fillStyle = '#737982'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_iron_sword', (ctx) => {
      ctx.fillStyle = '#e8b838'; ctx.fillRect(3, 20, 4, 4);
      ctx.fillStyle = '#6e4527'; ctx.fillRect(5, 17, 3, 4);
      ctx.fillStyle = '#e8b838'; ctx.fillRect(4, 15, 8, 3);
      ctx.fillStyle = '#a6b0c2'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(15, 6, 2, 2);
    });

    drawIcon('icon_dagger', (ctx) => {
      ctx.fillStyle = '#e8b838'; ctx.fillRect(5, 17, 3, 3);
      ctx.fillStyle = '#a6b0c2'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(17, 5); ctx.lineTo(19, 6); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_spear', (ctx) => {
      ctx.strokeStyle = '#6e4527'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(3, 21); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#a6b0c2'; ctx.beginPath();
      ctx.moveTo(16, 8); ctx.lineTo(22, 2); ctx.lineTo(19, 11); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_bow', (ctx) => {
      ctx.strokeStyle = '#85582f'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(12, 12, 9, 0.7 * Math.PI, 1.8 * Math.PI); ctx.stroke();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(6, 19); ctx.lineTo(19, 6); ctx.stroke();
    });

    drawIcon('icon_staff', (ctx) => {
      ctx.strokeStyle = '#54361c'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(4, 20); ctx.lineTo(17, 7); ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath(); ctx.arc(19, 5, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(18, 4, 2, 2);
    });

    drawIcon('icon_astral_blade', (ctx) => {
      ctx.fillStyle = '#29173d'; ctx.fillRect(3, 20, 4, 4);
      ctx.fillStyle = '#8542c2'; ctx.fillRect(4, 15, 8, 3);
      ctx.fillStyle = '#aa44f0'; ctx.beginPath();
      ctx.moveTo(7, 15); ctx.lineTo(19, 3); ctx.lineTo(21, 4); ctx.lineTo(9, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e294ff'; ctx.fillRect(14, 6, 3, 2);
    });

    // Armor Sets
    drawIcon('icon_copper_helmet', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(5, 6, 14, 12);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(6, 6, 12, 3);
      ctx.fillStyle = '#222'; ctx.fillRect(8, 12, 8, 3);
    });

    drawIcon('icon_copper_chestplate', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(5, 5, 14, 14);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(8, 6, 8, 4);
      ctx.fillStyle = '#9e431e'; ctx.fillRect(5, 10, 2, 8); ctx.fillRect(17, 10, 2, 8);
    });

    drawIcon('icon_copper_leggings', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(6, 5, 12, 14);
      ctx.clearRect(11, 10, 2, 9);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(7, 6, 10, 3);
    });

    drawIcon('icon_copper_boots', (ctx) => {
      ctx.fillStyle = '#d97441'; ctx.fillRect(4, 10, 6, 10); ctx.fillRect(14, 10, 6, 10);
      ctx.fillStyle = '#f59a67'; ctx.fillRect(4, 10, 6, 3); ctx.fillRect(14, 10, 6, 3);
    });

    drawIcon('icon_iron_helmet', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(5, 6, 14, 12);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(6, 6, 12, 3);
      ctx.fillStyle = '#111'; ctx.fillRect(7, 11, 10, 3);
    });

    drawIcon('icon_iron_chestplate', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(5, 5, 14, 14);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(8, 6, 8, 4);
      ctx.fillStyle = '#555b66'; ctx.fillRect(5, 10, 2, 8); ctx.fillRect(17, 10, 2, 8);
    });

    drawIcon('icon_iron_leggings', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(6, 5, 12, 14);
      ctx.clearRect(11, 10, 2, 9);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(7, 6, 10, 3);
    });

    drawIcon('icon_iron_boots', (ctx) => {
      ctx.fillStyle = '#8c94a3'; ctx.fillRect(4, 10, 6, 10); ctx.fillRect(14, 10, 6, 10);
      ctx.fillStyle = '#d5dbe6'; ctx.fillRect(4, 10, 6, 3); ctx.fillRect(14, 10, 6, 3);
    });

    // Accessories
    drawIcon('icon_ring', (ctx) => {
      ctx.strokeStyle = '#f5c838'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(12, 13, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#22c55e'; ctx.fillRect(10, 5, 4, 4);
    });

    drawIcon('icon_amulet', (ctx) => {
      ctx.strokeStyle = '#f5c838'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(12, 9, 6, 0, Math.PI); ctx.stroke();
      ctx.fillStyle = '#38bdf8'; ctx.beginPath();
      ctx.moveTo(12, 14); ctx.lineTo(16, 19); ctx.lineTo(12, 23); ctx.lineTo(8, 19); ctx.closePath(); ctx.fill();
    });

    drawIcon('icon_boots_wings', (ctx) => {
      ctx.fillStyle = '#4ade80'; ctx.fillRect(6, 11, 6, 9); ctx.fillRect(13, 11, 6, 9);
      ctx.fillStyle = '#ffffff'; // Wings
      ctx.beginPath(); ctx.moveTo(4, 14); ctx.lineTo(1, 9); ctx.lineTo(5, 11); ctx.fill();
      ctx.beginPath(); ctx.moveTo(20, 14); ctx.lineTo(23, 9); ctx.lineTo(19, 11); ctx.fill();
    });

    drawIcon('icon_talisman', (ctx) => {
      ctx.fillStyle = '#b08419'; ctx.fillRect(6, 6, 12, 12);
      ctx.fillStyle = '#d97441'; ctx.fillRect(8, 8, 8, 8);
      ctx.fillStyle = '#fff08a'; ctx.fillRect(11, 11, 2, 2);
    });

    drawIcon('icon_cloak', (ctx) => {
      ctx.fillStyle = '#581c87'; ctx.beginPath();
      ctx.moveTo(8, 4); ctx.lineTo(16, 4); ctx.lineTo(20, 21); ctx.lineTo(4, 21); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#a855f7'; ctx.fillRect(10, 5, 4, 15);
    });

    // Potions
    drawIcon('icon_health_potion', (ctx) => {
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, 3, 4, 3);
      ctx.fillStyle = '#ef4444'; ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 11, 2, 2);
    });

    drawIcon('icon_mana_potion', (ctx) => {
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, 3, 4, 3);
      ctx.fillStyle = '#38bdf8'; ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 11, 2, 2);
    });

    drawIcon('icon_speed_potion', (ctx) => {
      ctx.fillStyle = '#e2e8f0'; ctx.fillRect(10, 3, 4, 3);
      ctx.fillStyle = '#eab308'; ctx.beginPath();
      ctx.arc(12, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(10, 11, 2, 2);
    });
  }

  private static createUtilityTextures(scene: Phaser.Scene, T: number): void {
    // 1. Reticle Cursor Box
    if (!scene.textures.exists('reticle')) {
      const canvas = scene.textures.createCanvas('reticle', T, T);
      if (canvas) {
        const ctx = canvas.context;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.5, 0.5, T - 1, T - 1);
        canvas.refresh();
      }
    }

    // 2. Particle Chip
    if (!scene.textures.exists('particle_chip')) {
      const canvas = scene.textures.createCanvas('particle_chip', 4, 4);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 4, 4);
        canvas.refresh();
      }
    }
  }
}
