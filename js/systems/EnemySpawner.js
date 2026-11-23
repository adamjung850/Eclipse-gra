import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { Enemy, ENEMY_TYPES } from '../entities/Enemy.js';
export class EnemySpawner {
    scene;
    player;
    enemies;
    worldManager;
    dayNightSystem;
    spawnCooldownTimer = 1000;
    constructor(scene, player, enemies, worldManager, dayNightSystem) {
        this.scene = scene;
        this.player = player;
        this.enemies = enemies;
        this.worldManager = worldManager;
        this.dayNightSystem = dayNightSystem;
        // Populate the world with initial enemies off-screen
        this.initialWorldSpawn();
    }
    setDayNightSystem(dayNightSystem) {
        this.dayNightSystem = dayNightSystem;
    }
    getMaxAliveEnemies() {
        const isNight = this.dayNightSystem?.isNight() ?? false;
        return isNight ? 20 : 14;
    }
    initialWorldSpawn() {
        const playerTile = this.worldManager.worldToTile(this.player.x, this.player.y);
        // Spawn 8 initial enemies distributed in safe off-screen distances (18 to 40 tiles away)
        const offsets = [-36, -28, -22, -18, 18, 22, 28, 36];
        for (const offset of offsets) {
            const targetX = Math.max(6, Math.min(this.worldManager.width - 7, playerTile.x + offset));
            this.spawnGroundEnemyNear(targetX, playerTile.y, 'slime');
        }
    }
    update(delta) {
        // 1. Despawn distant enemies (> 1300px away from player)
        const enemyList = this.enemies.getChildren();
        for (let i = enemyList.length - 1; i >= 0; i--) {
            const e = enemyList[i];
            if (e && e.active) {
                const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
                if (dist > 1300) {
                    e.die();
                }
            }
        }
        // 2. Periodic Spawn Check
        this.spawnCooldownTimer -= delta;
        if (this.spawnCooldownTimer <= 0) {
            const isNight = this.dayNightSystem?.isNight() ?? false;
            const maxEnemies = this.getMaxAliveEnemies();
            const activeCount = this.enemies.countActive(true);
            // Fast, dynamic spawn intervals:
            // Day: 1.5s - 2.5s
            // Night: 0.9s - 1.8s (higher danger at night)
            const baseCooldown = isNight ? 1000 : 1600;
            const varCooldown = isNight ? 800 : 900;
            this.spawnCooldownTimer = baseCooldown + Math.random() * varCooldown;
            if (activeCount < maxEnemies) {
                // If density is low, spawn 1 or 2 mobs
                const countToSpawn = (maxEnemies - activeCount > 6) ? 2 : 1;
                for (let i = 0; i < countToSpawn; i++) {
                    this.attemptProceduralSpawn();
                }
            }
        }
    }
    isTileVisibleOnScreen(tileX, tileY, paddingPx = 70) {
        const camera = this.scene.cameras.main;
        const T = GAME_CONSTANTS.TILE_SIZE;
        const wx = tileX * T + T / 2;
        const wy = tileY * T + T / 2;
        const view = camera.worldView;
        return (wx >= view.left - paddingPx &&
            wx <= view.right + paddingPx &&
            wy >= view.top - paddingPx &&
            wy <= view.bottom + paddingPx);
    }
    attemptProceduralSpawn() {
        const camera = this.scene.cameras.main;
        const view = camera.worldView;
        const T = GAME_CONSTANTS.TILE_SIZE;
        const playerTile = this.worldManager.worldToTile(this.player.x, this.player.y);
        // Choose spawn side: left or right outside the current camera view
        const side = Math.random() > 0.5 ? 1 : -1;
        // Spawns 80px to 220px past the camera viewport boundary
        const extraMarginPx = 80 + Math.random() * 140;
        const targetWorldX = side > 0 ? (view.right + extraMarginPx) : (view.left - extraMarginPx);
        const targetTileX = Math.max(6, Math.min(this.worldManager.width - 7, Math.floor(targetWorldX / T)));
        const depth = playerTile.y;
        const isNight = this.dayNightSystem?.isNight() ?? false;
        let typeKey = 'slime';
        if (depth < GAME_CONSTANTS.SURFACE_HEIGHT + 4) {
            // -----------------------------------------------------------------
            // Surface Level
            // -----------------------------------------------------------------
            if (isNight) {
                // Night: Skeletons (45%), Slimes (35%), Bats (20%)
                const roll = Math.random();
                if (roll < 0.45)
                    typeKey = 'skeleton';
                else if (roll < 0.80)
                    typeKey = 'slime';
                else
                    typeKey = 'bat';
            }
            else {
                // Day: Slimes (Green, Blue, occasionally Red)
                typeKey = 'slime';
            }
        }
        else if (depth < GAME_CONSTANTS.CAVERN_DEPTH) {
            // -----------------------------------------------------------------
            // Shallow Caverns: Crawlers (45%), Slimes (30%), Bats (25%)
            // -----------------------------------------------------------------
            const roll = Math.random();
            if (roll < 0.45)
                typeKey = 'crawler';
            else if (roll < 0.75)
                typeKey = 'slime';
            else
                typeKey = 'bat';
        }
        else {
            // -----------------------------------------------------------------
            // Deep Caverns: Skeletons (50%), Crawlers (30%), Bats (20%)
            // -----------------------------------------------------------------
            const roll = Math.random();
            if (roll < 0.50)
                typeKey = 'skeleton';
            else if (roll < 0.80)
                typeKey = 'crawler';
            else
                typeKey = 'bat';
        }
        if (typeKey === 'bat') {
            this.spawnAirEnemyNear(targetTileX, playerTile.y);
        }
        else {
            this.spawnGroundEnemyNear(targetTileX, playerTile.y, typeKey);
        }
    }
    spawnGroundEnemyNear(targetX, refY, typeKey) {
        // Robust Multi-column Search: check target column and +/- 1-2 adjacent columns
        // to ensure spawns never fail when landing on a small obstruction or tree leaf
        const columnOffsets = [0, 1, -1, 2, -2];
        for (const xOff of columnOffsets) {
            const colX = Math.max(5, Math.min(this.worldManager.width - 6, targetX + xOff));
            const minY = Math.max(3, refY - 14);
            const maxY = Math.min(this.worldManager.height - 4, refY + 16);
            for (let ty = minY; ty <= maxY; ty++) {
                const floorBlock = this.worldManager.getBlock(colX, ty + 1);
                const isFloorSolid = floorBlock === BlockId.GRASS ||
                    floorBlock === BlockId.DIRT ||
                    floorBlock === BlockId.STONE ||
                    floorBlock === BlockId.BRICK ||
                    floorBlock === BlockId.PLANK;
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
    spawnAirEnemyNear(targetX, refY) {
        const columnOffsets = [0, 1, -1];
        for (const xOff of columnOffsets) {
            const colX = Math.max(5, Math.min(this.worldManager.width - 6, targetX + xOff));
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
    instantiateEnemy(tileX, tileY, typeKey) {
        const T = GAME_CONSTANTS.TILE_SIZE;
        const config = ENEMY_TYPES[typeKey] || ENEMY_TYPES.slime;
        let variant = undefined;
        if (typeKey === 'slime') {
            const isDeep = tileY > GAME_CONSTANTS.CAVERN_DEPTH;
            const isShallowCavern = tileY > GAME_CONSTANTS.SURFACE_HEIGHT;
            const isNight = this.dayNightSystem?.isNight() ?? false;
            let color = 'green';
            const cRoll = Math.random();
            if (isDeep) {
                if (cRoll < 0.45)
                    color = 'red';
                else if (cRoll < 0.8)
                    color = 'blue';
                else
                    color = 'green';
            }
            else if (isShallowCavern || isNight) {
                if (cRoll < 0.45)
                    color = 'blue';
                else if (cRoll < 0.75)
                    color = 'red';
                else
                    color = 'green';
            }
            else {
                if (cRoll < 0.70)
                    color = 'green';
                else if (cRoll < 0.90)
                    color = 'blue';
                else
                    color = 'red';
            }
            const sRoll = Math.random();
            let size = 'medium';
            if (sRoll < 0.35)
                size = 'small';
            else if (sRoll < 0.75)
                size = 'medium';
            else
                size = 'large';
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
            enemy.body.setVelocity(0, 0);
        }
    }
}
