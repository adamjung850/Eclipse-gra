import { BlockId, GAME_CONSTANTS } from '../types/index.js';

export interface GeneratedWorldData {
  width: number;
  height: number;
  foreground: number[][]; // [x][y] = BlockId
  background: number[][]; // [x][y] = BlockId
  spawnX: number; // in world pixel coordinates
  spawnY: number; // in world pixel coordinates
}

export class WorldGenerator {
  public static generate(
    width: number = GAME_CONSTANTS.WORLD_WIDTH,
    height: number = GAME_CONSTANTS.WORLD_HEIGHT
  ): GeneratedWorldData {
    const foreground: number[][] = [];
    const background: number[][] = [];

    // Initialize empty grid
    for (let x = 0; x < width; x++) {
      foreground[x] = new Array(height).fill(BlockId.AIR);
      background[x] = new Array(height).fill(BlockId.AIR);
    }

    // 1. Calculate Surface Height Profile
    const surfaceHeights: number[] = new Array(width);
    for (let x = 0; x < width; x++) {
      const h1 = Math.sin(x * 0.045) * 6;
      const h2 = Math.cos(x * 0.11) * 3;
      const h3 = Math.sin(x * 0.22 + 0.8) * 1.5;
      surfaceHeights[x] = Math.floor(GAME_CONSTANTS.SURFACE_HEIGHT + h1 + h2 + h3);
    }

    // 2. Fill Primary Strata
    for (let x = 0; x < width; x++) {
      const surfaceY = surfaceHeights[x];

      for (let y = 0; y < height; y++) {
        if (y < surfaceY) {
          // Air above surface
          foreground[x][y] = BlockId.AIR;
          background[x][y] = BlockId.AIR;
        } else if (y === surfaceY) {
          // Grass layer
          foreground[x][y] = BlockId.GRASS;
          background[x][y] = BlockId.DIRT_WALL;
        } else if (y < surfaceY + 4) {
          // Dirt sub-layer
          foreground[x][y] = BlockId.DIRT;
          background[x][y] = BlockId.DIRT_WALL;
        } else if (y < GAME_CONSTANTS.BEDROCK_DEPTH) {
          // Stone layer
          foreground[x][y] = BlockId.STONE;
          background[x][y] = BlockId.STONE_WALL;
        } else {
          // Bedrock mantle
          foreground[x][y] = BlockId.BEDROCK;
          background[x][y] = BlockId.STONE_WALL;
        }
      }
    }

    // 3. Carve Underground Caves (Smooth harmonic worm tunnels)
    for (let x = 2; x < width - 2; x++) {
      const surfaceY = surfaceHeights[x];
      for (let y = surfaceY + 5; y < GAME_CONSTANTS.BEDROCK_DEPTH; y++) {
        const n1 = Math.sin(x * 0.075 + y * 0.055);
        const n2 = Math.cos(x * 0.115 - y * 0.085);
        const n3 = Math.sin(x * 0.035 + y * 0.04);
        const caveDensity = n1 + n2 + n3;

        // If above threshold, carve cave pocket
        if (caveDensity > 1.35) {
          foreground[x][y] = BlockId.AIR;
          // Keep background wall intact for subterranean depth
        }
      }
    }

    // 4. Generate Ore Veins
    this.spawnOreVeins(width, height, foreground, surfaceHeights);

    // 5. Generate Procedural Trees on Surface
    this.spawnTrees(width, foreground, surfaceHeights);

    // 6. Find Safe Player Spawn
    const spawnTileX = Math.floor(width / 2);
    const spawnTileY = surfaceHeights[spawnTileX] - 2;
    const spawnX = spawnTileX * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
    const spawnY = spawnTileY * GAME_CONSTANTS.TILE_SIZE;

    return {
      width,
      height,
      foreground,
      background,
      spawnX,
      spawnY
    };
  }

  private static spawnOreVeins(
    width: number,
    height: number,
    grid: number[][],
    surfaceHeights: number[]
  ): void {
    const seedVein = (
      oreId: BlockId,
      clusterCount: number,
      minDepth: number,
      maxDepth: number,
      veinSize: number
    ) => {
      for (let i = 0; i < clusterCount; i++) {
        const cx = Math.floor(4 + Math.random() * (width - 8));
        const surfaceY = surfaceHeights[cx];
        const cy = Math.floor(
          Math.max(surfaceY + minDepth, Math.min(height - 6, surfaceY + minDepth + Math.random() * (maxDepth - minDepth)))
        );

        // Stamp out small cluster around center
        for (let ox = -veinSize; ox <= veinSize; ox++) {
          for (let oy = -veinSize; oy <= veinSize; oy++) {
            const tx = cx + ox;
            const ty = cy + oy;
            if (tx >= 0 && tx < width && ty >= 0 && ty < height) {
              if (grid[tx][ty] === BlockId.STONE && Math.random() > 0.35) {
                grid[tx][ty] = oreId;
              }
            }
          }
        }
      }
    };

    // Coal Veins (Common throughout upper and mid depths)
    seedVein(BlockId.COAL_ORE, 42, 3, 50, 2);

    // Copper Veins (Upper subterranean)
    seedVein(BlockId.COPPER_ORE, 35, 4, 45, 2);

    // Iron Veins (Mid depths)
    seedVein(BlockId.IRON_ORE, 30, 14, 65, 2);

    // Gold Veins (Deep caverns)
    seedVein(BlockId.GOLD_ORE, 18, 35, 75, 1);

    // Astral Crystal (Deep abyss)
    seedVein(BlockId.CRYSTAL_ORE, 14, 50, 78, 1);

    // Obsidian deposits (Near bedrock)
    seedVein(BlockId.OBSIDIAN, 10, 65, 80, 2);
  }

  private static spawnTrees(width: number, grid: number[][], surfaceHeights: number[]): void {
    let lastTreeX = 5;

    for (let x = 6; x < width - 6; x++) {
      // Minimum spacing of 5 tiles between trees
      if (x - lastTreeX < 5) continue;

      const surfaceY = surfaceHeights[x];
      // Check if surface is grass
      if (grid[x][surfaceY] !== BlockId.GRASS) continue;

      // Check flatness: surface should not have a steep cliff
      if (Math.abs(surfaceHeights[x - 1] - surfaceY) > 1 || Math.abs(surfaceHeights[x + 1] - surfaceY) > 1) {
        continue;
      }

      // 45% chance to grow a tree
      if (Math.random() < 0.45) {
        const trunkHeight = 5 + Math.floor(Math.random() * 4); // 5 to 8 blocks high
        const treeTopY = surfaceY - trunkHeight;

        // Draw Trunk
        for (let ty = surfaceY - 1; ty >= treeTopY; ty--) {
          grid[x][ty] = BlockId.WOOD;
        }

        // Draw Leaf Canopy
        const canopyRadius = 2 + Math.floor(Math.random() * 2); // 2 or 3
        for (let lx = x - canopyRadius; lx <= x + canopyRadius; lx++) {
          for (let ly = treeTopY - canopyRadius; ly <= treeTopY + 1; ly++) {
            if (lx >= 0 && lx < width && ly >= 0) {
              const distSq = (lx - x) * (lx - x) + (ly - (treeTopY - 1)) * (ly - (treeTopY - 1));
              if (distSq <= canopyRadius * canopyRadius + 1) {
                // Don't overwrite trunk
                if (grid[lx][ly] === BlockId.AIR) {
                  grid[lx][ly] = BlockId.LEAVES;
                }
              }
            }
          }
        }

        lastTreeX = x;
      }
    }
  }
}
