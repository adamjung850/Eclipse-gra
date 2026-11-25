import {
  CraftingRecipe,
  CraftingStation,
  EquipSlotType,
  GAME_CONSTANTS,
  InventorySlot,
  ItemCategory,
  ItemData,
  ItemRarity,
  RARITY_COLORS
} from '../types/index.js';
import { Player } from '../entities/Player.js';
import { CRAFTING_RECIPES } from '../world/CraftingRecipes.js';
import { ITEM_REGISTRY } from '../world/ItemTypes.js';
import { GameScene } from './GameScene.js';
import { CursorManager } from '../systems/CursorManager.js';
import { BiomeSystem } from '../world/BiomeSystem.js';

export class UIScene extends Phaser.Scene {
  private player!: Player;
  private gameScene!: GameScene;
  private cursorManager!: CursorManager;

  // HUD Top Elements
  private hotbarSlots: Phaser.GameObjects.Container[] = [];
  private slotHighlight!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private manaText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private depthText!: Phaser.GameObjects.Text;
  private itemTooltipText!: Phaser.GameObjects.Text;

  // Inventory & Crafting Window State
  public isInventoryOpen: boolean = false;
  private invContainer!: Phaser.GameObjects.Container;
  private invSlots: Phaser.GameObjects.Container[] = [];
  private equipSlots: Record<string, Phaser.GameObjects.Container> = {};

  // Chest Modal State
  public isChestOpen: boolean = false;
  private chestContainer!: Phaser.GameObjects.Container;
  public activeChestPos: { x: number; y: number } | null = null;
  public activeChestSlots: InventorySlot[] = [];
  private chestSlotContainers: Phaser.GameObjects.Container[] = [];
  private chestPlayerSlotContainers: Phaser.GameObjects.Container[] = [];

  // Boss Bar State (Generated Pixel-Art RPG Boss Frame + Animated Fill)
  public bossBarContainer!: Phaser.GameObjects.Container;
  private bossBarFillSprite!: Phaser.GameObjects.Image;
  private bossBarFrameImage!: Phaser.GameObjects.Image;
  private bossBarTitleImage!: Phaser.GameObjects.Image;
  private bossBarNameText!: Phaser.GameObjects.Text;
  private bossBarHpText!: Phaser.GameObjects.Text;
  private bossBarCurrentHp: number = 750;
  private bossBarMaxHp: number = 750;
  private bossBarTargetWidth: number = 473;
  public bossBarAnimWidth: number = 473;

  // ── GTA-style ZGON Death Screen ──────────────────────────────────────────
  // Phase 1 (0–700 ms):   Slowmo + red camera-tint builds in
  // Phase 2 (700–1400 ms): Grayscale drain – white wash overlay
  // Phase 3 (1400–2000 ms): Full red screen, pixel-art "ZGON" in WHITE fades in
  // Phase 4 (2000–3100 ms): Background red → black, text WHITE → RED
  // Phase 5 (3100 ms+):   Black + red text; respawn fires at 2800 ms
  private deathOverlay:     Phaser.GameObjects.Graphics | null = null;
  private deathTextCanvas:  Phaser.GameObjects.Image    | null = null;
  private deathColorFx:     Phaser.FX.ColorMatrix       | null = null;
  private deathScreenActive: boolean = false;
  private deathPhase:        number  = 0;
  private deathPhaseTimer:   number  = 0;
  private deathRespawned:    boolean = false;

  // Pause Menu (ESC)
  public isPauseMenuOpen: boolean = false;
  private pauseMenuContainer: Phaser.GameObjects.Container | null = null;
  private pauseSettingsModal: Phaser.GameObjects.Container | null = null;
  private pauseListeningKey: string | null = null;
  private pauseKeyListener: ((e: KeyboardEvent) => void) | null = null;
  private pauseSliderMove: ((p: Phaser.Input.Pointer) => void) | null = null;
  private pauseSliderUp: (() => void) | null = null;

  // Hand / Cursor Item
  private cursorSlot: InventorySlot = { item: null, count: 0 };
  private cursorItemSprite!: Phaser.GameObjects.Image;
  private cursorItemText!: Phaser.GameObjects.Text;

  // Tooltip Box
  private tooltipBox!: Phaser.GameObjects.Container;
  private tooltipBg!: Phaser.GameObjects.Graphics;
  private tooltipTitle!: Phaser.GameObjects.Text;
  private tooltipMeta!: Phaser.GameObjects.Text;
  private tooltipStats!: Phaser.GameObjects.Text;
  private tooltipDesc!: Phaser.GameObjects.Text;
  private tooltipObtain!: Phaser.GameObjects.Text;

  // Crafting UI
  private craftCategory: string = 'all';
  private craftStationText!: Phaser.GameObjects.Text;
  private recipeListContainer!: Phaser.GameObjects.Container;
  private activeStationSet: Set<CraftingStation> = new Set([CraftingStation.HAND]);
  private keyShift?: Phaser.Input.Keyboard.Key;

  constructor() {
    super('UIScene');
  }

  public create(data: { player: Player }): void {
    this.player = data.player;
    this.gameScene = this.scene.get('GameScene') as GameScene;

    if (this.gameScene.isIntroCameraMoving) {
      this.cameras.main.setAlpha(0);
    }

    // 1. Create Top HUD
    this.createHealthAndMana();
    this.createHotbar();
    this.createDepthInfo();
    this.createItemTooltip();
    this.createBossBar();

    // 2. Create Full Inventory & Crafting Modal (Hidden by default)
    this.createInventoryModal();

    // 2b. Create Chest Modal Window
    this.createChestModal();

    // 3. Create Detailed Hover Tooltip
    this.createHoverTooltip();

    // 4. Create Cursor Holding Item
    this.createCursorItemVisual();

    // 5. Setup Cursor Hooks
    this.cursorManager = CursorManager.getInstance(this.game);
    this.initCursorHooks();

    // 6. Handle Keyboard & Resizing
    this.initInputHooks();

    this.scale.on('resize', () => {
      this.repositionUI();
    });
  }

  private initCursorHooks(): void {
    // Whenever pointer moves over any interactive GameObject in UIScene
    this.input.on('gameobjectover', () => {
      this.cursorManager.setUIHover(true);
    });
    this.input.on('gameobjectout', () => {
      this.cursorManager.setUIHover(false);
    });
  }

  private initInputHooks(): void {
    const kb = this.input.keyboard;
    if (kb) {
      this.keyShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    }

    // Pointer move updates cursor holding item & tooltips
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.cursorSlot.item) {
        this.cursorItemSprite.setPosition(pointer.x, pointer.y);
        this.cursorItemText.setPosition(pointer.x + 10, pointer.y + 10);
      }
      if (this.tooltipBox.visible) {
        this.tooltipBox.setPosition(Math.min(this.scale.width - 230, pointer.x + 14), Math.min(this.scale.height - 200, pointer.y + 14));
      }
    });

    // Drop holding item if clicked in world background while inventory is open
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isInventoryOpen && this.cursorSlot.item) {
        // If clicked outside inventory modal panels
        if (pointer.y > 660 || pointer.x < 40 || pointer.x > this.scale.width - 40) {
          this.dropCursorItem();
        }
      }
    });
  }

  public toggleInventory(forceState?: boolean): void {
    this.isInventoryOpen = forceState !== undefined ? forceState : !this.isInventoryOpen;
    this.invContainer.setVisible(this.isInventoryOpen);

    if (this.isInventoryOpen) {
      this.hideTooltip();
      this.refreshInventoryUI();
      this.refreshCraftingRecipes();
    } else {
      // Return holding item to inventory if closing
      if (this.cursorSlot.item) {
        this.player.addItem(this.cursorSlot.item.id, this.cursorSlot.count);
        this.cursorSlot = { item: null, count: 0 };
        this.cursorItemSprite.setVisible(false);
        this.cursorItemText.setVisible(false);
      }
      this.cursorManager.setHoldingItem(false);
      this.cursorManager.setUIHover(false);
      this.hideTooltip();
    }
  }

  // =========================================================================
  // HUD (TOP BARS & HOTBAR)
  // =========================================================================

  private createHealthAndMana(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0e1117, 0.88);
    bg.lineStyle(2, 0x2e384d, 1);
    bg.fillRoundedRect(16, 14, 210, 72, 6);
    bg.strokeRoundedRect(16, 14, 210, 72, 6);

    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(26, 18, '100 / 100 HP', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffc4c4',
      fontStyle: 'bold'
    });

    this.manaBar = this.add.graphics();
    this.manaText = this.add.text(26, 39, '50 / 50 MP', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b8e2ff',
      fontStyle: 'bold'
    });

    this.xpBar = this.add.graphics();
    this.levelText = this.add.text(26, 60, 'Lv. 1 [0 / 100 XP]', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#facc15',
      fontStyle: 'bold'
    });
  }

  private createHotbar(): void {
    const slotSize = 46;
    const padding = 5;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(240, Math.floor((this.scale.width - totalWidth) / 2));
    const startY = 16;

    this.hotbarSlots = [];

    for (let i = 0; i < GAME_CONSTANTS.HOTBAR_SLOTS; i++) {
      const slotX = startX + i * (slotSize + padding);
      const slotContainer = this.add.container(slotX, startY);

      const box = this.add.graphics();
      box.fillStyle(0x131722, 0.92);
      box.lineStyle(2, 0x313d54, 1);
      box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
      box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
      slotContainer.add(box);

      const numLabel = this.add.text(4, 3, `${i + 1}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#6e7f9e'
      });
      slotContainer.add(numLabel);

      const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
      icon.setDisplaySize(28, 28);
      icon.setVisible(false);
      icon.setName('icon');
      slotContainer.add(icon);

      const countLabel = this.add.text(slotSize - 5, slotSize - 5, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      countLabel.setOrigin(1, 1);
      countLabel.setName('count');
      slotContainer.add(countLabel);

      slotContainer.setSize(slotSize, slotSize);
      slotContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, slotSize, slotSize), Phaser.Geom.Rectangle.Contains);
      slotContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (!this.isInventoryOpen) {
          this.player.selectedSlot = i;
        } else {
          this.handleSlotClick(i, pointer.rightButtonDown());
        }
      });

      slotContainer.on('pointerover', () => {
        const item = this.player.inventory[i]?.item;
        if (item) this.showTooltip(item);
      });
      slotContainer.on('pointerout', () => {
        this.hideTooltip();
      });

      this.hotbarSlots.push(slotContainer);
    }

    this.slotHighlight = this.add.graphics();
  }

  private createDepthInfo(): void {
    this.depthText = this.add.text(16, 80, 'Wysokość: Powierzchnia', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e0e6ed',
      backgroundColor: 'rgba(14, 17, 23, 0.8)',
      padding: { x: 8, y: 4 }
    });
  }

  private createItemTooltip(): void {
    const slotSize = 46;
    const padding = 5;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(240, Math.floor((this.scale.width - totalWidth) / 2));

    this.itemTooltipText = this.add.text(startX, 70, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#f5c838',
      fontStyle: 'bold',
      backgroundColor: 'rgba(14, 17, 23, 0.85)',
      padding: { x: 8, y: 4 }
    });
  }

  // =========================================================================
  // FULL INVENTORY & CRAFTING MODAL WINDOW (KEY 'E')
  // =========================================================================

  private createInventoryModal(): void {
    this.invContainer = this.add.container(0, 0);
    this.invContainer.setDepth(150);
    this.invContainer.setVisible(false);

    // Dim overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x04060a, 0.75);
    overlay.fillRect(0, 0, 3000, 2000);
    this.invContainer.add(overlay);

    // --- LEFT PANEL: PLAYER, EQUIPMENT & BACKPACK ---
    const panelX = 40;
    const panelY = 80;
    const panelW = 540;
    const panelH = 560;

    const leftPanelBg = this.add.graphics();
    leftPanelBg.fillStyle(0x0d111a, 0.96);
    leftPanelBg.lineStyle(2, 0x2e384d, 1);
    leftPanelBg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    leftPanelBg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    this.invContainer.add(leftPanelBg);

    // Title
    const title = this.add.text(panelX + 20, panelY + 16, 'POSTAĆ & EKWIPUNEK [E - Zamknij]', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#38bdf8',
      fontStyle: 'bold'
    });
    this.invContainer.add(title);

    // Close Button [✖]
    const btnClose = this.add.text(panelX + panelW - 32, panelY + 14, '✖', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ef4444',
      fontStyle: 'bold'
    });
    btnClose.setInteractive({ useHandCursor: true });
    btnClose.on('pointerdown', () => this.toggleInventory(false));
    this.invContainer.add(btnClose);

    // Stats Box
    this.createCharacterStatsSection(panelX + 20, panelY + 44);

    // Equipment Slots (8 slots)
    this.createEquipmentSlotsSection(panelX + 255, panelY + 44);

    // Full 45 Slots: Hotbar (0-8) + Backpack (9-44)
    this.createAllInventorySlotsSection(panelX + 20, panelY + 215);

    // --- RIGHT PANEL: CRAFTING WORKSHOP ---
    this.createCraftingPanel(panelX + panelW + 20, panelY, 480, panelH);
  }

  private createCharacterStatsSection(x: number, y: number): void {
    const box = this.add.graphics();
    box.fillStyle(0x131722, 0.85);
    box.lineStyle(1, 0x232c3d, 1);
    box.fillRoundedRect(x, y, 225, 170, 6);
    box.strokeRoundedRect(x, y, 225, 170, 6);
    this.invContainer.add(box);

    const statsHeader = this.add.text(x + 12, y + 10, 'PARAMETRY BOJOWE', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f59e0b',
      fontStyle: 'bold'
    });
    this.invContainer.add(statsHeader);

    const statLabels = [
      'Poziom gracza: 1',
      'Maksymalne HP: 100',
      'Maksymalna MP: 50',
      'Całkowita Obrona: 0',
      'Szansa na krytyk: 5%',
      'Bonus prędkości: +0%',
      'Siła kopania: 25'
    ];

    statLabels.forEach((label, idx) => {
      const txt = this.add.text(x + 12, y + 30 + idx * 19, label, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#cbd5e1'
      });
      txt.setName(`stat_${idx}`);
      this.invContainer.add(txt);
    });
  }

  private createEquipmentSlotsSection(x: number, y: number): void {
    const equipDefs = [
      { slot: EquipSlotType.HELMET, label: 'Hełm', ox: 0, oy: 0 },
      { slot: EquipSlotType.CHEST, label: 'Zbroja', ox: 70, oy: 0 },
      { slot: EquipSlotType.LEGS, label: 'Spodnie', ox: 140, oy: 0 },
      { slot: EquipSlotType.BOOTS, label: 'Buty', ox: 210, oy: 0 },
      { slot: EquipSlotType.RING_1, label: 'Pierścień 1', ox: 0, oy: 85 },
      { slot: EquipSlotType.RING_2, label: 'Pierścień 2', ox: 70, oy: 85 },
      { slot: EquipSlotType.AMULET, label: 'Amulet', ox: 140, oy: 85 },
      { slot: EquipSlotType.CAPE, label: 'Peleryna', ox: 210, oy: 85 }
    ];

    const slotSize = 48;

    equipDefs.forEach((def) => {
      const container = this.add.container(x + def.ox, y + def.oy);

      const box = this.add.graphics();
      box.fillStyle(0x141824, 0.95);
      box.lineStyle(2, 0x475569, 1);
      box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
      box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
      container.add(box);

      const placeholderLabel = this.add.text(slotSize / 2, slotSize / 2, def.label, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#475569',
        align: 'center'
      });
      placeholderLabel.setOrigin(0.5, 0.5);
      placeholderLabel.setName('placeholder');
      container.add(placeholderLabel);

      const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
      icon.setDisplaySize(30, 30);
      icon.setVisible(false);
      icon.setName('icon');
      container.add(icon);

      container.setSize(slotSize, slotSize);
      container.setInteractive(new Phaser.Geom.Rectangle(0, 0, slotSize, slotSize), Phaser.Geom.Rectangle.Contains);

      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.handleEquipSlotClick(def.slot);
      });

      container.on('pointerover', () => {
        const item = this.player.equipment[def.slot]?.item;
        if (item) this.showTooltip(item);
      });
      container.on('pointerout', () => {
        this.hideTooltip();
      });

      this.invContainer.add(container);
      this.equipSlots[def.slot] = container;
    });
  }

  private createAllInventorySlotsSection(x: number, y: number): void {
    const slotSize = 48;
    const padding = 6;
    this.invSlots = new Array(GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS);

    // --- 1. HOTBAR SECTION (Sloty 1 - 9, index 0..8) ---
    const hotbarLabel = this.add.text(x, y - 2, '⚡ PAS SZYBKIEGO WYBORU (Sloty 1 - 9)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f59e0b',
      fontStyle: 'bold'
    });
    this.invContainer.add(hotbarLabel);

    const hotbarY = y + 16;
    for (let col = 0; col < 9; col++) {
      const slotIdx = col;
      const slotX = x + col * (slotSize + padding);

      const container = this.add.container(slotX, hotbarY);

      const box = this.add.graphics();
      box.fillStyle(0x1a1e2b, 0.96);
      box.lineStyle(1.8, 0xd97706, 0.9); // Gold amber border for hotbar
      box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
      box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
      container.add(box);

      // Slot number index indicator (1..9)
      const numLabel = this.add.text(4, 3, `${col + 1}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#f59e0b',
        fontStyle: 'bold'
      });
      container.add(numLabel);

      const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
      icon.setDisplaySize(28, 28);
      icon.setVisible(false);
      icon.setName('icon');
      container.add(icon);

      const countLabel = this.add.text(slotSize - 4, slotSize - 4, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      countLabel.setOrigin(1, 1);
      countLabel.setName('count');
      container.add(countLabel);

      container.setSize(slotSize, slotSize);
      container.setInteractive(new Phaser.Geom.Rectangle(0, 0, slotSize, slotSize), Phaser.Geom.Rectangle.Contains);

      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.handleSlotClick(slotIdx, pointer.rightButtonDown());
      });

      container.on('pointerover', () => {
        const item = this.player.inventory[slotIdx]?.item;
        if (item) this.showTooltip(item);
      });
      container.on('pointerout', () => {
        this.hideTooltip();
      });

      this.invContainer.add(container);
      this.invSlots[slotIdx] = container;
    }

    // --- 2. BACKPACK SECTION (Sloty 10 - 45, index 9..44) ---
    const backpackLabelY = hotbarY + slotSize + 12;
    const bpLabel = this.add.text(x, backpackLabelY, '🎒 GŁÓWNY PLECAK (Sloty 10 - 45)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold'
    });
    this.invContainer.add(bpLabel);

    const bpSlotsY = backpackLabelY + 18;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 9; col++) {
        const slotIdx = 9 + row * 9 + col;
        const slotX = x + col * (slotSize + padding);
        const slotY = bpSlotsY + row * (slotSize + padding);

        const container = this.add.container(slotX, slotY);

        const box = this.add.graphics();
        box.fillStyle(0x131722, 0.95);
        box.lineStyle(1.5, 0x2e384d, 1);
        box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
        box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
        container.add(box);

        const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
        icon.setDisplaySize(28, 28);
        icon.setVisible(false);
        icon.setName('icon');
        container.add(icon);

        const countLabel = this.add.text(slotSize - 4, slotSize - 4, '', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ffffff',
          fontStyle: 'bold'
        });
        countLabel.setOrigin(1, 1);
        countLabel.setName('count');
        container.add(countLabel);

        container.setSize(slotSize, slotSize);
        container.setInteractive(new Phaser.Geom.Rectangle(0, 0, slotSize, slotSize), Phaser.Geom.Rectangle.Contains);

        container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.handleSlotClick(slotIdx, pointer.rightButtonDown());
        });

        container.on('pointerover', () => {
          const item = this.player.inventory[slotIdx]?.item;
          if (item) this.showTooltip(item);
        });
        container.on('pointerout', () => {
          this.hideTooltip();
        });

        this.invContainer.add(container);
        this.invSlots[slotIdx] = container;
      }
    }
  }

  // =========================================================================
  // CRAFTING PANEL
  // =========================================================================

  private createCraftingPanel(x: number, y: number, w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x0d111a, 0.96);
    bg.lineStyle(2, 0x2e384d, 1);
    bg.fillRoundedRect(x, y, w, h, 8);
    bg.strokeRoundedRect(x, y, w, h, 8);
    this.invContainer.add(bg);

    const title = this.add.text(x + 20, y + 16, 'WARSZTAT RZEMIEŚLNICZY', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f59e0b',
      fontStyle: 'bold'
    });
    this.invContainer.add(title);

    // Active station detection indicator
    this.craftStationText = this.add.text(x + 20, y + 42, '[Stacja: Podręczny crafting]', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#38bdf8'
    });
    this.invContainer.add(this.craftStationText);

    // Category Tabs
    const categories = [
      { id: 'all', label: 'Wszystko' },
      { id: 'tools', label: 'Narzędzia' },
      { id: 'weapons', label: 'Bronie' },
      { id: 'armor', label: 'Zbroje' },
      { id: 'blocks', label: 'Bloki' },
      { id: 'consumables', label: 'Mikstury' }
    ];

    categories.forEach((cat, idx) => {
      const tabX = x + 16 + idx * 74;
      const tabY = y + 68;

      const tab = this.add.text(tabX, tabY, cat.label, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: this.craftCategory === cat.id ? '#f59e0b' : '#94a3b8',
        backgroundColor: '#161c28',
        padding: { x: 6, y: 4 }
      });
      tab.setInteractive();
      tab.on('pointerdown', () => {
        this.craftCategory = cat.id;
        this.refreshCraftingRecipes();
      });
      this.invContainer.add(tab);
    });

    // Recipe List Scrollable Container
    this.recipeListContainer = this.add.container(x + 16, y + 104);
    this.invContainer.add(this.recipeListContainer);
  }

  private refreshCraftingRecipes(): void {
    if (!this.player || !this.gameScene) return;

    // Detect nearby stations
    this.activeStationSet = this.player.getNearbyStations(this.gameScene.worldManager);

    const stationNames: string[] = ['Podręczny'];
    if (this.activeStationSet.has(CraftingStation.WORKBENCH)) stationNames.push('Stół rzemieślniczy');
    if (this.activeStationSet.has(CraftingStation.FURNACE)) stationNames.push('Piec hutniczy');
    if (this.activeStationSet.has(CraftingStation.ANVIL)) stationNames.push('Kowadło');

    this.craftStationText.setText(`[Aktywne stacje: ${stationNames.join(' + ')}]`);

    // Clear old list items
    this.recipeListContainer.removeAll(true);

    // Filter recipes by station and category
    const validRecipes = CRAFTING_RECIPES.filter((r) => {
      const stationMatches = this.activeStationSet.has(r.station);
      const categoryMatches = this.craftCategory === 'all' || r.category === this.craftCategory;
      return stationMatches && categoryMatches;
    });

    const itemH = 58;
    const maxVisible = 7;

    validRecipes.slice(0, maxVisible).forEach((recipe, idx) => {
      const itemResult = ITEM_REGISTRY[recipe.resultItemId];
      if (!itemResult) return;

      const rowY = idx * (itemH + 4);
      const row = this.add.container(0, rowY);

      // Check if player has all ingredients
      const canCraft = recipe.ingredients.every((ing) => this.player.hasItem(ing.itemId, ing.count));

      // Row background
      const rowBg = this.add.graphics();
      rowBg.fillStyle(canCraft ? 0x162033 : 0x11141c, 0.9);
      rowBg.lineStyle(1, canCraft ? 0x2563eb : 0x222736, 1);
      rowBg.fillRoundedRect(0, 0, 444, itemH, 4);
      rowBg.strokeRoundedRect(0, 0, 444, itemH, 4);
      row.add(rowBg);

      // Result Icon
      const icon = this.add.image(28, itemH / 2, itemResult.iconTexture);
      icon.setDisplaySize(30, 30);
      row.add(icon);

      // Result Name & Quantity
      const nameColor = RARITY_COLORS[itemResult.rarity] || '#ffffff';
      const nameText = this.add.text(54, 8, `${itemResult.name} ${recipe.resultCount > 1 ? `(x${recipe.resultCount})` : ''}`, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: nameColor,
        fontStyle: 'bold'
      });
      row.add(nameText);

      // Ingredients list
      const ingTexts = recipe.ingredients
        .map((ing) => {
          const ingData = ITEM_REGISTRY[ing.itemId];
          const has = this.player.hasItem(ing.itemId, ing.count);
          const ingName = ingData ? ingData.name : ing.itemId;
          return `${ingName}: ${ing.count}`;
        })
        .join(' | ');

      const reqText = this.add.text(54, 24, `Składniki: ${ingTexts}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: canCraft ? '#86efac' : '#94a3b8',
        wordWrap: { width: 280 }
      });
      row.add(reqText);

      // CRAFT BUTTON
      const btn = this.add.container(380, itemH / 2);
      const btnBg = this.add.graphics();
      btnBg.fillStyle(canCraft ? 0x16a34a : 0x334155, 1);
      btnBg.fillRoundedRect(-38, -14, 76, 28, 4);
      btn.add(btnBg);

      const btnLabel = this.add.text(0, 0, 'WYTWÓRZ', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: canCraft ? '#ffffff' : '#64748b',
        fontStyle: 'bold'
      });
      btnLabel.setOrigin(0.5, 0.5);
      btn.add(btnLabel);

      if (canCraft) {
        btn.setSize(76, 28);
        btn.setInteractive();
        btn.on('pointerdown', () => {
          this.executeCraft(recipe);
        });
      }

      row.add(btn);

      // Tooltip on row hover
      rowBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, 370, itemH), Phaser.Geom.Rectangle.Contains);
      rowBg.on('pointerover', () => {
        this.showTooltip(itemResult);
      });
      rowBg.on('pointerout', () => {
        this.hideTooltip();
      });

      this.recipeListContainer.add(row);
    });

    if (validRecipes.length === 0) {
      const emptyText = this.add.text(20, 20, 'Brak receptur w tej kategorii przy obecnej stacji.', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#64748b'
      });
      this.recipeListContainer.add(emptyText);
    }
  }

  private executeCraft(recipe: CraftingRecipe): void {
    // 1. Consume ingredients
    for (const ing of recipe.ingredients) {
      this.player.consumeItem(ing.itemId, ing.count);
    }

    // 2. Add result item
    const success = this.player.addItem(recipe.resultItemId, recipe.resultCount);
    if (!success) {
      // If inventory is completely full, drop item in world
      const resultItem = ITEM_REGISTRY[recipe.resultItemId];
      if (resultItem) {
        this.gameScene.showWorldFloatingText(this.player.x, this.player.y - 20, 'Ekwipunek pełny! Przedmiot upuszczono.', '#ef4444');
      }
    }

    // 3. Audio & feedback
    this.gameScene.sounds.play('place');
    const resultItem = ITEM_REGISTRY[recipe.resultItemId];
    if (resultItem) {
      this.gameScene.showWorldFloatingText(this.player.x, this.player.y - 20, `Wytworzono: +${recipe.resultCount} ${resultItem.name}`, '#4ade80');
    }

    // 4. Refresh views
    this.refreshInventoryUI();
    this.refreshCraftingRecipes();
  }

  // =========================================================================
  // INVENTORY INTERACTION & CURSOR ITEM SWAPPING
  // =========================================================================

  private handleSlotClick(slotIndex: number, isRightClick: boolean): void {
    const slot = this.player.inventory[slotIndex];
    if (!slot) return;

    // Shift-Click: Instant Equip or Transfer
    const isShift = this.keyShift ? this.keyShift.isDown : false;
    if (isShift && slot.item) {
      if (slot.item.equipSlot) {
        this.player.equipItem(slotIndex);
      } else if (slot.item.category === ItemCategory.CONSUMABLE) {
        this.player.useConsumable(slotIndex);
      }
      this.refreshInventoryUI();
      return;
    }

    // Case 1: Cursor is empty
    if (!this.cursorSlot.item) {
      if (slot.item && slot.count > 0) {
        if (isRightClick && slot.count > 1) {
          // Pick up half
          const half = Math.ceil(slot.count / 2);
          this.cursorSlot = { item: slot.item, count: half };
          slot.count -= half;
        } else {
          // Pick up whole stack
          this.cursorSlot = { item: slot.item, count: slot.count };
          slot.item = null;
          slot.count = 0;
        }
      }
    }
    // Case 2: Cursor is holding an item
    else {
      if (!slot.item) {
        // Place into empty slot
        if (isRightClick) {
          // Place 1
          slot.item = this.cursorSlot.item;
          slot.count = 1;
          this.cursorSlot.count -= 1;
          if (this.cursorSlot.count <= 0) this.cursorSlot.item = null;
        } else {
          // Place all
          slot.item = this.cursorSlot.item;
          slot.count = this.cursorSlot.count;
          this.cursorSlot = { item: null, count: 0 };
        }
      } else if (slot.item.id === this.cursorSlot.item.id) {
        // Same item: Stack together
        const space = slot.item.maxStack - slot.count;
        if (space > 0) {
          if (isRightClick) {
            slot.count += 1;
            this.cursorSlot.count -= 1;
            if (this.cursorSlot.count <= 0) this.cursorSlot.item = null;
          } else {
            const add = Math.min(space, this.cursorSlot.count);
            slot.count += add;
            this.cursorSlot.count -= add;
            if (this.cursorSlot.count <= 0) this.cursorSlot.item = null;
          }
        }
      } else {
        // Different item: Swap items
        const temp = { item: slot.item, count: slot.count };
        slot.item = this.cursorSlot.item;
        slot.count = this.cursorSlot.count;
        this.cursorSlot = temp;
      }
    }

    this.updateCursorVisual();
    this.refreshInventoryUI();
    this.refreshCraftingRecipes();
    if (this.isChestOpen) {
      this.refreshChestPlayerSlotsUI();
    }
  }

  private handleEquipSlotClick(equipSlotType: string): void {
    const currentEquip = this.player.equipment[equipSlotType];

    // If cursor holds matching equippable item
    if (this.cursorSlot.item && this.cursorSlot.item.equipSlot === equipSlotType) {
      const temp = currentEquip.item;
      currentEquip.item = this.cursorSlot.item;
      currentEquip.count = 1;

      if (temp) {
        this.cursorSlot = { item: temp, count: 1 };
      } else {
        this.cursorSlot = { item: null, count: 0 };
      }
      this.player.recalculateStats();
    }
    // If cursor empty & equip slot has item -> unequip into cursor
    else if (!this.cursorSlot.item && currentEquip.item) {
      this.cursorSlot = { item: currentEquip.item, count: 1 };
      currentEquip.item = null;
      currentEquip.count = 0;
      this.player.recalculateStats();
    }

    this.updateCursorVisual();
    this.refreshInventoryUI();
  }

  private dropCursorItem(): void {
    if (!this.cursorSlot.item) return;

    const item = this.cursorSlot.item;
    const count = this.cursorSlot.count;
    this.cursorSlot = { item: null, count: 0 };
    this.updateCursorVisual();

    // Spawn dropped item in game world
    this.gameScene.showWorldFloatingText(this.player.x, this.player.y - 20, `Wyrzucono: ${item.name} (x${count})`, '#f59e0b');
    this.gameScene.sounds.play('place');

    for (let i = 0; i < count; i++) {
      this.gameScene.handleBlockDrop(
        Math.floor(this.player.x / GAME_CONSTANTS.TILE_SIZE),
        Math.floor(this.player.y / GAME_CONSTANTS.TILE_SIZE),
        item.placeBlockId || 1
      );
    }
  }

  // =========================================================================
  // CHEST MODAL WINDOW
  // =========================================================================

  private createChestModal(): void {
    this.chestContainer = this.add.container(0, 0);
    this.chestContainer.setDepth(160);
    this.chestContainer.setVisible(false);

    // Dim overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x04060a, 0.75);
    overlay.fillRect(0, 0, 3000, 2000);
    this.chestContainer.add(overlay);

    const slotSize = 48;
    const padding = 6;
    const panelW = 560;
    const panelH = 590;
    const panelX = Math.floor((this.scale.width - panelW) / 2);
    const panelY = 55;

    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x0d111a, 0.96);
    bg.lineStyle(2, 0xd97706, 1); // Gold amber chest border
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);
    this.chestContainer.add(bg);

    // Header Title
    const title = this.add.text(panelX + 20, panelY + 16, '📦 SKRZYNIA SKARBÓW [ESC / E - Zamknij]', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#f59e0b',
      fontStyle: 'bold'
    });
    this.chestContainer.add(title);

    // Buttons: Loot All & Deposit Matching & Close
    const btnLoot = this.add.text(panelX + 260, panelY + 14, '📥 Weź wszystko', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#1e3a5f',
      padding: { x: 8, y: 4 }
    });
    btnLoot.setInteractive({ useHandCursor: true });
    btnLoot.on('pointerdown', () => this.lootAllChest());
    btnLoot.on('pointerover', () => btnLoot.setBackgroundColor('#2563eb'));
    btnLoot.on('pointerout', () => btnLoot.setBackgroundColor('#1e3a5f'));
    this.chestContainer.add(btnLoot);

    const btnDeposit = this.add.text(panelX + 380, panelY + 14, '📤 Odłóż pasujące', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#164e63',
      padding: { x: 8, y: 4 }
    });
    btnDeposit.setInteractive({ useHandCursor: true });
    btnDeposit.on('pointerdown', () => this.depositMatchingToChest());
    btnDeposit.on('pointerover', () => btnDeposit.setBackgroundColor('#0891b2'));
    btnDeposit.on('pointerout', () => btnDeposit.setBackgroundColor('#164e63'));
    this.chestContainer.add(btnDeposit);

    const btnClose = this.add.text(panelX + panelW - 32, panelY + 14, '✖', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ef4444',
      fontStyle: 'bold'
    });
    btnClose.setInteractive({ useHandCursor: true });
    btnClose.on('pointerdown', () => this.closeChestModal());
    this.chestContainer.add(btnClose);

    // --- 1. CHEST SLOTS SECTION (20 SLOTS: 2 rows x 10 cols) ---
    const chestLabel = this.add.text(panelX + 20, panelY + 48, 'ZAWARTOŚĆ SKRZYNI (20 Slotów)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f59e0b',
      fontStyle: 'bold'
    });
    this.chestContainer.add(chestLabel);

    this.chestSlotContainers = [];
    const chestSlotsStartX = panelX + (panelW - (10 * slotSize + 9 * padding)) / 2;
    const chestSlotsStartY = panelY + 68;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 10; col++) {
        const slotIdx = row * 10 + col;
        const slotX = chestSlotsStartX + col * (slotSize + padding);
        const slotY = chestSlotsStartY + row * (slotSize + padding);

        const container = this.add.container(slotX, slotY);

        const box = this.add.graphics();
        box.fillStyle(0x1a1a24, 0.95);
        box.lineStyle(1.5, 0xd97706, 0.85); // Gold slot outline
        box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
        box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
        container.add(box);

        const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
        icon.setDisplaySize(28, 28);
        icon.setVisible(false);
        icon.setName('icon');
        container.add(icon);

        const countLabel = this.add.text(slotSize - 4, slotSize - 4, '', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ffffff',
          fontStyle: 'bold'
        });
        countLabel.setOrigin(1, 1);
        countLabel.setName('count');
        container.add(countLabel);

        container.setSize(slotSize, slotSize);
        container.setInteractive(new Phaser.Geom.Rectangle(0, 0, slotSize, slotSize), Phaser.Geom.Rectangle.Contains);

        container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.handleChestSlotClick(slotIdx, pointer.rightButtonDown());
        });

        container.on('pointerover', () => {
          const item = this.activeChestSlots[slotIdx]?.item;
          if (item) this.showTooltip(item);
        });
        container.on('pointerout', () => {
          this.hideTooltip();
        });

        this.chestContainer.add(container);
        this.chestSlotContainers.push(container);
      }
    }

    // --- 2. PLAYER INVENTORY INSIDE CHEST MODAL ---
    const invSectionY = chestSlotsStartY + 2 * (slotSize + padding) + 16;

    // Hotbar row (0..8)
    const pHotbarLabel = this.add.text(panelX + 20, invSectionY, '⚡ TWÓJ PAS SZYBKIEGO WYBORU (Sloty 1 - 9)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#f59e0b',
      fontStyle: 'bold'
    });
    this.chestContainer.add(pHotbarLabel);

    this.chestPlayerSlotContainers = new Array(GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS);
    const pSlotsStartX = panelX + (panelW - (9 * slotSize + 8 * padding)) / 2;
    const pHotbarY = invSectionY + 16;

    for (let col = 0; col < 9; col++) {
      const slotIdx = col;
      const slotX = pSlotsStartX + col * (slotSize + padding);

      const container = this.add.container(slotX, pHotbarY);

      const box = this.add.graphics();
      box.fillStyle(0x1a1e2b, 0.96);
      box.lineStyle(1.8, 0xd97706, 0.9);
      box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
      box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
      container.add(box);

      const numLabel = this.add.text(4, 3, `${col + 1}`, {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#f59e0b',
        fontStyle: 'bold'
      });
      container.add(numLabel);

      const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
      icon.setDisplaySize(28, 28);
      icon.setVisible(false);
      icon.setName('icon');
      container.add(icon);

      const countLabel = this.add.text(slotSize - 4, slotSize - 4, '', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold'
      });
      countLabel.setOrigin(1, 1);
      countLabel.setName('count');
      container.add(countLabel);

      container.setSize(slotSize, slotSize);
      container.setInteractive(new Phaser.Geom.Rectangle(0, 0, slotSize, slotSize), Phaser.Geom.Rectangle.Contains);

      container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.handleSlotClick(slotIdx, pointer.rightButtonDown());
        this.refreshChestPlayerSlotsUI();
      });

      container.on('pointerover', () => {
        const item = this.player.inventory[slotIdx]?.item;
        if (item) this.showTooltip(item);
      });
      container.on('pointerout', () => {
        this.hideTooltip();
      });

      this.chestContainer.add(container);
      this.chestPlayerSlotContainers[slotIdx] = container;
    }

    // Backpack rows (9..44)
    const pBpLabelY = pHotbarY + slotSize + 10;
    const pBpLabel = this.add.text(panelX + 20, pBpLabelY, '🎒 TWÓJ GŁÓWNY PLECAK (Sloty 10 - 45)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold'
    });
    this.chestContainer.add(pBpLabel);

    const pBpSlotsY = pBpLabelY + 16;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 9; col++) {
        const slotIdx = 9 + row * 9 + col;
        const slotX = pSlotsStartX + col * (slotSize + padding);
        const slotY = pBpSlotsY + row * (slotSize + padding);

        const container = this.add.container(slotX, slotY);

        const box = this.add.graphics();
        box.fillStyle(0x131722, 0.95);
        box.lineStyle(1.5, 0x2e384d, 1);
        box.fillRoundedRect(0, 0, slotSize, slotSize, 4);
        box.strokeRoundedRect(0, 0, slotSize, slotSize, 4);
        container.add(box);

        const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
        icon.setDisplaySize(28, 28);
        icon.setVisible(false);
        icon.setName('icon');
        container.add(icon);

        const countLabel = this.add.text(slotSize - 4, slotSize - 4, '', {
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#ffffff',
          fontStyle: 'bold'
        });
        countLabel.setOrigin(1, 1);
        countLabel.setName('count');
        container.add(countLabel);

        container.setSize(slotSize, slotSize);
        container.setInteractive(new Phaser.Geom.Rectangle(0, 0, slotSize, slotSize), Phaser.Geom.Rectangle.Contains);

        container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.handleSlotClick(slotIdx, pointer.rightButtonDown());
          this.refreshChestPlayerSlotsUI();
        });

        container.on('pointerover', () => {
          const item = this.player.inventory[slotIdx]?.item;
          if (item) this.showTooltip(item);
        });
        container.on('pointerout', () => {
          this.hideTooltip();
        });

        this.chestContainer.add(container);
        this.chestPlayerSlotContainers[slotIdx] = container;
      }
    }
  }

  public openChestModal(tileX: number, tileY: number, chestSlots: InventorySlot[]): void {
    if (this.isInventoryOpen) {
      this.toggleInventory(false);
    }

    this.isChestOpen = true;
    this.activeChestPos = { x: tileX, y: tileY };
    this.activeChestSlots = chestSlots;
    this.chestContainer.setVisible(true);

    this.refreshChestUI();
    this.refreshChestPlayerSlotsUI();
  }

  public closeChestModal(): void {
    if (!this.isChestOpen) return;
    this.isChestOpen = false;
    this.chestContainer.setVisible(false);

    // Return any item on cursor to player
    if (this.cursorSlot.item) {
      this.player.addItem(this.cursorSlot.item.id, this.cursorSlot.count);
      this.cursorSlot = { item: null, count: 0 };
      this.updateCursorVisual();
    }

    this.activeChestPos = null;
    this.activeChestSlots = [];
    this.hideTooltip();
    this.refreshInventoryUI();
  }

  private handleChestSlotClick(slotIdx: number, isRightClick: boolean): void {
    if (!this.activeChestSlots || !this.activeChestSlots[slotIdx]) return;
    const slot = this.activeChestSlots[slotIdx];

    // Case 1: Cursor empty
    if (!this.cursorSlot.item) {
      if (slot.item && slot.count > 0) {
        if (isRightClick && slot.count > 1) {
          const half = Math.ceil(slot.count / 2);
          this.cursorSlot = { item: slot.item, count: half };
          slot.count -= half;
        } else {
          this.cursorSlot = { item: slot.item, count: slot.count };
          slot.item = null;
          slot.count = 0;
        }
      }
    }
    // Case 2: Cursor holding item
    else {
      if (!slot.item) {
        if (isRightClick) {
          slot.item = this.cursorSlot.item;
          slot.count = 1;
          this.cursorSlot.count -= 1;
          if (this.cursorSlot.count <= 0) this.cursorSlot.item = null;
        } else {
          slot.item = this.cursorSlot.item;
          slot.count = this.cursorSlot.count;
          this.cursorSlot = { item: null, count: 0 };
        }
      } else if (slot.item.id === this.cursorSlot.item.id) {
        const space = slot.item.maxStack - slot.count;
        if (space > 0) {
          if (isRightClick) {
            slot.count += 1;
            this.cursorSlot.count -= 1;
            if (this.cursorSlot.count <= 0) this.cursorSlot.item = null;
          } else {
            const add = Math.min(space, this.cursorSlot.count);
            slot.count += add;
            this.cursorSlot.count -= add;
            if (this.cursorSlot.count <= 0) this.cursorSlot.item = null;
          }
        }
      } else {
        // Swap
        const temp = { item: slot.item, count: slot.count };
        slot.item = this.cursorSlot.item;
        slot.count = this.cursorSlot.count;
        this.cursorSlot = temp;
      }
    }

    this.updateCursorVisual();
    this.refreshChestUI();
    this.refreshChestPlayerSlotsUI();
  }

  public refreshChestUI(): void {
    if (!this.activeChestSlots) return;

    for (let i = 0; i < this.chestSlotContainers.length; i++) {
      const container = this.chestSlotContainers[i];
      const slotData = this.activeChestSlots[i];
      if (!container) continue;

      const icon = container.getByName('icon') as Phaser.GameObjects.Image;
      const countLabel = container.getByName('count') as Phaser.GameObjects.Text;

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
  }

  public refreshChestPlayerSlotsUI(): void {
    for (let slotIndex = 0; slotIndex < GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS; slotIndex++) {
      const container = this.chestPlayerSlotContainers[slotIndex];
      if (!container) continue;

      const slotData = this.player.inventory[slotIndex];
      const icon = container.getByName('icon') as Phaser.GameObjects.Image;
      const countLabel = container.getByName('count') as Phaser.GameObjects.Text;

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
    this.updateHotbarVisuals();
  }

  private lootAllChest(): void {
    if (!this.activeChestSlots) return;
    let anyLooted = false;
    for (const slot of this.activeChestSlots) {
      if (slot && slot.item && slot.count > 0) {
        const added = this.player.addItem(slot.item.id, slot.count);
        if (added) {
          slot.item = null;
          slot.count = 0;
          anyLooted = true;
        }
      }
    }
    if (anyLooted) {
      this.gameScene.sounds.play('pickup');
      this.refreshChestUI();
      this.refreshChestPlayerSlotsUI();
    }
  }

  private depositMatchingToChest(): void {
    if (!this.activeChestSlots) return;
    let anyDeposited = false;
    const chestItemIds = new Set<string>();
    for (const s of this.activeChestSlots) {
      if (s.item) chestItemIds.add(s.item.id);
    }

    for (const pSlot of this.player.inventory) {
      if (pSlot.item && chestItemIds.has(pSlot.item.id)) {
        for (const cSlot of this.activeChestSlots) {
          if (cSlot.item && cSlot.item.id === pSlot.item.id && cSlot.count < cSlot.item.maxStack) {
            const space = cSlot.item.maxStack - cSlot.count;
            const take = Math.min(space, pSlot.count);
            cSlot.count += take;
            pSlot.count -= take;
            anyDeposited = true;
            if (pSlot.count <= 0) {
              pSlot.item = null;
              pSlot.count = 0;
              break;
            }
          }
        }
      }
    }
    if (anyDeposited) {
      this.gameScene.sounds.play('place');
      this.refreshChestUI();
      this.refreshChestPlayerSlotsUI();
    }
  }

  private createCursorItemVisual(): void {
    this.cursorItemSprite = this.add.image(0, 0, 'icon_pickaxe');
    this.cursorItemSprite.setDisplaySize(28, 28);
    this.cursorItemSprite.setDepth(200);
    this.cursorItemSprite.setVisible(false);

    this.cursorItemText = this.add.text(0, 0, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.cursorItemText.setDepth(201);
    this.cursorItemText.setVisible(false);
  }

  private updateCursorVisual(): void {
    const isHolding = Boolean(this.cursorSlot.item && this.cursorSlot.count > 0);
    this.cursorManager.setHoldingItem(isHolding);

    if (isHolding && this.cursorSlot.item) {
      this.cursorItemSprite.setTexture(this.cursorSlot.item.iconTexture);
      this.cursorItemSprite.setVisible(true);
      if (this.cursorSlot.count > 1) {
        this.cursorItemText.setText(`${this.cursorSlot.count}`);
        this.cursorItemText.setVisible(true);
      } else {
        this.cursorItemText.setVisible(false);
      }
    } else {
      this.cursorItemSprite.setVisible(false);
      this.cursorItemText.setVisible(false);
    }
  }

  // =========================================================================
  // DETAILED RPG HOVER TOOLTIP
  // =========================================================================

  private createHoverTooltip(): void {
    this.tooltipBox = this.add.container(0, 0);
    this.tooltipBox.setDepth(180);
    this.tooltipBox.setVisible(false);

    this.tooltipBg = this.add.graphics();
    this.tooltipBox.add(this.tooltipBg);

    this.tooltipTitle = this.add.text(12, 10, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#ffffff'
    });
    this.tooltipBox.add(this.tooltipTitle);

    this.tooltipMeta = this.add.text(12, 28, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#94a3b8'
    });
    this.tooltipBox.add(this.tooltipMeta);

    this.tooltipStats = this.add.text(12, 48, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#38bdf8',
      lineSpacing: 3
    });
    this.tooltipBox.add(this.tooltipStats);

    this.tooltipDesc = this.add.text(12, 90, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#cbd5e1',
      wordWrap: { width: 220 }
    });
    this.tooltipBox.add(this.tooltipDesc);

    this.tooltipObtain = this.add.text(12, 136, '', {
      fontFamily: 'monospace',
      fontSize: '9px',
      color: '#eab308'
    });
    this.tooltipBox.add(this.tooltipObtain);
  }

  public showTooltip(item: ItemData): void {
    const boxW = 240;
    const boxH = 160;

    const color = RARITY_COLORS[item.rarity] || '#ffffff';
    this.tooltipTitle.setText(item.name);
    this.tooltipTitle.setColor(color);

    this.tooltipMeta.setText(`[${item.rarity}] ${item.category} • Wartość: ${item.value} monet`);

    // Build stats strings
    const stats: string[] = [];
    if (item.damage) stats.push(`🗡 Obrażenia: +${item.damage}`);
    if (item.toolPower) stats.push(`⛏ Siła kopania: ${item.toolPower}`);
    if (item.defense) stats.push(`🛡 Obrona: +${item.defense}`);
    if (item.critChance) stats.push(`🎯 Krytyk: +${Math.round(item.critChance * 100)}%`);
    if (item.speedBonus) stats.push(`💨 Prędkość: +${Math.round(item.speedBonus * 100)}%`);
    if (item.hpBonus) stats.push(`❤ Max HP: +${item.hpBonus}`);
    if (item.manaBonus) stats.push(`✨ Max Mana: +${item.manaBonus}`);
    if (item.healAmount) stats.push(`🧪 Leczy: +${item.healAmount} HP`);
    if (item.manaHealAmount) stats.push(`🧪 Odnawia: +${item.manaHealAmount} MP`);

    this.tooltipStats.setText(stats.join('\n'));
    this.tooltipDesc.setText(`"${item.description}"`);
    this.tooltipObtain.setText(`Źródło: ${item.obtainInfo}`);

    this.tooltipBg.clear();
    this.tooltipBg.fillStyle(0x0c0f17, 0.96);
    this.tooltipBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 1);
    this.tooltipBg.fillRoundedRect(0, 0, boxW, boxH, 6);
    this.tooltipBg.strokeRoundedRect(0, 0, boxW, boxH, 6);

    this.tooltipBox.setVisible(true);
  }

  public hideTooltip(): void {
    this.tooltipBox.setVisible(false);
  }

  // =========================================================================
  // UI REFRESH AND REPOSITIONING
  // =========================================================================

  public refreshInventoryUI(): void {
    // 1. Refresh all 45 inventory slots (Hotbar 0..8 + Backpack 9..44)
    for (let slotIndex = 0; slotIndex < GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS; slotIndex++) {
      const slotContainer = this.invSlots[slotIndex];
      if (!slotContainer) continue;

      const slotData = this.player.inventory[slotIndex];
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

    // 2. Refresh 8 equipment slots
    for (const slotKey of Object.keys(this.equipSlots)) {
      const container = this.equipSlots[slotKey];
      const equipData = this.player.equipment[slotKey];
      const icon = container.getByName('icon') as Phaser.GameObjects.Image;
      const placeholder = container.getByName('placeholder') as Phaser.GameObjects.Text;

      if (equipData && equipData.item) {
        icon.setTexture(equipData.item.iconTexture);
        icon.setVisible(true);
        placeholder.setVisible(false);
      } else {
        icon.setVisible(false);
        placeholder.setVisible(true);
      }
    }

    // 3. Refresh Character Stats Display
    const statValues = [
      `Poziom gracza: ${this.player.level}`,
      `Maksymalne HP: ${this.player.maxHp} HP`,
      `Maksymalna MP: ${this.player.maxMana} MP`,
      `Całkowita Obrona: ${this.player.defense} OBR`,
      `Szansa na krytyk: ${Math.round(this.player.critChance * 100)}%`,
      `Bonus prędkości: +${Math.round(this.player.speedBonus * 100)}%`,
      `Wybrany kilof: ${this.player.getSelectedItem()?.toolPower || 8}`
    ];

    statValues.forEach((val, idx) => {
      const txt = this.invContainer.getByName(`stat_${idx}`) as Phaser.GameObjects.Text;
      if (txt) txt.setText(val);
    });

    // 4. Update Hotbar
    this.updateHotbarVisuals();
  }

  private repositionUI(): void {
    const slotSize = 46;
    const padding = 5;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(240, Math.floor((this.scale.width - totalWidth) / 2));
    const startY = 16;

    for (let i = 0; i < this.hotbarSlots.length; i++) {
      this.hotbarSlots[i].setPosition(startX + i * (slotSize + padding), startY);
    }

    if (this.itemTooltipText) {
      this.itemTooltipText.setPosition(startX, 70);
    }

    this.repositionBossBar();
  }

  public update(): void {
    if (!this.player) return;

    this.updateStatsBars();
    this.updateHotbarVisuals();
    this.updateDepthDisplay();
    this.updateDeathScreen();

    // Bezpiecznik kursora: jeśli element UI lub overlay HTML zniknął pod kursorem (brak gameobjectout/mouseleave),
    // natychmiast przywracamy normalne wykrywanie kursora świata.
    if (this.cursorManager && this.cursorManager.isUIHovered()) {
      const hits = this.input.hitTestPointer(this.input.activePointer);
      const domHover = typeof document !== 'undefined' && document.querySelector('.interactive:hover') !== null;
      if (hits.length === 0 && !domHover) {
        this.cursorManager.setUIHover(false);
      }
    }
  }

  private updateStatsBars(): void {
    this.hpBar.clear();
    this.hpBar.fillStyle(0x3a141a, 0.9);
    this.hpBar.fillRoundedRect(24, 29, 194, 7, 3);
    const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.hpBar.fillStyle(0xe63946, 1);
    this.hpBar.fillRoundedRect(24, 29, 194 * hpRatio, 7, 3);
    this.hpText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp} HP`);

    this.manaBar.clear();
    this.manaBar.fillStyle(0x132a40, 0.9);
    this.manaBar.fillRoundedRect(24, 50, 194, 7, 3);
    const manaRatio = Phaser.Math.Clamp(this.player.mana / this.player.maxMana, 0, 1);
    this.manaBar.fillStyle(0x38bdf8, 1);
    this.manaBar.fillRoundedRect(24, 50, 194 * manaRatio, 7, 3);
    this.manaText.setText(`${Math.ceil(this.player.mana)} / ${this.player.maxMana} MP`);

    this.xpBar.clear();
    this.xpBar.fillStyle(0x382c10, 0.9);
    this.xpBar.fillRoundedRect(24, 73, 194, 5, 2);
    const xpRatio = Phaser.Math.Clamp(this.player.xp / this.player.maxXp, 0, 1);
    this.xpBar.fillStyle(0xfacc15, 1);
    this.xpBar.fillRoundedRect(24, 73, 194 * xpRatio, 5, 2);
    this.levelText.setText(`Lv. ${this.player.level} [${this.player.xp} / ${this.player.maxXp} XP]`);
  }

  private updateHotbarVisuals(): void {
    const slotSize = 46;
    const padding = 5;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(240, Math.floor((this.scale.width - totalWidth) / 2));
    const startY = 16;

    for (let i = 0; i < GAME_CONSTANTS.HOTBAR_SLOTS; i++) {
      const slotContainer = this.hotbarSlots[i];
      if (!slotContainer) continue;

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

    const activeX = startX + this.player.selectedSlot * (slotSize + padding);
    this.slotHighlight.clear();
    this.slotHighlight.lineStyle(3, 0xf5c838, 1);
    this.slotHighlight.strokeRoundedRect(activeX - 2, startY - 2, slotSize + 4, slotSize + 4, 5);

    const activeItem = this.player.getSelectedItem();
    if (activeItem) {
      const color = RARITY_COLORS[activeItem.rarity] || '#ffffff';
      this.itemTooltipText.setColor(color);
      const count = this.player.getSelectedItemCount();
      this.itemTooltipText.setText(`${activeItem.name} ${count > 1 ? `(x${count})` : ''} - [${activeItem.category}]`);
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
    const timeStr = this.gameScene.dayNightSystem ? ` | ${this.gameScene.dayNightSystem.getTimeString()}` : '';
    this.depthText.setText(`[Biom: ${biome.polishName} | Głębokość: ${depthMeters}m] | Poziom ${this.player.level}${timeStr}`);
  }

  // =========================================================================
  // ORNATE PIXEL ART BOSS BAR HUD (GENERATED FROM RAPPENEM-INSPIRED DESIGN)
  // =========================================================================

  private static readonly BOSS_BAR_FRAME_W: number = 662;
  private static readonly BOSS_BAR_FILL_W: number = 473;
  private static readonly BOSS_BAR_FILL_H: number = 19;
  private static readonly BOSS_BAR_FILL_X: number = -236.5;
  private static readonly BOSS_BAR_FILL_Y: number = 3.5;

  private createBossBar(): void {
    this.bossBarContainer = this.add.container(0, 0);
    this.bossBarContainer.setDepth(120);
    this.bossBarContainer.setVisible(false);

    // 1. Recessed obsidian empty track groove (visible behind cropped fill)
    const bgGraphics = this.add.graphics();
    bgGraphics.setName('barBg');
    bgGraphics.fillStyle(0x090f1c, 0.94);
    bgGraphics.fillRect(
      UIScene.BOSS_BAR_FILL_X,
      UIScene.BOSS_BAR_FILL_Y - UIScene.BOSS_BAR_FILL_H / 2,
      UIScene.BOSS_BAR_FILL_W,
      UIScene.BOSS_BAR_FILL_H
    );
    bgGraphics.lineStyle(1, 0x162238, 0.9);
    for (let i = 1; i < 10; i++) {
      const divX = UIScene.BOSS_BAR_FILL_X + (UIScene.BOSS_BAR_FILL_W / 10) * i;
      bgGraphics.lineBetween(
        divX,
        UIScene.BOSS_BAR_FILL_Y - UIScene.BOSS_BAR_FILL_H / 2 + 1,
        divX,
        UIScene.BOSS_BAR_FILL_Y + UIScene.BOSS_BAR_FILL_H / 2 - 1
      );
    }
    this.bossBarContainer.add(bgGraphics);

    // 2. Dynamic generated segmented electric-cyan health fill sprite
    this.bossBarFillSprite = this.add.image(
      UIScene.BOSS_BAR_FILL_X,
      UIScene.BOSS_BAR_FILL_Y,
      'bossbar_vormak_fill'
    );
    this.bossBarFillSprite.setOrigin(0, 0.5);
    this.bossBarContainer.add(this.bossBarFillSprite);

    // 3. Generated ornate pixel-art frame overlay (central worm skull, horns, basalt wings & spine border)
    this.bossBarFrameImage = this.add.image(0, 0, 'bossbar_vormak_frame');
    this.bossBarFrameImage.setOrigin(0.5, 0.5);
    this.bossBarContainer.add(this.bossBarFrameImage);

    // 4. Hand-crafted crisp pixel-art serif "VORMAK" title sprite (zero blur box)
    this.bossBarTitleImage = this.add.image(0, -66, 'bossbar_vormak_title');
    this.bossBarTitleImage.setOrigin(0.5, 1);
    this.bossBarContainer.add(this.bossBarTitleImage);

    // Fallback text (hidden when displaying pixel title sprite for VORMAK)
    this.bossBarNameText = this.add.text(0, -68, 'VORMAK', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#38bdf8',
      fontStyle: 'bold',
      stroke: '#060912',
      strokeThickness: 4
    });
    this.bossBarNameText.setOrigin(0.5, 1);
    this.bossBarNameText.setVisible(false);
    this.bossBarContainer.add(this.bossBarNameText);

    // 5. Crisp HP readout centered cleanly under the central fangs
    this.bossBarHpText = this.add.text(0, 61, '1000 / 1000 HP (100%)', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e2e8f0',
      fontStyle: 'bold',
      stroke: '#040710',
      strokeThickness: 3,
      padding: { x: 4, y: 2 }
    });
    this.bossBarHpText.setOrigin(0.5, 0);
    this.bossBarContainer.add(this.bossBarHpText);

    this.repositionBossBar();
    this.ensureBossBarTexturesLoaded();
  }

  private ensureBossBarTexturesLoaded(): void {
    const required: Array<{ key: string; url: string }> = [
      { key: 'bossbar_vormak_frame', url: 'assets/textures/bossbar_vormak_frame.png?v=6.9' },
      { key: 'bossbar_vormak_fill', url: 'assets/textures/bossbar_vormak_fill.png?v=6.9' },
      { key: 'bossbar_vormak_title', url: 'assets/textures/bossbar_vormak_title.png?v=6.9' }
    ];

    const missing = required.filter(item => !this.textures.exists(item.key));
    if (missing.length === 0) return;

    // Prevent green __MISSING placeholder squares from flashing while loading
    if (!this.textures.exists('bossbar_vormak_fill')) this.bossBarFillSprite.setVisible(false);
    if (!this.textures.exists('bossbar_vormak_frame')) this.bossBarFrameImage.setVisible(false);
    if (!this.textures.exists('bossbar_vormak_title')) this.bossBarTitleImage.setVisible(false);

    missing.forEach(item => this.load.image(item.key, item.url));
    this.load.once('complete', () => {
      if (this.textures.exists('bossbar_vormak_fill')) {
        this.bossBarFillSprite.setTexture('bossbar_vormak_fill');
        this.bossBarFillSprite.setVisible(true);
      }
      if (this.textures.exists('bossbar_vormak_frame')) {
        this.bossBarFrameImage.setTexture('bossbar_vormak_frame');
        this.bossBarFrameImage.setVisible(true);
      }
      if (this.textures.exists('bossbar_vormak_title')) {
        this.bossBarTitleImage.setTexture('bossbar_vormak_title');
        this.bossBarTitleImage.setVisible(true);
      }
      this.repositionBossBar();
    });
    this.load.start();
  }

  public repositionBossBar(): void {
    if (!this.bossBarContainer) return;

    const targetWidth = Math.min(580, this.scale.width * 0.72);
    const barScale = Phaser.Math.Clamp(targetWidth / UIScene.BOSS_BAR_FRAME_W, 0.45, 0.92);
    const centerX = Math.floor(this.scale.width / 2);
    const posY = Math.floor(this.scale.height - 92 * barScale);

    this.bossBarContainer.setScale(barScale);
    this.bossBarContainer.setPosition(centerX, posY);

    this.renderBossBarFill();
  }

  public showBossBar(bossName: string, currentHp: number, maxHp: number): void {
    const cleanName = (bossName || 'VORMAK').split(',')[0].trim().toUpperCase();
    const isVormak = cleanName === 'VORMAK';
    this.bossBarTitleImage.setVisible(isVormak);
    this.bossBarNameText.setVisible(!isVormak);
    if (!isVormak) {
      this.bossBarNameText.setText(cleanName);
    }

    this.bossBarMaxHp = Math.max(1, maxHp);
    this.bossBarCurrentHp = Phaser.Math.Clamp(currentHp, 0, this.bossBarMaxHp);
    const ratio = this.bossBarCurrentHp / this.bossBarMaxHp;
    this.bossBarAnimWidth = 0; // Start empty and sweep-fill dramatically
    this.bossBarTargetWidth = UIScene.BOSS_BAR_FILL_W * ratio;
    this.renderBossBarFill();

    const pct = Math.round(ratio * 100);
    this.bossBarHpText.setText(`${this.bossBarCurrentHp} / ${this.bossBarMaxHp} HP (${pct}%)`);

    this.repositionBossBar();
    const targetY = this.bossBarContainer.y;

    this.bossBarContainer.setAlpha(0);
    this.bossBarContainer.setScale(0.84);
    this.bossBarContainer.y = targetY - 64;
    this.bossBarContainer.setVisible(true);

    this.tweens.killTweensOf(this.bossBarContainer);
    this.tweens.killTweensOf(this);

    // Slide & pop in bossbar frame
    this.tweens.add({
      targets: this.bossBarContainer,
      alpha: 1,
      y: targetY,
      scaleX: 1,
      scaleY: 1,
      duration: 650,
      ease: 'Back.easeOut'
    });

    // Sweep-fill HP bar from 0 to full
    this.tweens.add({
      targets: this,
      bossBarAnimWidth: this.bossBarTargetWidth,
      duration: 950,
      delay: 200,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        this.renderBossBarFill();
      }
    });
  }

  public updateBossBar(currentHp: number, maxHp: number): void {
    this.bossBarCurrentHp = Math.max(0, currentHp);
    this.bossBarMaxHp = Math.max(1, maxHp);

    const ratio = Phaser.Math.Clamp(this.bossBarCurrentHp / this.bossBarMaxHp, 0, 1);
    this.bossBarTargetWidth = UIScene.BOSS_BAR_FILL_W * ratio;

    const pct = Math.round(ratio * 100);
    this.bossBarHpText.setText(`${this.bossBarCurrentHp} / ${this.bossBarMaxHp} HP (${pct}%)`);

    // Smoothly animate the health fill crop reduction
    this.tweens.killTweensOf(this);
    this.tweens.add({
      targets: this,
      bossBarAnimWidth: this.bossBarTargetWidth,
      duration: 180,
      ease: 'Quad.easeOut',
      onUpdate: () => {
        this.renderBossBarFill();
      }
    });
  }

  public hideBossBar(): void {
    if (!this.bossBarContainer || !this.bossBarContainer.visible) return;
    this.tweens.killTweensOf(this.bossBarContainer);
    this.tweens.add({
      targets: this.bossBarContainer,
      alpha: 0,
      duration: 600,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.bossBarContainer.setVisible(false);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GTA-STYLE "ZGON" DEATH SCREEN
  // Sekwencja:
  //   Faza 1 (0–700 ms):    Slowmo + shake + czerwony tint na GameScene camera
  //   Faza 2 (700–1400 ms): Drain do B&W (tint → szary + biały wash)
  //   Faza 3 (1400–2000 ms): Pełny czerwony overlay w UIScene + białe "ZGON" pojawia się
  //   Faza 4 (2000–3100 ms): Tło czerwone → czarne, tekst biały → czerwony
  //   Faza 5 (3100–3500 ms): Czarny ekran, czerwony napis; respawn już odpalony
  // ─────────────────────────────────────────────────────────────────────────

  public showDeathScreen(): void {
    if (this.deathScreenActive) return;
    this.deathScreenActive = true;
    this.deathPhase = 1;
    this.deathPhaseTimer = 0;
    this.deathRespawned = false;

    // Slowmo fizyki GameScene natychmiast + mocny shake kamery
    this.applyDeathSlowmo(0.15);

    const cam = (this.gameScene as any)?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined;
    if (cam) {
      cam.shake(750, 0.016, true);
      if (cam.postFX) {
        if (this.deathColorFx) {
          cam.postFX.remove(this.deathColorFx as any);
          this.deathColorFx = null;
        }
        this.deathColorFx = cam.postFX.addColorMatrix();
      }
    }

    // Zbuduj pixel-art teksturę "ZGON" (na początku alpha=0)
    this.buildDeathTextTexture();

    // Stwórz overlay graphics
    if (this.deathOverlay) { this.deathOverlay.destroy(); this.deathOverlay = null; }
    this.deathOverlay = this.add.graphics();
    this.deathOverlay.setDepth(999);
  }

  private applyDeathSlowmo(factor: number): void {
    const gs = this.gameScene as any;
    if (gs?.physics?.world) {
      gs.physics.world.timeScale = factor < 0.01 ? 999 : (1 / factor);
    }
  }

  private restoreAfterDeath(): void {
    const gs = this.gameScene as any;
    if (gs?.physics?.world) {
      gs.physics.world.timeScale = 1;
    }
    const cam = (gs as any)?.cameras?.main as Phaser.Cameras.Scene2D.Camera | undefined;
    if (cam?.postFX && this.deathColorFx) {
      cam.postFX.remove(this.deathColorFx as any);
      this.deathColorFx = null;
    }
  }

  /**
   * Buduje masywny pixel-artowy napis "ZGON" (styl GTA / RPG pixel-art z grubym obrysem,
   * cieniem 3D i 3-tonowym cieniowaniem) na offscreen canvas i dodaje jako Phaser texture.
   */
  private buildDeathTextTexture(): void {
    const SCALE      = 6;  // px na piksel siatki (ostry pixel-art)
    const BORDER     = 2;  // grubość czarnego obrysu w pikselach siatki
    const SHADOW_Y   = 2;  // twardy cień 3D w dół
    const LETTER_GAP = 2;  // odstęp między literami w pikselach siatki

    const GLYPHS: Record<string, string[]> = {
      Z: [
        '############',
        '############',
        '############',
        '       #####',
        '      ##### ',
        '     #####  ',
        '    #####   ',
        '   #####    ',
        '  #####     ',
        ' #####      ',
        '#####       ',
        '############',
        '############',
        '############',
      ],
      G: [
        '  ########  ',
        ' ########## ',
        '############',
        '####    ####',
        '####        ',
        '####        ',
        '####  ######',
        '####  ######',
        '####    ####',
        '####    ####',
        '####    ####',
        '############',
        ' ########## ',
        '  ########  ',
      ],
      O: [
        '  ########  ',
        ' ########## ',
        '############',
        '####    ####',
        '####    ####',
        '####    ####',
        '####    ####',
        '####    ####',
        '####    ####',
        '####    ####',
        '####    ####',
        '############',
        ' ########## ',
        '  ########  ',
      ],
      N: [
        '####    ####',
        '#####   ####',
        '######  ####',
        '######  ####',
        '####### ####',
        '#### #######',
        '#### #######',
        '####  ######',
        '####  ######',
        '####   #####',
        '####   #####',
        '####    ####',
        '####    ####',
        '####    ####',
      ],
    };

    const LETTERS = ['Z', 'G', 'O', 'N'];
    const GLYPH_W = 12;
    const GLYPH_H = 14;

    const totalDotW = LETTERS.length * GLYPH_W + (LETTERS.length - 1) * LETTER_GAP + BORDER * 2;
    const totalDotH = GLYPH_H + BORDER * 2 + SHADOW_Y;
    const texW = totalDotW * SCALE;
    const texH = totalDotH * SCALE;

    const KEY = '__zgon_death_tex__';
    if (this.textures.exists(KEY)) this.textures.remove(KEY);

    const canvas = document.createElement('canvas');
    canvas.width  = texW;
    canvas.height = texH;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const drawDot = (dotX: number, dotY: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(dotX * SCALE, dotY * SCALE, SCALE, SCALE);
    };

    const getPixel = (li: number, gx: number, gy: number): boolean => {
      const g = GLYPHS[LETTERS[li]];
      if (!g || gy < 0 || gy >= GLYPH_H || gx < 0 || gx >= GLYPH_W) return false;
      return g[gy][gx] === '#';
    };

    // 1. Twardy cień 3D przesunięty w dół (SHADOW_Y) + obrys
    for (let li = 0; li < LETTERS.length; li++) {
      const baseX = BORDER + li * (GLYPH_W + LETTER_GAP);
      for (let gy = -BORDER; gy < GLYPH_H + BORDER + SHADOW_Y; gy++) {
        for (let gx = -BORDER; gx < GLYPH_W + BORDER; gx++) {
          let hitShadow = false;
          for (let dy = -BORDER; dy <= BORDER && !hitShadow; dy++) {
            for (let dx = -BORDER; dx <= BORDER && !hitShadow; dx++) {
              if (getPixel(li, gx + dx, gy - SHADOW_Y + dy)) hitShadow = true;
            }
          }
          if (hitShadow) drawDot(baseX + gx, BORDER + gy, '#090202');
        }
      }
    }

    // 2. Pełny czarny obrys 8-kierunkowy wokół liter
    for (let li = 0; li < LETTERS.length; li++) {
      const baseX = BORDER + li * (GLYPH_W + LETTER_GAP);
      for (let gy = -BORDER; gy < GLYPH_H + BORDER; gy++) {
        for (let gx = -BORDER; gx < GLYPH_W + BORDER; gx++) {
          if (getPixel(li, gx, gy)) continue;
          let outline = false;
          for (let dy = -BORDER; dy <= BORDER && !outline; dy++) {
            for (let dx = -BORDER; dx <= BORDER && !outline; dx++) {
              if (dx === 0 && dy === 0) continue;
              if (getPixel(li, gx + dx, gy + dy)) outline = true;
            }
          }
          if (outline) drawDot(baseX + gx, BORDER + gy, '#000000');
        }
      }
    }

    // 3. Wypełnienie z 3-tonowym cieniowaniem (ładnie współgra z setTint biały -> czerwony)
    for (let li = 0; li < LETTERS.length; li++) {
      const baseX = BORDER + li * (GLYPH_W + LETTER_GAP);
      for (let gy = 0; gy < GLYPH_H; gy++) {
        let shade = '#ededed';
        if (gy <= 2) shade = '#ffffff';
        else if (gy >= 10 && gy <= 11) shade = '#d4d4d4';
        else if (gy >= 12) shade = '#b8b8b8';

        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (getPixel(li, gx, gy)) drawDot(baseX + gx, BORDER + gy, shade);
        }
      }
    }

    this.textures.addCanvas(KEY, canvas);
    this.textures.get(KEY)?.setFilter(Phaser.Textures.FilterMode.NEAREST);

    if (this.deathTextCanvas) { this.deathTextCanvas.destroy(); this.deathTextCanvas = null; }
    this.deathTextCanvas = this.add.image(this.scale.width / 2, this.scale.height / 2, KEY);
    this.deathTextCanvas.setDepth(1001);
    this.deathTextCanvas.setAlpha(0);
    this.deathTextCanvas.setOrigin(0.5, 0.5);
    this.deathTextCanvas.setTint(0xffffff);
  }

  /**
   * Wywoływane z update() — steruje całą sekwencją ekranu zgonu.
   */
  private updateDeathScreen(): void {
    if (!this.deathScreenActive) return;

    const delta = this.game.loop.delta;
    this.deathPhaseTimer += delta;
    const t   = this.deathPhaseTimer;
    const W   = this.scale.width;
    const H   = this.scale.height;

    if (!this.deathOverlay || !this.deathTextCanvas) return;

    // ── Faza 1 (0–700 ms): Slowmo + shake + czerwony ekran ────────────────
    if (t < 700) {
      const p = t / 700;
      this.deathOverlay.clear();
      this.deathOverlay.fillStyle(0xcc0000, p * 0.52);
      this.deathOverlay.fillRect(0, 0, W, H);

    // ── Faza 2 (700–1400 ms): Przejście w czarno-biały ────────────────────
    } else if (t < 1400) {
      const p = (t - 700) / 700;
      if (this.deathPhase < 2) this.deathPhase = 2;

      // Świat gry staje się czarno-biały
      if (this.deathColorFx) {
        this.deathColorFx.grayscale(p);
      }

      // Czerwony odcień z fazy 1 zanika do lekkiego B&W wash
      this.deathOverlay.clear();
      const redAlpha = 0.52 * (1 - p);
      if (redAlpha > 0.01) {
        this.deathOverlay.fillStyle(0xcc0000, redAlpha);
        this.deathOverlay.fillRect(0, 0, W, H);
      }
      this.deathOverlay.fillStyle(0xd8d8d8, p * 0.16);
      this.deathOverlay.fillRect(0, 0, W, H);

    // ── Faza 3 (1400–2050 ms): Czerwony ekran + białe "ZGON" + shake ──────
    } else if (t < 2050) {
      const p = (t - 1400) / 650;
      if (this.deathPhase < 3) {
        this.deathPhase = 3;
        this.cameras.main.shake(200, 0.007, true);
      }

      if (this.deathColorFx) {
        this.deathColorFx.grayscale(1);
      }

      // Głęboki czerwony ekran (widać pod nim czarno-biały świat jak w GTA, pod koniec prawie pełny czerwony)
      this.deathOverlay.clear();
      this.deathOverlay.fillStyle(0xbb0000, 0.68 + Math.min(p, 1) * 0.28);
      this.deathOverlay.fillRect(0, 0, W, H);

      // "ZGON" pojawia się białe (z lekkim uderzeniem skali)
      const pop = 1 + (1 - Math.min(p * 2.5, 1)) * 0.12;
      this.deathTextCanvas.setScale(pop);
      this.deathTextCanvas.setAlpha(Math.min(p * 2.2, 1.0));
      this.deathTextCanvas.setTint(0xffffff);

    // ── Faza 4 (2050–3100 ms): Tło czerwone→czarne, tekst biały→czerwony ───
    } else if (t < 3100) {
      const p = (t - 2050) / 1050;
      if (this.deathPhase < 4) this.deathPhase = 4;

      // Tło: czerwone (0xbb0000) → całkowicie czarne (0x000000, alpha 1.0 - nic nie widać)
      const r = Math.round(187 * (1 - p));
      const bgAlpha = 0.96 + p * 0.04;
      this.deathOverlay.clear();
      this.deathOverlay.fillStyle((r << 16) >>> 0, bgAlpha);
      this.deathOverlay.fillRect(0, 0, W, H);

      // Tekst: biały → czerwony
      const tG = Math.round(255 * (1 - p));
      const tB = Math.round(255 * (1 - p));
      this.deathTextCanvas.setScale(1);
      this.deathTextCanvas.setAlpha(1);
      this.deathTextCanvas.setTint(Phaser.Display.Color.GetColor(255, tG, tB));

      // Respawn w połowie fazy 4 pod czarną kurtyną
      if (!this.deathRespawned && t >= 2800) {
        this.deathRespawned = true;
        this.player.respawn();
        this.restoreAfterDeath();
      }

    // ── Faza 5 (3100+ ms): Czarny ekran + czerwony napis → fade-out ────────
    } else {
      this.deathOverlay.clear();
      this.deathOverlay.fillStyle(0x000000, 1.0);
      this.deathOverlay.fillRect(0, 0, W, H);

      this.deathTextCanvas.setAlpha(1);
      this.deathTextCanvas.setTint(0xff2222);

      if (t > 3600) {
        this.hideDeathScreen();
      }
    }
  }

  /**
   * Chowa ekran zgonu (fade-out). Wywoływane automatycznie po fazie 5.
   */
  public hideDeathScreen(): void {
    if (!this.deathScreenActive) return;
    this.deathScreenActive = false;
    this.deathPhase = 0;
    this.deathPhaseTimer = 0;
    this.restoreAfterDeath();

    if (this.deathOverlay) {
      this.tweens.add({
        targets: this.deathOverlay, alpha: 0, duration: 500, ease: 'Sine.easeOut',
        onComplete: () => { if (this.deathOverlay) { this.deathOverlay.destroy(); this.deathOverlay = null; } }
      });
    }
    if (this.deathTextCanvas) {
      this.tweens.add({
        targets: this.deathTextCanvas, alpha: 0, duration: 400, ease: 'Sine.easeOut',
        onComplete: () => { if (this.deathTextCanvas) { this.deathTextCanvas.destroy(); this.deathTextCanvas = null; } }
      });
    }
  }

  private renderBossBarFill(): void {
    if (!this.bossBarFillSprite) return;

    const cropW = Math.round(Phaser.Math.Clamp(this.bossBarAnimWidth, 0, UIScene.BOSS_BAR_FILL_W));
    if (cropW < 1) {
      this.bossBarFillSprite.setVisible(false);
      return;
    }

    this.bossBarFillSprite.setVisible(true);
    this.bossBarFillSprite.setCrop(0, 0, cropW, UIScene.BOSS_BAR_FILL_H);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MENU PAUZY POD ESC (styl Main Menu: WZNÓW, USTAWIENIA, WRÓĆ DO MENU, WYJDŹ)
  // ─────────────────────────────────────────────────────────────────────────

  public togglePauseMenu(forceState?: boolean): void {
    if (this.deathScreenActive) return;
    const next = forceState !== undefined ? forceState : !this.isPauseMenuOpen;
    if (next === this.isPauseMenuOpen) return;

    if (next) {
      this.openPauseMenu();
    } else {
      this.closePauseMenu();
    }
  }

  private openPauseMenu(): void {
    this.isPauseMenuOpen = true;
    if (this.gameScene) {
      this.gameScene.isPaused = true;
      this.gameScene.physics.pause();
    }

    // Panel sterowania w prawym górnym rogu pojawia się z powrotem pod ESC
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) {
      const hudAllowed = localStorage.getItem('delveria_controls_hud') !== '0';
      uiOverlay.style.display = hudAllowed ? '' : 'none';
    }

    const W = this.scale.width;
    const H = this.scale.height;
    const root = this.add.container(0, 0).setDepth(900);

    const backdrop = this.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x010308, 0.74)
      .setInteractive();

    const title = this.add.text(W / 2, H * 0.27, 'PAUZA', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '42px',
      fontStyle: 'bold',
      color: '#7dd3fc',
      stroke: '#02040a',
      strokeThickness: 6,
      letterSpacing: 8,
    }).setOrigin(0.5, 0.5);

    const gap = 58;
    const startY = H * 0.44;
    const items: { label: string; primary: boolean; onClick: () => void }[] = [
      { label: 'WZNÓW', primary: true, onClick: () => this.closePauseMenu() },
      { label: 'USTAWIENIA', primary: false, onClick: () => this.openPauseSettingsModal('sound') },
      { label: 'WRÓĆ DO MENU', primary: false, onClick: () => this.returnToMainMenu() },
      { label: 'WYJDŹ Z GRY', primary: false, onClick: () => this.quitFromPause() },
    ];

    root.add([backdrop, title]);

    items.forEach((item, idx) => {
      const btn = this.createPauseMenuButton(W / 2, startY + idx * gap, 276, 46, item.label, item.primary, item.onClick);
      root.add(btn);
    });

    this.pauseMenuContainer = root;
  }

  private closePauseMenu(): void {
    this.isPauseMenuOpen = false;
    this.closePauseSettingsModal();

    if (this.pauseMenuContainer) {
      this.pauseMenuContainer.destroy();
      this.pauseMenuContainer = null;
    }

    if (this.gameScene) {
      this.gameScene.isPaused = false;
      this.gameScene.inputLockTimer = 280; // Blokuje przypadkowy atak po kliknięciu WZNÓW
      this.gameScene.physics.resume();
      // Jeśli minęło już 15 sekund gry, chowamy z powrotem panel sterowania
      if (this.gameScene.controlsHudExpired) {
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) uiOverlay.style.display = 'none';
      }
    }
  }

  private returnToMainMenu(): void {
    this.closePauseSettingsModal();
    if (this.pauseMenuContainer) {
      this.pauseMenuContainer.destroy();
      this.pauseMenuContainer = null;
    }
    this.isPauseMenuOpen = false;
    if (this.gameScene) {
      this.gameScene.isPaused = false;
      this.gameScene.physics.resume();
    }
    const uiOverlay = document.getElementById('ui-overlay');
    if (uiOverlay) uiOverlay.style.display = 'none';

    this.scene.stop('GameScene');
    this.scene.stop('UIScene');
    this.scene.start('MainMenuScene');
  }

  private async quitFromPause(): Promise<void> {
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri?.core?.invoke) {
        await tauri.core.invoke('quit_app');
        return;
      }
    } catch {
      // Fallback
    }
    window.close();
  }

  private createPauseMenuButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    primary: boolean,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const label = this.add.text(0, 0, text, {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: primary ? '20px' : '16px',
      fontStyle: 'bold',
      color: primary ? '#e0f2fe' : '#cbd5e1',
      stroke: '#02040a',
      strokeThickness: 4,
      letterSpacing: 3,
    }).setOrigin(0.5, 0.5);

    const ornaments = this.add.text(0, 0, `◆   ${' '.repeat(text.length + 2)}   ◆`, {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '14px',
      color: '#7dd3fc',
    }).setOrigin(0.5, 0.5).setAlpha(0);

    const drawBg = (hovered: boolean) => {
      const hw = width / 2;
      const hh = height / 2;
      bg.clear();
      const fillMain = primary ? (hovered ? 0x0e2d4d : 0x081a30) : (hovered ? 0x131d33 : 0x070b15);
      const borderMain = primary ? (hovered ? 0x7dd3fc : 0x38bdf8) : (hovered ? 0xc084fc : 0x334155);
      const gemColor = primary ? 0x7dd3fc : (hovered ? 0xe879f9 : 0x475569);

      bg.fillStyle(0x02040a, 0.98);
      bg.fillRect(-hw - 3, -hh - 3, width + 6, height + 6);
      bg.fillStyle(fillMain, 0.94);
      bg.fillRect(-hw, -hh, width, height);
      bg.fillStyle(0xffffff, hovered ? 0.16 : 0.06);
      bg.fillRect(-hw + 2, -hh + 2, width - 4, 3);
      bg.fillStyle(0x000000, 0.35);
      bg.fillRect(-hw + 2, hh - 4, width - 4, 2);
      bg.lineStyle(hovered ? 2 : 1, borderMain, hovered ? 1 : 0.85);
      bg.strokeRect(-hw, -hh, width, height);

      const cSz = 4;
      bg.fillStyle(gemColor, 1);
      bg.fillRect(-hw - 1, -hh - 1, cSz, cSz);
      bg.fillRect(hw - cSz + 1, -hh - 1, cSz, cSz);
      bg.fillRect(-hw - 1, hh - cSz + 1, cSz, cSz);
      bg.fillRect(hw - cSz + 1, hh - cSz + 1, cSz, cSz);
    };

    drawBg(false);
    container.add([bg, ornaments, label]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      if (this.pauseSettingsModal) return;
      drawBg(true);
      label.setColor('#ffffff');
      ornaments.setAlpha(1);
      this.tweens.add({ targets: container, scale: 1.04, duration: 90, ease: 'Sine.easeOut' });
    });
    container.on('pointerout', () => {
      drawBg(false);
      label.setColor(primary ? '#e0f2fe' : '#cbd5e1');
      ornaments.setAlpha(0);
      this.tweens.add({ targets: container, scale: 1.0, duration: 90, ease: 'Sine.easeOut' });
    });
    container.on('pointerdown', () => {
      if (this.pauseSettingsModal) return;
      onClick();
    });

    return container;
  }

  private cleanupPauseModalListeners(): void {
    if (this.pauseKeyListener) {
      window.removeEventListener('keydown', this.pauseKeyListener, true);
      this.pauseKeyListener = null;
    }
    if (this.pauseSliderMove) {
      this.input.off('pointermove', this.pauseSliderMove);
      this.pauseSliderMove = null;
    }
    if (this.pauseSliderUp) {
      this.input.off('pointerup', this.pauseSliderUp);
      this.pauseSliderUp = null;
    }
  }

  private closePauseSettingsModal(): void {
    this.pauseListeningKey = null;
    this.cleanupPauseModalListeners();
    if (this.pauseSettingsModal) {
      this.pauseSettingsModal.destroy();
      this.pauseSettingsModal = null;
    }
  }

  private openPauseSettingsModal(tab: 'sound' | 'controls' | 'graphics'): void {
    this.closePauseSettingsModal();

    const W = this.scale.width;
    const H = this.scale.height;
    const modal = this.add.container(W / 2, H / 2).setDepth(950);

    const backdrop = this.add.rectangle(0, 0, W * 2, H * 2, 0x000000, 0.01).setInteractive();
    const pw = 620, ph = 460;
    const panel = this.add.graphics();
    panel.fillStyle(0x010308, 0.98);
    panel.fillRect(-pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8);
    panel.fillStyle(0x050914, 0.98);
    panel.fillRect(-pw / 2, -ph / 2, pw, ph);
    panel.fillStyle(0x091428, 1);
    panel.fillRect(-pw / 2, -ph / 2, pw, 50);
    panel.lineStyle(2, 0x38bdf8, 0.9);
    panel.strokeRect(-pw / 2, -ph / 2, pw, ph);
    panel.lineStyle(1, 0x1e293b, 1);
    panel.lineBetween(-pw / 2, -ph / 2 + 50, pw / 2, -ph / 2 + 50);

    const header = this.add.text(-pw / 2 + 24, -ph / 2 + 25, 'USTAWIENIA', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#7dd3fc',
      letterSpacing: 4,
    }).setOrigin(0, 0.5);

    const closeX = pw / 2 - 26, closeY = -ph / 2 + 25;
    const closeBg = this.add.graphics();
    const drawClose = (hover: boolean) => {
      closeBg.clear();
      closeBg.fillStyle(hover ? 0x7f1d1d : 0x0e172a, 1);
      closeBg.fillRect(closeX - 15, closeY - 15, 30, 30);
      closeBg.lineStyle(1, hover ? 0xf87171 : 0x334155, 1);
      closeBg.strokeRect(closeX - 15, closeY - 15, 30, 30);
    };
    drawClose(false);
    const closeTxt = this.add.text(closeX, closeY, '✕', {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#e2e8f0',
    }).setOrigin(0.5, 0.5);
    const closeHit = this.add.rectangle(closeX, closeY, 34, 34, 0x000000, 0).setInteractive({ useHandCursor: true });
    closeHit.on('pointerover', () => drawClose(true));
    closeHit.on('pointerout', () => drawClose(false));
    closeHit.on('pointerdown', () => this.closePauseSettingsModal());

    modal.add([backdrop, panel, header, closeBg, closeTxt, closeHit]);

    const tabs: { id: 'sound' | 'controls' | 'graphics'; label: string }[] = [
      { id: 'sound', label: 'DŹWIĘK' },
      { id: 'controls', label: 'STEROWANIE' },
      { id: 'graphics', label: 'GRAFIKA' },
    ];
    const tabW = 176, tabH = 36, tabGap = 12;
    const tabStartX = -(tabW + tabGap);
    const tabY = -ph / 2 + 80;

    tabs.forEach((t, idx) => {
      const tx = tabStartX + idx * (tabW + tabGap);
      const act = tab === t.id;
      const tBg = this.add.graphics();
      tBg.fillStyle(act ? 0x0c2440 : 0x090e1a, 1);
      tBg.fillRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH);
      tBg.lineStyle(act ? 2 : 1, act ? 0x38bdf8 : 0x1e293b, 1);
      tBg.strokeRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH);
      const tTxt = this.add.text(tx, tabY, t.label, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: act ? '#ffffff' : '#94a3b8',
        letterSpacing: 2,
      }).setOrigin(0.5, 0.5);
      const tHit = this.add.rectangle(tx, tabY, tabW, tabH, 0x000000, 0).setInteractive({ useHandCursor: true });
      tHit.on('pointerdown', () => {
        if (tab !== t.id) this.openPauseSettingsModal(t.id);
      });
      modal.add([tBg, tTxt, tHit]);
    });

    const contentTopY = -ph / 2 + 136;
    const boxW = pw - 68;

    const getNum = (k: string, def: number) => {
      const v = localStorage.getItem(k);
      if (v === null) return def;
      const n = parseFloat(v);
      return Number.isNaN(n) ? def : Phaser.Math.Clamp(n, 0, 1);
    };

    const addSlider = (rowIdx: number, title: string, desc: string, val: number, onChange: (v: number) => void) => {
      const ry = contentTopY + rowIdx * 72;
      const rBg = this.add.graphics();
      rBg.fillStyle(0x080e1c, 0.92);
      rBg.fillRect(-boxW / 2, ry - 26, boxW, 56);
      rBg.lineStyle(1, 0x1e293b, 1);
      rBg.strokeRect(-boxW / 2, ry - 26, boxW, 56);

      const tLbl = this.add.text(-boxW / 2 + 16, ry - 9, title, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#e2e8f0',
      }).setOrigin(0, 0.5);
      const tDesc = this.add.text(-boxW / 2 + 16, ry + 11, desc, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '11px',
        color: '#64748b',
      }).setOrigin(0, 0.5);

      const trackW = 152, trackX = boxW / 2 - 218;
      const pctText = this.add.text(boxW / 2 - 16, ry, `${Math.round(val * 100)}%`, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#7dd3fc',
      }).setOrigin(1, 0.5);

      const sG = this.add.graphics();
      const drawS = (v: number) => {
        sG.clear();
        sG.fillStyle(0x0f172a, 1);
        sG.fillRect(trackX, ry - 5, trackW, 10);
        sG.lineStyle(1, 0x334155, 1);
        sG.strokeRect(trackX, ry - 5, trackW, 10);
        const fw = Math.round(trackW * v);
        if (fw > 0) {
          sG.fillStyle(0x0284c7, 1);
          sG.fillRect(trackX + 1, ry - 4, Math.max(0, fw - 1), 8);
          sG.fillStyle(0x38bdf8, 1);
          sG.fillRect(trackX + 1, ry - 4, Math.max(0, fw - 1), 3);
        }
        const kx = trackX + fw;
        sG.fillStyle(0xe0f2fe, 1);
        sG.fillRect(kx - 5, ry - 10, 10, 20);
        sG.lineStyle(1, 0x0284c7, 1);
        sG.strokeRect(kx - 5, ry - 10, 10, 20);
      };
      drawS(val);

      const upd = (p: Phaser.Input.Pointer) => {
        const v = Phaser.Math.Clamp((p.x - W / 2 - trackX) / trackW, 0, 1);
        drawS(v);
        pctText.setText(`${Math.round(v * 100)}%`);
        onChange(v);
      };

      const hit = this.add.rectangle(trackX + trackW / 2, ry, trackW + 20, 34, 0x000000, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', (p: Phaser.Input.Pointer) => {
        upd(p);
        this.cleanupPauseModalListeners();
        this.pauseSliderMove = (mp: Phaser.Input.Pointer) => { if (mp.isDown) upd(mp); };
        this.pauseSliderUp = () => this.cleanupPauseModalListeners();
        this.input.on('pointermove', this.pauseSliderMove);
        this.input.on('pointerup', this.pauseSliderUp);
      });
      modal.add([rBg, tLbl, tDesc, sG, pctText, hit]);
    };

    const addSwitch = (ry: number, title: string, desc: string, init: boolean, onToggle: (v: boolean) => void) => {
      const rBg = this.add.graphics();
      rBg.fillStyle(0x080e1c, 0.92);
      rBg.fillRect(-boxW / 2, ry - 22, boxW, 46);
      rBg.lineStyle(1, 0x1e293b, 1);
      rBg.strokeRect(-boxW / 2, ry - 22, boxW, 46);

      const tLbl = this.add.text(-boxW / 2 + 16, ry - 7, title, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e2e8f0',
      }).setOrigin(0, 0.5);
      const tDesc = this.add.text(-boxW / 2 + 16, ry + 9, desc, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '11px',
        color: '#64748b',
      }).setOrigin(0, 0.5);

      const swX = boxW / 2 - 48;
      const swG = this.add.graphics();
      const drawSw = (on: boolean) => {
        swG.clear();
        swG.fillStyle(on ? 0x0369a1 : 0x1e293b, 1);
        swG.fillRect(swX - 28, ry - 11, 56, 22);
        swG.lineStyle(1, on ? 0x7dd3fc : 0x475569, 1);
        swG.strokeRect(swX - 28, ry - 11, 56, 22);
        swG.fillStyle(on ? 0xe0f2fe : 0x94a3b8, 1);
        swG.fillRect(on ? swX + 4 : swX - 24, ry - 8, 20, 16);
      };
      drawSw(init);

      let curr = init;
      const hit = this.add.rectangle(swX, ry, 64, 30, 0x000000, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        curr = !curr;
        drawSw(curr);
        onToggle(curr);
      });
      modal.add([rBg, tLbl, tDesc, swG, hit]);
    };

    if (tab === 'sound') {
      addSlider(0, 'Głośność główna', 'Ogólny poziom dźwięku w całej grze', getNum('delveria_vol_master', 1), (v) => {
        this.sound.volume = v;
        this.sound.mute = v <= 0.001;
        localStorage.setItem('delveria_vol_master', v.toFixed(2));
      });
      addSlider(1, 'Muzyka w tle', 'Głośność ścieżki dźwiękowej podczas gry', getNum('delveria_vol_music', 0.8), (v) => {
        localStorage.setItem('delveria_vol_music', v.toFixed(2));
      });
      addSlider(2, 'Efekty dźwiękowe (SFX)', 'Kopanie, walka, boss i interfejs', getNum('delveria_vol_sfx', 1), (v) => {
        localStorage.setItem('delveria_vol_sfx', v.toFixed(2));
      });
    } else if (tab === 'controls') {
      const defaults: Record<string, string> = { left: 'A', right: 'D', jump: 'W', inventory: 'E', drop: 'Q', music: 'M' };
      let saved: Record<string, string> = { ...defaults };
      try {
        const r = localStorage.getItem('delveria_keybinds');
        if (r) saved = { ...defaults, ...JSON.parse(r) };
      } catch {}

      const actions = [
        { key: 'left', label: 'Ruch w lewo' },
        { key: 'right', label: 'Ruch w prawo' },
        { key: 'jump', label: 'Skok (lub SPACE)' },
        { key: 'inventory', label: 'Ekwipunek i crafting' },
        { key: 'drop', label: 'Wyrzucenie przedmiotu' },
        { key: 'music', label: 'Muzyka WŁ. / WYŁ.' },
      ];

      actions.forEach((act, idx) => {
        const ry = contentTopY - 6 + idx * 42;
        const rBg = this.add.graphics();
        rBg.fillStyle(0x080e1c, 0.9);
        rBg.fillRect(-boxW / 2, ry - 17, boxW, 36);
        rBg.lineStyle(1, 0x1e293b, 0.9);
        rBg.strokeRect(-boxW / 2, ry - 17, boxW, 36);

        const lbl = this.add.text(-boxW / 2 + 16, ry, act.label, {
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '14px',
          color: '#e2e8f0',
        }).setOrigin(0, 0.5);

        const btnX = boxW / 2 - 74;
        const kBg = this.add.graphics();
        const drawK = (l: boolean) => {
          kBg.clear();
          kBg.fillStyle(l ? 0x0c4a6e : 0x0f172a, 1);
          kBg.fillRect(btnX - 58, ry - 13, 116, 26);
          kBg.lineStyle(1, l ? 0xfacc15 : 0x38bdf8, 1);
          kBg.strokeRect(btnX - 58, ry - 13, 116, 26);
        };
        drawK(false);

        const kTxt = this.add.text(btnX, ry, saved[act.key], {
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#7dd3fc',
        }).setOrigin(0.5, 0.5);

        const hit = this.add.rectangle(btnX, ry, 120, 30, 0x000000, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          this.pauseListeningKey = act.key;
          drawK(true);
          kTxt.setText('NACIŚNIJ...');
          kTxt.setColor('#fde047');

          if (this.pauseKeyListener) window.removeEventListener('keydown', this.pauseKeyListener, true);
          this.pauseKeyListener = (ev: KeyboardEvent) => {
            ev.preventDefault();
            ev.stopPropagation();
            if (ev.key === 'Escape') {
              drawK(false);
              kTxt.setText(saved[act.key]);
              kTxt.setColor('#7dd3fc');
              this.pauseListeningKey = null;
              window.removeEventListener('keydown', this.pauseKeyListener!, true);
              this.pauseKeyListener = null;
              return;
            }
            const norm = ev.code === 'Space' ? 'SPACE'
              : ev.code.startsWith('Key') && ev.code.length === 4 ? ev.code.slice(3).toUpperCase()
              : /^[a-zA-Z]$/.test(ev.key) ? ev.key.toUpperCase() : null;
            if (norm) {
              saved[act.key] = norm;
              localStorage.setItem('delveria_keybinds', JSON.stringify(saved));
              drawK(false);
              kTxt.setText(norm);
              kTxt.setColor('#7dd3fc');
              this.pauseListeningKey = null;
              window.removeEventListener('keydown', this.pauseKeyListener!, true);
              this.pauseKeyListener = null;
            }
          };
          window.addEventListener('keydown', this.pauseKeyListener, true);
        });

        modal.add([rBg, lbl, kBg, kTxt, hit]);
      });

      const footerY = ph / 2 - 36;
      const info = this.add.text(-boxW / 2, footerY, 'Zmiana klawiszy obowiązuje od kolejnego wejścia do gry', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '11px',
        color: '#64748b',
      }).setOrigin(0, 0.5);
      modal.add(info);
    } else if (tab === 'graphics') {
      const fpsY = contentTopY + 8;
      const fpsBox = this.add.graphics();
      fpsBox.fillStyle(0x080e1c, 0.92);
      fpsBox.fillRect(-boxW / 2, fpsY - 30, boxW, 74);
      fpsBox.lineStyle(1, 0x1e293b, 1);
      fpsBox.strokeRect(-boxW / 2, fpsY - 30, boxW, 74);
      const fpsTitle = this.add.text(-boxW / 2 + 16, fpsY - 14, 'LIMIT KLATEK (FPS)', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e2e8f0',
      }).setOrigin(0, 0.5);
      modal.add([fpsBox, fpsTitle]);

      let curFps = localStorage.getItem('delveria_fps') || '60';
      const fpsOpts = [
        { val: '30', label: '30' },
        { val: '60', label: '60' },
        { val: '120', label: '120' },
        { val: '144', label: '144' },
        { val: '240', label: '240' },
        { val: '300', label: '300' },
        { val: 'unlimited', label: 'MAX' },
      ];
      const optW = 68, optGap = 6;
      const totalOptW = fpsOpts.length * optW + (fpsOpts.length - 1) * optGap;
      const optStartX = -totalOptW / 2 + optW / 2;
      const optY = fpsY + 18;
      const drawers: (() => void)[] = [];

      fpsOpts.forEach((opt, i) => {
        const ox = optStartX + i * (optW + optGap);
        const oBg = this.add.graphics();
        const oTxt = this.add.text(ox, optY, opt.label, {
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#cbd5e1',
        }).setOrigin(0.5, 0.5);
        const drawOpt = () => {
          const sel = curFps === opt.val;
          oBg.clear();
          oBg.fillStyle(sel ? 0x0369a1 : 0x0f172a, 1);
          oBg.fillRect(ox - optW / 2, optY - 13, optW, 26);
          oBg.lineStyle(sel ? 2 : 1, sel ? 0x7dd3fc : 0x334155, 1);
          oBg.strokeRect(ox - optW / 2, optY - 13, optW, 26);
          oTxt.setColor(sel ? '#ffffff' : '#94a3b8');
        };
        drawOpt();
        drawers.push(drawOpt);

        const oHit = this.add.rectangle(ox, optY, optW, 28, 0x000000, 0).setInteractive({ useHandCursor: true });
        oHit.on('pointerdown', () => {
          curFps = opt.val;
          localStorage.setItem('delveria_fps', curFps);
          const target = curFps === 'unlimited' ? 999 : parseInt(curFps, 10);
          const loop = this.game.loop as any;
          if (loop) { loop.targetFps = target; loop._target = 1000 / target; }
          drawers.forEach(fn => fn());
        });
        modal.add([oBg, oTxt, oHit]);
      });

      addSlider(1.25, 'Wstrząsy kamery (Shake)', 'Siła drgań ekranu podczas walki z bossem', getNum('delveria_shake_val', 1), (v) => {
        localStorage.setItem('delveria_shake_val', v.toFixed(2));
      });

      const fsInit = localStorage.getItem('delveria_fullscreen') === '1';
      addSwitch(contentTopY + 178, 'Pełny ekran', 'Przełącza okno gry w tryb pełnoekranowy', fsInit, async (v) => {
        localStorage.setItem('delveria_fullscreen', v ? '1' : '0');
        try {
          const tauri = (window as any).__TAURI__;
          if (tauri?.core?.invoke) await tauri.core.invoke('set_fullscreen', { fullscreen: v });
        } catch {}
      });

      const hudInit = localStorage.getItem('delveria_controls_hud') !== '0';
      addSwitch(contentTopY + 236, 'Podpowiedzi klawiszy (HUD)', 'Pokazuje panel skrótów w prawym górnym rogu', hudInit, (v) => {
        localStorage.setItem('delveria_controls_hud', v ? '1' : '0');
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay) uiOverlay.style.display = v ? '' : 'none';
      });
    }

    this.pauseSettingsModal = modal;
  }
}
