import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { BLOCK_DEFINITIONS } from './BlockTypes.js';
import { GeneratedWorldData } from './WorldGenerator.js';

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

  // Callback when a block is broken: (tileX, tileY, blockId) => void
  public onBlockBroken?: (tileX: number, tileY: number, blockId: number) => void;

  constructor(scene: Phaser.Scene, worldData: GeneratedWorldData) {
    this.scene = scene;
    this.width = worldData.width;
    this.height = worldData.height;
    this.foreground = worldData.foreground;
    this.background = worldData.background;

    this.createTilemaps();
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
            this.foregroundLayer.putTileAt(blockId, x, y);
          }
        }
      }

      this.updateCollisions();
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

    // 3. Explicitly disable collision on wood, leaves, torches and walls
    const nonSolidIds = [
      BlockId.WOOD,
      BlockId.LEAVES,
      BlockId.TORCH,
      BlockId.DIRT_WALL,
      BlockId.STONE_WALL,
      BlockId.WOOD_WALL
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

  public breakBlock(tileX: number, tileY: number): void {
    const blockId = this.getBlock(tileX, tileY);
    if (blockId === BlockId.AIR || blockId === BlockId.BEDROCK) return;

    // If breaking a grass block, ensure the background wall shows the grass block texture (with green top), not dirt
    if (blockId === BlockId.GRASS) {
      this.background[tileX][tileY] = BlockId.GRASS;
      this.backgroundLayer.putTileAt(BlockId.GRASS, tileX, tileY);
    }

    // Remove from grids
    this.foreground[tileX][tileY] = BlockId.AIR;
    this.foregroundLayer.removeTileAt(tileX, tileY);
    this.clearDamage(tileX, tileY);

    // Trigger broken callback
    if (this.onBlockBroken) {
      this.onBlockBroken(tileX, tileY, blockId);
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
