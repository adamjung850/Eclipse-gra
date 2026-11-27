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
import {
  getAutoSaveEnabled,
  getAutoSaveIntervalSec,
  getCurrentUser,
  getSaveMetaForCurrentUser,
  saveGameProgress,
  setAutoSaveEnabled,
  setAutoSaveIntervalSec,
} from '../systems/AccountSystem.js';

export class UIScene extends Phaser.Scene {
  private player!: Player;
  private gameScene!: GameScene;
  private cursorManager!: CursorManager;

  // HUD Top Elements
  private hotbarBg!: Phaser.GameObjects.Graphics;
  private hotbarSlots: Phaser.GameObjects.Container[] = [];
  private slotHighlight!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private manaText!: Phaser.GameObjects.Text;
  private xpBar!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private depthBg!: Phaser.GameObjects.Graphics;
  private depthText!: Phaser.GameObjects.Text;
  private itemTooltipBg!: Phaser.GameObjects.Graphics;
  private itemTooltipText!: Phaser.GameObjects.Text;
  private craftTabVisuals: { id: string; bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; x: number; y: number; w: number; h: number }[] = [];

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
  private dragOrigin: { kind: 'inv' | 'equip' | 'chest'; index: number | string; x: number; y: number } | null = null;
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
        this.tooltipBox.setPosition(Math.min(this.scale.width - 252, pointer.x + 14), Math.min(this.scale.height - 172, pointer.y + 14));
      }
    });

    // Drop holding item if clicked in world background while inventory is open
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isInventoryOpen && this.cursorSlot.item) {
        const panelW = 1040;
        const leftX = Math.max(20, Math.floor((this.scale.width - panelW) / 2));
        const topY = Math.max(92, Math.floor((this.scale.height - 560) / 2));
        if (pointer.x < leftX || pointer.x > leftX + panelW || pointer.y < topY || pointer.y > topY + 560) {
          this.dropCursorItem();
        }
      }
    });

    this.input.on('pointerup', () => {
      this.dragOrigin = null;
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
      if (this.gameScene) this.gameScene.inputLockTimer = 200;
    }
    this.syncControlsOverlayForModals();
  }

  private syncControlsOverlayForModals(): void {
    const uiOverlay = document.getElementById('ui-overlay');
    if (!uiOverlay) return;
    if (this.isInventoryOpen || this.isChestOpen) {
      uiOverlay.style.display = 'none';
    } else if (!this.gameScene.isPaused && !this.gameScene.controlsHudExpired) {
      let showHud = true;
      try {
        const saved = localStorage.getItem('delveria_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.controlsHud !== undefined) showHud = Boolean(parsed.controlsHud);
        }
      } catch { /* ignore */ }
      uiOverlay.style.display = showHud ? '' : 'none';
    }
  }

  // =========================================================================
  // HUD (TOP BARS & HOTBAR) — STYL DELVERII
  // =========================================================================

  private drawCrystalPanel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    borderColor: number = 0x1e3a5f,
    cornerColor: number = 0x38bdf8,
    alpha: number = 0.92,
    radius: number = 8
  ): void {
    g.fillStyle(0x070b14, alpha);
    g.fillRoundedRect(x, y, w, h, radius);

    // Subtelny górny połysk szkła
    g.fillStyle(0xffffff, 0.04);
    g.fillRoundedRect(x + 2, y + 2, w - 4, Math.min(18, h * 0.35), { tl: radius - 1, tr: radius - 1, bl: 0, br: 0 });

    // Zewnętrzna i wewnętrzna ramka
    g.lineStyle(2, borderColor, 0.95);
    g.strokeRoundedRect(x, y, w, h, radius);
    g.lineStyle(1, cornerColor, 0.28);
    g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, Math.max(2, radius - 2));

    // Ozdobne krystaliczne narożniki
    const c = 6;
    g.lineStyle(2, cornerColor, 0.85);
    // Lewy górny
    g.lineBetween(x + 1, y + c, x + 1, y + 1);
    g.lineBetween(x + 1, y + 1, x + c, y + 1);
    // Prawy górny
    g.lineBetween(x + w - c, y + 1, x + w - 1, y + 1);
    g.lineBetween(x + w - 1, y + 1, x + w - 1, y + c);
    // Lewy dolny
    g.lineBetween(x + 1, y + h - c, x + 1, y + h - 1);
    g.lineBetween(x + 1, y + h - 1, x + c, y + h - 1);
    // Prawy dolny
    g.lineBetween(x + w - c, y + h - 1, x + w - 1, y + h - 1);
    g.lineBetween(x + w - 1, y + h - c, x + w - 1, y + h - 1);
  }

  private addSlotHitbox(
    container: Phaser.GameObjects.Container,
    slotSize: number,
    onDown: (p: Phaser.Input.Pointer) => void,
    onUp: ((p: Phaser.Input.Pointer) => void) | null,
    onOver: () => void,
    onOut: () => void
  ): void {
    const hit = this.add.rectangle(slotSize / 2, slotSize / 2, slotSize, slotSize, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onDown);
    if (onUp) hit.on('pointerup', onUp);
    hit.on('pointerover', onOver);
    hit.on('pointerout', onOut);
    container.add(hit);
  }

  private drawCrystalSlot(
    g: Phaser.GameObjects.Graphics,
    size: number,
    borderColor: number = 0x26354d,
    accentAlpha: number = 0.16,
    bgColor: number = 0x0b111e
  ): void {
    g.clear();
    g.fillStyle(bgColor, 0.94);
    g.fillRoundedRect(0, 0, size, size, 5);
    // Wewnętrzny cień u góry
    g.fillStyle(0x03050a, 0.55);
    g.fillRoundedRect(2, 2, size - 4, 5, 2);
    // Zewnętrzna ramka + subtelny akcent
    g.lineStyle(1.5, borderColor, 0.95);
    g.strokeRoundedRect(0, 0, size, size, 5);
    g.lineStyle(1, 0x38bdf8, accentAlpha);
    g.strokeRoundedRect(2, 2, size - 4, size - 4, 3);
  }

  private createHealthAndMana(): void {
    const bg = this.add.graphics();
    this.drawCrystalPanel(bg, 14, 14, 240, 92, 0x1e3a5f, 0x38bdf8, 0.92, 8);

    // Etykiety / odznaki po lewej stronie pasków
    this.add.text(24, 22, '♥', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#fb7185',
      fontStyle: 'bold'
    });
    this.add.text(24, 47, '✦', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#38bdf8',
      fontStyle: 'bold'
    });
    this.add.text(24, 72, '★', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '11px',
      color: '#fbbf24',
      fontStyle: 'bold'
    });

    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(242, 22, '100 / 100', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#ffe4e6',
      fontStyle: 'bold',
      stroke: '#03050a',
      strokeThickness: 2
    }).setOrigin(1, 0);

    this.manaBar = this.add.graphics();
    this.manaText = this.add.text(242, 47, '50 / 50', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#e0f2fe',
      fontStyle: 'bold',
      stroke: '#03050a',
      strokeThickness: 2
    }).setOrigin(1, 0);

    this.xpBar = this.add.graphics();
    this.levelText = this.add.text(42, 72, 'Poz. 1  •  0 / 100 XP', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#fde68a',
      fontStyle: 'bold',
      stroke: '#03050a',
      strokeThickness: 2
    });
  }

  private createHotbar(): void {
    const slotSize = 46;
    const padding = 6;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(272, Math.floor((this.scale.width - totalWidth) / 2));
    const startY = 18;

    this.hotbarBg = this.add.graphics();
    this.drawCrystalPanel(this.hotbarBg, startX - 10, startY - 7, totalWidth + 20, slotSize + 14, 0x1e3a5f, 0x38bdf8, 0.9, 8);

    this.hotbarSlots = [];

    for (let i = 0; i < GAME_CONSTANTS.HOTBAR_SLOTS; i++) {
      const slotX = startX + i * (slotSize + padding);
      const slotContainer = this.add.container(slotX, startY);

      const box = this.add.graphics();
      this.drawCrystalSlot(box, slotSize, 0x2a3b55, 0.14, 0x0b111e);
      slotContainer.add(box);

      const numLabel = this.add.text(4, 3, `${i + 1}`, {
        fontFamily: 'Consolas, monospace',
        fontSize: '9px',
        color: '#64748b',
        fontStyle: 'bold'
      });
      slotContainer.add(numLabel);

      const icon = this.add.image(slotSize / 2, slotSize / 2 + 1, 'icon_pickaxe');
      icon.setDisplaySize(28, 28);
      icon.setVisible(false);
      icon.setName('icon');
      slotContainer.add(icon);

      const countLabel = this.add.text(slotSize - 4, slotSize - 3, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#03050a',
        strokeThickness: 3
      });
      countLabel.setOrigin(1, 1);
      countLabel.setName('count');
      slotContainer.add(countLabel);

      this.addSlotHitbox(
        slotContainer,
        slotSize,
        (pointer: Phaser.Input.Pointer) => {
          if (!this.isInventoryOpen) {
            this.player.selectedSlot = i;
          } else {
            this.handleSlotClick(i, pointer.rightButtonDown());
          }
        },
        null,
        () => {
          const item = this.player.inventory[i]?.item;
          if (item) this.showTooltip(item);
        },
        () => {
          this.hideTooltip();
        }
      );

      this.hotbarSlots.push(slotContainer);
    }

    this.slotHighlight = this.add.graphics();
  }

  private createDepthInfo(): void {
    this.depthBg = this.add.graphics();
    this.drawCrystalPanel(this.depthBg, 14, 112, 240, 28, 0x1e293b, 0x38bdf8, 0.88, 6);

    this.depthText = this.add.text(24, 126, 'Zielone Równiny • 0m', {
      fontFamily: 'Consolas, monospace',
      fontSize: '10px',
      color: '#cbd5e1',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
  }

  private createItemTooltip(): void {
    const slotSize = 46;
    const padding = 6;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(272, Math.floor((this.scale.width - totalWidth) / 2));
    const centerX = startX + totalWidth / 2;

    this.itemTooltipBg = this.add.graphics();
    this.itemTooltipText = this.add.text(centerX, 82, '', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#fde047',
      fontStyle: 'bold',
      stroke: '#03050a',
      strokeThickness: 2
    }).setOrigin(0.5, 0.5);
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
    overlay.fillStyle(0x03050a, 0.72);
    overlay.fillRect(0, 0, 3000, 2000);
    this.invContainer.add(overlay);

    // --- LEFT PANEL: PLAYER, EQUIPMENT & BACKPACK ---
    const panelW = 540;
    const craftW = 480;
    const gap = 20;
    const totalW = panelW + gap + craftW;
    const panelX = Math.max(20, Math.floor((this.scale.width - totalW) / 2));
    const panelY = Math.max(92, Math.floor((this.scale.height - 560) / 2));
    const panelH = 560;

    const leftPanelBg = this.add.graphics();
    this.drawCrystalPanel(leftPanelBg, panelX, panelY, panelW, panelH, 0x1e3a5f, 0x38bdf8, 0.96, 10);
    // Pasek nagłówka
    leftPanelBg.fillStyle(0x0f1a2d, 0.9);
    leftPanelBg.fillRoundedRect(panelX + 4, panelY + 4, panelW - 8, 36, { tl: 7, tr: 7, bl: 0, br: 0 });
    leftPanelBg.lineStyle(1, 0x38bdf8, 0.25);
    leftPanelBg.lineBetween(panelX + 8, panelY + 40, panelX + panelW - 8, panelY + 40);
    this.invContainer.add(leftPanelBg);

    // Title
    const title = this.add.text(panelX + 18, panelY + 22, 'POSTAĆ & EKWIPUNEK', {
      fontFamily: 'Consolas, monospace',
      fontSize: '14px',
      color: '#e0f2fe',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.invContainer.add(title);

    const hintClose = this.add.text(panelX + panelW - 52, panelY + 22, '[E]', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#64748b',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);
    this.invContainer.add(hintClose);

    // Close Button [✕] w ramce
    const closeCont = this.add.container(panelX + panelW - 26, panelY + 22);
    const closeBg = this.add.graphics();
    const drawClose = (hover: boolean) => {
      closeBg.clear();
      closeBg.fillStyle(hover ? 0x7f1d1d : 0x141d2f, 0.95);
      closeBg.lineStyle(1.5, hover ? 0xf87171 : 0x334155, 1);
      closeBg.fillRoundedRect(-12, -12, 24, 24, 5);
      closeBg.strokeRoundedRect(-12, -12, 24, 24, 5);
    };
    drawClose(false);
    const btnClose = this.add.text(0, 0, '✕', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#fca5a5',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    closeCont.add([closeBg, btnClose]);
    closeCont.setSize(24, 24);
    closeCont.setInteractive({ useHandCursor: true });
    closeCont.on('pointerover', () => drawClose(true));
    closeCont.on('pointerout', () => drawClose(false));
    closeCont.on('pointerdown', () => this.toggleInventory(false));
    this.invContainer.add(closeCont);

    // Stats Box
    this.createCharacterStatsSection(panelX + 18, panelY + 48);

    // Equipment Slots (8 slots)
    this.createEquipmentSlotsSection(panelX + 254, panelY + 48);

    // Full 45 Slots: Hotbar (0-8) + Backpack (9-44)
    this.createAllInventorySlotsSection(panelX + 18, panelY + 224);

    // --- RIGHT PANEL: CRAFTING WORKSHOP ---
    this.createCraftingPanel(panelX + panelW + gap, panelY, craftW, panelH);
  }

  private createCharacterStatsSection(x: number, y: number): void {
    const box = this.add.graphics();
    this.drawCrystalPanel(box, x, y, 224, 166, 0x26354d, 0x38bdf8, 0.85, 6);
    this.invContainer.add(box);

    const statsHeader = this.add.text(x + 12, y + 10, 'PARAMETRY BOJOWE', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#fbbf24',
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
      const txt = this.add.text(x + 12, y + 30 + idx * 18.5, label, {
        fontFamily: 'Consolas, monospace',
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
      { slot: EquipSlotType.CHEST, label: 'Zbroja', ox: 68, oy: 0 },
      { slot: EquipSlotType.LEGS, label: 'Spodnie', ox: 136, oy: 0 },
      { slot: EquipSlotType.BOOTS, label: 'Buty', ox: 204, oy: 0 },
      { slot: EquipSlotType.RING_1, label: 'Pierść. 1', ox: 0, oy: 84 },
      { slot: EquipSlotType.RING_2, label: 'Pierść. 2', ox: 68, oy: 84 },
      { slot: EquipSlotType.AMULET, label: 'Amulet', ox: 136, oy: 84 },
      { slot: EquipSlotType.CAPE, label: 'Peleryna', ox: 204, oy: 84 }
    ];

    const slotSize = 50;

    equipDefs.forEach((def) => {
      const container = this.add.container(x + def.ox, y + def.oy);

      const box = this.add.graphics();
      this.drawCrystalSlot(box, slotSize, 0x3b4d6b, 0.2, 0x0b1220);
      container.add(box);

      const placeholderLabel = this.add.text(slotSize / 2, slotSize + 10, def.label, {
        fontFamily: 'Consolas, monospace',
        fontSize: '9px',
        color: '#64748b',
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

      this.addSlotHitbox(
        container,
        slotSize,
        (pointer: Phaser.Input.Pointer) => this.onSlotPointerDown('equip', def.slot, pointer),
        (pointer: Phaser.Input.Pointer) => this.onSlotPointerUp('equip', def.slot, pointer),
        () => {
          const item = this.player.equipment[def.slot]?.item;
          if (item) this.showTooltip(item);
        },
        () => this.hideTooltip()
      );

      this.invContainer.add(container);
      this.equipSlots[def.slot] = container;
    });
  }

  private createAllInventorySlotsSection(x: number, y: number): void {
    const slotSize = 48;
    const padding = 8;
    this.invSlots = new Array(GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS);

    // --- 1. HOTBAR SECTION (Sloty 1 - 9, index 0..8) ---
    const hotbarLabel = this.add.text(x, y - 4, 'PAS SZYBKIEGO WYBORU (1 - 9)', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#fbbf24',
      fontStyle: 'bold'
    });
    this.invContainer.add(hotbarLabel);

    const hotbarY = y + 14;
    for (let col = 0; col < 9; col++) {
      const slotIdx = col;
      const slotX = x + col * (slotSize + padding);

      const container = this.add.container(slotX, hotbarY);

      const box = this.add.graphics();
      this.drawCrystalSlot(box, slotSize, 0xd97706, 0.16, 0x0f1523);
      container.add(box);

      const numLabel = this.add.text(4, 3, `${col + 1}`, {
        fontFamily: 'Consolas, monospace',
        fontSize: '9px',
        color: '#fbbf24',
        fontStyle: 'bold'
      });
      container.add(numLabel);

      const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
      icon.setDisplaySize(28, 28);
      icon.setVisible(false);
      icon.setName('icon');
      container.add(icon);

      const countLabel = this.add.text(slotSize - 4, slotSize - 3, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '11px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#03050a',
        strokeThickness: 3
      });
      countLabel.setOrigin(1, 1);
      countLabel.setName('count');
      container.add(countLabel);

      this.addSlotHitbox(
        container,
        slotSize,
        (pointer: Phaser.Input.Pointer) => this.onSlotPointerDown('inv', slotIdx, pointer),
        (pointer: Phaser.Input.Pointer) => this.onSlotPointerUp('inv', slotIdx, pointer),
        () => {
          const item = this.player.inventory[slotIdx]?.item;
          if (item) this.showTooltip(item);
        },
        () => this.hideTooltip()
      );

      this.invContainer.add(container);
      this.invSlots[slotIdx] = container;
    }

    // --- 2. BACKPACK SECTION (Sloty 10 - 45, index 9..44) ---
    const backpackLabelY = hotbarY + slotSize + 12;
    const bpLabel = this.add.text(x, backpackLabelY, 'GŁÓWNY PLECAK', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#7dd3fc',
      fontStyle: 'bold'
    });
    this.invContainer.add(bpLabel);

    const bpSlotsY = backpackLabelY + 16;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 9; col++) {
        const slotIdx = 9 + row * 9 + col;
        const slotX = x + col * (slotSize + padding);
        const slotY = bpSlotsY + row * (slotSize + padding);

        const container = this.add.container(slotX, slotY);

        const box = this.add.graphics();
        this.drawCrystalSlot(box, slotSize, 0x26354d, 0.14, 0x0b111e);
        container.add(box);

        const icon = this.add.image(slotSize / 2, slotSize / 2, 'icon_pickaxe');
        icon.setDisplaySize(28, 28);
        icon.setVisible(false);
        icon.setName('icon');
        container.add(icon);

        const countLabel = this.add.text(slotSize - 4, slotSize - 3, '', {
          fontFamily: 'Consolas, monospace',
          fontSize: '11px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#03050a',
          strokeThickness: 3
        });
        countLabel.setOrigin(1, 1);
        countLabel.setName('count');
        container.add(countLabel);

        this.addSlotHitbox(
          container,
          slotSize,
          (pointer: Phaser.Input.Pointer) => this.onSlotPointerDown('inv', slotIdx, pointer),
          (pointer: Phaser.Input.Pointer) => this.onSlotPointerUp('inv', slotIdx, pointer),
          () => {
            const item = this.player.inventory[slotIdx]?.item;
            if (item) this.showTooltip(item);
          },
          () => this.hideTooltip()
        );

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
    this.drawCrystalPanel(bg, x, y, w, h, 0x1e3a5f, 0x38bdf8, 0.96, 10);
    bg.fillStyle(0x0f1a2d, 0.9);
    bg.fillRoundedRect(x + 4, y + 4, w - 8, 36, { tl: 7, tr: 7, bl: 0, br: 0 });
    bg.lineStyle(1, 0x38bdf8, 0.25);
    bg.lineBetween(x + 8, y + 40, x + w - 8, y + 40);
    this.invContainer.add(bg);

    const title = this.add.text(x + 18, y + 22, 'WARSZTAT RZEMIEŚLNICZY', {
      fontFamily: 'Consolas, monospace',
      fontSize: '14px',
      color: '#fde047',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.invContainer.add(title);

    // Active station detection indicator
    this.craftStationText = this.add.text(x + 18, y + 52, 'Aktywne stacje: Podręczny', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#7dd3fc'
    });
    this.invContainer.add(this.craftStationText);

    // Category Tabs (stylowe przyciski z podświetleniem aktywnej zakładki)
    const categories = [
      { id: 'all', label: 'Wszystko' },
      { id: 'tools', label: 'Narzędzia' },
      { id: 'weapons', label: 'Bronie' },
      { id: 'armor', label: 'Zbroje' },
      { id: 'blocks', label: 'Bloki' },
      { id: 'consumables', label: 'Mikstury' }
    ];

    this.craftTabVisuals = [];
    const tabW = 71;
    const tabH = 24;
    const tabGap = 4;

    categories.forEach((cat, idx) => {
      const tabX = x + 16 + idx * (tabW + tabGap);
      const tabY = y + 74;

      const tabBg = this.add.graphics();
      const tabLabel = this.add.text(tabX + tabW / 2, tabY + tabH / 2, cat.label, {
        fontFamily: 'Consolas, monospace',
        fontSize: '10px',
        color: '#cbd5e1',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0.5);

      const hit = this.add.rectangle(tabX + tabW / 2, tabY + tabH / 2, tabW, tabH, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => {
        this.craftCategory = cat.id;
        this.refreshCraftingRecipes();
      });

      this.invContainer.add([tabBg, tabLabel, hit]);
      this.craftTabVisuals.push({ id: cat.id, bg: tabBg, label: tabLabel, x: tabX, y: tabY, w: tabW, h: tabH });
    });

    // Recipe List Scrollable Container
    this.recipeListContainer = this.add.container(x + 16, y + 108);
    this.invContainer.add(this.recipeListContainer);
  }

  private refreshCraftingRecipes(): void {
    if (!this.player || !this.gameScene) return;

    // Odśwież wygląd zakładek kategorii
    for (const t of this.craftTabVisuals) {
      const active = t.id === this.craftCategory;
      t.bg.clear();
      t.bg.fillStyle(active ? 0x1e3a5f : 0x0d1422, 0.95);
      t.bg.lineStyle(1.5, active ? 0x38bdf8 : 0x26354d, 1);
      t.bg.fillRoundedRect(t.x, t.y, t.w, t.h, 5);
      t.bg.strokeRoundedRect(t.x, t.y, t.w, t.h, 5);
      t.label.setColor(active ? '#fde047' : '#94a3b8');
    }

    // Detect nearby stations
    this.activeStationSet = this.player.getNearbyStations(this.gameScene.worldManager);

    const stationNames: string[] = ['Podręczny'];
    if (this.activeStationSet.has(CraftingStation.WORKBENCH)) stationNames.push('Stół rzemieślniczy');
    if (this.activeStationSet.has(CraftingStation.FURNACE)) stationNames.push('Piec hutniczy');
    if (this.activeStationSet.has(CraftingStation.ANVIL)) stationNames.push('Kowadło');

    this.craftStationText.setText(`Aktywne stacje: ${stationNames.join(' • ')}`);

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

      const rowY = idx * (itemH + 5);
      const row = this.add.container(0, rowY);

      // Check if player has all ingredients
      const canCraft = recipe.ingredients.every((ing) => this.player.hasItem(ing.itemId, ing.count));

      // Row background
      const rowBg = this.add.graphics();
      rowBg.fillStyle(canCraft ? 0x0f1d33 : 0x0b101b, 0.92);
      rowBg.lineStyle(1.5, canCraft ? 0x38bdf8 : 0x1e293b, canCraft ? 0.65 : 0.8);
      rowBg.fillRoundedRect(0, 0, 448, itemH, 6);
      rowBg.strokeRoundedRect(0, 0, 448, itemH, 6);
      row.add(rowBg);

      // Slot pod ikonę wyniku
      const iconSlot = this.add.graphics();
      this.drawCrystalSlot(iconSlot, 40, canCraft ? 0x38bdf8 : 0x26354d, 0.14, 0x070b14);
      iconSlot.setPosition(10, 9);
      row.add(iconSlot);

      // Result Icon
      const icon = this.add.image(30, itemH / 2, itemResult.iconTexture);
      icon.setDisplaySize(28, 28);
      row.add(icon);

      // Result Name & Quantity
      const nameColor = RARITY_COLORS[itemResult.rarity] || '#ffffff';
      const nameText = this.add.text(60, 10, `${itemResult.name}${recipe.resultCount > 1 ? ` ×${recipe.resultCount}` : ''}`, {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: nameColor,
        fontStyle: 'bold'
      });
      row.add(nameText);

      // Ingredients list
      const ingTexts = recipe.ingredients
        .map((ing) => {
          const ingData = ITEM_REGISTRY[ing.itemId];
          const ingName = ingData ? ingData.name : ing.itemId;
          return `${ingName}: ${ing.count}`;
        })
        .join('  •  ');

      const reqText = this.add.text(60, 29, ingTexts, {
        fontFamily: 'Consolas, monospace',
        fontSize: '10px',
        color: canCraft ? '#86efac' : '#94a3b8',
        wordWrap: { width: 290 }
      });
      row.add(reqText);

      // CRAFT BUTTON
      const btn = this.add.container(396, itemH / 2);
      const btnBg = this.add.graphics();
      const drawCraftBtn = (hover: boolean) => {
        btnBg.clear();
        if (canCraft) {
          btnBg.fillStyle(hover ? 0x15803d : 0x166534, 1);
          btnBg.lineStyle(1.5, hover ? 0x86efac : 0x22c55e, 1);
        } else {
          btnBg.fillStyle(0x161d2b, 0.9);
          btnBg.lineStyle(1, 0x334155, 0.8);
        }
        btnBg.fillRoundedRect(-40, -15, 80, 30, 5);
        btnBg.strokeRoundedRect(-40, -15, 80, 30, 5);
      };
      drawCraftBtn(false);
      btn.add(btnBg);

      const btnLabel = this.add.text(0, 0, 'WYTWÓRZ', {
        fontFamily: 'Consolas, monospace',
        fontSize: '10px',
        color: canCraft ? '#f0fdf4' : '#64748b',
        fontStyle: 'bold'
      });
      btnLabel.setOrigin(0.5, 0.5);
      btn.add(btnLabel);

      if (canCraft) {
        btn.setSize(80, 30);
        btn.setInteractive({ useHandCursor: true });
        btn.on('pointerover', () => drawCraftBtn(true));
        btn.on('pointerout', () => drawCraftBtn(false));
        btn.on('pointerdown', () => {
          this.executeCraft(recipe);
        });
      }

      row.add(btn);

      // Tooltip on row hover
      rowBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, 352, itemH), Phaser.Geom.Rectangle.Contains);
      rowBg.on('pointerover', () => {
        this.showTooltip(itemResult);
      });
      rowBg.on('pointerout', () => {
        this.hideTooltip();
      });

      this.recipeListContainer.add(row);
    });

    if (validRecipes.length === 0) {
      const emptyText = this.add.text(20, 24, 'Brak receptur w tej kategorii przy obecnej stacji.', {
        fontFamily: 'Consolas, monospace',
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

  private onSlotPointerDown(
    kind: 'inv' | 'equip' | 'chest',
    index: number | string,
    pointer: Phaser.Input.Pointer,
    refreshChest: boolean = false
  ): void {
    const wasHolding = Boolean(this.cursorSlot.item);
    const isRight = pointer.rightButtonDown();

    if (kind === 'inv') {
      this.handleSlotClick(index as number, isRight);
      if (refreshChest) this.refreshChestPlayerSlotsUI();
    } else if (kind === 'equip') {
      this.handleEquipSlotClick(index as string);
    } else if (kind === 'chest') {
      this.handleChestSlotClick(index as number, isRight);
    }

    if (!wasHolding && this.cursorSlot.item && !isRight) {
      this.dragOrigin = { kind, index, x: pointer.x, y: pointer.y };
    } else {
      this.dragOrigin = null;
    }
  }

  private onSlotPointerUp(
    kind: 'inv' | 'equip' | 'chest',
    index: number | string,
    pointer: Phaser.Input.Pointer,
    refreshChest: boolean = false
  ): void {
    if (!this.dragOrigin || !this.cursorSlot.item) return;

    const movedFar = Phaser.Math.Distance.Between(this.dragOrigin.x, this.dragOrigin.y, pointer.x, pointer.y) > 8;
    const differentSlot = this.dragOrigin.kind !== kind || this.dragOrigin.index !== index;

    if (differentSlot || movedFar) {
      if (kind === 'inv') {
        this.handleSlotClick(index as number, false);
        if (refreshChest) this.refreshChestPlayerSlotsUI();
      } else if (kind === 'equip') {
        this.handleEquipSlotClick(index as string);
      } else if (kind === 'chest') {
        this.handleChestSlotClick(index as number, false);
      }
    }
    this.dragOrigin = null;
  }

  private isEquipSlotCompatible(itemEquipSlot: string | undefined, targetEquipSlot: string): boolean {
    if (!itemEquipSlot) return false;
    if (itemEquipSlot === targetEquipSlot) return true;
    const isRingItem = itemEquipSlot === EquipSlotType.RING_1 || itemEquipSlot === EquipSlotType.RING_2;
    const isRingTarget = targetEquipSlot === EquipSlotType.RING_1 || targetEquipSlot === EquipSlotType.RING_2;
    return isRingItem && isRingTarget;
  }

  private handleSlotClick(slotIndex: number, isRightClick: boolean): void {
    const slot = this.player.inventory[slotIndex];
    if (!slot) return;

    // Shift-Click: Szybkie zakładanie uzbrojenia, użycie mikstury lub przeniesienie między pasem/plecakiem/skrzynią
    const isShift = this.keyShift ? this.keyShift.isDown : false;
    if (isShift && slot.item) {
      if (this.isChestOpen && this.activeChestSlots) {
        // Przenieś przedmiot z plecaka do pierwszego wolnego/pasującego slotu w skrzyni
        for (let ci = 0; ci < this.activeChestSlots.length; ci++) {
          const cs = this.activeChestSlots[ci];
          if (cs.item && cs.item.id === slot.item.id && cs.count < cs.item.maxStack) {
            const add = Math.min(cs.item.maxStack - cs.count, slot.count);
            cs.count += add;
            slot.count -= add;
            if (slot.count <= 0) { slot.item = null; slot.count = 0; break; }
          }
        }
        if (slot.count > 0 && slot.item) {
          for (let ci = 0; ci < this.activeChestSlots.length; ci++) {
            const cs = this.activeChestSlots[ci];
            if (!cs.item) {
              cs.item = slot.item;
              cs.count = slot.count;
              slot.item = null;
              slot.count = 0;
              break;
            }
          }
        }
        this.refreshChestUI();
        this.refreshChestPlayerSlotsUI();
        this.refreshInventoryUI();
        return;
      }

      if (slot.item.equipSlot) {
        this.player.equipItem(slotIndex);
      } else if (slot.item.category === ItemCategory.CONSUMABLE) {
        this.player.useConsumable(slotIndex);
      } else {
        // Szybkie przeniesienie między Pasem (0..8) a Plecakiem (9..44)
        const targetStart = slotIndex < 9 ? 9 : 0;
        const targetEnd = slotIndex < 9 ? GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS : 9;
        for (let ti = targetStart; ti < targetEnd; ti++) {
          const ts = this.player.inventory[ti];
          if (ts.item && ts.item.id === slot.item.id && ts.count < ts.item.maxStack) {
            const add = Math.min(ts.item.maxStack - ts.count, slot.count);
            ts.count += add;
            slot.count -= add;
            if (slot.count <= 0) { slot.item = null; slot.count = 0; break; }
          }
        }
        if (slot.count > 0 && slot.item) {
          for (let ti = targetStart; ti < targetEnd; ti++) {
            const ts = this.player.inventory[ti];
            if (!ts.item) {
              ts.item = slot.item;
              ts.count = slot.count;
              slot.item = null;
              slot.count = 0;
              break;
            }
          }
        }
      }
      this.refreshInventoryUI();
      this.refreshCraftingRecipes();
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
    const isShift = this.keyShift ? this.keyShift.isDown : false;

    // Shift-Click: zdejmij założony przedmiot prosto do plecaka
    if (isShift && currentEquip.item && !this.cursorSlot.item) {
      if (this.player.addItem(currentEquip.item.id, 1)) {
        currentEquip.item = null;
        currentEquip.count = 0;
        this.player.recalculateStats();
        this.refreshInventoryUI();
      }
      return;
    }

    // Jeśli kursor trzyma pasujący element uzbrojenia
    if (this.cursorSlot.item && this.isEquipSlotCompatible(this.cursorSlot.item.equipSlot, equipSlotType)) {
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
    overlay.fillStyle(0x03050a, 0.72);
    overlay.fillRect(0, 0, 3000, 2000);
    this.chestContainer.add(overlay);

    const slotSize = 48;
    const padding = 6;
    const panelW = 568;
    const panelH = 602;
    const panelX = Math.floor((this.scale.width - panelW) / 2);
    const panelY = Math.max(82, Math.floor((this.scale.height - panelH) / 2));

    // Panel background w stylu Delverii ze złotym akcentem skrzyni
    const bg = this.add.graphics();
    this.drawCrystalPanel(bg, panelX, panelY, panelW, panelH, 0xb45309, 0xfbbf24, 0.96, 10);
    bg.fillStyle(0x1a150b, 0.9);
    bg.fillRoundedRect(panelX + 4, panelY + 4, panelW - 8, 38, { tl: 7, tr: 7, bl: 0, br: 0 });
    bg.lineStyle(1, 0xfbbf24, 0.3);
    bg.lineBetween(panelX + 8, panelY + 42, panelX + panelW - 8, panelY + 42);
    this.chestContainer.add(bg);

    // Header Title
    const title = this.add.text(panelX + 18, panelY + 23, 'SKRZYNIA SKARBÓW', {
      fontFamily: 'Consolas, monospace',
      fontSize: '14px',
      color: '#fde047',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.chestContainer.add(title);

    // Stylowe przyciski: Weź wszystko & Odłóż pasujące & Zamknij
    const makeChestBtn = (bx: number, by: number, bw: number, label: string, fill: number, stroke: number, hoverFill: number, onClick: () => void) => {
      const c = this.add.container(bx, by);
      const bbg = this.add.graphics();
      const drawB = (hover: boolean) => {
        bbg.clear();
        bbg.fillStyle(hover ? hoverFill : fill, 0.95);
        bbg.lineStyle(1.5, stroke, 1);
        bbg.fillRoundedRect(-bw / 2, -13, bw, 26, 5);
        bbg.strokeRoundedRect(-bw / 2, -13, bw, 26, 5);
      };
      drawB(false);
      const txt = this.add.text(0, 0, label, {
        fontFamily: 'Consolas, monospace',
        fontSize: '10px',
        color: '#f8fafc',
        fontStyle: 'bold'
      }).setOrigin(0.5, 0.5);
      c.add([bbg, txt]);
      c.setSize(bw, 26);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerover', () => drawB(true));
      c.on('pointerout', () => drawB(false));
      c.on('pointerdown', onClick);
      this.chestContainer.add(c);
    };

    makeChestBtn(panelX + panelW - 224, panelY + 23, 112, 'WEŹ WSZYSTKO', 0x1e3a5f, 0x38bdf8, 0x2563eb, () => this.lootAllChest());
    makeChestBtn(panelX + panelW - 102, panelY + 23, 116, 'ODŁÓŻ PASUJĄCE', 0x134e4a, 0x2dd4bf, 0x0f766e, () => this.depositMatchingToChest());

    const closeCont = this.add.container(panelX + panelW - 24, panelY + 23);
    const closeBg = this.add.graphics();
    const drawClose = (hover: boolean) => {
      closeBg.clear();
      closeBg.fillStyle(hover ? 0x7f1d1d : 0x1c1917, 0.95);
      closeBg.lineStyle(1.5, hover ? 0xf87171 : 0x78350f, 1);
      closeBg.fillRoundedRect(-12, -12, 24, 24, 5);
      closeBg.strokeRoundedRect(-12, -12, 24, 24, 5);
    };
    drawClose(false);
    const btnClose = this.add.text(0, 0, '✕', {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '12px',
      color: '#fca5a5',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0.5);
    closeCont.add([closeBg, btnClose]);
    closeCont.setSize(24, 24);
    closeCont.setInteractive({ useHandCursor: true });
    closeCont.on('pointerover', () => drawClose(true));
    closeCont.on('pointerout', () => drawClose(false));
    closeCont.on('pointerdown', () => this.closeChestModal());
    this.chestContainer.add(closeCont);

    // --- 1. CHEST SLOTS SECTION (20 SLOTS: 2 rows x 10 cols) ---
    const chestLabel = this.add.text(panelX + 18, panelY + 52, 'ZAWARTOŚĆ SKRZYNI (20 Slotów)', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#fbbf24',
      fontStyle: 'bold'
    });
    this.chestContainer.add(chestLabel);

    this.chestSlotContainers = [];
    const chestSlotsStartX = panelX + (panelW - (10 * slotSize + 9 * padding)) / 2;
    const chestSlotsStartY = panelY + 72;

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 10; col++) {
        const slotIdx = row * 10 + col;
        const slotX = chestSlotsStartX + col * (slotSize + padding);
        const slotY = chestSlotsStartY + row * (slotSize + padding);

        const container = this.add.container(slotX, slotY);

        const box = this.add.graphics();
        this.drawCrystalSlot(box, slotSize, 0xd97706, 0.14, 0x12100d);
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

        this.addSlotHitbox(
          container,
          slotSize,
          (pointer: Phaser.Input.Pointer) => this.onSlotPointerDown('chest', slotIdx, pointer),
          (pointer: Phaser.Input.Pointer) => this.onSlotPointerUp('chest', slotIdx, pointer),
          () => {
            const item = this.activeChestSlots[slotIdx]?.item;
            if (item) this.showTooltip(item);
          },
          () => this.hideTooltip()
        );

        this.chestContainer.add(container);
        this.chestSlotContainers.push(container);
      }
    }

    // --- 2. PLAYER INVENTORY INSIDE CHEST MODAL ---
    const invSectionY = chestSlotsStartY + 2 * (slotSize + padding) + 16;

    // Hotbar row (0..8)
    const pHotbarLabel = this.add.text(panelX + 18, invSectionY, 'PAS SZYBKIEGO WYBORU (1 - 9)', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#fbbf24',
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
      this.drawCrystalSlot(box, slotSize, 0xd97706, 0.16, 0x0f1523);
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

      this.addSlotHitbox(
        container,
        slotSize,
        (pointer: Phaser.Input.Pointer) => this.onSlotPointerDown('inv', slotIdx, pointer, true),
        (pointer: Phaser.Input.Pointer) => this.onSlotPointerUp('inv', slotIdx, pointer, true),
        () => {
          const item = this.player.inventory[slotIdx]?.item;
          if (item) this.showTooltip(item);
        },
        () => this.hideTooltip()
      );

      this.chestContainer.add(container);
      this.chestPlayerSlotContainers[slotIdx] = container;
    }

    // Backpack rows (9..44)
    const pBpLabelY = pHotbarY + slotSize + 10;
    const pBpLabel = this.add.text(panelX + 18, pBpLabelY, 'GŁÓWNY PLECAK', {
      fontFamily: 'Consolas, monospace',
      fontSize: '11px',
      color: '#7dd3fc',
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
        this.drawCrystalSlot(box, slotSize, 0x26354d, 0.14, 0x0b111e);
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

        this.addSlotHitbox(
          container,
          slotSize,
          (pointer: Phaser.Input.Pointer) => this.onSlotPointerDown('inv', slotIdx, pointer, true),
          (pointer: Phaser.Input.Pointer) => this.onSlotPointerUp('inv', slotIdx, pointer, true),
          () => {
            const item = this.player.inventory[slotIdx]?.item;
            if (item) this.showTooltip(item);
          },
          () => this.hideTooltip()
        );

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
    this.syncControlsOverlayForModals();
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
    this.syncControlsOverlayForModals();
    if (this.gameScene) this.gameScene.inputLockTimer = 200;
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
    const rarityHex = Phaser.Display.Color.HexStringToColor(color).color;
    this.drawCrystalPanel(this.tooltipBg, 0, 0, boxW, boxH, rarityHex, rarityHex, 0.96, 8);

    const ptr = this.input.activePointer;
    this.tooltipBox.setPosition(
      Math.min(this.scale.width - (boxW + 12), ptr.x + 14),
      Math.min(this.scale.height - (boxH + 12), ptr.y + 14)
    );
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
    const padding = 6;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(272, Math.floor((this.scale.width - totalWidth) / 2));
    const startY = 18;

    if (this.hotbarBg) {
      this.hotbarBg.clear();
      this.drawCrystalPanel(this.hotbarBg, startX - 10, startY - 7, totalWidth + 20, slotSize + 14, 0x1e3a5f, 0x38bdf8, 0.9, 8);
    }

    for (let i = 0; i < this.hotbarSlots.length; i++) {
      this.hotbarSlots[i].setPosition(startX + i * (slotSize + padding), startY);
    }

    if (this.itemTooltipText) {
      this.itemTooltipText.setPosition(startX + totalWidth / 2, 84);
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
    const barX = 42;
    const barW = 200;

    // HP Bar
    this.hpBar.clear();
    this.hpBar.fillStyle(0x2a0f18, 0.95);
    this.hpBar.fillRoundedRect(barX, 34, barW, 8, 3);
    const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    const hpW = Math.max(hpRatio > 0 ? 4 : 0, barW * hpRatio);
    if (hpW > 0) {
      this.hpBar.fillStyle(0xe11d48, 1);
      this.hpBar.fillRoundedRect(barX, 34, hpW, 8, 3);
      this.hpBar.fillStyle(0xfda4af, 0.45);
      this.hpBar.fillRoundedRect(barX + 1, 35, Math.max(0, hpW - 2), 2, 1);
    }
    this.hpBar.lineStyle(1, 0x881337, 0.8);
    this.hpBar.strokeRoundedRect(barX, 34, barW, 8, 3);
    this.hpText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp} HP`);

    // Mana Bar
    this.manaBar.clear();
    this.manaBar.fillStyle(0x0c1e33, 0.95);
    this.manaBar.fillRoundedRect(barX, 59, barW, 8, 3);
    const manaRatio = Phaser.Math.Clamp(this.player.mana / this.player.maxMana, 0, 1);
    const manaW = Math.max(manaRatio > 0 ? 4 : 0, barW * manaRatio);
    if (manaW > 0) {
      this.manaBar.fillStyle(0x0ea5e9, 1);
      this.manaBar.fillRoundedRect(barX, 59, manaW, 8, 3);
      this.manaBar.fillStyle(0xbae6fd, 0.5);
      this.manaBar.fillRoundedRect(barX + 1, 60, Math.max(0, manaW - 2), 2, 1);
    }
    this.manaBar.lineStyle(1, 0x075985, 0.8);
    this.manaBar.strokeRoundedRect(barX, 59, barW, 8, 3);
    this.manaText.setText(`${Math.ceil(this.player.mana)} / ${this.player.maxMana} MP`);

    // XP Bar
    this.xpBar.clear();
    this.xpBar.fillStyle(0x281e0b, 0.95);
    this.xpBar.fillRoundedRect(barX, 87, barW, 6, 2);
    const xpRatio = Phaser.Math.Clamp(this.player.xp / this.player.maxXp, 0, 1);
    const xpW = Math.max(xpRatio > 0 ? 4 : 0, barW * xpRatio);
    if (xpW > 0) {
      this.xpBar.fillStyle(0xf59e0b, 1);
      this.xpBar.fillRoundedRect(barX, 87, xpW, 6, 2);
      this.xpBar.fillStyle(0xfef08a, 0.55);
      this.xpBar.fillRoundedRect(barX + 1, 88, Math.max(0, xpW - 2), 2, 1);
    }
    this.xpBar.lineStyle(1, 0x78350f, 0.8);
    this.xpBar.strokeRoundedRect(barX, 87, barW, 6, 2);
    this.levelText.setText(`Poz. ${this.player.level}  •  ${this.player.xp} / ${this.player.maxXp} XP`);
  }

  private updateHotbarVisuals(): void {
    const slotSize = 46;
    const padding = 6;
    const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
    const startX = Math.max(272, Math.floor((this.scale.width - totalWidth) / 2));
    const startY = 18;

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
    // Subtelna zewnętrzna poświata wybranego slotu + złota ramka z krystalicznymi narożnikami
    this.slotHighlight.lineStyle(4, 0xfbbf24, 0.25);
    this.slotHighlight.strokeRoundedRect(activeX - 3, startY - 3, slotSize + 6, slotSize + 6, 6);
    this.slotHighlight.lineStyle(2, 0xfbbf24, 1);
    this.slotHighlight.strokeRoundedRect(activeX - 1, startY - 1, slotSize + 2, slotSize + 2, 5);

    const activeItem = this.player.getSelectedItem();
    this.itemTooltipBg.clear();
    if (activeItem) {
      const color = RARITY_COLORS[activeItem.rarity] || '#ffffff';
      this.itemTooltipText.setColor(color);
      const count = this.player.getSelectedItemCount();
      this.itemTooltipText.setText(`${activeItem.name}${count > 1 ? ` ×${count}` : ''}  •  ${activeItem.category}`);
      const centerX = startX + totalWidth / 2;
      this.itemTooltipText.setPosition(centerX, 84);
      this.itemTooltipText.setVisible(true);

      const pillW = Math.max(120, this.itemTooltipText.width + 24);
      const pillH = 22;
      const px = centerX - pillW / 2;
      const py = 84 - pillH / 2;
      this.itemTooltipBg.fillStyle(0x070b14, 0.88);
      this.itemTooltipBg.fillRoundedRect(px, py, pillW, pillH, 6);
      this.itemTooltipBg.lineStyle(1.5, Phaser.Display.Color.HexStringToColor(color).color, 0.65);
      this.itemTooltipBg.strokeRoundedRect(px, py, pillW, pillH, 6);
      this.itemTooltipBg.setVisible(true);
    } else {
      this.itemTooltipText.setVisible(false);
      this.itemTooltipBg.setVisible(false);
    }
  }

  private updateDepthDisplay(): void {
    const T = GAME_CONSTANTS.TILE_SIZE;
    const tileX = Math.floor(this.player.x / T);
    const tileY = Math.floor(this.player.y / T);
    const biome = BiomeSystem.getBiomeAt(tileX, tileY);

    const depthMeters = (tileY - GAME_CONSTANTS.SURFACE_HEIGHT) * 2;
    const timeStr = this.gameScene.dayNightSystem ? ` • ${this.gameScene.dayNightSystem.getTimeString()}` : '';
    this.depthText.setText(`${biome.polishName} • ${depthMeters}m${timeStr}`);
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
      if (this.gameScene.isWorldReady) {
        saveGameProgress(this.gameScene);
      }
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
    if (this.gameScene && this.gameScene.isWorldReady) {
      saveGameProgress(this.gameScene);
    }
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

  private openPauseSettingsModal(tab: 'sound' | 'controls' | 'graphics' | 'save'): void {
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

    const tabs: { id: 'sound' | 'controls' | 'graphics' | 'save'; label: string }[] = [
      { id: 'sound', label: 'DŹWIĘK' },
      { id: 'controls', label: 'STEROWANIE' },
      { id: 'graphics', label: 'GRAFIKA' },
      { id: 'save', label: 'ZAPIS' },
    ];
    const tabW = 132, tabH = 36, tabGap = 10;
    const totalTabsW = tabs.length * tabW + (tabs.length - 1) * tabGap;
    const tabStartX = -totalTabsW / 2 + tabW / 2;
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
    } else if (tab === 'save') {
      const user = getCurrentUser() || 'Gość';
      const meta = getSaveMetaForCurrentUser();
      const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      };

      const infoBox = this.add.graphics();
      infoBox.fillStyle(0x080e1c, 0.92);
      infoBox.fillRect(-boxW / 2, contentTopY - 22, boxW, 64);
      infoBox.lineStyle(1, 0x1e293b, 1);
      infoBox.strokeRect(-boxW / 2, contentTopY - 22, boxW, 64);

      const accLbl = this.add.text(-boxW / 2 + 16, contentTopY - 4, `KONTO: ${user}`, {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0, 0.5);

      const statusTxt = this.add.text(
        -boxW / 2 + 16,
        contentTopY + 18,
        meta ? `Ostatni zapis: ${formatTime(meta.savedAt)} (${meta.characterName})` : 'Brak zapisanego stanu gry',
        {
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '12px',
          color: meta ? '#7dd3fc' : '#94a3b8',
        }
      ).setOrigin(0, 0.5);
      modal.add([infoBox, accLbl, statusTxt]);

      // Przycisk Zapisz Postęp Gry
      const saveBtnY = contentTopY + 76;
      const saveBtnW = boxW;
      const saveBtnH = 44;
      const saveBg = this.add.graphics();
      const drawSaveBtn = (hover: boolean) => {
        saveBg.clear();
        saveBg.fillStyle(hover ? 0x0369a1 : 0x0c4a6e, 1);
        saveBg.fillRect(-saveBtnW / 2, saveBtnY - saveBtnH / 2, saveBtnW, saveBtnH);
        saveBg.lineStyle(2, 0x38bdf8, 1);
        saveBg.strokeRect(-saveBtnW / 2, saveBtnY - saveBtnH / 2, saveBtnW, saveBtnH);
      };
      drawSaveBtn(false);
      const saveTxt = this.add.text(0, saveBtnY, 'ZAPISZ POSTĘP GRY', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#ffffff',
        letterSpacing: 2,
      }).setOrigin(0.5, 0.5);
      const saveHit = this.add.rectangle(0, saveBtnY, saveBtnW, saveBtnH, 0x000000, 0).setInteractive({ useHandCursor: true });
      saveHit.on('pointerover', () => drawSaveBtn(true));
      saveHit.on('pointerout', () => drawSaveBtn(false));
      saveHit.on('pointerdown', () => {
        const res = saveGameProgress(this.gameScene);
        if (res.ok && res.savedAt) {
          statusTxt.setText(`Zapisano pomyślnie! (${formatTime(res.savedAt)})`);
          statusTxt.setColor('#86efac');
          this.showSaveToast('Postęp gry zapisany!');
        } else {
          statusTxt.setText(res.error || 'Błąd zapisu.');
          statusTxt.setColor('#fca5a5');
        }
      });
      modal.add([saveBg, saveTxt, saveHit]);

      // Przełącznik Auto-Save
      addSwitch(
        contentTopY + 146,
        'Automatyczny zapis (Auto-Save)',
        'Okresowo zapisuje świat, ekwipunek i pozycję postaci',
        getAutoSaveEnabled(),
        (v) => {
          setAutoSaveEnabled(v);
        }
      );

      // Częstotliwość Auto-Save
      const intY = contentTopY + 218;
      const intBox = this.add.graphics();
      intBox.fillStyle(0x080e1c, 0.92);
      intBox.fillRect(-boxW / 2, intY - 26, boxW, 64);
      intBox.lineStyle(1, 0x1e293b, 1);
      intBox.strokeRect(-boxW / 2, intY - 26, boxW, 64);
      const intTitle = this.add.text(-boxW / 2 + 16, intY - 8, 'CZĘSTOTLIWOŚĆ AUTO-SAVE', {
        fontFamily: 'Consolas, "Courier New", monospace',
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#e2e8f0',
      }).setOrigin(0, 0.5);
      modal.add([intBox, intTitle]);

      let curInt = getAutoSaveIntervalSec();
      const intOpts = [
        { val: 30, label: '30s' },
        { val: 60, label: '60s' },
        { val: 120, label: '2m' },
        { val: 300, label: '5m' },
      ];
      const iW = 84, iGap = 10;
      const totalIW = intOpts.length * iW + (intOpts.length - 1) * iGap;
      const iStartX = -totalIW / 2 + iW / 2;
      const iBtnY = intY + 18;
      const intDrawers: (() => void)[] = [];

      intOpts.forEach((opt, idx) => {
        const ox = iStartX + idx * (iW + iGap);
        const oBg = this.add.graphics();
        const oTxt = this.add.text(ox, iBtnY, opt.label, {
          fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#cbd5e1',
        }).setOrigin(0.5, 0.5);
        const drawOpt = () => {
          const sel = curInt === opt.val;
          oBg.clear();
          oBg.fillStyle(sel ? 0x0369a1 : 0x0f172a, 1);
          oBg.fillRect(ox - iW / 2, iBtnY - 12, iW, 24);
          oBg.lineStyle(sel ? 2 : 1, sel ? 0x7dd3fc : 0x334155, 1);
          oBg.strokeRect(ox - iW / 2, iBtnY - 12, iW, 24);
          oTxt.setColor(sel ? '#ffffff' : '#94a3b8');
        };
        drawOpt();
        intDrawers.push(drawOpt);

        const oHit = this.add.rectangle(ox, iBtnY, iW, 26, 0x000000, 0).setInteractive({ useHandCursor: true });
        oHit.on('pointerdown', () => {
          curInt = opt.val;
          setAutoSaveIntervalSec(curInt);
          intDrawers.forEach((fn) => fn());
        });
        modal.add([oBg, oTxt, oHit]);
      });
    }

    this.pauseSettingsModal = modal;
  }

  public showSaveToast(message: string): void {
    const W = this.scale.width;
    const toast = this.add.text(W / 2, 26, message, {
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#86efac',
      backgroundColor: '#050a14',
      padding: { x: 12, y: 6 },
      stroke: '#020617',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setDepth(1200).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: 34,
      duration: 200,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.time.delayedCall(1400, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            y: 22,
            duration: 280,
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }
}
