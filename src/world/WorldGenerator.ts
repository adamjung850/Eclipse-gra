import { BlockId, GAME_CONSTANTS } from '../types/index.js';

export interface TreeRecord {
  x: number;
  surfaceY: number;
  treeTopY: number;
  trunkHeight: number;
  crownVariant: number;
  colorVariant: number;
}

export interface GeneratedWorldData {
  width: number;
  height: number;
  foreground: number[][]; // [x][y] = BlockId
  background: number[][]; // [x][y] = BlockId
  spawnX: number; // in world pixel coordinates
  spawnY: number; // in world pixel coordinates
  trees?: TreeRecord[];
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

    // 1. Calculate Surface Height Profile across enlarged world
    const surfaceHeights: number[] = new Array(width);
    for (let x = 0; x < width; x++) {
      const h1 = Math.sin(x * 0.018) * 8;
      const h2 = Math.cos(x * 0.042) * 4;
      const h3 = Math.sin(x * 0.095 + 1.2) * 2;
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

    // 3. Carve Natural Winding Caves (Perlin Worms / Sinuous Tunnels)
    this.carveNaturalCaves(width, height, foreground, surfaceHeights);

    // 4. Generate Procedural Ore Veins (Organic, connected clusters with spacing)
    this.spawnOreVeins(width, height, foreground, surfaceHeights);

    // 5. Generate Procedural Trees on Surface
    const trees: TreeRecord[] = [];
    this.spawnTrees(width, foreground, surfaceHeights, trees);

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
      spawnY,
      trees
    };
  }

  /**
   * Carves winding, natural caves ("zawijasy") using inertial tunnel worms.
   * Eliminates large spherical holes and creates interconnected subterranean passages.
   */
  private static carveNaturalCaves(
    width: number,
    height: number,
    grid: number[][],
    surfaceHeights: number[]
  ): void {
    const spawnCenter = Math.floor(width / 2);

    const carveWorm = (params: {
      x: number;
      y: number;
      angle: number;
      length: number;
      radius: number;
      turnSpeed: number;
      isEntrance?: boolean;
      branchDepth?: number;
    }) => {
      let curX = params.x;
      let curY = params.y;
      let curAngle = params.angle;
      let angleVelocity = 0;
      const branchDepth = params.branchDepth || 0;

      for (let step = 0; step < params.length; step++) {
        // Dynamic radius fluctuation creates natural rocky variations in tunnel width
        const radNoise = Math.sin(step * 0.22) * 0.35 + (Math.random() - 0.5) * 0.2;
        const radius = Math.max(1.5, Math.min(2.7, params.radius + radNoise));
        const intR = Math.ceil(radius);

        // Carve circular/elliptical segment
        for (let ox = -intR; ox <= intR; ox++) {
          for (let oy = -intR; oy <= intR; oy++) {
            const dist = Math.sqrt(ox * ox + oy * oy);
            if (dist <= radius) {
              const tx = Math.floor(curX + ox);
              const ty = Math.floor(curY + oy);

              if (tx >= 2 && tx < width - 2 && ty >= 0 && ty < GAME_CONSTANTS.BEDROCK_DEPTH - 2) {
                // Spawn protection: never carve directly under player start location
                const isNearSpawn =
                  Math.abs(tx - spawnCenter) <= 8 && ty < surfaceHeights[spawnCenter] + 8;
                if (isNearSpawn) continue;

                // Entrances can break through the surface; underground caves stay beneath surface
                if (params.isEntrance || ty >= surfaceHeights[tx] + 3) {
                  grid[tx][ty] = BlockId.AIR;
                }
              }
            }
          }
        }

        // Inertial turn rate produces smooth sinuous bends ("zawijasy") instead of jagged jumps
        angleVelocity = angleVelocity * 0.72 + (Math.random() - 0.5) * params.turnSpeed;
        curAngle += angleVelocity;

        // Boundaries & depth steering
        const avgSurfaceY = surfaceHeights[Math.max(0, Math.min(width - 1, Math.floor(curX)))];
        if (curY > GAME_CONSTANTS.BEDROCK_DEPTH - 7) {
          curAngle -= 0.18; // Steer away from bedrock
        } else if (!params.isEntrance && curY < avgSurfaceY + 5) {
          curAngle += 0.18; // Steer away from surface
        }

        curX += Math.cos(curAngle) * 1.0;
        curY += Math.sin(curAngle) * 1.0;

        // Bounce back from horizontal boundaries
        if (curX < 4) {
          curX = 4;
          curAngle = Math.PI - curAngle;
        } else if (curX > width - 5) {
          curX = width - 5;
          curAngle = Math.PI - curAngle;
        }

        // Branching: worms occasionally fork to form loops and side-paths
        if (branchDepth < 1 && step > 20 && step < params.length - 15 && Math.random() < 0.035) {
          const branchAngle = curAngle + (Math.random() > 0.5 ? 0.75 : -0.75);
          carveWorm({
            x: curX,
            y: curY,
            angle: branchAngle,
            length: Math.floor(params.length * 0.5),
            radius: Math.max(1.3, params.radius - 0.25),
            turnSpeed: params.turnSpeed * 1.1,
            isEntrance: false,
            branchDepth: branchDepth + 1
          });
        }
      }
    };

    // 1. Surface Cave Entrances (4 winding descents distributed across the 500-tile landscape)
    const entranceXs = [
      Math.floor(45 + Math.random() * 30),
      Math.floor(150 + Math.random() * 40),
      Math.floor(310 + Math.random() * 40),
      Math.floor(420 + Math.random() * 35)
    ];

    for (const entX of entranceXs) {
      const isRightSinking = Math.random() > 0.5;
      carveWorm({
        x: entX,
        y: surfaceHeights[entX],
        angle: isRightSinking
          ? (Math.PI / 3 + (Math.random() - 0.5) * 0.25)
          : ((2 * Math.PI) / 3 + (Math.random() - 0.5) * 0.25),
        length: 70,
        radius: 1.85,
        turnSpeed: 0.30,
        isEntrance: true
      });
    }

    // 2. Subterranean Winding Worms (26 labyrinthine sinuous tunnels)
    const numSubterraneanWorms = 26;
    for (let i = 0; i < numSubterraneanWorms; i++) {
      const startX = 18 + Math.random() * (width - 36);
      const surfaceY = surfaceHeights[Math.floor(startX)];
      const startY = surfaceY + 10 + Math.random() * (GAME_CONSTANTS.BEDROCK_DEPTH - surfaceY - 22);
      const initialAngle = Math.random() * Math.PI * 2;

      carveWorm({
        x: startX,
        y: startY,
        angle: initialAngle,
        length: 75 + Math.floor(Math.random() * 45),
        radius: 1.85,
        turnSpeed: 0.36,
        isEntrance: false
      });
    }

    // 3. Occasional Small Grottos (8 mini-cavern rooms, 3-3.8 tiles radius max)
    const numGrottos = 8;
    for (let g = 0; g < numGrottos; g++) {
      const gx = Math.floor(25 + Math.random() * (width - 50));
      const gy = Math.floor(
        surfaceHeights[gx] + 18 + Math.random() * (GAME_CONSTANTS.BEDROCK_DEPTH - surfaceHeights[gx] - 30)
      );
      const gRadius = 3.2 + Math.random() * 0.6; // 3.2 to 3.8 tiles radius max

      const intR = Math.ceil(gRadius);
      for (let ox = -intR; ox <= intR; ox++) {
        for (let oy = -intR; oy <= intR; oy++) {
          const dist = Math.sqrt(ox * ox + oy * oy * 1.3); // slightly flattened horizontally
          if (dist <= gRadius) {
            const tx = gx + ox;
            const ty = gy + oy;
            if (tx >= 2 && tx < width - 2 && ty > surfaceHeights[tx] + 6 && ty < GAME_CONSTANTS.BEDROCK_DEPTH - 2) {
              grid[tx][ty] = BlockId.AIR;
            }
          }
        }
      }
    }
  }

  /**
   * Spawns natural, connected ore veins using organic random walks.
   * Limits cluster sizes to 2-7 blocks and ensures spacing between different ore veins.
   */
  private static spawnOreVeins(
    width: number,
    height: number,
    grid: number[][],
    surfaceHeights: number[]
  ): void {
    const placedCenters: { x: number; y: number }[] = [];

    const seedOrganicVein = (
      oreId: BlockId,
      veinCount: number,
      minDepthOffset: number,
      maxDepthOffset: number,
      minSize: number,
      maxSize: number
    ) => {
      let placed = 0;
      let attempts = 0;

      while (placed < veinCount && attempts < veinCount * 35) {
        attempts++;
        const cx = Math.floor(6 + Math.random() * (width - 12));
        const surfaceY = surfaceHeights[cx];
        const cy = Math.floor(
          surfaceY + minDepthOffset + Math.random() * (maxDepthOffset - minDepthOffset)
        );

        if (cy >= GAME_CONSTANTS.BEDROCK_DEPTH - 2 || grid[cx][cy] !== BlockId.STONE) {
          continue;
        }

        // Distance check: ensure minimum 6 tiles spacing from existing ore vein centers
        let tooClose = false;
        for (const center of placedCenters) {
          const distSq = (cx - center.x) ** 2 + (cy - center.y) ** 2;
          if (distSq < 36) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        placedCenters.push({ x: cx, y: cy });

        // Grow natural organic vein using connected neighbor walk
        const targetSize = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));
        const vein: { x: number; y: number }[] = [{ x: cx, y: cy }];
        grid[cx][cy] = oreId;

        const dirs = [
          { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
          { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
        ];

        let walkAttempts = 0;
        while (vein.length < targetSize && walkAttempts < targetSize * 12) {
          walkAttempts++;
          const parent = vein[Math.floor(Math.random() * vein.length)];
          const dir = dirs[Math.floor(Math.random() * dirs.length)];
          const nx = parent.x + dir.x;
          const ny = parent.y + dir.y;

          if (nx >= 2 && nx < width - 2 && ny > surfaceY + 2 && ny < GAME_CONSTANTS.BEDROCK_DEPTH - 2) {
            if (grid[nx][ny] === BlockId.STONE) {
              grid[nx][ny] = oreId;
              vein.push({ x: nx, y: ny });
            }
          }
        }

        placed++;
      }
    };

    // Coal Veins: Common fuel, shallow to mid caverns (55 veins, 5-8 blocks each)
    seedOrganicVein(BlockId.COAL_ORE, 55, 6, 145, 5, 8);

    // Copper Veins: Basic crafting metal, upper subterranean (45 veins, 4-7 blocks each)
    seedOrganicVein(BlockId.COPPER_ORE, 45, 7, 120, 4, 7);

    // Iron Veins: Durable metal, mid depths (40 veins, 4-6 blocks each)
    seedOrganicVein(BlockId.IRON_ORE, 40, 16, 155, 4, 6);

    // Gold Veins: Rare precious metal, deep caverns (28 veins, 3-5 blocks each)
    seedOrganicVein(BlockId.GOLD_ORE, 28, 55, 172, 3, 5);

    // Diamond Veins: Highly prized brilliant crystals in deep caverns (22 veins, 2-4 blocks each)
    seedOrganicVein(BlockId.DIAMOND_ORE, 22, 85, 175, 2, 4);

    // Astral Crystal: Rare mystical deposits, deep abyss (16 veins, 2-4 blocks each)
    seedOrganicVein(BlockId.CRYSTAL_ORE, 16, 110, 175, 2, 4);

    // Void Obsidian: Near bedrock layer (14 veins, 4-6 blocks each)
    seedOrganicVein(BlockId.OBSIDIAN, 14, 130, 176, 4, 6);
  }

  private static spawnTrees(
    width: number,
    grid: number[][],
    surfaceHeights: number[],
    trees: TreeRecord[]
  ): void {
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

      // 48% chance to grow a tree
      if (Math.random() < 0.48) {
        // Diverse tree heights:
        // 25% short trees (4-5 blocks), 50% medium (6-8 blocks), 25% tall forest trees (9-11 blocks)
        const roll = Math.random();
        let trunkHeight: number;
        if (roll < 0.25) {
          trunkHeight = 4 + Math.floor(Math.random() * 2);
        } else if (roll < 0.75) {
          trunkHeight = 6 + Math.floor(Math.random() * 3);
        } else {
          trunkHeight = 9 + Math.floor(Math.random() * 3);
        }

        const treeTopY = surfaceY - trunkHeight;

        // Pick crown shape variant (0..4) and color variant (0..3)
        let crownVariant: number;
        if (trunkHeight >= 9) {
          // Tall trees suit tall forest (1), wide ancient (2), or split twin (3)
          crownVariant = [1, 2, 3][Math.floor(Math.random() * 3)];
        } else if (trunkHeight <= 5) {
          // Short trees suit round oak (0), wild bushy (4), or compact
          crownVariant = [0, 4, 0][Math.floor(Math.random() * 3)];
        } else {
          crownVariant = Math.floor(Math.random() * 5);
        }

        // Color palette variety: adjacent trees have alternating harmonious palettes
        const colorVariant = (trees.length * 2 + Math.floor(Math.random() * 2)) % 4;

        // 1. Root base resting directly on grass
        grid[x][surfaceY - 1] = BlockId.TREE_ROOT;

        // 2. Branch pattern selection based on height
        const branchSpots: { y: number; side: 'L' | 'R' }[] = [];
        if (trunkHeight >= 5) {
          const patternRoll = Math.random();
          if (trunkHeight >= 8 && patternRoll < 0.35) {
            // Dual/triple staggered branches on tall trees
            branchSpots.push({ y: surfaceY - 3, side: 'L' });
            branchSpots.push({ y: surfaceY - 5, side: 'R' });
            if (trunkHeight >= 10) branchSpots.push({ y: surfaceY - 8, side: 'L' });
          } else if (patternRoll < 0.30) {
            // Single left branch
            const by = surfaceY - 3 - Math.floor(Math.random() * (trunkHeight - 4));
            branchSpots.push({ y: by, side: 'L' });
          } else if (patternRoll < 0.60) {
            // Single right branch
            const by = surfaceY - 3 - Math.floor(Math.random() * (trunkHeight - 4));
            branchSpots.push({ y: by, side: 'R' });
          } else if (patternRoll < 0.85) {
            // Staggered branches left & right
            branchSpots.push({ y: surfaceY - 3, side: 'L' });
            branchSpots.push({ y: surfaceY - 5, side: 'R' });
          }
          // Remaining 15% have clean bare straight trunks
        }

        for (let ty = surfaceY - 2; ty >= treeTopY; ty--) {
          const branch = branchSpots.find(b => b.y === ty);
          if (branch) {
            grid[x][ty] = branch.side === 'L' ? BlockId.TREE_BRANCH_L : BlockId.TREE_BRANCH_R;
          } else {
            grid[x][ty] = BlockId.WOOD;
          }
        }

        // 3. Mark Canopy blocks in grid for reach and mining detection
        const halfWidth = (crownVariant === 2 || crownVariant === 3) ? 2 : 1;
        const canopyTop = crownVariant === 1 ? treeTopY - 3 : treeTopY - 2;

        for (let lx = x - halfWidth; lx <= x + halfWidth; lx++) {
          for (let ly = canopyTop; ly <= treeTopY; ly++) {
            if (lx >= 0 && lx < width && ly >= 0) {
              if (grid[lx][ly] === BlockId.AIR) {
                grid[lx][ly] = BlockId.LEAVES;
              }
            }
          }
        }

        trees.push({ x, surfaceY, treeTopY, trunkHeight, crownVariant, colorVariant });
        lastTreeX = x;
      }
    }
  }
}
