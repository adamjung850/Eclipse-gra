import { GAME_CONSTANTS } from '../types/index.js';
import { WorldGenerator } from '../world/WorldGenerator.js';
import { WorldManager } from '../world/WorldManager.js';
import { Player } from '../entities/Player.js';
import { DroppedItem } from '../entities/DroppedItem.js';
import { MiningSystem } from '../systems/MiningSystem.js';
import { InputManager } from '../systems/InputManager.js';
import { SoundSynthesizer } from '../systems/SoundSynthesizer.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';
import { ITEM_REGISTRY } from '../world/ItemTypes.js';

export class GameScene extends Phaser.Scene {
  public worldManager!: WorldManager;
  public player!: Player;
  public droppedItems!: Phaser.Physics.Arcade.Group;

  public miningSystem!: MiningSystem;
  public inputManager!: InputManager;
  public sounds!: SoundSynthesizer;

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

    // 6. Dropped Items Physics Group
    this.droppedItems = this.physics.add.group();

    // 7. Setup Physics Collisions
    this.physics.add.collider(this.player, this.worldManager.foregroundLayer);
    this.physics.add.collider(this.droppedItems, this.worldManager.foregroundLayer);

    // 8. Block Broken Hook -> Spawn Drops
    this.worldManager.onBlockBroken = (tileX: number, tileY: number, blockId: number) => {
      this.handleBlockDrop(tileX, tileY, blockId);
    };

    // 9. Systems
    this.miningSystem = new MiningSystem(this, this.player, this.worldManager);
    this.miningSystem.onPlaySound = (type: string) => {
      this.sounds.play(type);
    };

    this.inputManager = new InputManager(this, this.player);
    this.inputManager.onDropItem = () => {
      this.handlePlayerDropItem();
    };

    // 10. Launch Parallel UI Scene (Independent of camera zoom!)
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
        'Welcome to ECLIPSE: THE LOST WORLD',
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

    // 3. Mining & Building update
    this.miningSystem.update(time, delta, this.input.activePointer);

    // 4. Update Dropped Items (magnetic pull & collection)
    const items = this.droppedItems.getChildren() as DroppedItem[];
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      if (item && item.active) {
        item.updateItem(delta, this.player.x, this.player.y, (collected) => {
          this.handleItemPickup(collected);
        });
      }
    }
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
