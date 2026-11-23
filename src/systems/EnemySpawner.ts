import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { Player } from '../entities/Player.js';
import { Enemy, ENEMY_TYPES, SlimeColor, SlimeSize, SlimeVariant } from '../entities/Enemy.js';
import { WorldManager } from '../world/WorldManager.js';

export class EnemySpawner {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Phaser.Physics.Arcade.Group;
  private worldManager: WorldManager;

  private spawnCooldownTimer: number = 2500;
  private maxAliveEnemies: number = 7; // Balanced, non-overwhelming density

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    worldManager: WorldManager
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;
    this.worldManager = worldManager;

    // Initial starter spawns far off-screen
    this.initialWorldSpawn();
  }

  private initialWorldSpawn(): void {
    const playerTile = this.worldManager.worldToTile(this.player.x, this.player.y);

    // Spawn 2 initial foes far away on both sides (34 tiles off-screen)
    const farOffsets = [-34, 34];
    for (const offset of farOffsets) {
      const targetX = Math.max(5, Math.min(this.worldManager.width - 6, playerTile.x + offset));
      this.spawnGroundEnemyNear(targetX, playerTile.y, 'slime');
    }
  }

  public update(delta: number): void {
    // 1. Despawn distant enemies (> 1100px away from player)
    const enemyList = this.enemies.getChildren() as Enemy[];
    for (let i = enemyList.length - 1; i >= 0; i--) {
      const e = enemyList[i];
      if (e && e.active) {
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
        if (dist > 1150) {
          e.die();
        }
      }
    }

    // 2. Periodic Spawn Check
    this.spawnCooldownTimer -= delta;
    if (this.spawnCooldownTimer <= 0) {
      this.spawnCooldownTimer = 4500 + Math.random() * 2500;

      if (this.enemies.countActive(true) < this.maxAliveEnemies) {
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
    // Spawns 90px to 220px past the camera viewport boundary
    const extraMarginPx = 90 + Math.random() * 130;
    const targetWorldX = side > 0 ? (view.right + extraMarginPx) : (view.left - extraMarginPx);
    const targetTileX = Math.max(5, Math.min(this.worldManager.width - 6, Math.floor(targetWorldX / T)));

    // Determine enemy type by player depth
    let typeKey = 'slime';
    const depth = playerTile.y;

    if (depth < GAME_CONSTANTS.SURFACE_HEIGHT + 4) {
      // Surface level: Emerald Slimes
      typeKey = 'slime';
    } else if (depth < GAME_CONSTANTS.CAVERN_DEPTH) {
      // Shallow Caverns: Slimes, Crawlers, Bats
      const roll = Math.random();
      if (roll < 0.45) typeKey = 'crawler';
      else if (roll < 0.75) typeKey = 'slime';
      else typeKey = 'bat';
    } else {
      // Deep Caverns: Skeletons, Crawlers, Bats
      const roll = Math.random();
      if (roll < 0.45) typeKey = 'skeleton';
      else if (roll < 0.75) typeKey = 'crawler';
      else typeKey = 'bat';
    }

    if (typeKey === 'bat') {
      this.spawnAirEnemyNear(targetTileX, playerTile.y);
    } else {
      this.spawnGroundEnemyNear(targetTileX, playerTile.y, typeKey);
    }
  }

  private spawnGroundEnemyNear(targetX: number, refY: number, typeKey: string): void {
    // Scan downwards for solid ground (GRASS, DIRT, STONE) with 2 blocks of air above
    const minY = Math.max(3, refY - 14);
    const maxY = Math.min(this.worldManager.height - 4, refY + 16);

    for (let ty = minY; ty <= maxY; ty++) {
      const floorBlock = this.worldManager.getBlock(targetX, ty + 1);
      const isFloorSolid =
        floorBlock === BlockId.GRASS ||
        floorBlock === BlockId.DIRT ||
        floorBlock === BlockId.STONE ||
        floorBlock === BlockId.BRICK ||
        floorBlock === BlockId.PLANK;

      const isAir1 = this.worldManager.getBlock(targetX, ty) === BlockId.AIR;
      const isAir2 = this.worldManager.getBlock(targetX, ty - 1) === BlockId.AIR;

      if (isFloorSolid && isAir1 && isAir2) {
        // Double check candidate is completely off camera viewport
        if (!this.isTileVisibleOnScreen(targetX, ty, 50)) {
          this.instantiateEnemy(targetX, ty, typeKey);
          return;
        }
      }
    }
  }

  private spawnAirEnemyNear(targetX: number, refY: number): void {
    const minY = Math.max(4, refY - 8);
    const maxY = Math.min(this.worldManager.height - 5, refY + 8);

    for (let ty = minY; ty <= maxY; ty++) {
      if (this.worldManager.getBlock(targetX, ty) === BlockId.AIR) {
        if (!this.isTileVisibleOnScreen(targetX, ty, 50)) {
          this.instantiateEnemy(targetX, ty, 'bat');
          return;
        }
      }
    }
  }

  private instantiateEnemy(tileX: number, tileY: number, typeKey: string): void {
    const T = GAME_CONSTANTS.TILE_SIZE;
    const config = ENEMY_TYPES[typeKey] || ENEMY_TYPES.slime;

    let variant: SlimeVariant | undefined = undefined;
    if (typeKey === 'slime') {
      const isDeep = tileY > GAME_CONSTANTS.CAVERN_DEPTH;
      const isShallowCavern = tileY > GAME_CONSTANTS.SURFACE_HEIGHT;

      let color: SlimeColor = 'green';
      const cRoll = Math.random();
      if (isDeep) {
        if (cRoll < 0.45) color = 'red';
        else if (cRoll < 0.8) color = 'blue';
        else color = 'green';
      } else if (isShallowCavern) {
        if (cRoll < 0.45) color = 'blue';
        else if (cRoll < 0.75) color = 'green';
        else color = 'red';
      } else {
        if (cRoll < 0.65) color = 'green';
        else if (cRoll < 0.85) color = 'blue';
        else color = 'red';
      }

      const sRoll = Math.random();
      let size: SlimeSize = 'medium';
      if (sRoll < 0.3) size = 'small';
      else if (sRoll < 0.75) size = 'medium';
      else size = 'large';

      variant = { color, size };
    }

    const worldX = tileX * T + T / 2;
    // Align enemy's feet exactly resting 1px above the solid floor
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
