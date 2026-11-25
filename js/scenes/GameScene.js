import { BlockId, GAME_CONSTANTS, ItemCategory } from '../types/index.js';
import { WorldGenerator } from '../world/WorldGenerator.js';
import { WorldManager } from '../world/WorldManager.js';
import { Player } from '../entities/Player.js';
import { DroppedItem } from '../entities/DroppedItem.js';
import { MiningSystem } from '../systems/MiningSystem.js';
import { InputManager } from '../systems/InputManager.js';
import { SoundSynthesizer } from '../systems/SoundSynthesizer.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { EnemySpawner } from '../systems/EnemySpawner.js';
import { CursorManager } from '../systems/CursorManager.js';
import { DayNightSystem } from '../systems/DayNightSystem.js';
import { DarknessSystem } from '../systems/DarknessSystem.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';
import { ITEM_REGISTRY } from '../world/ItemTypes.js';
import { VormakBoss } from '../entities/VormakBoss.js';
export class GameScene extends Phaser.Scene {
    worldManager;
    player;
    droppedItems;
    enemies;
    projectiles;
    vormakBoss;
    bossSlowMoFactor = 1.0;
    isSummoningBoss = false;
    miningSystem;
    combatSystem;
    enemySpawner;
    inputManager;
    sounds;
    cursorManager;
    dayNightSystem;
    darknessSystem;
    constructor() {
        super('GameScene');
    }
    create() {
        const T = GAME_CONSTANTS.TILE_SIZE;
        const worldWidthPx = GAME_CONSTANTS.WORLD_WIDTH * T;
        const worldHeightPx = GAME_CONSTANTS.WORLD_HEIGHT * T;
        // 1. Setup World Physics Bounds
        this.physics.world.setBounds(0, 0, worldWidthPx, worldHeightPx);
        // 2. Audio Synthesizer
        this.sounds = new SoundSynthesizer();
        // 3. Sky, Atmosphere & Celestial System (Sun, Moon, Stars, Day/Night)
        this.dayNightSystem = new DayNightSystem(this);
        // 4. Generate Procedural World
        const worldData = WorldGenerator.generate();
        this.worldManager = new WorldManager(this, worldData);
        // 5. Spawn Player & Check URL Teleport overrides (?tp=desert, ?tp=ice, ?tp=dark, ?tp=crystal, ?tp=nether, ?tp=void)
        let pSpawnX = worldData.spawnX;
        let pSpawnY = worldData.spawnY;
        if (typeof window !== 'undefined') {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const tp = urlParams.get('tp');
                if (tp) {
                    const T = GAME_CONSTANTS.TILE_SIZE;
                    if (tp === 'desert') {
                        const tx = 430;
                        let sy = 50;
                        for (let y = 30; y < 80; y++) {
                            if (this.worldManager.getBlock(tx, y) !== BlockId.AIR) {
                                sy = y - 2;
                                break;
                            }
                        }
                        pSpawnX = tx * T + T / 2;
                        pSpawnY = sy * T;
                    }
                    else if (tp === 'ice') {
                        const tx = 50;
                        let sy = 40;
                        for (let y = 25; y < 70; y++) {
                            if (this.worldManager.getBlock(tx, y) !== BlockId.AIR) {
                                sy = y - 2;
                                break;
                            }
                        }
                        pSpawnX = tx * T + T / 2;
                        pSpawnY = sy * T;
                    }
                    else if (tp === 'dark') {
                        const tx = 310;
                        let sy = 50;
                        for (let y = 30; y < 80; y++) {
                            if (this.worldManager.getBlock(tx, y) !== BlockId.AIR) {
                                sy = y - 2;
                                break;
                            }
                        }
                        pSpawnX = tx * T + T / 2;
                        pSpawnY = sy * T;
                    }
                    else if (tp === 'crystal') {
                        pSpawnX = 200 * T;
                        pSpawnY = 135 * T;
                    }
                    else if (tp === 'nether') {
                        pSpawnX = 200 * T;
                        pSpawnY = 200 * T;
                    }
                    else if (tp === 'void') {
                        pSpawnX = 200 * T;
                        pSpawnY = 226 * T;
                    }
                }
            }
            catch (e) {
                // Ignore URL parsing errors
            }
        }
        this.player = new Player(this, pSpawnX, pSpawnY);
        window.__gameScene = this;
        // Tymczasowe przedmioty deweloperskie do przetestowania Totemu Vormaka
        this.player.addItem('slime_gel', 50);
        this.player.addItem('bone', 20);
        this.player.addItem('spider_eye', 5);
        this.player.addItem('stone', 100);
        this.player.addItem('diamond', 5);
        this.player.addItem('workbench_item', 1);
        // 6. Dropped Items, Enemies & Projectiles Physics Groups
        this.droppedItems = this.physics.add.group();
        this.enemies = this.physics.add.group();
        this.projectiles = this.physics.add.group();
        // Prevent Phaser PhysicsGroup defaults from wiping custom gravity, drag, and bounds on children
        this.droppedItems.defaults = {};
        this.enemies.defaults = {};
        this.projectiles.defaults = {};
        // 7. Setup Physics Collisions
        this.physics.add.collider(this.player, this.worldManager.foregroundLayer);
        this.physics.add.collider(this.droppedItems, this.worldManager.foregroundLayer);
        this.physics.add.collider(this.enemies, this.worldManager.foregroundLayer, undefined, (enemyObj) => !enemyObj.isBurrowing);
        // 8. Block Broken Hook & Item Drops
        this.worldManager.onBlockBroken = (tileX, tileY, blockId) => {
            this.handleBlockDrop(tileX, tileY, blockId);
        };
        this.worldManager.onItemDrop = (tileX, tileY, itemId, count) => {
            const T = GAME_CONSTANTS.TILE_SIZE;
            const dropX = tileX * T + T / 2 + (Math.random() - 0.5) * 14;
            const dropY = tileY * T + T / 2 + (Math.random() - 0.5) * 10;
            const dropped = new DroppedItem(this, dropX, dropY, itemId, count);
            this.droppedItems.add(dropped);
        };
        this.worldManager.onChestClosed = (tileX, tileY) => {
            const uiScene = this.scene.get('UIScene');
            if (uiScene && uiScene.isChestOpen && uiScene.activeChestPos?.x === tileX && uiScene.activeChestPos?.y === tileY) {
                uiScene.closeChestModal();
            }
        };
        // 9. Systems (Mining, Combat, Spawning & Input)
        this.miningSystem = new MiningSystem(this, this.player, this.worldManager);
        this.miningSystem.onPlaySound = (type) => {
            this.sounds.play(type);
        };
        this.combatSystem = new CombatSystem(this, this.player, this.enemies, this.projectiles, this.droppedItems, this.worldManager, this.sounds);
        this.enemySpawner = new EnemySpawner(this, this.player, this.enemies, this.worldManager, this.dayNightSystem);
        // 10. Subterranean Fog-of-War & Darkness Lighting System
        this.darknessSystem = new DarknessSystem(this, this.worldManager, this.player);
        this.inputManager = new InputManager(this, this.player);
        this.inputManager.onDropItem = () => {
            this.handlePlayerDropItem();
        };
        this.inputManager.onToggleMusic = () => {
            const isPlaying = this.sounds.toggleMusic();
            this.showWorldFloatingText(this.player.x, this.player.y - 25, isPlaying ? '🎵 Muzyka: WŁĄCZONA' : '🔇 Muzyka: WYŁĄCZONA', isPlaying ? '#38bdf8' : '#94a3b8');
        };
        // Auto-start music on first player interaction
        this.input.once('pointerdown', () => {
            this.sounds.startMusic();
        });
        this.inputManager.onToggleInventory = () => {
            const uiScene = this.scene.get('UIScene');
            if (!uiScene)
                return;
            if (uiScene.isChestOpen) {
                uiScene.closeChestModal();
                return;
            }
            uiScene.toggleInventory();
        };
        this.inputManager.onToggleMenu = () => {
            const uiScene = this.scene.get('UIScene');
            if (!uiScene)
                return;
            if (uiScene.isChestOpen) {
                uiScene.closeChestModal();
            }
            else if (uiScene.isInventoryOpen) {
                uiScene.toggleInventory(false);
            }
        };
        // Right-Click to open Chest within reach
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                const camera = this.cameras.main;
                const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
                const tilePos = this.worldManager.worldToTile(worldPoint.x, worldPoint.y);
                const playerCenter = this.player.getCenter();
                const dist = Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, worldPoint.x, worldPoint.y);
                const maxReach = (GAME_CONSTANTS.PLAYER_REACH_TILES + 1) * GAME_CONSTANTS.TILE_SIZE;
                if (dist <= maxReach) {
                    const blockId = this.worldManager.getBlock(tilePos.x, tilePos.y);
                    if (blockId === BlockId.CHEST) {
                        const chestSlots = this.worldManager.getChestAt(tilePos.x, tilePos.y);
                        if (chestSlots) {
                            const uiScene = this.scene.get('UIScene');
                            if (uiScene) {
                                uiScene.openChestModal(tilePos.x, tilePos.y, chestSlots);
                                this.sounds.play('pickup');
                            }
                        }
                    }
                }
            }
        });
        // 10. Centralized Custom Cursor Manager
        this.cursorManager = CursorManager.getInstance(this.game);
        // 11. Launch Parallel UI Scene (Independent of camera zoom!)
        this.scene.launch('UIScene', { player: this.player });
        // 11. Camera Setup
        const camera = this.cameras.main;
        camera.setBounds(0, 0, worldWidthPx, worldHeightPx);
        camera.startFollow(this.player, true, 0.08, 0.08);
        camera.setZoom(1.55);
        // Initial greeting floating text
        this.time.delayedCall(400, () => {
            this.showWorldFloatingText(this.player.x, this.player.y - 30, 'Witaj w ECLIPSE: THE LOST WORLD', '#6ee7b7');
        });
    }
    handleBlockDrop(tileX, tileY, blockId) {
        const T = GAME_CONSTANTS.TILE_SIZE;
        const dropX = tileX * T + T / 2;
        const dropY = tileY * T + T / 2;
        // Chest block destruction drops the chest item itself (contents were dropped via onItemDrop)
        if (blockId === BlockId.CHEST) {
            const chestDrop = new DroppedItem(this, dropX, dropY, 'ancient_chest', 1);
            this.droppedItems.add(chestDrop);
            this.sounds.play('break');
            return;
        }
        const def = BLOCK_DEFINITIONS[blockId];
        if (!def || !def.dropItemId)
            return;
        const count = Phaser.Math.Between(def.dropMin, def.dropMax);
        if (count <= 0)
            return;
        const dropped = new DroppedItem(this, dropX, dropY, def.dropItemId, count);
        this.droppedItems.add(dropped);
    }
    handlePlayerDropItem() {
        const item = this.player.getSelectedItem();
        if (!item)
            return;
        const success = this.player.consumeSelectedItem(1);
        if (success) {
            const dropOffset = this.player.isFacingLeft ? -20 : 20;
            const dropped = new DroppedItem(this, this.player.x + dropOffset, this.player.y, item.id, 1);
            this.droppedItems.add(dropped);
            this.sounds.play('place');
        }
    }
    update(time, delta) {
        // 1. Update Continuous Day/Night, Celestial Bodies (Sun, Moon, Stars) & Sky
        this.dayNightSystem.update(delta);
        // 1.1 Update World (Sapling growth, falling trees)
        this.worldManager.update(delta);
        // 1.2 Subterranean Darkness & Fog-of-War Lighting
        this.darknessSystem.update();
        // 2. Input & Player update
        this.inputManager.update(delta);
        // Auto-close chest modal if player walks out of reach
        const uiScene = this.scene.get('UIScene');
        if (uiScene && uiScene.isChestOpen && uiScene.activeChestPos) {
            const T = GAME_CONSTANTS.TILE_SIZE;
            const chestX = uiScene.activeChestPos.x * T + T / 2;
            const chestY = uiScene.activeChestPos.y * T + T / 2;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chestX, chestY);
            if (dist > (GAME_CONSTANTS.PLAYER_REACH_TILES + 2) * T) {
                uiScene.closeChestModal();
            }
        }
        // 3. Spawner & Combat updates
        this.enemySpawner.update(delta);
        this.combatSystem.update(time, delta, this.input.activePointer);
        // 3.1 Vormak Boss Update (respects cinematic slow-motion factor during summon)
        if (this.vormakBoss && !this.vormakBoss.isDead) {
            this.vormakBoss.update(time, delta * this.bossSlowMoFactor);
        }
        // 4. Mining, Building, Summoning & Attack handling
        if (this.input.activePointer.isDown) {
            const selectedItem = this.player.getSelectedItem();
            if (selectedItem?.id === 'vormak_totem') {
                this.useVormakTotem();
            }
            else {
                const isWeapon = selectedItem?.category === ItemCategory.WEAPON;
                const aimingAtEnemy = this.combatSystem.isPointerOverEnemy(this.input.activePointer);
                if (isWeapon || aimingAtEnemy) {
                    // Weapon attack or clicking directly on an enemy (including bare fist!) takes priority
                    this.combatSystem.handlePlayerAttack(time, this.input.activePointer);
                }
                else {
                    // Otherwise attempt mining/placement
                    const didMine = this.miningSystem.update(time, delta, this.input.activePointer);
                    // If not targeting a mineable/placeable tile, allow swinging tool or punching with bare hand!
                    if (!didMine) {
                        this.combatSystem.handlePlayerAttack(time, this.input.activePointer);
                    }
                }
            }
        }
        else {
            this.miningSystem.update(time, delta, this.input.activePointer);
        }
        // 5. Update Dropped Items (magnetic pull & collection)
        const items = this.droppedItems.getChildren();
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item && item.active) {
                item.updateItem(delta, this.player.x, this.player.y, (collected) => {
                    this.handleItemPickup(collected);
                });
            }
        }
        // 6. Update Pixel Art Cursor State (Combat, Reach, Dropped Items, Default)
        this.updateCursorState();
    }
    updateCursorState() {
        if (!this.cursorManager)
            return;
        // If UI is being hovered or holding an item, UIScene handles the cursor state
        if (this.cursorManager.isUIHovered() || this.cursorManager.isItemHeld()) {
            return;
        }
        const pointer = this.input.activePointer;
        const camera = this.cameras.main;
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        // 1. Check Enemy Hover -> Red Combat Target Crosshair
        let enemyTargeted = false;
        const enemyList = this.enemies.getChildren();
        for (let i = 0; i < enemyList.length; i++) {
            const e = enemyList[i];
            if (e && e.active && e.visible) {
                const bounds = e.getBounds();
                if (worldPoint.x >= bounds.x - 6 &&
                    worldPoint.x <= bounds.right + 6 &&
                    worldPoint.y >= bounds.y - 6 &&
                    worldPoint.y <= bounds.bottom + 6) {
                    enemyTargeted = true;
                    break;
                }
            }
        }
        this.cursorManager.setEnemyTarget(enemyTargeted);
        if (enemyTargeted)
            return;
        // 2. Check Dropped Item Hover -> Red Interact Pointer
        let itemHovered = false;
        const dropList = this.droppedItems.getChildren();
        for (let i = 0; i < dropList.length; i++) {
            const drop = dropList[i];
            if (drop && drop.active && drop.visible) {
                const dist = Phaser.Math.Distance.Between(worldPoint.x, worldPoint.y, drop.x, drop.y);
                if (dist <= 22) {
                    itemHovered = true;
                    break;
                }
            }
        }
        this.cursorManager.setDroppedItemHover(itemHovered);
        if (itemHovered)
            return;
        // 3. Check Mining/Placement Reach -> Red Interact Pointer
        const T = GAME_CONSTANTS.TILE_SIZE;
        const tilePos = this.worldManager.worldToTile(worldPoint.x, worldPoint.y);
        const tileX = tilePos.x;
        const tileY = tilePos.y;
        const playerCenter = this.player.getCenter();
        const targetCenter = new Phaser.Math.Vector2(tileX * T + T / 2, tileY * T + T / 2);
        const dist = Phaser.Math.Distance.Between(playerCenter.x, playerCenter.y, targetCenter.x, targetCenter.y);
        const inReach = dist <= GAME_CONSTANTS.PLAYER_REACH_TILES * T;
        let canInteract = false;
        if (inReach) {
            const blockId = this.worldManager.getBlock(tileX, tileY);
            const selectedItem = this.player.getSelectedItem();
            if (blockId !== BlockId.AIR && blockId !== BlockId.BEDROCK) {
                // Mineable block within reach
                canInteract = true;
            }
            else if (blockId === BlockId.AIR && selectedItem && selectedItem.isPlaceable && selectedItem.placeBlockId) {
                // Valid block placement position within reach
                canInteract = true;
            }
        }
        this.cursorManager.setTileInReach(canInteract);
    }
    handleItemPickup(item) {
        const success = this.player.addItem(item.itemId, item.amount);
        if (success) {
            this.sounds.play('pickup');
            const itemData = ITEM_REGISTRY[item.itemId];
            const name = itemData ? itemData.name : item.itemId;
            this.showWorldFloatingText(this.player.x, this.player.y - 20, `+${item.amount} ${name}`, '#fcd34d');
        }
    }
    /**
     * Uses "Totem Vormaka": Totem launches into the sky, slams into the ground,
     * creating a glowing blue fissure with screen-wide tremors before Vormak erupts in slow-motion!
     */
    useVormakTotem() {
        if (this.isSummoningBoss)
            return;
        if (this.vormakBoss && !this.vormakBoss.isDead) {
            this.showWorldFloatingText(this.player.x, this.player.y - 36, 'Vormak już jest przebudzony!', '#f97316');
            return;
        }
        const consumed = this.player.consumeSelectedItem(1);
        if (!consumed)
            return;
        this.isSummoningBoss = true;
        const uiScene = this.scene.get('UIScene');
        if (uiScene && uiScene.refreshInventoryUI) {
            uiScene.refreshInventoryUI();
        }
        const T = GAME_CONSTANTS.TILE_SIZE;
        const dir = this.player.isFacingLeft ? -1 : 1;
        const targetX = Phaser.Math.Clamp(this.player.x + dir * 100, 5 * T, (GAME_CONSTANTS.WORLD_WIDTH - 6) * T);
        const tileX = Math.floor(targetX / T);
        const surfaceTileY = this.worldManager.surfaceYCache?.[tileX] ?? Math.floor(this.player.y / T) + 1;
        const surfaceY = surfaceTileY * T;
        // 1. Spawn Pixelart Totem Sprite
        const totem = this.add.sprite(this.player.x, this.player.y - 14, 'vormak_totem_world');
        totem.setDepth(28);
        this.sounds.play('magic_cast');
        // Cyan particle trail emitter for the flying totem
        const trailEmitter = this.add.particles(0, 0, 'particle_chip', {
            lifespan: 450,
            speed: { min: 20, max: 90 },
            scale: { start: 1.5, end: 0 },
            tint: [0x06b6d4, 0x38bdf8, 0xa5f3fc],
            emitting: false
        });
        trailEmitter.setDepth(27);
        // Phase A: Totem flies high up into the air
        this.tweens.add({
            targets: totem,
            x: targetX,
            y: surfaceY - 130,
            angle: 360,
            scaleX: 1.35,
            scaleY: 1.35,
            duration: 550,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                if (Math.random() < 0.65) {
                    trailEmitter.explode(2, totem.x, totem.y);
                }
            },
            onComplete: () => {
                // Phase B: Totem slams straight down into the earth
                this.tweens.add({
                    targets: totem,
                    y: surfaceY - 8,
                    angle: 720,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 240,
                    ease: 'Quad.easeIn',
                    onUpdate: () => {
                        trailEmitter.explode(2, totem.x, totem.y);
                    },
                    onComplete: () => {
                        totem.destroy();
                        // Phase C: Ground impact -> Blue/Cyan Glow in Ground + Screen Shake + Additional Effects!
                        this.sounds.play('boss_emerge');
                        this.sounds.play('boss_warn');
                        this.cameras.main.shake(1050, 0.016);
                        this.cameras.main.flash(220, 34, 211, 238, false);
                        this.showWorldFloatingText(targetX, surfaceY - 45, '⚠️ Ziemia pęka... Nadchodzi Vormak!', '#38bdf8');
                        // Explosion of cyan energy + stone chips
                        trailEmitter.explode(32, targetX, surfaceY);
                        // Glowing blue fissure & energy pillar in the ground
                        const groundGlow = this.add.graphics();
                        groundGlow.setDepth(16);
                        let glowPulse = 0;
                        const glowTimer = this.time.addEvent({
                            delay: 30,
                            repeat: 30,
                            callback: () => {
                                glowPulse += 0.25;
                                groundGlow.clear();
                                const alpha = 0.55 + Math.sin(glowPulse) * 0.25;
                                // Outer deep blue aura in ground
                                groundGlow.fillStyle(0x0284c7, alpha * 0.45);
                                groundGlow.fillEllipse(targetX, surfaceY + 4, 120, 34);
                                // Inner bright cyan fissure
                                groundGlow.fillStyle(0x22d3ee, alpha * 0.85);
                                groundGlow.fillEllipse(targetX, surfaceY + 2, 68, 16);
                                // White-hot core crack
                                groundGlow.fillStyle(0xe0f2fe, alpha);
                                groundGlow.fillRect(targetX - 24, surfaceY - 2, 48, 5);
                                // Vertical blue light beam rising from the crack
                                groundGlow.fillStyle(0x38bdf8, alpha * 0.35);
                                groundGlow.fillRect(targetX - 18, surfaceY - 260, 36, 260);
                                groundGlow.fillStyle(0xa5f3fc, alpha * 0.55);
                                groundGlow.fillRect(targetX - 6, surfaceY - 260, 12, 260);
                                // Rising pixel sparks from ground fissure
                                trailEmitter.explode(3, targetX + Phaser.Math.Between(-30, 30), surfaceY);
                            }
                        });
                        // Phase D: After 950ms, Vormak erupts skyward in SLOW MOTION!
                        this.time.delayedCall(950, () => {
                            glowTimer.remove(false);
                            this.tweens.add({
                                targets: groundGlow,
                                alpha: 0,
                                duration: 450,
                                onComplete: () => {
                                    groundGlow.destroy();
                                    trailEmitter.destroy();
                                }
                            });
                            // Spawn Vormak directly from the glowing blue fissure
                            this.vormakBoss = new VormakBoss(this, this.worldManager, this.player, this.sounds, this.enemies, { x: targetX, y: surfaceY });
                            // Activate dramatic Slow Motion while Vormak rockets into the sky!
                            this.bossSlowMoFactor = 0.35;
                            this.physics.world.timeScale = 2.85; // Inverse in Arcade Physics
                            // After 1600ms real-time, smoothly return time to normal so Vormak crashes back to earth!
                            window.setTimeout(() => {
                                if (!this.scene || !this.scene.isActive())
                                    return;
                                this.bossSlowMoFactor = 1.0;
                                this.physics.world.timeScale = 1.0;
                                this.isSummoningBoss = false;
                            }, 1600);
                        });
                    }
                });
            }
        });
    }
    showWorldFloatingText(worldX, worldY, text, color = '#44ff88') {
        const floatText = this.add.text(worldX, worldY - 10, text, {
            fontFamily: 'monospace',
            fontSize: '12px',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        floatText.setOrigin(0.5, 0.5);
        floatText.setDepth(50);
        this.tweens.add({
            targets: floatText,
            y: worldY - 45,
            alpha: 0,
            duration: 1000,
            ease: 'Power1',
            onComplete: () => {
                floatText.destroy();
            }
        });
    }
}
