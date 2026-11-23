import { BlockId, GAME_CONSTANTS, ItemCategory } from '../types/index.js';
import { WorldGenerator } from '../world/WorldGenerator.js';
import { WorldManager } from '../world/WorldManager.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { DroppedItem } from '../entities/DroppedItem.js';
import { MiningSystem } from '../systems/MiningSystem.js';
import { InputManager } from '../systems/InputManager.js';
import { SoundSynthesizer } from '../systems/SoundSynthesizer.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { EnemySpawner } from '../systems/EnemySpawner.js';
import { CursorManager } from '../systems/CursorManager.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';
import { ITEM_REGISTRY } from '../world/ItemTypes.js';

export class GameScene extends Phaser.Scene {
  public worldManager!: WorldManager;
  public player!: Player;
  public droppedItems!: Phaser.Physics.Arcade.Group;
  public enemies!: Phaser.Physics.Arcade.Group;
  public projectiles!: Phaser.Physics.Arcade.Group;

  public miningSystem!: MiningSystem;
  public combatSystem!: CombatSystem;
  public enemySpawner!: EnemySpawner;
  public inputManager!: InputManager;
  public sounds!: SoundSynthesizer;
  public cursorManager!: CursorManager;

  // Sky & Day-Night
  private skyGraphic!: Phaser.GameObjects.Graphics;
  private gameTime: number = 240; // Starts in midday (0 - 1440)

  constructor() {
    super('GameScene');
  }

  public create(): void {
    const T = GAME_CONSTANTS.TILE_SIZE;
    const worldWidthPx = GAME_CONSTANTS.WORLD_WIDTH * T;
    const worldHeightPx = GAME_CONSTANTS.WORLD_HEIGHT * T;

    // 1. Setup World Physics Bounds
    this.physics.world.setBounds(0, 0, worldWidthPx, worldHeightPx);

    // 2. Audio Synthesizer
    this.sounds = new SoundSynthesizer();

    // 3. Sky & Atmosphere Background
    this.skyGraphic = this.add.graphics();
    this.skyGraphic.setScrollFactor(0);
    this.skyGraphic.setDepth(-10);

    // 4. Generate Procedural World
    const worldData = WorldGenerator.generate();
    this.worldManager = new WorldManager(this, worldData);

    // 5. Spawn Player
    this.player = new Player(this, worldData.spawnX, worldData.spawnY);

    // 6. Dropped Items, Enemies & Projectiles Physics Groups
    this.droppedItems = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.projectiles = this.physics.add.group();

    // Prevent Phaser PhysicsGroup defaults from wiping custom gravity, drag, and bounds on children
    (this.droppedItems as any).defaults = {};
    (this.enemies as any).defaults = {};
    (this.projectiles as any).defaults = {};

    // 7. Setup Physics Collisions
    this.physics.add.collider(this.player, this.worldManager.foregroundLayer);
    this.physics.add.collider(this.droppedItems, this.worldManager.foregroundLayer);
    this.physics.add.collider(this.enemies, this.worldManager.foregroundLayer);

    // 8. Block Broken Hook -> Spawn Drops
    this.worldManager.onBlockBroken = (tileX: number, tileY: number, blockId: number) => {
      this.handleBlockDrop(tileX, tileY, blockId);
    };

    // 9. Systems (Mining, Combat, Spawning & Input)
    this.miningSystem = new MiningSystem(this, this.player, this.worldManager);
    this.miningSystem.onPlaySound = (type: string) => {
      this.sounds.play(type);
    };

    this.combatSystem = new CombatSystem(
      this,
      this.player,
      this.enemies,
      this.projectiles,
      this.droppedItems,
      this.worldManager,
      this.sounds
    );

    this.enemySpawner = new EnemySpawner(
      this,
      this.player,
      this.enemies,
      this.worldManager
    );

    this.inputManager = new InputManager(this, this.player);
    this.inputManager.onDropItem = () => {
      this.handlePlayerDropItem();
    };

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
      this.showWorldFloatingText(
        this.player.x,
        this.player.y - 30,
        'Witaj w ECLIPSE: THE LOST WORLD',
        '#6ee7b7'
      );
    });
  }

  public handleBlockDrop(tileX: number, tileY: number, blockId: number): void {
    const def = BLOCK_DEFINITIONS[blockId];
    if (!def || !def.dropItemId) return;

    const count = Phaser.Math.Between(def.dropMin, def.dropMax);
    if (count <= 0) return;

    const T = GAME_CONSTANTS.TILE_SIZE;
    const dropX = tileX * T + T / 2;
    const dropY = tileY * T + T / 2;

    const dropped = new DroppedItem(this, dropX, dropY, def.dropItemId, count);
    this.droppedItems.add(dropped);
  }

  private handlePlayerDropItem(): void {
    const item = this.player.getSelectedItem();
    if (!item) return;

    const success = this.player.consumeSelectedItem(1);
    if (success) {
      const dropOffset = this.player.isFacingLeft ? -20 : 20;
      const dropped = new DroppedItem(this, this.player.x + dropOffset, this.player.y, item.id, 1);
      this.droppedItems.add(dropped);
      this.sounds.play('place');
    }
  }

  public update(time: number, delta: number): void {
    // 1. Update Sky Gradient
    this.updateAtmosphere(delta);

    // 2. Input & Player update
    this.inputManager.update(delta);

    // 3. Spawner & Combat updates
    this.enemySpawner.update(delta);
    this.combatSystem.update(time, delta, this.input.activePointer);

    // 4. Mining, Building & Attack handling
    if (this.input.activePointer.isDown) {
      const selectedItem = this.player.getSelectedItem();
      const isWeapon = selectedItem?.category === ItemCategory.WEAPON;

      if (isWeapon) {
        // Weapon attack takes top priority when wielding a weapon
        this.combatSystem.handlePlayerAttack(time, this.input.activePointer);
      } else {
        // Otherwise attempt mining/placement
        const didMine = this.miningSystem.update(time, delta, this.input.activePointer);
        // If not targeting a mineable block, allow swinging tool for defensive hit
        if (!didMine && selectedItem?.category === ItemCategory.TOOL) {
          this.combatSystem.handlePlayerAttack(time, this.input.activePointer);
        }
      }
    } else {
      this.miningSystem.update(time, delta, this.input.activePointer);
    }

    // 5. Update Dropped Items (magnetic pull & collection)
    const items = this.droppedItems.getChildren() as DroppedItem[];
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

  private updateCursorState(): void {
    if (!this.cursorManager) return;

    // If UI is being hovered or holding an item, UIScene handles the cursor state
    if (this.cursorManager.isUIHovered() || this.cursorManager.isItemHeld()) {
      return;
    }

    const pointer = this.input.activePointer;
    const camera = this.cameras.main;
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);

    // 1. Check Enemy Hover -> Red Combat Target Crosshair
    let enemyTargeted = false;
    const enemyList = this.enemies.getChildren() as Enemy[];
    for (let i = 0; i < enemyList.length; i++) {
      const e = enemyList[i];
      if (e && e.active && e.visible) {
        const bounds = e.getBounds();
        if (
          worldPoint.x >= bounds.x - 6 &&
          worldPoint.x <= bounds.right + 6 &&
          worldPoint.y >= bounds.y - 6 &&
          worldPoint.y <= bounds.bottom + 6
        ) {
          enemyTargeted = true;
          break;
        }
      }
    }
    this.cursorManager.setEnemyTarget(enemyTargeted);
    if (enemyTargeted) return;

    // 2. Check Dropped Item Hover -> Red Interact Pointer
    let itemHovered = false;
    const dropList = this.droppedItems.getChildren() as DroppedItem[];
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
    if (itemHovered) return;

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
      } else if (blockId === BlockId.AIR && selectedItem && selectedItem.isPlaceable && selectedItem.placeBlockId) {
        // Valid block placement position within reach
        canInteract = true;
      }
    }
    this.cursorManager.setTileInReach(canInteract);
  }

  private handleItemPickup(item: DroppedItem): void {
    const success = this.player.addItem(item.itemId, item.amount);
    if (success) {
      this.sounds.play('pickup');
      const itemData = ITEM_REGISTRY[item.itemId];
      const name = itemData ? itemData.name : item.itemId;
      this.showWorldFloatingText(
        this.player.x,
        this.player.y - 20,
        `+${item.amount} ${name}`,
        '#fcd34d'
      );
    }
  }

  public showWorldFloatingText(worldX: number, worldY: number, text: string, color: string = '#44ff88'): void {
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

  private updateAtmosphere(delta: number): void {
    // Advance day-night cycle (1 game day = 12 real minutes)
    this.gameTime = (this.gameTime + delta * 0.02) % 1440;

    const width = this.scale.width;
    const height = this.scale.height;

    this.skyGraphic.clear();

    // Calculate sky color based on cycle:
    // 0 = midnight, 360 = dawn, 720 = noon, 1080 = dusk
    let skyTop = 0x5b93d3;
    let skyBottom = 0xbce3fa;

    if (this.gameTime > 1000 || this.gameTime < 400) {
      // Night / Eclipse
      skyTop = 0x090b14;
      skyBottom = 0x181e2e;
    } else if (this.gameTime >= 400 && this.gameTime < 550) {
      // Sunrise
      skyTop = 0x824970;
      skyBottom = 0xf5a267;
    } else if (this.gameTime >= 900 && this.gameTime <= 1000) {
      // Sunset
      skyTop = 0x7a3052;
      skyBottom = 0xde7043;
    }

    this.skyGraphic.fillGradientStyle(skyTop, skyTop, skyBottom, skyBottom, 1);
    this.skyGraphic.fillRect(0, 0, width, height);
  }
}
