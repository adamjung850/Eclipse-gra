import { BlockId, GAME_CONSTANTS } from '../types/index.js';

export class WorldGenerator {
  static generate(
    width = GAME_CONSTANTS.WORLD_WIDTH,
    height = GAME_CONSTANTS.WORLD_HEIGHT
  ) {
    const foreground = [];
    const background = [];

    for (let x = 0; x < width; x++) {
      foreground[x] = new Array(height).fill(BlockId.AIR);
      background[x] = new Array(height).fill(BlockId.AIR);
    }

    // Surface Profile
    const surfaceHeights = new Array(width);
    for (let x = 0; x < width; x++) {
      const h1 = Math.sin(x * 0.045) * 6;
      const h2 = Math.cos(x * 0.11) * 3;
      const h3 = Math.sin(x * 0.22 + 0.8) * 1.5;
      surfaceHeights[x] = Math.floor(GAME_CONSTANTS.SURFACE_HEIGHT + h1 + h2 + h3);
    }

    // Strata
    for (let x = 0; x < width; x++) {
      const surfaceY = surfaceHeights[x];

      for (let y = 0; y < height; y++) {
        if (y < surfaceY) {
          foreground[x][y] = BlockId.AIR;
          background[x][y] = BlockId.AIR;
        } else if (y === surfaceY) {
          foreground[x][y] = BlockId.GRASS;
          background[x][y] = BlockId.DIRT_WALL;
        } else if (y < surfaceY + 4) {
          foreground[x][y] = BlockId.DIRT;
          background[x][y] = BlockId.DIRT_WALL;
        } else if (y < GAME_CONSTANTS.BEDROCK_DEPTH) {
          foreground[x][y] = BlockId.STONE;
          background[x][y] = BlockId.STONE_WALL;
        } else {
          foreground[x][y] = BlockId.BEDROCK;
          background[x][y] = BlockId.STONE_WALL;
        }
      }
    }

    // Caves
    for (let x = 2; x < width - 2; x++) {
      const surfaceY = surfaceHeights[x];
      for (let y = surfaceY + 5; y < GAME_CONSTANTS.BEDROCK_DEPTH; y++) {
        const n1 = Math.sin(x * 0.075 + y * 0.055);
        const n2 = Math.cos(x * 0.115 - y * 0.085);
        const n3 = Math.sin(x * 0.035 + y * 0.04);
        const caveDensity = n1 + n2 + n3;

        if (caveDensity > 1.35) {
          foreground[x][y] = BlockId.AIR;
        }
      }
    }

    // Ore Veins
    this.spawnOreVeins(width, height, foreground, surfaceHeights);

    // Trees
    this.spawnTrees(width, foreground, surfaceHeights);

    // Safe Player Spawn
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

  static spawnOreVeins(width, height, grid, surfaceHeights) {
    const seedVein = (oreId, clusterCount, minDepth, maxDepth, veinSize) => {
      for (let i = 0; i < clusterCount; i++) {
        const cx = Math.floor(4 + Math.random() * (width - 8));
        const surfaceY = surfaceHeights[cx];
        const cy = Math.floor(
          Math.max(surfaceY + minDepth, Math.min(height - 6, surfaceY + minDepth + Math.random() * (maxDepth - minDepth)))
        );

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

    seedVein(BlockId.COAL_ORE, 42, 3, 50, 2);
    seedVein(BlockId.COPPER_ORE, 35, 4, 45, 2);
    seedVein(BlockId.IRON_ORE, 30, 14, 65, 2);
    seedVein(BlockId.GOLD_ORE, 18, 35, 75, 1);
    seedVein(BlockId.CRYSTAL_ORE, 14, 50, 78, 1);
    seedVein(BlockId.OBSIDIAN, 10, 65, 80, 2);
  }

  static spawnTrees(width, grid, surfaceHeights) {
    let lastTreeX = 5;

    for (let x = 6; x < width - 6; x++) {
      if (x - lastTreeX < 5) continue;

      const surfaceY = surfaceHeights[x];
      if (grid[x][surfaceY] !== BlockId.GRASS) continue;

      if (Math.abs(surfaceHeights[x - 1] - surfaceY) > 1 || Math.abs(surfaceHeights[x + 1] - surfaceY) > 1) {
        continue;
      }

      if (Math.random() < 0.45) {
        const trunkHeight = 5 + Math.floor(Math.random() * 4);
        const treeTopY = surfaceY - trunkHeight;

        for (let ty = surfaceY - 1; ty >= treeTopY; ty--) {
          grid[x][ty] = BlockId.WOOD;
        }

        const canopyRadius = 2 + Math.floor(Math.random() * 2);
        for (let lx = x - canopyRadius; lx <= x + canopyRadius; lx++) {
          for (let ly = treeTopY - canopyRadius; ly <= treeTopY + 1; ly++) {
            if (lx >= 0 && lx < width && ly >= 0) {
              const distSq = (lx - x) * (lx - x) + (ly - (treeTopY - 1)) * (ly - (treeTopY - 1));
              if (distSq <= canopyRadius * canopyRadius + 1) {
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
