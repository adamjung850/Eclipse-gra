import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { BLOCK_DEFINITIONS } from './BlockTypes.js';

export class WorldManager {
  constructor(scene, worldData) {
    this.scene = scene;
    this.width = worldData.width;
    this.height = worldData.height;
    this.foreground = worldData.foreground;
    this.background = worldData.background;
    this.blockDamage = new Map();
    this.crackImages = new Map();
    this.onBlockBroken = null;

    this.createTilemaps();
  }

  createTilemaps() {
    const T = GAME_CONSTANTS.TILE_SIZE;

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

    // Background Layer
    const bgLayer = this.tilemap.createBlankLayer('BackgroundLayer', tileset, 0, 0);
    if (bgLayer) {
      this.backgroundLayer = bgLayer;
      this.backgroundLayer.setAlpha(0.65);
      this.backgroundLayer.setTint(0x888899);

      for (let x = 0; x < this.width; x++) {
        for (let y = 0; y < this.height; y++) {
          const wallId = this.background[x][y];
          if (wallId !== BlockId.AIR) {
            this.backgroundLayer.putTileAt(wallId, x, y);
          }
        }
      }
    }

    // Foreground Layer
    const fgLayer = this.tilemap.createBlankLayer('ForegroundLayer', tileset, 0, 0);
    if (fgLayer) {
      this.foregroundLayer = fgLayer;

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

  updateCollisions() {
    const solidBlockIds = [];
    for (let id = 1; id < 32; id++) {
      const def = BLOCK_DEFINITIONS[id];
      if (def && def.isSolid) {
        solidBlockIds.push(id);
      }
    }
    this.foregroundLayer.setCollision(solidBlockIds, true);
  }

  getBlock(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return BlockId.BEDROCK;
    }
    return this.foreground[tileX][tileY];
  }

  getWall(tileX, tileY) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return BlockId.AIR;
    }
    return this.background[tileX][tileY];
  }

  isSolid(tileX, tileY) {
    const blockId = this.getBlock(tileX, tileY);
    const def = BLOCK_DEFINITIONS[blockId];
    return def ? def.isSolid : false;
  }

  damageBlock(tileX, tileY, damage) {
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

    if (progress >= 1.0) {
      this.breakBlock(tileX, tileY);
      return true;
    }

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

  clearDamage(tileX, tileY) {
    const key = `${tileX},${tileY}`;
    this.blockDamage.delete(key);
    const crack = this.crackImages.get(key);
    if (crack) {
      crack.destroy();
      this.crackImages.delete(key);
    }
  }

  breakBlock(tileX, tileY) {
    const blockId = this.getBlock(tileX, tileY);
    if (blockId === BlockId.AIR || blockId === BlockId.BEDROCK) return;

    this.foreground[tileX][tileY] = BlockId.AIR;
    this.foregroundLayer.removeTileAt(tileX, tileY);
    this.clearDamage(tileX, tileY);

    if (this.onBlockBroken) {
      this.onBlockBroken(tileX, tileY, blockId);
    }
  }

  canPlaceBlock(tileX, tileY, blockId, playerBounds) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }

    if (this.foreground[tileX][tileY] !== BlockId.AIR) {
      return false;
    }

    const T = GAME_CONSTANTS.TILE_SIZE;
    const blockRect = new Phaser.Geom.Rectangle(tileX * T, tileY * T, T, T);

    const def = BLOCK_DEFINITIONS[blockId];
    if (def && def.isSolid) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, blockRect)) {
        return false;
      }
    }

    const hasSolidNeighbor =
      this.isSolid(tileX - 1, tileY) ||
      this.isSolid(tileX + 1, tileY) ||
      this.isSolid(tileX, tileY - 1) ||
      this.isSolid(tileX, tileY + 1) ||
      this.background[tileX][tileY] !== BlockId.AIR;

    return hasSolidNeighbor;
  }

  placeBlock(tileX, tileY, blockId) {
    if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
      return false;
    }

    const def = BLOCK_DEFINITIONS[blockId];
    if (!def) return false;

    if (def.isWall) {
      this.background[tileX][tileY] = blockId;
      this.backgroundLayer.putTileAt(blockId, tileX, tileY);
    } else {
      this.foreground[tileX][tileY] = blockId;
      this.foregroundLayer.putTileAt(blockId, tileX, tileY);
      if (def.isSolid) {
        this.updateCollisions();
      }
    }

    return true;
  }

  worldToTile(worldX, worldY) {
    const T = GAME_CONSTANTS.TILE_SIZE;
    return {
      x: Math.floor(worldX / T),
      y: Math.floor(worldY / T)
    };
  }

  tileToWorld(tileX, tileY) {
    const T = GAME_CONSTANTS.TILE_SIZE;
    return {
      x: tileX * T,
      y: tileY * T
    };
  }
}
