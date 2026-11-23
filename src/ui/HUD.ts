import { GAME_CONSTANTS, ItemRarity } from '../types/index.js';
import { Player } from '../entities/Player.js';
import { BiomeSystem } from '../world/BiomeSystem.js';

export class HUD {
  private scene: Phaser.Scene;
  private player: Player;

  private container!: Phaser.GameObjects.Container;
  private hotbarSlots: Phaser.GameObjects.Container[] = [];
  private slotHighlight!: Phaser.GameObjects.Graphics;

  // Stats Bars
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private manaText!: Phaser.GameObjects.Text;

  // Depth & Time Info
  private depthText!: Phaser.GameObjects.Text;
  private itemTooltipText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    this.createUI();
  }

  private createUI(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    this.createHealthAndMana();
    this.createHotbar();
    this.createDepthInfo();
    this.createItemTooltip();
  }

  private createHealthAndMana(): void {
    const bg = this.scene.add.graphics();
    // Stats frame background
    bg.fillStyle(0x0e1117, 0.85);
    bg.lineStyle(2, 0x2e384d, 1);
    bg.fillRoundedRect(16, 16, 210, 58, 6);
    bg.strokeRoundedRect(16, 16, 210, 58, 6);
    this.container.add(bg);

    // HP Bar
    this.hpBar = this.scene.add.graphics();
    this.container.add(this.hpBar);

    this.hpText = this.scene.add.text(26, 20, '100 / 100 HP', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffc4c4',
      fontStyle: 'bold'
    });
    this.container.add(this.hpText);

    // Mana Bar
    this.manaBar = this.scene.add.graphics();
    this.container.add(this.manaBar);

    this.manaText = this.scene.add.text(26, 44, '50 / 50 MP', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b8e2ff',
      fontStyle: 'bold'
    });
    this.container.add(this.manaText);
  }

  private createHotbar(): void {
    const startX = 246;
    const startY = 16;
    const slotSize = 44;
    const padding = 5;

    for (let i = 0; i < GAME_CONSTANTS.HOTBAR_SLOTS; i++) {
      const slotX = startX + i * (slotSize + padding);
      const slotContainer = this.scene.add.container(slotX, startY);

      // Slot Background Box
      const box = this.scene.add.graphics();
      box.fillStyle(0x131722, 0.9);
      box.lineStyle(2, 0x313d54, 1);
      box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
      box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
      slotContainer.add(box);

      // Slot Number Label (1-9)
      const numLabel = this.scene.add.text(4, 3, `${i + 1}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#6e7f9e'
      });
      slotContainer.add(numLabel);

      // Item Icon Sprite
      const icon = this.scene.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
      icon.setDisplaySize(26, 26);
      icon.setVisible(false);
      icon.setName('icon');
      slotContainer.add(icon);

      // Stack Count Text
      const countLabel = this.scene.add.text(slotSize - 5, slotSize - 5, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      countLabel.setOrigin(1, 1);
      countLabel.setName('count');
      slotContainer.add(countLabel);

      this.container.add(slotContainer);
      this.hotbarSlots.push(slotContainer);
    }

    // Highlight Box for Active Slot
    this.slotHighlight = this.scene.add.graphics();
    this.container.add(this.slotHighlight);
  }

  private createDepthInfo(): void {
    this.depthText = this.scene.add.text(16, 84, 'Altitude: Surface', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e0e6ed',
      backgroundColor: 'rgba(14, 17, 23, 0.75)',
      padding: { x: 8, y: 4 }
    });
    this.container.add(this.depthText);
  }

  private createItemTooltip(): void {
    this.itemTooltipText = this.scene.add.text(246, 68, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f5c838',
      fontStyle: 'bold',
      backgroundColor: 'rgba(14, 17, 23, 0.8)',
      padding: { x: 8, y: 4 }
    });
    this.container.add(this.itemTooltipText);
  }

  public update(): void {
    this.updateStatsBars();
    this.updateHotbarVisuals();
    this.updateDepthDisplay();
  }

  private updateStatsBars(): void {
    // HP Bar
    this.hpBar.clear();
    this.hpBar.fillStyle(0x3a141a, 0.9);
    this.hpBar.fillRoundedRect(24, 32, 194, 8, 3);
    const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.hpBar.fillStyle(0xe63946, 1);
    this.hpBar.fillRoundedRect(24, 32, 194 * hpRatio, 8, 3);
    this.hpText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp} HP`);

    // Mana Bar
    this.manaBar.clear();
    this.manaBar.fillStyle(0x132a40, 0.9);
    this.manaBar.fillRoundedRect(24, 56, 194, 8, 3);
    const manaRatio = Phaser.Math.Clamp(this.player.mana / this.player.maxMana, 0, 1);
    this.manaBar.fillStyle(0x38bdf8, 1);
    this.manaBar.fillRoundedRect(24, 56, 194 * manaRatio, 8, 3);
    this.manaText.setText(`${Math.ceil(this.player.mana)} / ${this.player.maxMana} MP`);
  }

  private updateHotbarVisuals(): void {
    const startX = 246;
    const startY = 16;
    const slotSize = 44;
    const padding = 5;

    for (let i = 0; i < GAME_CONSTANTS.HOTBAR_SLOTS; i++) {
      const slotContainer = this.hotbarSlots[i];
      const slotData = this.player.inventory[i];
      const icon = slotContainer.getByName('icon') as Phaser.GameObjects.Image;
      const countLabel = slotContainer.getByName('count') as Phaser.GameObjects.Text;

      if (slotData && slotData.item && slotData.count > 0) {
        icon.setTexture(slotData.item.iconTexture);
        icon.setVisible(true);

        if (slotData.count > 1) {
          countLabel.setText(`${slotData.count}`);
          countLabel.setVisible(true);
        } else {
          countLabel.setVisible(false);
        }
      } else {
        icon.setVisible(false);
        countLabel.setVisible(false);
      }
    }

    // Update Highlight
    const activeX = startX + this.player.selectedSlot * (slotSize + padding);
    this.slotHighlight.clear();
    this.slotHighlight.lineStyle(3, 0xf5c838, 1); // Gold border
    this.slotHighlight.strokeRoundedRect(activeX - 2, startY - 2, slotSize + 4, slotSize + 4, 5);

    // Update Item Name Tooltip
    const activeItem = this.player.getSelectedItem();
    if (activeItem) {
      let rarityColor = '#ffffff';
      if (activeItem.rarity === ItemRarity.UNCOMMON) rarityColor = '#48d46e';
      else if (activeItem.rarity === ItemRarity.RARE) rarityColor = '#4ba3e3';
      else if (activeItem.rarity === ItemRarity.EPIC) rarityColor = '#b84ce6';
      else if (activeItem.rarity === ItemRarity.LEGENDARY) rarityColor = '#f59e0b';

      this.itemTooltipText.setColor(rarityColor);
      const count = this.player.getSelectedItemCount();
      this.itemTooltipText.setText(`${activeItem.name} ${count > 1 ? `(x${count})` : ''} - ${activeItem.category}`);
      this.itemTooltipText.setVisible(true);
    } else {
      this.itemTooltipText.setVisible(false);
    }
  }

  private updateDepthDisplay(): void {
    const T = GAME_CONSTANTS.TILE_SIZE;
    const tileX = Math.floor(this.player.x / T);
    const tileY = Math.floor(this.player.y / T);
    const biome = BiomeSystem.getBiomeAt(tileX, tileY);
    const depthMeters = (tileY - GAME_CONSTANTS.SURFACE_HEIGHT) * 2;
    this.depthText.setText(`[Biom: ${biome.polishName} | Głębokość: ${depthMeters}m] | Poziom ${this.player.level}`);
  }

  public showFloatingText(worldX: number, worldY: number, text: string, color: string = '#44ff88'): void {
    const floatText = this.scene.add.text(worldX, worldY - 10, text, {
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 3
    });
    floatText.setOrigin(0.5, 0.5);
    floatText.setDepth(50);

    this.scene.tweens.add({
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

  public destroy(): void {
    this.container.destroy();
  }
}
