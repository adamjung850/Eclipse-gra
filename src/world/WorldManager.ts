import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { BLOCK_DEFINITIONS } from './BlockTypes.js';
import { GeneratedWorldData, TreeRecord } from './WorldGenerator.js';
import { CROWN_PALETTES, CROWN_DEFS } from '../textures/TreeSprites.js';

export interface ActiveTree {
  x: number;
  surfaceY: number;
  treeTopY: number;
  trunkHeight: number;
  crownVariant: number;
  colorVariant: number;
  crownSprite?: Phaser.GameObjects.Image;
}

export interface PlantedSapling {
  x: number;
  y: number;
  plantedAt: number;
  growTime: number;
}

export class WorldManager {
  public scene: Phaser.Scene;
  public width: number;
  public height: number;
  public foreground: number[][];
  public background: number[][];
  public blockDamage: Map<string, number> = new Map();
  public crackImages: Map<string, Phaser.GameObjects.Image> = new Map();

  public tilemap!: Phaser.Tilemaps.Tilemap;
  public backgroundLayer!: Phaser.Tilemaps.TilemapLayer;
  public foregroundLayer!: Phaser.Tilemaps.TilemapLayer;

  // Trees & Sapling growth
  public activeTrees: ActiveTree[] = [];
  public plantedSaplings: PlantedSapling[] = [];

  // Callback when a block is broken: (tileX, tileY, blockId) => void
  public onBlockBroken?: (tileX: number, tileY: number, blockId: number) => void;

  constructor(scene: Phaser.Scene, worldData: GeneratedWorldData) {
    this.scene = scene;
    this.width = worldData.width;
    this.height = worldData.height;
    this.foreground = worldData.foreground;
    this.background = worldData.background;

    // Initialize trees from procedural generation
    if (worldData.trees) {
      for (const t of worldData.trees) {
        this.activeTrees.push({
          x: t.x,
          surfaceY: t.surfaceY,
          treeTopY: t.treeTopY,
          trunkHeight: t.trunkHeight,
          crownVariant: t.crownVariant ?? 0,
          colorVariant: t.colorVariant ?? 0
        });
      }
    }

    this.createTilemaps();
    this.spawnInitialTreeCrowns();
  }

  private createTilemaps(): void {
    const T = GAME_CONSTANTS.TILE_SIZE;

    // 1. Create Phaser Tilemap
    this.tilemap = this.scene.make.tilemap({
      tileWidth: T,
      tileHeight: T,
      width: this.width,
      height: this.height
    });

    const tileset = this.tilemap.addTilesetImage('world_tileset', 'world_tileset', T, T, 0, 0);
    if (!tileset) {
      console.error('Failed to create world tileset');
      return;
    }

    // 2. Create Background Layer (Walls)
    const bgLayer = this.tilemap.createBlankLayer('BackgroundLayer', tileset, 0, 0);
    if (bgLayer) {
      this.backgroundLayer = bgLayer;
      this.backgroundLayer.setAlpha(0.92);
      this.backgroundLayer.setTint(0xccccdd);

      // Populate background tiles
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          const wallId = this.background[x][y];
          if (wallId !== BlockId.AIR) {
            this.backgroundLayer.putTileAt(wallId, x, y);
          }
        }
      }
    }

    // 3. Create Foreground Layer (Solid & interactable blocks)
    const fgLayer = this.tilemap.createBlankLayer('ForegroundLayer', tileset, 0, 0);
    if (fgLayer) {
      this.foregroundLayer = fgLayer;

      // Populate foreground tiles
      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          const blockId = this.foreground[x][y];
          if (blockId !== BlockId.AIR) {
            // Natural tree leaves are rendered via tree_crown sprite, skip square block placement
            if (blockId === BlockId.LEAVES && this.isNaturalTreeLeaf(x, y)) {
              continue;
            }
            this.foregroundLayer.putTileAt(blockId, x, y);
          }
        }
      }

      this.updateCollisions();
    }
  }

  public isNaturalTreeLeaf(x: number, y: number): boolean {
    for (const tree of this.activeTrees) {
      const halfW = (tree.crownVariant === 2 || tree.crownVariant === 3) ? 2 : 1;
      const topY = tree.crownVariant === 1 ? tree.treeTopY - 3 : tree.treeTopY - 2;
      if (Math.abs(tree.x - x) <= halfW && y <= tree.treeTopY && y >= topY) {
        return true;
      }
    }
    return false;
  }

  private spawnInitialTreeCrowns(): void {
    const T = GAME_CONSTANTS.TILE_SIZE;
    for (const tree of this.activeTrees) {
      const texKey = `tree_crown_${tree.crownVariant}_${tree.colorVariant}`;
      const crown = this.scene.add.image(
        tree.x * T + T / 2,
        tree.treeTopY * T + 7,
        this.scene.textures.exists(texKey) ? texKey : 'tree_crown'
      );
      crown.setDepth(0);
      crown.setOrigin(0.5, 1.0);
      tree.crownSprite = crown;
    }
  }

  public updateCollisions(): void {
    // 1. Reset all tile collisions across the entire layer
    this.foregroundLayer.setCollisionByExclusion([], false);

    // 2. Identify all solid block IDs from BLOCK_DEFINITIONS
    const solidBlockIds: number[] = [];
    for (let id = 1; id < 32; id++) {
      const def = BLOCK_DEFINITIONS[id];
      if (def && def.isSolid) {
        solidBlockIds.push(id);
      }
    }
    this.foregroundLayer.setCollision(solidBlockIds, true);

    // 3. Explicitly disable collision on wood, leaves, torches, walls, saplings and tree parts
    const nonSolidIds = [
      BlockId.WOOD,
      BlockId.LEAVES,
      BlockId.TORCH,
      BlockId.DIRT_WALL,
      BlockId.STONE_WALL,
      BlockId.WOOD_WALL,
      BlockId.SAPLING,
      BlockId.TREE_ROOT,
      BlockId.TREE_BRANCH_L,
      BlockId.TREE_BRANCH_R
    ];
    this.foregroundLayer.setCollision(nonSolidIds, false);

    // 4. Force individual tile collision properties to match BLOCK_DEFINITIONS strictly
    this.foregroundLayer.forEachTile((tile) => {
      const def = BLOCK_DEFINITIONS[tile.index];
      const isSolid = def ? def.isSolid : false;
      tile.setCollision(isSolid, isSolid, isSolid, isSolid);
    });
  }

  public getBlock(tileX: number, tileY: number): number {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return BlockId.BEDROCK; // Outside map counts as bedrock
    }
    return this.foreground[tileX][tileY];
  }

  public getWall(tileX: number, tileY: number): number {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return BlockId.AIR;
    }
    return this.background[tileX][tileY];
  }

  public isSolid(tileX: number, tileY: number): boolean {
    const blockId = this.getBlock(tileX, tileY);
    const def = BLOCK_DEFINITIONS[blockId];
    return def ? def.isSolid : false;
  }

  public damageBlock(tileX: number, tileY: number, damage: number): boolean {
    const blockId = this.getBlock(tileX, tileY);
    if (blockId === BlockId.AIR || blockId === BlockId.BEDROCK) {
      return false;
    }

    const def = BLOCK_DEFINITIONS[blockId];
    if (!def) return false;

    const key = `${tileX},${tileY}`;
    const currentDmg = (this.blockDamage.get(key) || 0) + damage;
    this.blockDamage.set(key, currentDmg);

    const T = GAME_CONSTANTS.TILE_SIZE;
    const progress = currentDmg / def.hardness;

    // Check if broken
    if (progress >= 1.0) {
      this.breakBlock(tileX, tileY);
      return true;
    }

    // Update crack sprite overlay
    let crackIdx = 0;
    if (progress > 0.75) crackIdx = 3;
    else if (progress > 0.5) crackIdx = 2;
    else if (progress > 0.25) crackIdx = 1;

    let crackImg = this.crackImages.get(key);
    if (!crackImg) {
      crackImg = this.scene.add.image(tileX * T + T / 2, tileY * T + T / 2, `crack_${crackIdx}`);
      crackImg.setDepth(15);
      this.crackImages.set(key, crackImg);
    } else {
      crackImg.setTexture(`crack_${crackIdx}`);
    }

    return false;
  }

  public clearDamage(tileX: number, tileY: number): void {
    const key = `${tileX},${tileY}`;
    this.blockDamage.delete(key);
    const crack = this.crackImages.get(key);
    if (crack) {
      crack.destroy();
      this.crackImages.delete(key);
    }
  }

  public isTreeTrunkBlock(blockId: number): boolean {
    return (
      blockId === BlockId.WOOD ||
      blockId === BlockId.TREE_ROOT ||
      blockId === BlockId.TREE_BRANCH_L ||
      blockId === BlockId.TREE_BRANCH_R
    );
  }

  public breakBlock(tileX: number, tileY: number): void {
    const blockId = this.getBlock(tileX, tileY);
    if (blockId === BlockId.AIR || blockId === BlockId.BEDROCK) return;

    // Tree-Fall Cascade: if breaking ANY trunk segment, fell the entire tree above it!
    if (this.isTreeTrunkBlock(blockId)) {
      this.fellTreeFrom(tileX, tileY);
      return;
    }

    // If breaking a grass block, ensure the background wall shows the grass block texture (with green top), not dirt
    if (blockId === BlockId.GRASS) {
      this.background[tileX][tileY] = BlockId.GRASS;
      this.backgroundLayer.putTileAt(BlockId.GRASS, tileX, tileY);
    }

    // Remove from grids
    this.foreground[tileX][tileY] = BlockId.AIR;
    this.foregroundLayer.removeTileAt(tileX, tileY);
    this.clearDamage(tileX, tileY);

    // If breaking a leaf block of a tree, check if crown needs to be removed
    if (blockId === BlockId.LEAVES) {
      const treeIdx = this.activeTrees.findIndex(t => {
        const halfW = (t.crownVariant === 2 || t.crownVariant === 3) ? 2 : 1;
        const topY = t.crownVariant === 1 ? t.treeTopY - 3 : t.treeTopY - 2;
        return Math.abs(t.x - tileX) <= halfW && tileY <= t.treeTopY && tileY >= topY;
      });
      if (treeIdx !== -1) {
        const tree = this.activeTrees[treeIdx];
        if (tree.crownSprite) {
          this.emitLeafBurst(tree.x * GAME_CONSTANTS.TILE_SIZE + 12, tree.treeTopY * GAME_CONSTANTS.TILE_SIZE - 20, tree.colorVariant);
          tree.crownSprite.destroy();
          tree.crownSprite = undefined;
        }
      }
    }

    // Trigger broken callback
    if (this.onBlockBroken) {
      this.onBlockBroken(tileX, tileY, blockId);
    }
  }

  public fellTreeFrom(tileX: number, startY: number): void {
    // 1. Break the initial trunk block
    const initialBlockId = this.getBlock(tileX, startY);
    this.foreground[tileX][startY] = BlockId.AIR;
    this.foregroundLayer.removeTileAt(tileX, startY);
    this.clearDamage(tileX, startY);
    if (this.onBlockBroken) {
      this.onBlockBroken(tileX, startY, initialBlockId);
    }

    // 2. Cascade upwards breaking all trunk blocks above
    let currY = startY - 1;
    while (currY >= 0 && this.isTreeTrunkBlock(this.getBlock(tileX, currY))) {
      const bId = this.getBlock(tileX, currY);
      this.foreground[tileX][currY] = BlockId.AIR;
      this.foregroundLayer.removeTileAt(tileX, currY);
      this.clearDamage(tileX, currY);
      if (this.onBlockBroken) {
        this.onBlockBroken(tileX, currY, bId);
      }
      currY--;
    }

    // 3. Find and destroy tree crown
    const treeIdx = this.activeTrees.findIndex(t => t.x === tileX && t.surfaceY >= startY && t.treeTopY <= startY + 2);
    if (treeIdx !== -1) {
      const tree = this.activeTrees[treeIdx];
      if (tree.crownSprite) {
        this.emitLeafBurst(tree.x * GAME_CONSTANTS.TILE_SIZE + 12, tree.treeTopY * GAME_CONSTANTS.TILE_SIZE - 20, tree.colorVariant);
        tree.crownSprite.destroy();
      }

      // Clear canopy blocks and drop saplings
      const halfW = (tree.crownVariant === 2 || tree.crownVariant === 3) ? 2 : 1;
      const topY = tree.crownVariant === 1 ? tree.treeTopY - 3 : tree.treeTopY - 2;

      for (let lx = tree.x - halfW; lx <= tree.x + halfW; lx++) {
        for (let ly = topY; ly <= tree.treeTopY; ly++) {
          if (lx >= 0 && lx < this.width && ly >= 0) {
            if (this.foreground[lx][ly] === BlockId.LEAVES) {
              this.foreground[lx][ly] = BlockId.AIR;
              this.foregroundLayer.removeTileAt(lx, ly);
              this.clearDamage(lx, ly);
              if (this.onBlockBroken) {
                this.onBlockBroken(lx, ly, BlockId.LEAVES);
              }
            }
          }
        }
      }

      this.activeTrees.splice(treeIdx, 1);
    }
  }

  public emitLeafBurst(worldX: number, worldY: number, colorVariant: number = 0): void {
    const pal = CROWN_PALETTES[colorVariant] || CROWN_PALETTES[0];
    for (let i = 0; i < 16; i++) {
      const p = this.scene.add.image(
        worldX + (Math.random() - 0.5) * 44,
        worldY + (Math.random() - 0.5) * 36,
        'particle_chip'
      );
      p.setTint(Math.random() > 0.4 ? pal.particlePrimary : pal.particleSecondary);
      p.setDepth(15);
      this.scene.tweens.add({
        targets: p,
        x: p.x + (Math.random() - 0.5) * 48,
        y: p.y + 25 + Math.random() * 40,
        alpha: 0,
        duration: 450 + Math.random() * 350,
        onComplete: () => p.destroy()
      });
    }
  }

  public growTreeAt(tileX: number, surfaceY: number): void {
    if (this.getBlock(tileX, surfaceY) !== BlockId.SAPLING) return;

    // Pick diverse height for grown saplings:
    const roll = Math.random();
    let trunkHeight: number;
    if (roll < 0.3) {
      trunkHeight = 4 + Math.floor(Math.random() * 2);
    } else if (roll < 0.75) {
      trunkHeight = 6 + Math.floor(Math.random() * 3);
    } else {
      trunkHeight = 9 + Math.floor(Math.random() * 2);
    }
    const treeTopY = surfaceY - trunkHeight + 1;

    // Pick random crown and color variants
    const crownVariant = Math.floor(Math.random() * CROWN_DEFS.length);
    const colorVariant = Math.floor(Math.random() * CROWN_PALETTES.length);
    const halfWidth = (crownVariant === 2 || crownVariant === 3) ? 2 : 1;
    const canopyTop = crownVariant === 1 ? treeTopY - 3 : treeTopY - 2;

    // Check space above
    for (let ty = surfaceY - 1; ty >= canopyTop; ty--) {
      if (ty < 0 || this.isSolid(tileX, ty)) return; // Obstacle above
    }

    // Remove sapling
    this.foreground[tileX][surfaceY] = BlockId.AIR;
    this.foregroundLayer.removeTileAt(tileX, surfaceY);

    // 1. Root base
    this.foreground[tileX][surfaceY] = BlockId.TREE_ROOT;
    this.foregroundLayer.putTileAt(BlockId.TREE_ROOT, tileX, surfaceY);

    // 2. Trunk with dynamic branches
    const branchSpots: { y: number; side: 'L' | 'R' }[] = [];
    if (trunkHeight >= 5) {
      const bRoll = Math.random();
      if (bRoll < 0.35) {
        branchSpots.push({ y: surfaceY - 2, side: 'L' });
        if (trunkHeight >= 7) branchSpots.push({ y: surfaceY - 4, side: 'R' });
      } else if (bRoll < 0.70) {
        branchSpots.push({ y: surfaceY - 2, side: 'R' });
        if (trunkHeight >= 7) branchSpots.push({ y: surfaceY - 4, side: 'L' });
      } else if (bRoll < 0.90) {
        branchSpots.push({ y: surfaceY - 3, side: 'L' });
        branchSpots.push({ y: surfaceY - 5, side: 'R' });
      }
    }

    for (let ty = surfaceY - 1; ty >= treeTopY; ty--) {
      const branch = branchSpots.find(b => b.y === ty);
      let bId = BlockId.WOOD;
      if (branch) {
        bId = branch.side === 'L' ? BlockId.TREE_BRANCH_L : BlockId.TREE_BRANCH_R;
      }
      this.foreground[tileX][ty] = bId;
      this.foregroundLayer.putTileAt(bId, tileX, ty);
    }

    // 3. Mark canopy
    for (let lx = tileX - halfWidth; lx <= tileX + halfWidth; lx++) {
      for (let ly = canopyTop; ly <= treeTopY; ly++) {
        if (lx >= 0 && lx < this.width && ly >= 0) {
          if (this.foreground[lx][ly] === BlockId.AIR) {
            this.foreground[lx][ly] = BlockId.LEAVES;
          }
        }
      }
    }

    // 4. Create Crown Sprite
    const T = GAME_CONSTANTS.TILE_SIZE;
    const texKey = `tree_crown_${crownVariant}_${colorVariant}`;
    const crown = this.scene.add.image(
      tileX * T + T / 2,
      treeTopY * T + 7,
      this.scene.textures.exists(texKey) ? texKey : 'tree_crown'
    );
    crown.setDepth(0);
    crown.setOrigin(0.5, 1.0);

    this.activeTrees.push({
      x: tileX,
      surfaceY: surfaceY + 1,
      treeTopY,
      trunkHeight,
      crownVariant,
      colorVariant,
      crownSprite: crown
    });

    // Growth particle poof
    this.emitLeafBurst(tileX * T + T / 2, surfaceY * T, colorVariant);
  }

  public update(delta: number): void {
    if (this.plantedSaplings.length > 0) {
      const now = Date.now();
      for (let i = this.plantedSaplings.length - 1; i >= 0; i--) {
        const s = this.plantedSaplings[i];
        if (now - s.plantedAt >= s.growTime) {
          this.plantedSaplings.splice(i, 1);
          this.growTreeAt(s.x, s.y);
        }
      }
    }
  }

  public canPlaceBlock(
    tileX: number,
    tileY: number,
    blockId: number,
    playerBounds: Phaser.Geom.Rectangle
  ): boolean {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }

    // Target tile must be Air
    if (this.foreground[tileX][tileY] !== BlockId.AIR) {
      return false;
    }

    // Sapling placement: must be planted on top of fertile Grass or Dirt
    if (blockId === BlockId.SAPLING) {
      const floorBlock = this.getBlock(tileX, tileY + 1);
      return floorBlock === BlockId.GRASS || floorBlock === BlockId.DIRT;
    }

    const T = GAME_CONSTANTS.TILE_SIZE;
    const blockRect = new Phaser.Geom.Rectangle(tileX * T, tileY * T, T, T);

    // Solid blocks cannot be placed directly inside player bounding box
    const def = BLOCK_DEFINITIONS[blockId];
    if (def && def.isSolid) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, blockRect)) {
        return false;
      }
    }

    // Classic Sandbox placement rule: Must be adjacent to an existing solid block or background wall
    const hasSolidNeighbor =
      this.isSolid(tileX - 1, tileY) ||
      this.isSolid(tileX + 1, tileY) ||
      this.isSolid(tileX, tileY - 1) ||
      this.isSolid(tileX, tileY + 1) ||
      this.background[tileX][tileY] !== BlockId.AIR;

    return hasSolidNeighbor;
  }

  public placeBlock(tileX: number, tileY: number, blockId: number): boolean {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }

    const def = BLOCK_DEFINITIONS[blockId];
    if (!def) return false;

    if (def.isWall) {
      // Place as wall in background layer
      this.background[tileX][tileY] = blockId;
      this.backgroundLayer.putTileAt(blockId, tileX, tileY);
    } else {
      // If placing dirt with air directly above, turn it into lush grass block
      if (blockId === BlockId.DIRT && tileY > 0 && this.foreground[tileX][tileY - 1] === BlockId.AIR) {
        blockId = BlockId.GRASS;
      }
      // Place in foreground layer
      this.foreground[tileX][tileY] = blockId;
      this.foregroundLayer.putTileAt(blockId, tileX, tileY);

      // If planting a sapling, track it for natural tree growth!
      if (blockId === BlockId.SAPLING) {
        this.plantedSaplings.push({
          x: tileX,
          y: tileY,
          plantedAt: Date.now(),
          growTime: 12000 + Math.random() * 8000 // 12-20s growth time
        });
      }

      // Synchronize background layer if empty
      if (this.background[tileX][tileY] === BlockId.AIR) {
        this.background[tileX][tileY] = blockId;
        this.backgroundLayer.putTileAt(blockId, tileX, tileY);
      }
      if (def.isSolid) {
        this.updateCollisions();
      }
    }

    return true;
  }

  public worldToTile(worldX: number, worldY: number): { x: number; y: number } {
    const T = GAME_CONSTANTS.TILE_SIZE;
    return {
      x: Math.floor(worldX / T),
      y: Math.floor(worldY / T)
    };
  }

  public tileToWorld(tileX: number, tileY: number): { x: number; y: number } {
    const T = GAME_CONSTANTS.TILE_SIZE;
    return {
      x: tileX * T,
      y: tileY * T
    };
  }
}
