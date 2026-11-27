import { BiomeId, BlockId, GAME_CONSTANTS } from '../types/index.js';
import { Player } from '../entities/Player.js';
import { Enemy, ENEMY_TYPES, SlimeColor, SlimeSize, SlimeVariant } from '../entities/Enemy.js';
import { WorldManager } from '../world/WorldManager.js';
import { DayNightSystem } from './DayNightSystem.js';
import { BiomeSystem } from '../world/BiomeSystem.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';

export class EnemySpawner {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Phaser.Physics.Arcade.Group;
  private worldManager: WorldManager;
  private dayNightSystem?: DayNightSystem;

  private spawnCooldownTimer: number = 1000;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    worldManager: WorldManager,
    dayNightSystem?: DayNightSystem
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.worldManager = worldManager;
    this.dayNightSystem = dayNightSystem;

    // Populate the world with initial enemies off-screen
    this.initialWorldSpawn();
  }

  public setDayNightSystem(dayNightSystem: DayNightSystem): void {
    this.dayNightSystem = dayNightSystem;
  }

  private getMaxAliveEnemies(): number {
    const isNight = this.dayNightSystem?.isNight() ?? false;
    return isNight ? 9 : 5;
  }

  private initialWorldSpawn(): void {
    const playerTile = this.worldManager.worldToTile(this.player.x, this.player.y);

    // Spawn only 2 initial enemies safely distributed far off-screen (36 tiles away)
    const offsets = [-36, 36];
    for (const offset of offsets) {
      const targetX = playerTile.x + offset;
      this.spawnGroundEnemyNear(targetX, playerTile.y, 'slime');
    }
  }

  public update(delta: number): void {
    // 1. Despawn distant regular enemies (> 1050px away from player) - NEVER despawn boss segments!
    const enemyList = this.enemies.getChildren() as Enemy[];
    let activeRegularCount = 0;
    for (let i = enemyList.length - 1; i >= 0; i--) {
      const e = enemyList[i];
      if (!e || !e.active) continue;
      if ((e as any).boss) continue;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (dist > 1050) {
        e.die();
      } else {
        activeRegularCount++;
      }
    }

    // 2. Periodic Spawn Check
    this.spawnCooldownTimer -= delta;
    if (this.spawnCooldownTimer <= 0) {
      const isNight = this.dayNightSystem?.isNight() ?? false;
      const maxEnemies = this.getMaxAliveEnemies();

      // Balanced spawn intervals so the player is never swarmed:
      // Day: 4.5s - 7.0s
      // Night: 2.8s - 4.5s
      const baseCooldown = isNight ? 2800 : 4500;
      const varCooldown = isNight ? 1700 : 2500;
      this.spawnCooldownTimer = baseCooldown + Math.random() * varCooldown;

      if (activeRegularCount < maxEnemies) {
        this.attemptProceduralSpawn();
      }
    }
  }

  private isTileVisibleOnScreen(tileX: number, tileY: number, paddingPx: number = 70): boolean {
    const camera = this.scene.cameras.main;
    const T = GAME_CONSTANTS.TILE_SIZE;
    const wx = tileX * T + T / 2;
    const wy = tileY * T + T / 2;
    const view = camera.worldView;

    return (
      wx >= view.left - paddingPx &&
      wx <= view.right + paddingPx &&
      wy >= view.top - paddingPx &&
      wy <= view.bottom + paddingPx
    );
  }

  private attemptProceduralSpawn(): void {
    const camera = this.scene.cameras.main;
    const view = camera.worldView;
    const T = GAME_CONSTANTS.TILE_SIZE;
    const playerTile = this.worldManager.worldToTile(this.player.x, this.player.y);

    // Choose spawn side: left or right outside the current camera view
    const side = Math.random() > 0.5 ? 1 : -1;
    // Spawns comfortably off-screen (160px to 320px past the camera viewport boundary)
    const extraMarginPx = 160 + Math.random() * 160;
    const targetWorldX = side > 0 ? (view.right + extraMarginPx) : (view.left - extraMarginPx);
    const targetTileX = Math.floor(targetWorldX / T);

    const depth = playerTile.y;
    const isNight = this.dayNightSystem?.isNight() ?? false;
    let typeKey = 'slime';

    if (depth < GAME_CONSTANTS.SURFACE_HEIGHT + 4) {
      // -----------------------------------------------------------------
      // Surface Level
      // -----------------------------------------------------------------
      if (isNight) {
        // Night: Skeletons (35%), Spiders (25%), Slimes (25%), Bats (15%)
        const roll = Math.random();
        if (roll < 0.35) typeKey = 'skeleton';
        else if (roll < 0.60) typeKey = 'spider';
        else if (roll < 0.85) typeKey = 'slime';
        else typeKey = 'bat';
      } else {
        // Day: Slimes (Green, Blue, occasionally Red)
        typeKey = 'slime';
      }
    } else if (depth < GAME_CONSTANTS.CAVERN_DEPTH) {
      // -----------------------------------------------------------------
      // Shallow Caverns: Spiders (30%), Crawlers (30%), Slimes (20%), Bats (20%)
      // -----------------------------------------------------------------
      const roll = Math.random();
      if (roll < 0.30) typeKey = 'spider';
      else if (roll < 0.60) typeKey = 'crawler';
      else if (roll < 0.80) typeKey = 'slime';
      else typeKey = 'bat';
    } else {
      // -----------------------------------------------------------------
      // Deep Caverns: Skeletons (40%), Spiders (25%), Crawlers (20%), Bats (15%)
      // -----------------------------------------------------------------
      const roll = Math.random();
      if (roll < 0.40) typeKey = 'skeleton';
      else if (roll < 0.65) typeKey = 'spider';
      else if (roll < 0.85) typeKey = 'crawler';
      else typeKey = 'bat';
    }

    if (typeKey === 'bat') {
      this.spawnAirEnemyNear(targetTileX, playerTile.y);
    } else {
      this.spawnGroundEnemyNear(targetTileX, playerTile.y, typeKey);
    }
  }

  private spawnGroundEnemyNear(targetX: number, refY: number, typeKey: string): void {
    // Robust Multi-column Search: check target column and +/- 1-2 adjacent columns
    // to ensure spawns never fail when landing on a small obstruction or tree leaf
    const columnOffsets = [0, 1, -1, 2, -2];

    for (const xOff of columnOffsets) {
      const colX = targetX + xOff;
      const minY = Math.max(3, refY - 14);
      const maxY = Math.min(this.worldManager.height - 4, refY + 16);

      for (let ty = minY; ty <= maxY; ty++) {
        const floorBlock = this.worldManager.getBlock(colX, ty + 1);
        const isFloorSolid = BLOCK_DEFINITIONS[floorBlock]?.isSolid ?? false;

        const isAir1 = this.worldManager.getBlock(colX, ty) === BlockId.AIR;
        const isAir2 = this.worldManager.getBlock(colX, ty - 1) === BlockId.AIR;

        if (isFloorSolid && isAir1 && isAir2) {
          // Double check candidate is completely off camera viewport
          if (!this.isTileVisibleOnScreen(colX, ty, 45)) {
            this.instantiateEnemy(colX, ty, typeKey);
            return;
          }
        }
      }
    }
  }

  private spawnAirEnemyNear(targetX: number, refY: number): void {
    const columnOffsets = [0, 1, -1];
    for (const xOff of columnOffsets) {
      const colX = targetX + xOff;
      const minY = Math.max(4, refY - 8);
      const maxY = Math.min(this.worldManager.height - 5, refY + 8);

      for (let ty = minY; ty <= maxY; ty++) {
        if (this.worldManager.getBlock(colX, ty) === BlockId.AIR) {
          if (!this.isTileVisibleOnScreen(colX, ty, 45)) {
            this.instantiateEnemy(colX, ty, 'bat');
            return;
          }
        }
      }
    }
  }

  private instantiateEnemy(tileX: number, tileY: number, typeKey: string): void {
    const T = GAME_CONSTANTS.TILE_SIZE;
    const config = ENEMY_TYPES[typeKey] || ENEMY_TYPES.slime;

    let variant: SlimeVariant | undefined = undefined;
    if (typeKey === 'slime') {
      const biome = BiomeSystem.getBiomeAt(tileX, tileY);
      const isNight = this.dayNightSystem?.isNight() ?? false;

      let color: SlimeColor = 'green';
      switch (biome.id) {
        case BiomeId.DESERT:
          color = 'sand';
          break;
        case BiomeId.FROZEN_PEAKS:
          color = 'ice';
          break;
        case BiomeId.DARK_FOREST:
          color = 'dark';
          break;
        case BiomeId.NETHER:
          color = 'magma';
          break;
        case BiomeId.CRYSTAL_CAVES:
          color = Math.random() < 0.6 ? 'blue' : 'dark';
          break;
        case BiomeId.THE_VOID:
          color = 'dark';
          break;
        case BiomeId.UNDERGROUND:
          color = Math.random() < 0.5 ? 'blue' : 'red';
          break;
        case BiomeId.GREENLANDS:
        default:
          if (isNight) {
            color = Math.random() < 0.6 ? 'blue' : 'green';
          } else {
            color = Math.random() < 0.8 ? 'green' : 'blue';
          }
          break;
      }

      const sRoll = Math.random();
      let size: SlimeSize = 'medium';
      if (sRoll < 0.35) size = 'small';
      else if (sRoll < 0.75) size = 'medium';
      else size = 'large';

      variant = { color, size };
    }

    const worldX = tileX * T + T / 2;
    const floorY = (tileY + 1) * T;
    const scale = variant ? (variant.size === 'small' ? 0.72 : variant.size === 'large' ? 1.45 : 1.0) : 1.0;
    const worldY = floorY - Math.floor((config.height * scale) / 2) - 1;

    const enemy = new Enemy(this.scene, worldX, worldY, typeKey, variant);
    this.enemies.add(enemy);
    enemy.initPhysics();
    if (enemy.body) {
      (enemy.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    }
  }
}
