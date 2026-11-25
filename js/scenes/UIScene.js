import { CraftingStation, EquipSlotType, GAME_CONSTANTS, ItemCategory, RARITY_COLORS } from '../types/index.js';
import { CRAFTING_RECIPES } from '../world/CraftingRecipes.js';
import { ITEM_REGISTRY } from '../world/ItemTypes.js';
import { CursorManager } from '../systems/CursorManager.js';
import { BiomeSystem } from '../world/BiomeSystem.js';
export class UIScene extends Phaser.Scene {
    player;
    gameScene;
    cursorManager;
    // HUD Top Elements
    hotbarSlots = [];
    slotHighlight;
    hpBar;
    hpText;
    manaBar;
    manaText;
    xpBar;
    levelText;
    depthText;
    itemTooltipText;
    // Inventory & Crafting Window State
    isInventoryOpen = false;
    invContainer;
    invSlots = [];
    equipSlots = {};
    // Chest Modal State
    isChestOpen = false;
    chestContainer;
    activeChestPos = null;
    activeChestSlots = [];
    chestSlotContainers = [];
    chestPlayerSlotContainers = [];
    // Boss Bar State (Generated Pixel-Art RPG Boss Frame + Animated Fill)
    bossBarContainer;
    bossBarFillSprite;
    bossBarFrameImage;
    bossBarTitleImage;
    bossBarNameText;
    bossBarHpText;
    bossBarCurrentHp = 750;
    bossBarMaxHp = 750;
    bossBarTargetWidth = 473;
    bossBarAnimWidth = 473;
    // ── GTA-style ZGON Death Screen ──────────────────────────────────────────
    // Phase 1 (0–700 ms):   Slowmo + red camera-tint builds in
    // Phase 2 (700–1400 ms): Grayscale drain – white wash overlay
    // Phase 3 (1400–2000 ms): Full red screen, pixel-art "ZGON" in WHITE fades in
    // Phase 4 (2000–3100 ms): Background red → black, text WHITE → RED
    // Phase 5 (3100 ms+):   Black + red text; respawn fires at 2800 ms
    deathOverlay = null;
    deathTextCanvas = null;
    deathColorFx = null;
    deathScreenActive = false;
    deathPhase = 0;
    deathPhaseTimer = 0;
    deathRespawned = false;
    // Hand / Cursor Item
    cursorSlot = { item: null, count: 0 };
    cursorItemSprite;
    cursorItemText;
    // Tooltip Box
    tooltipBox;
    tooltipBg;
    tooltipTitle;
    tooltipMeta;
    tooltipStats;
    tooltipDesc;
    tooltipObtain;
    // Crafting UI
    craftCategory = 'all';
    craftStationText;
    recipeListContainer;
    activeStationSet = new Set([CraftingStation.HAND]);
    keyShift;
    constructor() {
        super('UIScene');
    }
    create(data) {
        this.player = data.player;
        this.gameScene = this.scene.get('GameScene');
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
    initCursorHooks() {
        // Whenever pointer moves over any interactive GameObject in UIScene
        this.input.on('gameobjectover', () => {
            this.cursorManager.setUIHover(true);
        });
        this.input.on('gameobjectout', () => {
            this.cursorManager.setUIHover(false);
        });
    }
    initInputHooks() {
        const kb = this.input.keyboard;
        if (kb) {
            this.keyShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        }
        // Pointer move updates cursor holding item & tooltips
        this.input.on('pointermove', (pointer) => {
            if (this.cursorSlot.item) {
                this.cursorItemSprite.setPosition(pointer.x, pointer.y);
                this.cursorItemText.setPosition(pointer.x + 10, pointer.y + 10);
            }
            if (this.tooltipBox.visible) {
                this.tooltipBox.setPosition(Math.min(this.scale.width - 230, pointer.x + 14), Math.min(this.scale.height - 200, pointer.y + 14));
            }
        });
        // Drop holding item if clicked in world background while inventory is open
        this.input.on('pointerdown', (pointer) => {
            if (this.isInventoryOpen && this.cursorSlot.item) {
                // If clicked outside inventory modal panels
                if (pointer.y > 660 || pointer.x < 40 || pointer.x > this.scale.width - 40) {
                    this.dropCursorItem();
                }
            }
        });
    }
    toggleInventory(forceState) {
        this.isInventoryOpen = forceState !== undefined ? forceState : !this.isInventoryOpen;
        this.invContainer.setVisible(this.isInventoryOpen);
        if (this.isInventoryOpen) {
            this.hideTooltip();
            this.refreshInventoryUI();
            this.refreshCraftingRecipes();
        }
        else {
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
    createHealthAndMana() {
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
    createHotbar() {
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
            slotContainer.on('pointerdown', (pointer) => {
                if (!this.isInventoryOpen) {
                    this.player.selectedSlot = i;
                }
                else {
                    this.handleSlotClick(i, pointer.rightButtonDown());
                }
            });
            slotContainer.on('pointerover', () => {
                const item = this.player.inventory[i]?.item;
                if (item)
                    this.showTooltip(item);
            });
            slotContainer.on('pointerout', () => {
                this.hideTooltip();
            });
            this.hotbarSlots.push(slotContainer);
        }
        this.slotHighlight = this.add.graphics();
    }
    createDepthInfo() {
        this.depthText = this.add.text(16, 80, 'Wysokość: Powierzchnia', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#e0e6ed',
            backgroundColor: 'rgba(14, 17, 23, 0.8)',
            padding: { x: 8, y: 4 }
        });
    }
    createItemTooltip() {
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
    createInventoryModal() {
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
    createCharacterStatsSection(x, y) {
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
    createEquipmentSlotsSection(x, y) {
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
            container.on('pointerdown', (pointer) => {
                this.handleEquipSlotClick(def.slot);
            });
            container.on('pointerover', () => {
                const item = this.player.equipment[def.slot]?.item;
                if (item)
                    this.showTooltip(item);
            });
            container.on('pointerout', () => {
                this.hideTooltip();
            });
            this.invContainer.add(container);
            this.equipSlots[def.slot] = container;
        });
    }
    createAllInventorySlotsSection(x, y) {
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
            container.on('pointerdown', (pointer) => {
                this.handleSlotClick(slotIdx, pointer.rightButtonDown());
            });
            container.on('pointerover', () => {
                const item = this.player.inventory[slotIdx]?.item;
                if (item)
                    this.showTooltip(item);
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
                container.on('pointerdown', (pointer) => {
                    this.handleSlotClick(slotIdx, pointer.rightButtonDown());
                });
                container.on('pointerover', () => {
                    const item = this.player.inventory[slotIdx]?.item;
                    if (item)
                        this.showTooltip(item);
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
    createCraftingPanel(x, y, w, h) {
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
    refreshCraftingRecipes() {
        if (!this.player || !this.gameScene)
            return;
        // Detect nearby stations
        this.activeStationSet = this.player.getNearbyStations(this.gameScene.worldManager);
        const stationNames = ['Podręczny'];
        if (this.activeStationSet.has(CraftingStation.WORKBENCH))
            stationNames.push('Stół rzemieślniczy');
        if (this.activeStationSet.has(CraftingStation.FURNACE))
            stationNames.push('Piec hutniczy');
        if (this.activeStationSet.has(CraftingStation.ANVIL))
            stationNames.push('Kowadło');
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
            if (!itemResult)
                return;
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
    executeCraft(recipe) {
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
    handleSlotClick(slotIndex, isRightClick) {
        const slot = this.player.inventory[slotIndex];
        if (!slot)
            return;
        // Shift-Click: Instant Equip or Transfer
        const isShift = this.keyShift ? this.keyShift.isDown : false;
        if (isShift && slot.item) {
            if (slot.item.equipSlot) {
                this.player.equipItem(slotIndex);
            }
            else if (slot.item.category === ItemCategory.CONSUMABLE) {
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
                }
                else {
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
                    if (this.cursorSlot.count <= 0)
                        this.cursorSlot.item = null;
                }
                else {
                    // Place all
                    slot.item = this.cursorSlot.item;
                    slot.count = this.cursorSlot.count;
                    this.cursorSlot = { item: null, count: 0 };
                }
            }
            else if (slot.item.id === this.cursorSlot.item.id) {
                // Same item: Stack together
                const space = slot.item.maxStack - slot.count;
                if (space > 0) {
                    if (isRightClick) {
                        slot.count += 1;
                        this.cursorSlot.count -= 1;
                        if (this.cursorSlot.count <= 0)
                            this.cursorSlot.item = null;
                    }
                    else {
                        const add = Math.min(space, this.cursorSlot.count);
                        slot.count += add;
                        this.cursorSlot.count -= add;
                        if (this.cursorSlot.count <= 0)
                            this.cursorSlot.item = null;
                    }
                }
            }
            else {
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
    handleEquipSlotClick(equipSlotType) {
        const currentEquip = this.player.equipment[equipSlotType];
        // If cursor holds matching equippable item
        if (this.cursorSlot.item && this.cursorSlot.item.equipSlot === equipSlotType) {
            const temp = currentEquip.item;
            currentEquip.item = this.cursorSlot.item;
            currentEquip.count = 1;
            if (temp) {
                this.cursorSlot = { item: temp, count: 1 };
            }
            else {
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
    dropCursorItem() {
        if (!this.cursorSlot.item)
            return;
        const item = this.cursorSlot.item;
        const count = this.cursorSlot.count;
        this.cursorSlot = { item: null, count: 0 };
        this.updateCursorVisual();
        // Spawn dropped item in game world
        this.gameScene.showWorldFloatingText(this.player.x, this.player.y - 20, `Wyrzucono: ${item.name} (x${count})`, '#f59e0b');
        this.gameScene.sounds.play('place');
        for (let i = 0; i < count; i++) {
            this.gameScene.handleBlockDrop(Math.floor(this.player.x / GAME_CONSTANTS.TILE_SIZE), Math.floor(this.player.y / GAME_CONSTANTS.TILE_SIZE), item.placeBlockId || 1);
        }
    }
    // =========================================================================
    // CHEST MODAL WINDOW
    // =========================================================================
    createChestModal() {
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
                container.on('pointerdown', (pointer) => {
                    this.handleChestSlotClick(slotIdx, pointer.rightButtonDown());
                });
                container.on('pointerover', () => {
                    const item = this.activeChestSlots[slotIdx]?.item;
                    if (item)
                        this.showTooltip(item);
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
            container.on('pointerdown', (pointer) => {
                this.handleSlotClick(slotIdx, pointer.rightButtonDown());
                this.refreshChestPlayerSlotsUI();
            });
            container.on('pointerover', () => {
                const item = this.player.inventory[slotIdx]?.item;
                if (item)
                    this.showTooltip(item);
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
                container.on('pointerdown', (pointer) => {
                    this.handleSlotClick(slotIdx, pointer.rightButtonDown());
                    this.refreshChestPlayerSlotsUI();
                });
                container.on('pointerover', () => {
                    const item = this.player.inventory[slotIdx]?.item;
                    if (item)
                        this.showTooltip(item);
                });
                container.on('pointerout', () => {
                    this.hideTooltip();
                });
                this.chestContainer.add(container);
                this.chestPlayerSlotContainers[slotIdx] = container;
            }
        }
    }
    openChestModal(tileX, tileY, chestSlots) {
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
    closeChestModal() {
        if (!this.isChestOpen)
            return;
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
    handleChestSlotClick(slotIdx, isRightClick) {
        if (!this.activeChestSlots || !this.activeChestSlots[slotIdx])
            return;
        const slot = this.activeChestSlots[slotIdx];
        // Case 1: Cursor empty
        if (!this.cursorSlot.item) {
            if (slot.item && slot.count > 0) {
                if (isRightClick && slot.count > 1) {
                    const half = Math.ceil(slot.count / 2);
                    this.cursorSlot = { item: slot.item, count: half };
                    slot.count -= half;
                }
                else {
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
                    if (this.cursorSlot.count <= 0)
                        this.cursorSlot.item = null;
                }
                else {
                    slot.item = this.cursorSlot.item;
                    slot.count = this.cursorSlot.count;
                    this.cursorSlot = { item: null, count: 0 };
                }
            }
            else if (slot.item.id === this.cursorSlot.item.id) {
                const space = slot.item.maxStack - slot.count;
                if (space > 0) {
                    if (isRightClick) {
                        slot.count += 1;
                        this.cursorSlot.count -= 1;
                        if (this.cursorSlot.count <= 0)
                            this.cursorSlot.item = null;
                    }
                    else {
                        const add = Math.min(space, this.cursorSlot.count);
                        slot.count += add;
                        this.cursorSlot.count -= add;
                        if (this.cursorSlot.count <= 0)
                            this.cursorSlot.item = null;
                    }
                }
            }
            else {
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
    refreshChestUI() {
        if (!this.activeChestSlots)
            return;
        for (let i = 0; i < this.chestSlotContainers.length; i++) {
            const container = this.chestSlotContainers[i];
            const slotData = this.activeChestSlots[i];
            if (!container)
                continue;
            const icon = container.getByName('icon');
            const countLabel = container.getByName('count');
            if (slotData && slotData.item && slotData.count > 0) {
                icon.setTexture(slotData.item.iconTexture);
                icon.setVisible(true);
                if (slotData.count > 1) {
                    countLabel.setText(`${slotData.count}`);
                    countLabel.setVisible(true);
                }
                else {
                    countLabel.setVisible(false);
                }
            }
            else {
                icon.setVisible(false);
                countLabel.setVisible(false);
            }
        }
    }
    refreshChestPlayerSlotsUI() {
        for (let slotIndex = 0; slotIndex < GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS; slotIndex++) {
            const container = this.chestPlayerSlotContainers[slotIndex];
            if (!container)
                continue;
            const slotData = this.player.inventory[slotIndex];
            const icon = container.getByName('icon');
            const countLabel = container.getByName('count');
            if (slotData && slotData.item && slotData.count > 0) {
                icon.setTexture(slotData.item.iconTexture);
                icon.setVisible(true);
                if (slotData.count > 1) {
                    countLabel.setText(`${slotData.count}`);
                    countLabel.setVisible(true);
                }
                else {
                    countLabel.setVisible(false);
                }
            }
            else {
                icon.setVisible(false);
                countLabel.setVisible(false);
            }
        }
        this.updateHotbarVisuals();
    }
    lootAllChest() {
        if (!this.activeChestSlots)
            return;
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
    depositMatchingToChest() {
        if (!this.activeChestSlots)
            return;
        let anyDeposited = false;
        const chestItemIds = new Set();
        for (const s of this.activeChestSlots) {
            if (s.item)
                chestItemIds.add(s.item.id);
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
    createCursorItemVisual() {
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
    updateCursorVisual() {
        const isHolding = Boolean(this.cursorSlot.item && this.cursorSlot.count > 0);
        this.cursorManager.setHoldingItem(isHolding);
        if (isHolding && this.cursorSlot.item) {
            this.cursorItemSprite.setTexture(this.cursorSlot.item.iconTexture);
            this.cursorItemSprite.setVisible(true);
            if (this.cursorSlot.count > 1) {
                this.cursorItemText.setText(`${this.cursorSlot.count}`);
                this.cursorItemText.setVisible(true);
            }
            else {
                this.cursorItemText.setVisible(false);
            }
        }
        else {
            this.cursorItemSprite.setVisible(false);
            this.cursorItemText.setVisible(false);
        }
    }
    // =========================================================================
    // DETAILED RPG HOVER TOOLTIP
    // =========================================================================
    createHoverTooltip() {
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
    showTooltip(item) {
        const boxW = 240;
        const boxH = 160;
        const color = RARITY_COLORS[item.rarity] || '#ffffff';
        this.tooltipTitle.setText(item.name);
        this.tooltipTitle.setColor(color);
        this.tooltipMeta.setText(`[${item.rarity}] ${item.category} • Wartość: ${item.value} monet`);
        // Build stats strings
        const stats = [];
        if (item.damage)
            stats.push(`🗡 Obrażenia: +${item.damage}`);
        if (item.toolPower)
            stats.push(`⛏ Siła kopania: ${item.toolPower}`);
        if (item.defense)
            stats.push(`🛡 Obrona: +${item.defense}`);
        if (item.critChance)
            stats.push(`🎯 Krytyk: +${Math.round(item.critChance * 100)}%`);
        if (item.speedBonus)
            stats.push(`💨 Prędkość: +${Math.round(item.speedBonus * 100)}%`);
        if (item.hpBonus)
            stats.push(`❤ Max HP: +${item.hpBonus}`);
        if (item.manaBonus)
            stats.push(`✨ Max Mana: +${item.manaBonus}`);
        if (item.healAmount)
            stats.push(`🧪 Leczy: +${item.healAmount} HP`);
        if (item.manaHealAmount)
            stats.push(`🧪 Odnawia: +${item.manaHealAmount} MP`);
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
    hideTooltip() {
        this.tooltipBox.setVisible(false);
    }
    // =========================================================================
    // UI REFRESH AND REPOSITIONING
    // =========================================================================
    refreshInventoryUI() {
        // 1. Refresh all 45 inventory slots (Hotbar 0..8 + Backpack 9..44)
        for (let slotIndex = 0; slotIndex < GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS; slotIndex++) {
            const slotContainer = this.invSlots[slotIndex];
            if (!slotContainer)
                continue;
            const slotData = this.player.inventory[slotIndex];
            const icon = slotContainer.getByName('icon');
            const countLabel = slotContainer.getByName('count');
            if (slotData && slotData.item && slotData.count > 0) {
                icon.setTexture(slotData.item.iconTexture);
                icon.setVisible(true);
                if (slotData.count > 1) {
                    countLabel.setText(`${slotData.count}`);
                    countLabel.setVisible(true);
                }
                else {
                    countLabel.setVisible(false);
                }
            }
            else {
                icon.setVisible(false);
                countLabel.setVisible(false);
            }
        }
        // 2. Refresh 8 equipment slots
        for (const slotKey of Object.keys(this.equipSlots)) {
            const container = this.equipSlots[slotKey];
            const equipData = this.player.equipment[slotKey];
            const icon = container.getByName('icon');
            const placeholder = container.getByName('placeholder');
            if (equipData && equipData.item) {
                icon.setTexture(equipData.item.iconTexture);
                icon.setVisible(true);
                placeholder.setVisible(false);
            }
            else {
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
            const txt = this.invContainer.getByName(`stat_${idx}`);
            if (txt)
                txt.setText(val);
        });
        // 4. Update Hotbar
        this.updateHotbarVisuals();
    }
    repositionUI() {
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
    update() {
        if (!this.player)
            return;
        this.updateStatsBars();
        this.updateHotbarVisuals();
        this.updateDepthDisplay();
        this.updateDeathScreen();
    }
    updateStatsBars() {
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
    updateHotbarVisuals() {
        const slotSize = 46;
        const padding = 5;
        const totalWidth = GAME_CONSTANTS.HOTBAR_SLOTS * (slotSize + padding) - padding;
        const startX = Math.max(240, Math.floor((this.scale.width - totalWidth) / 2));
        const startY = 16;
        for (let i = 0; i < GAME_CONSTANTS.HOTBAR_SLOTS; i++) {
            const slotContainer = this.hotbarSlots[i];
            if (!slotContainer)
                continue;
            const slotData = this.player.inventory[i];
            const icon = slotContainer.getByName('icon');
            const countLabel = slotContainer.getByName('count');
            if (slotData && slotData.item && slotData.count > 0) {
                icon.setTexture(slotData.item.iconTexture);
                icon.setVisible(true);
                if (slotData.count > 1) {
                    countLabel.setText(`${slotData.count}`);
                    countLabel.setVisible(true);
                }
                else {
                    countLabel.setVisible(false);
                }
            }
            else {
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
        }
        else {
            this.itemTooltipText.setVisible(false);
        }
    }
    updateDepthDisplay() {
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
    static BOSS_BAR_FRAME_W = 662;
    static BOSS_BAR_FILL_W = 473;
    static BOSS_BAR_FILL_H = 19;
    static BOSS_BAR_FILL_X = -236.5;
    static BOSS_BAR_FILL_Y = 3.5;
    createBossBar() {
        this.bossBarContainer = this.add.container(0, 0);
        this.bossBarContainer.setDepth(120);
        this.bossBarContainer.setVisible(false);
        // 1. Recessed obsidian empty track groove (visible behind cropped fill)
        const bgGraphics = this.add.graphics();
        bgGraphics.setName('barBg');
        bgGraphics.fillStyle(0x090f1c, 0.94);
        bgGraphics.fillRect(UIScene.BOSS_BAR_FILL_X, UIScene.BOSS_BAR_FILL_Y - UIScene.BOSS_BAR_FILL_H / 2, UIScene.BOSS_BAR_FILL_W, UIScene.BOSS_BAR_FILL_H);
        bgGraphics.lineStyle(1, 0x162238, 0.9);
        for (let i = 1; i < 10; i++) {
            const divX = UIScene.BOSS_BAR_FILL_X + (UIScene.BOSS_BAR_FILL_W / 10) * i;
            bgGraphics.lineBetween(divX, UIScene.BOSS_BAR_FILL_Y - UIScene.BOSS_BAR_FILL_H / 2 + 1, divX, UIScene.BOSS_BAR_FILL_Y + UIScene.BOSS_BAR_FILL_H / 2 - 1);
        }
        this.bossBarContainer.add(bgGraphics);
        // 2. Dynamic generated segmented electric-cyan health fill sprite
        this.bossBarFillSprite = this.add.image(UIScene.BOSS_BAR_FILL_X, UIScene.BOSS_BAR_FILL_Y, 'bossbar_vormak_fill');
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
    ensureBossBarTexturesLoaded() {
        const required = [
            { key: 'bossbar_vormak_frame', url: 'assets/textures/bossbar_vormak_frame.png?v=6.9' },
            { key: 'bossbar_vormak_fill', url: 'assets/textures/bossbar_vormak_fill.png?v=6.9' },
            { key: 'bossbar_vormak_title', url: 'assets/textures/bossbar_vormak_title.png?v=6.9' }
        ];
        const missing = required.filter(item => !this.textures.exists(item.key));
        if (missing.length === 0)
            return;
        // Prevent green __MISSING placeholder squares from flashing while loading
        if (!this.textures.exists('bossbar_vormak_fill'))
            this.bossBarFillSprite.setVisible(false);
        if (!this.textures.exists('bossbar_vormak_frame'))
            this.bossBarFrameImage.setVisible(false);
        if (!this.textures.exists('bossbar_vormak_title'))
            this.bossBarTitleImage.setVisible(false);
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
    repositionBossBar() {
        if (!this.bossBarContainer)
            return;
        const targetWidth = Math.min(580, this.scale.width * 0.72);
        const barScale = Phaser.Math.Clamp(targetWidth / UIScene.BOSS_BAR_FRAME_W, 0.45, 0.92);
        const centerX = Math.floor(this.scale.width / 2);
        const posY = Math.floor(this.scale.height - 92 * barScale);
        this.bossBarContainer.setScale(barScale);
        this.bossBarContainer.setPosition(centerX, posY);
        this.renderBossBarFill();
    }
    showBossBar(bossName, currentHp, maxHp) {
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
        this.bossBarAnimWidth = UIScene.BOSS_BAR_FILL_W * ratio;
        this.bossBarTargetWidth = this.bossBarAnimWidth;
        const pct = Math.round(ratio * 100);
        this.bossBarHpText.setText(`${this.bossBarCurrentHp} / ${this.bossBarMaxHp} HP (${pct}%)`);
        this.bossBarContainer.setAlpha(0);
        this.bossBarContainer.setVisible(true);
        this.repositionBossBar();
        this.tweens.killTweensOf(this.bossBarContainer);
        this.tweens.add({
            targets: this.bossBarContainer,
            alpha: 1,
            duration: 350,
            ease: 'Sine.easeOut'
        });
    }
    updateBossBar(currentHp, maxHp) {
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
    hideBossBar() {
        if (!this.bossBarContainer || !this.bossBarContainer.visible)
            return;
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
    showDeathScreen() {
        if (this.deathScreenActive)
            return;
        this.deathScreenActive = true;
        this.deathPhase = 1;
        this.deathPhaseTimer = 0;
        this.deathRespawned = false;
        // Slowmo fizyki GameScene natychmiast + mocny shake kamery
        this.applyDeathSlowmo(0.15);
        const cam = this.gameScene?.cameras?.main;
        if (cam) {
            cam.shake(750, 0.016, true);
            if (cam.postFX) {
                if (this.deathColorFx) {
                    cam.postFX.remove(this.deathColorFx);
                    this.deathColorFx = null;
                }
                this.deathColorFx = cam.postFX.addColorMatrix();
            }
        }
        // Zbuduj pixel-art teksturę "ZGON" (na początku alpha=0)
        this.buildDeathTextTexture();
        // Stwórz overlay graphics
        if (this.deathOverlay) {
            this.deathOverlay.destroy();
            this.deathOverlay = null;
        }
        this.deathOverlay = this.add.graphics();
        this.deathOverlay.setDepth(999);
    }
    applyDeathSlowmo(factor) {
        const gs = this.gameScene;
        if (gs?.physics?.world) {
            gs.physics.world.timeScale = factor < 0.01 ? 999 : (1 / factor);
        }
    }
    restoreAfterDeath() {
        const gs = this.gameScene;
        if (gs?.physics?.world) {
            gs.physics.world.timeScale = 1;
        }
        const cam = gs?.cameras?.main;
        if (cam?.postFX && this.deathColorFx) {
            cam.postFX.remove(this.deathColorFx);
            this.deathColorFx = null;
        }
    }
    /**
     * Buduje masywny pixel-artowy napis "ZGON" (styl GTA / RPG pixel-art z grubym obrysem,
     * cieniem 3D i 3-tonowym cieniowaniem) na offscreen canvas i dodaje jako Phaser texture.
     */
    buildDeathTextTexture() {
        const SCALE = 6; // px na piksel siatki (ostry pixel-art)
        const BORDER = 2; // grubość czarnego obrysu w pikselach siatki
        const SHADOW_Y = 2; // twardy cień 3D w dół
        const LETTER_GAP = 2; // odstęp między literami w pikselach siatki
        const GLYPHS = {
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
        if (this.textures.exists(KEY))
            this.textures.remove(KEY);
        const canvas = document.createElement('canvas');
        canvas.width = texW;
        canvas.height = texH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const drawDot = (dotX, dotY, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(dotX * SCALE, dotY * SCALE, SCALE, SCALE);
        };
        const getPixel = (li, gx, gy) => {
            const g = GLYPHS[LETTERS[li]];
            if (!g || gy < 0 || gy >= GLYPH_H || gx < 0 || gx >= GLYPH_W)
                return false;
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
                            if (getPixel(li, gx + dx, gy - SHADOW_Y + dy))
                                hitShadow = true;
                        }
                    }
                    if (hitShadow)
                        drawDot(baseX + gx, BORDER + gy, '#090202');
                }
            }
        }
        // 2. Pełny czarny obrys 8-kierunkowy wokół liter
        for (let li = 0; li < LETTERS.length; li++) {
            const baseX = BORDER + li * (GLYPH_W + LETTER_GAP);
            for (let gy = -BORDER; gy < GLYPH_H + BORDER; gy++) {
                for (let gx = -BORDER; gx < GLYPH_W + BORDER; gx++) {
                    if (getPixel(li, gx, gy))
                        continue;
                    let outline = false;
                    for (let dy = -BORDER; dy <= BORDER && !outline; dy++) {
                        for (let dx = -BORDER; dx <= BORDER && !outline; dx++) {
                            if (dx === 0 && dy === 0)
                                continue;
                            if (getPixel(li, gx + dx, gy + dy))
                                outline = true;
                        }
                    }
                    if (outline)
                        drawDot(baseX + gx, BORDER + gy, '#000000');
                }
            }
        }
        // 3. Wypełnienie z 3-tonowym cieniowaniem (ładnie współgra z setTint biały -> czerwony)
        for (let li = 0; li < LETTERS.length; li++) {
            const baseX = BORDER + li * (GLYPH_W + LETTER_GAP);
            for (let gy = 0; gy < GLYPH_H; gy++) {
                let shade = '#ededed';
                if (gy <= 2)
                    shade = '#ffffff';
                else if (gy >= 10 && gy <= 11)
                    shade = '#d4d4d4';
                else if (gy >= 12)
                    shade = '#b8b8b8';
                for (let gx = 0; gx < GLYPH_W; gx++) {
                    if (getPixel(li, gx, gy))
                        drawDot(baseX + gx, BORDER + gy, shade);
                }
            }
        }
        this.textures.addCanvas(KEY, canvas);
        this.textures.get(KEY)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
        if (this.deathTextCanvas) {
            this.deathTextCanvas.destroy();
            this.deathTextCanvas = null;
        }
        this.deathTextCanvas = this.add.image(this.scale.width / 2, this.scale.height / 2, KEY);
        this.deathTextCanvas.setDepth(1001);
        this.deathTextCanvas.setAlpha(0);
        this.deathTextCanvas.setOrigin(0.5, 0.5);
        this.deathTextCanvas.setTint(0xffffff);
    }
    /**
     * Wywoływane z update() — steruje całą sekwencją ekranu zgonu.
     */
    updateDeathScreen() {
        if (!this.deathScreenActive)
            return;
        const delta = this.game.loop.delta;
        this.deathPhaseTimer += delta;
        const t = this.deathPhaseTimer;
        const W = this.scale.width;
        const H = this.scale.height;
        if (!this.deathOverlay || !this.deathTextCanvas)
            return;
        // ── Faza 1 (0–700 ms): Slowmo + shake + czerwony ekran ────────────────
        if (t < 700) {
            const p = t / 700;
            this.deathOverlay.clear();
            this.deathOverlay.fillStyle(0xcc0000, p * 0.52);
            this.deathOverlay.fillRect(0, 0, W, H);
            // ── Faza 2 (700–1400 ms): Przejście w czarno-biały ────────────────────
        }
        else if (t < 1400) {
            const p = (t - 700) / 700;
            if (this.deathPhase < 2)
                this.deathPhase = 2;
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
        }
        else if (t < 2050) {
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
        }
        else if (t < 3100) {
            const p = (t - 2050) / 1050;
            if (this.deathPhase < 4)
                this.deathPhase = 4;
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
        }
        else {
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
    hideDeathScreen() {
        if (!this.deathScreenActive)
            return;
        this.deathScreenActive = false;
        this.deathPhase = 0;
        this.deathPhaseTimer = 0;
        this.restoreAfterDeath();
        if (this.deathOverlay) {
            this.tweens.add({
                targets: this.deathOverlay, alpha: 0, duration: 500, ease: 'Sine.easeOut',
                onComplete: () => { if (this.deathOverlay) {
                    this.deathOverlay.destroy();
                    this.deathOverlay = null;
                } }
            });
        }
        if (this.deathTextCanvas) {
            this.tweens.add({
                targets: this.deathTextCanvas, alpha: 0, duration: 400, ease: 'Sine.easeOut',
                onComplete: () => { if (this.deathTextCanvas) {
                    this.deathTextCanvas.destroy();
                    this.deathTextCanvas = null;
                } }
            });
        }
    }
    renderBossBarFill() {
        if (!this.bossBarFillSprite)
            return;
        const cropW = Math.round(Phaser.Math.Clamp(this.bossBarAnimWidth, 0, UIScene.BOSS_BAR_FILL_W));
        if (cropW < 1) {
            this.bossBarFillSprite.setVisible(false);
            return;
        }
        this.bossBarFillSprite.setVisible(true);
        this.bossBarFillSprite.setCrop(0, 0, cropW, UIScene.BOSS_BAR_FILL_H);
    }
}
