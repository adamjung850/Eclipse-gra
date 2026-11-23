import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { Player } from '../entities/Player.js';
import { WorldManager } from '../world/WorldManager.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';

export class MiningSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private worldManager: WorldManager;

  private reticle!: Phaser.GameObjects.Image;
  private lastMineTime: number = 0;
  private lastPlaceTime: number = 0;
  private currentMiningTile: { x: number; y: number } | null = null;

  // Particle Emitter
  private chipEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  // Sound Callbacks
  public onPlaySound?: (type: string) => void;

  constructor(scene: Phaser.Scene, player: Player, worldManager: WorldManager) {
    this.scene = scene;
    this.player = player;
    this.worldManager = worldManager;

    this.initReticle();
    this.initParticles();
  }

  private initReticle(): void {
    const T = GAME_CONSTANTS.TILE_SIZE;
    this.reticle = this.scene.add.image(0, 0, 'reticle');
    this.reticle.setOrigin(0, 0);
    this.reticle.setDepth(30);
  }

  private initParticles(): void {
    this.chipEmitter = this.scene.add.particles(0, 0, 'particle_chip', {
      lifespan: 400,
      speed: { min: 40, max: 120 },
      scale: { start: 1.2, end: 0.2 },
      gravityY: 450,
      emitting: false
    });
    this.chipEmitter.setDepth(25);
  }

  public update(time: number, delta: number, pointer: Phaser.Input.Pointer): boolean {
    const T = GAME_CONSTANTS.TILE_SIZE;
    const camera = this.scene.cameras.main;

    // Convert mouse screen to world position
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    const tilePos = this.worldManager.worldToTile(worldPoint.x, worldPoint.y);
    const tileX = tilePos.x;
    const tileY = tilePos.y;

    // Position reticle snap to grid
    this.reticle.setPosition(tileX * T, tileY * T);

    // Reach Check
    const playerCenter = this.player.getCenter();
    const targetCenter = new Phaser.Math.Vector2(tileX * T + T / 2, tileY * T + T / 2);
    const dist = Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, targetCenter.x, targetCenter.y);
    const maxReach = GAME_CONSTANTS.PLAYER_REACH_TILES * T;
    const inReach = dist <= maxReach;

    // Reticle color: Green/Yellow if in reach, Red if too far
    if (inReach) {
      this.reticle.setTint(0x44ff88);
      this.reticle.setAlpha(0.85);
    } else {
      this.reticle.setTint(0xff4444);
      this.reticle.setAlpha(0.4);
    }

    let handled = false;

    // Handle Active Click (LMB)
    if (pointer.isDown && inReach) {
      const blockId = this.worldManager.getBlock(tileX, tileY);
      const selectedItem = this.player.getSelectedItem();

      if (blockId !== BlockId.AIR && blockId !== BlockId.BEDROCK) {
        // Mining Mode
        this.handleMining(time, tileX, tileY, blockId, selectedItem);
        handled = true;
      } else if (blockId === BlockId.AIR && selectedItem && selectedItem.isPlaceable && selectedItem.placeBlockId) {
        // Building Mode
        this.handlePlacement(time, tileX, tileY, selectedItem);
        handled = true;
      }
    } else {
      // Released or out of reach
      if (this.currentMiningTile) {
        this.worldManager.clearDamage(this.currentMiningTile.x, this.currentMiningTile.y);
        this.currentMiningTile = null;
      }
    }

    return handled;
  }

  private handleMining(
    time: number,
    tileX: number,
    tileY: number,
    blockId: number,
    selectedItem: any
  ): void {
    const MINE_INTERVAL = 140; // ms per strike
    if (time - this.lastMineTime < MINE_INTERVAL) return;
    this.lastMineTime = time;

    // If switched tile, clear damage on previous
    if (this.currentMiningTile && (this.currentMiningTile.x !== tileX || this.currentMiningTile.y !== tileY)) {
      this.worldManager.clearDamage(this.currentMiningTile.x, this.currentMiningTile.y);
    }
    this.currentMiningTile = { x: tileX, y: tileY };

    // Trigger tool swing
    const T = GAME_CONSTANTS.TILE_SIZE;
    this.player.triggerToolSwing(tileX * T + T / 2, tileY * T + T / 2);

    // Calculate mining damage
    let power = 8; // Bare hands base power
    if (selectedItem && selectedItem.toolPower) {
      power = selectedItem.toolPower;
    }

    const def = BLOCK_DEFINITIONS[blockId];
    if (def) {
      // Emit particle chips
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

  private handlePlacement(time: number, tileX: number, tileY: number, selectedItem: any): void {
    const PLACE_INTERVAL = 180; // ms
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

  public destroy(): void {
    if (this.reticle) this.reticle.destroy();
    if (this.chipEmitter) this.chipEmitter.destroy();
  }
}
