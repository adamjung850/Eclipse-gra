import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';

export class MiningSystem {
  constructor(scene, player, worldManager) {
    this.scene = scene;
    this.player = player;
    this.worldManager = worldManager;

    this.lastMineTime = 0;
    this.lastPlaceTime = 0;
    this.currentMiningTile = null;
    this.onPlaySound = null;

    this.initReticle();
    this.initParticles();
  }

  initReticle() {
    const T = GAME_CONSTANTS.TILE_SIZE;
    this.reticle = this.scene.add.image(0, 0, 'reticle');
    this.reticle.setOrigin(0, 0);
    this.reticle.setDepth(30);
  }

  initParticles() {
    this.chipEmitter = this.scene.add.particles(0, 0, 'particle_chip', {
      lifespan: 400,
      speed: { min: 40, max: 120 },
      scale: { start: 1.2, end: 0.2 },
      gravityY: 450,
      emitting: false
    });
    this.chipEmitter.setDepth(25);
  }

  update(time, delta, pointer) {
    const T = GAME_CONSTANTS.TILE_SIZE;
    const camera = this.scene.cameras.main;

    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    const tilePos = this.worldManager.worldToTile(worldPoint.x, worldPoint.y);
    const tileX = tilePos.x;
    const tileY = tilePos.y;

    this.reticle.setPosition(tileX * T, tileY * T);

    const playerCenter = this.player.getCenter();
    const targetCenter = new Phaser.Math.Vector2(tileX * T + T / 2, tileY * T + T / 2);
    const dist = Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, targetCenter.x, targetCenter.y);
    const maxReach = GAME_CONSTANTS.PLAYER_REACH_TILES * T;
    const inReach = dist <= maxReach;

    if (inReach) {
      this.reticle.setTint(0x44ff88);
      this.reticle.setAlpha(0.85);
    } else {
      this.reticle.setTint(0xff4444);
      this.reticle.setAlpha(0.4);
    }

    if (pointer.isDown && inReach) {
      const blockId = this.worldManager.getBlock(tileX, tileY);
      const selectedItem = this.player.getSelectedItem();

      if (blockId !== BlockId.AIR && blockId !== BlockId.BEDROCK) {
        this.handleMining(time, tileX, tileY, blockId, selectedItem);
      } else if (blockId === BlockId.AIR && selectedItem && selectedItem.isPlaceable && selectedItem.placeBlockId) {
        this.handlePlacement(time, tileX, tileY, selectedItem);
      }
    } else {
      if (this.currentMiningTile) {
        this.worldManager.clearDamage(this.currentMiningTile.x, this.currentMiningTile.y);
        this.currentMiningTile = null;
      }
    }
  }

  handleMining(time, tileX, tileY, blockId, selectedItem) {
    const MINE_INTERVAL = 140;
    if (time - this.lastMineTime < MINE_INTERVAL) return;
    this.lastMineTime = time;

    if (this.currentMiningTile && (this.currentMiningTile.x !== tileX || this.currentMiningTile.y !== tileY)) {
      this.worldManager.clearDamage(this.currentMiningTile.x, this.currentMiningTile.y);
    }
    this.currentMiningTile = { x: tileX, y: tileY };

    const T = GAME_CONSTANTS.TILE_SIZE;
    this.player.triggerToolSwing(tileX * T + T / 2, tileY * T + T / 2);

    let power = 8;
    if (selectedItem && selectedItem.toolPower) {
      power = selectedItem.toolPower;
    }

    const def = BLOCK_DEFINITIONS[blockId];
    if (def) {
      this.chipEmitter.particleTint = def.particleColor;
      this.chipEmitter.emitParticleAt(tileX * T + T / 2, tileY * T + T / 2, 4);

      if (this.onPlaySound) {
        this.onPlaySound(def.soundType);
      }
    }

    const destroyed = this.worldManager.damageBlock(tileX, tileY, power);
    if (destroyed) {
      this.currentMiningTile = null;
      if (def) {
        this.chipEmitter.emitParticleAt(tileX * T + T / 2, tileY * T + T / 2, 12);
      }
      if (this.onPlaySound) {
        this.onPlaySound('break');
      }
    }
  }

  handlePlacement(time, tileX, tileY, selectedItem) {
    const PLACE_INTERVAL = 180;
    if (time - this.lastPlaceTime < PLACE_INTERVAL) return;

    const blockIdToPlace = selectedItem.placeBlockId;
    if (!blockIdToPlace) return;

    const playerBounds = this.player.getBounds();
    const canPlace = this.worldManager.canPlaceBlock(tileX, tileY, blockIdToPlace, playerBounds);

    if (canPlace) {
      this.lastPlaceTime = time;
      const success = this.worldManager.placeBlock(tileX, tileY, blockIdToPlace);
      if (success) {
        this.player.consumeSelectedItem(1);
        const T = GAME_CONSTANTS.TILE_SIZE;
        this.player.triggerToolSwing(tileX * T + T / 2, tileY * T + T / 2);

        const def = BLOCK_DEFINITIONS[blockIdToPlace];
        if (def) {
          this.chipEmitter.particleTint = def.particleColor;
          this.chipEmitter.emitParticleAt(tileX * T + T / 2, tileY * T + T / 2, 5);
        }

        if (this.onPlaySound) {
          this.onPlaySound('place');
        }
      }
    }
  }

  destroy() {
    if (this.reticle) this.reticle.destroy();
    if (this.chipEmitter) this.chipEmitter.destroy();
  }
}
