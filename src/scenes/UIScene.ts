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

export class UIScene extends Phaser.Scene {
  private player!: Player;
  private gameScene!: GameScene;

  // HUD Top Elements
  private hotbarSlots: Phaser.GameObjects.Container[] = [];
  private slotHighlight!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private manaText!: Phaser.GameObjects.Text;
  private depthText!: Phaser.GameObjects.Text;
  private itemTooltipText!: Phaser.GameObjects.Text;

  // Inventory & Crafting Window State
  public isInventoryOpen: boolean = false;
  private invContainer!: Phaser.GameObjects.Container;
  private invSlots: Phaser.GameObjects.Container[] = [];
  private equipSlots: Record<string, Phaser.GameObjects.Container> = {};

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

  constructor() {
    super('UIScene');
  }

  public create(data: { player: Player }): void {
    this.player = data.player;
    this.gameScene = this.scene.get('GameScene') as GameScene;

    // 1. Create Top HUD
    this.createHealthAndMana();
    this.createHotbar();
    this.createDepthInfo();
    this.createItemTooltip();

    // 2. Create Full Inventory & Crafting Modal (Hidden by default)
    this.createInventoryModal();

    // 3. Create Detailed Hover Tooltip
    this.createHoverTooltip();

    // 4. Create Cursor Holding Item
    this.createCursorItemVisual();

    // 5. Handle Keyboard & Resizing
    this.initInputHooks();

    this.scale.on('resize', () => {
      this.repositionUI();
    });
  }

  private initInputHooks(): void {
    const kb = this.input.keyboard;
    if (kb) {
      const keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
      keyE.on('down', () => {
        this.toggleInventory();
      });

      const keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      keyEsc.on('down', () => {
        if (this.isInventoryOpen) {
          this.toggleInventory(false);
        }
      });
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
    bg.fillRoundedRect(16, 16, 210, 56, 6);
    bg.strokeRoundedRect(16, 16, 210, 56, 6);

    this.hpBar = this.add.graphics();
    this.hpText = this.add.text(26, 20, '100 / 100 HP', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#ffc4c4',
      fontStyle: 'bold'
    });

    this.manaBar = this.add.graphics();
    this.manaText = this.add.text(26, 43, '50 / 50 MP', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#b8e2ff',
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
    this.depthText = this.add.text(16, 80, 'Altitude: Surface', {
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
    const panelY = 90;
    const panelW = 560;
    const panelH = 540;

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

    // Stats Box
    this.createCharacterStatsSection(panelX + 20, panelY + 46);

    // Equipment Slots (8 slots)
    this.createEquipmentSlotsSection(panelX + 260, panelY + 46);

    // Backpack 36 Slots (4 rows x 9 cols)
    this.createBackpackSlotsSection(panelX + 20, panelY + 235);

    // --- RIGHT PANEL: CRAFTING WORKSHOP ---
    this.createCraftingPanel(panelX + panelW + 24, panelY, 480, panelH);
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

  private createBackpackSlotsSection(x: number, y: number): void {
    const slotSize = 48;
    const padding = 6;

    // Header label
    const bpLabel = this.add.text(x, y - 20, 'GŁÓWNY PLECAK (Sloty 10 - 45)', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#94a3b8',
      fontStyle: 'bold'
    });
    this.invContainer.add(bpLabel);

    this.invSlots = [];

    // 4 rows x 9 columns
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 9; col++) {
        const slotIdx = 9 + row * 9 + col;
        const slotX = x + col * (slotSize + padding);
        const slotY = y + row * (slotSize + padding);

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
        this.invSlots.push(container);
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
      tab.setInteractive({ useHandCursor: true });
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

      const reqText = this.add.text(54, 28, `Składniki: ${ingTexts}`, {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: canCraft ? '#86efac' : '#94a3b8'
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
        btn.setInteractive({ useHandCursor: true });
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
    const kb = this.input.keyboard;
    const isShift = kb ? kb.checkDown(kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT)) : false;
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
    if (this.cursorSlot.item && this.cursorSlot.count > 0) {
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
    // 1. Refresh 36 backpack slots
    for (let i = 0; i < 36; i++) {
      const slotIndex = 9 + i;
      const slotContainer = this.invSlots[i];
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
  }

  public update(): void {
    if (!this.player) return;

    this.updateStatsBars();
    this.updateHotbarVisuals();
    this.updateDepthDisplay();
  }

  private updateStatsBars(): void {
    this.hpBar.clear();
    this.hpBar.fillStyle(0x3a141a, 0.9);
    this.hpBar.fillRoundedRect(24, 31, 194, 8, 3);
    const hpRatio = Phaser.Math.Clamp(this.player.hp / this.player.maxHp, 0, 1);
    this.hpBar.fillStyle(0xe63946, 1);
    this.hpBar.fillRoundedRect(24, 31, 194 * hpRatio, 8, 3);
    this.hpText.setText(`${Math.ceil(this.player.hp)} / ${this.player.maxHp} HP`);

    this.manaBar.clear();
    this.manaBar.fillStyle(0x132a40, 0.9);
    this.manaBar.fillRoundedRect(24, 54, 194, 8, 3);
    const manaRatio = Phaser.Math.Clamp(this.player.mana / this.player.maxMana, 0, 1);
    this.manaBar.fillStyle(0x38bdf8, 1);
    this.manaBar.fillRoundedRect(24, 54, 194 * manaRatio, 8, 3);
    this.manaText.setText(`${Math.ceil(this.player.mana)} / ${this.player.maxMana} MP`);
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
    const tileY = Math.floor(this.player.y / T);
    let zone = 'Surface Hills';
    if (tileY < GAME_CONSTANTS.SURFACE_HEIGHT) zone = 'Surface Canopy';
    else if (tileY < GAME_CONSTANTS.CAVERN_DEPTH) zone = 'Upper Caverns';
    else if (tileY < GAME_CONSTANTS.BEDROCK_DEPTH) zone = 'Deep Abyss';
    else zone = 'Bedrock Mantle';

    const depthMeters = (tileY - GAME_CONSTANTS.SURFACE_HEIGHT) * 2;
    this.depthText.setText(`[Depth: ${depthMeters}m] ${zone} | Level ${this.player.level}`);
  }
}
