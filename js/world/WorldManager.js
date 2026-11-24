import { BlockId, BiomeId, GAME_CONSTANTS } from '../types/index.js';
import { BLOCK_DEFINITIONS } from './BlockTypes.js';
import { CROWN_PALETTES } from '../textures/TreeSprites.js';
import { BiomeSystem } from './BiomeSystem.js';
import { ITEM_REGISTRY } from './ItemTypes.js';
export class WorldManager {
    scene;
    width;
    height;
    foreground;
    background;
    blockDamage = new Map();
    crackImages = new Map();
    tilemap;
    backgroundLayer;
    foregroundLayer;
    // Trees & Sapling growth
    activeTrees = [];
    plantedSaplings = [];
    // Chests Data: tileKey "x,y" => 20 InventorySlots
    chests = new Map();
    onItemDrop;
    onChestClosed;
    // Callback when a block is broken: (tileX, tileY, blockId) => void
    onBlockBroken;
    constructor(scene, worldData) {
        this.scene = scene;
        this.width = worldData.width;
        this.height = worldData.height;
        this.foreground = worldData.foreground;
        this.background = worldData.background;
        // Initialize trees from procedural generation
        if (worldData.trees) {
            for (const t of worldData.trees) {
                this.activeTrees.push({
                    x: t.x,
                    surfaceY: t.surfaceY,
                    treeTopY: t.treeTopY,
                    trunkHeight: t.trunkHeight,
                    crownVariant: t.crownVariant ?? 0,
                    colorVariant: t.colorVariant ?? 0,
                    branchSprites: [],
                    branchSpots: t.branchSpots ?? [],
                    isDarkWood: t.isDarkWood
                });
            }
        }
        this.createTilemaps();
        this.spawnInitialTreeCrowns();
    }
    createTilemaps() {
        const T = GAME_CONSTANTS.TILE_SIZE;
        // 1. Create Phaser Tilemap
        this.tilemap = this.scene.make.tilemap({
            tileWidth: T,
            tileHeight: T,
            width: this.width,
            height: this.height
        });
        const tileset = this.tilemap.addTilesetImage('world_tileset', 'world_tileset', T, T, 0, 0);
        if (!tileset) {
            console.error('Failed to create world tileset');
            return;
        }
        // 2. Create Background Layer (Walls)
        const bgLayer = this.tilemap.createBlankLayer('BackgroundLayer', tileset, 0, 0);
        if (bgLayer) {
            this.backgroundLayer = bgLayer;
            this.backgroundLayer.setAlpha(0.95);
            this.backgroundLayer.setTint(0x525463);
            // Populate background tiles
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    const wallId = this.background[x][y];
                    if (wallId !== BlockId.AIR) {
                        this.backgroundLayer.putTileAt(wallId, x, y);
                    }
                }
            }
        }
        // 3. Create Foreground Layer (Solid & interactable blocks)
        const fgLayer = this.tilemap.createBlankLayer('ForegroundLayer', tileset, 0, 0);
        if (fgLayer) {
            this.foregroundLayer = fgLayer;
            // Populate foreground tiles
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    const blockId = this.foreground[x][y];
                    if (blockId !== BlockId.AIR) {
                        // Natural tree leaves are rendered via tree_crown sprite, skip square block placement
                        if (blockId === BlockId.LEAVES && this.isNaturalTreeLeaf(x, y)) {
                            continue;
                        }
                        this.foregroundLayer.putTileAt(blockId, x, y);
                    }
                }
            }
            this.updateCollisions();
        }
    }
    isNaturalTreeLeaf(x, y) {
        for (const tree of this.activeTrees) {
            const halfW = (tree.crownVariant === 2 || tree.crownVariant === 3) ? 2 : 1;
            const topY = tree.crownVariant === 1 ? tree.treeTopY - 3 : tree.treeTopY - 2;
            if (Math.abs(tree.x - x) <= halfW && y <= tree.treeTopY && y >= topY) {
                return true;
            }
        }
        return false;
    }
    spawnInitialTreeCrowns() {
        const T = GAME_CONSTANTS.TILE_SIZE;
        for (const tree of this.activeTrees) {
            if (!tree.branchSprites)
                tree.branchSprites = [];
            // 1. Crown Sprite: overlaps top of trunk by 18px for seamless socket integration
            const texKey = `tree_crown_${tree.crownVariant}_${tree.colorVariant}`;
            const crown = this.scene.add.image(tree.x * T + T / 2, tree.treeTopY * T + 18, this.scene.textures.exists(texKey) ? texKey : 'tree_crown');
            crown.setDepth(2);
            crown.setOrigin(0.5, 1.0);
            tree.crownSprite = crown;
            // 2. Large Pixel Art Branches
            if (tree.branchSpots) {
                const darkSuffix = tree.isDarkWood ? '_dark' : '';
                for (const b of tree.branchSpots) {
                    if (b.side === 'L') {
                        const bSprite = this.scene.add.image(tree.x * T + 5, b.y * T + 12, `tree_branch_left_${tree.colorVariant}${darkSuffix}`);
                        bSprite.setOrigin(47 / 48, 35 / 42);
                        bSprite.setDepth(1);
                        tree.branchSprites.push(bSprite);
                    }
                    else {
                        const bSprite = this.scene.add.image(tree.x * T + 19, b.y * T + 12, `tree_branch_right_${tree.colorVariant}${darkSuffix}`);
                        bSprite.setOrigin(0, 35 / 42);
                        bSprite.setDepth(1);
                        tree.branchSprites.push(bSprite);
                    }
                }
            }
        }
    }
    updateCollisions() {
        // 1. Reset all tile collisions across the entire layer
        this.foregroundLayer.setCollisionByExclusion([], false);
        // 2. Identify all solid block IDs from BLOCK_DEFINITIONS
        const solidBlockIds = [];
        for (const key of Object.keys(BLOCK_DEFINITIONS)) {
            const id = Number(key);
            const def = BLOCK_DEFINITIONS[id];
            if (def && def.isSolid) {
                solidBlockIds.push(id);
            }
        }
        this.foregroundLayer.setCollision(solidBlockIds, true);
        // 3. Explicitly disable collision on wood, leaves, torches, walls, saplings, cacti and tree parts
        const nonSolidIds = [
            BlockId.WOOD,
            BlockId.DARK_WOOD,
            BlockId.PALM_WOOD,
            BlockId.LEAVES,
            BlockId.DARK_LEAVES,
            BlockId.CACTUS,
            BlockId.TORCH,
            BlockId.DIRT_WALL,
            BlockId.STONE_WALL,
            BlockId.WOOD_WALL,
            BlockId.CRYSTAL_WALL,
            BlockId.SAPLING,
            BlockId.TREE_ROOT,
            BlockId.TREE_BRANCH_L,
            BlockId.TREE_BRANCH_R
        ];
        this.foregroundLayer.setCollision(nonSolidIds, false);
        // 4. Force individual tile collision properties to match BLOCK_DEFINITIONS strictly
        this.foregroundLayer.forEachTile((tile) => {
            const def = BLOCK_DEFINITIONS[tile.index];
            const isSolid = def ? def.isSolid : false;
            tile.setCollision(isSolid, isSolid, isSolid, isSolid);
        });
    }
    getBlock(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return BlockId.BEDROCK; // Outside map counts as bedrock
        }
        return this.foreground[tileX][tileY];
    }
    getWall(tileX, tileY) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return BlockId.AIR;
        }
        return this.background[tileX][tileY];
    }
    isSolid(tileX, tileY) {
        const blockId = this.getBlock(tileX, tileY);
        const def = BLOCK_DEFINITIONS[blockId];
        return def ? def.isSolid : false;
    }
    getChestAt(tileX, tileY) {
        if (this.getBlock(tileX, tileY) !== BlockId.CHEST)
            return null;
        const key = `${tileX},${tileY}`;
        if (this.chests.has(key)) {
            return this.chests.get(key);
        }
        // Initialize 20 chest slots (2 rows x 10 cols)
        const slots = [];
        for (let i = 0; i < 20; i++) {
            slots.push({ item: null, count: 0 });
        }
        // Procedurally generate authentic dungeon / cavern / biome treasure
        const biome = BiomeSystem.getBiomeAt(tileX, tileY, this.height);
        let sIdx = 0;
        // Guaranteed essentials
        slots[sIdx++] = { item: ITEM_REGISTRY['torch'], count: 12 + Math.floor(Math.random() * 16) };
        slots[sIdx++] = { item: ITEM_REGISTRY['plank'], count: 16 + Math.floor(Math.random() * 24) };
        // Potions
        if (Math.random() < 0.75) {
            slots[sIdx++] = { item: ITEM_REGISTRY['minor_healing_potion'], count: 2 + Math.floor(Math.random() * 3) };
        }
        if (Math.random() < 0.60) {
            slots[sIdx++] = { item: ITEM_REGISTRY['minor_mana_potion'], count: 2 + Math.floor(Math.random() * 3) };
        }
        // Bars & Ores
        const barRoll = Math.random();
        if (barRoll < 0.45) {
            slots[sIdx++] = { item: ITEM_REGISTRY['iron_bar'], count: 3 + Math.floor(Math.random() * 4) };
        }
        else if (barRoll < 0.75) {
            slots[sIdx++] = { item: ITEM_REGISTRY['copper_bar'], count: 4 + Math.floor(Math.random() * 6) };
        }
        else {
            slots[sIdx++] = { item: ITEM_REGISTRY['gold_ore'], count: 3 + Math.floor(Math.random() * 4) };
        }
        // Biome-specific unique treasure loot
        if (biome.id === BiomeId.FROZEN_PEAKS) {
            slots[sIdx++] = Math.random() < 0.55
                ? { item: ITEM_REGISTRY['ice_blade'], count: 1 }
                : { item: ITEM_REGISTRY['blizzard_pendant'], count: 1 };
        }
        else if (biome.id === BiomeId.DESERT) {
            slots[sIdx++] = Math.random() < 0.55
                ? { item: ITEM_REGISTRY['sandstorm_bottle'], count: 1 }
                : { item: ITEM_REGISTRY['sun_dagger'], count: 1 };
        }
        else if (biome.id === BiomeId.DARK_FOREST) {
            slots[sIdx++] = Math.random() < 0.55
                ? { item: ITEM_REGISTRY['necrotic_dagger'], count: 1 }
                : { item: ITEM_REGISTRY['shadow_hood'], count: 1 };
        }
        else {
            // General Cavern / Miner Cabin
            const cabRoll = Math.random();
            if (cabRoll < 0.45) {
                slots[sIdx++] = { item: ITEM_REGISTRY['band_of_regen'], count: 1 };
            }
            else if (cabRoll < 0.75) {
                slots[sIdx++] = { item: ITEM_REGISTRY['hunting_bow'], count: 1 };
            }
            else {
                slots[sIdx++] = { item: ITEM_REGISTRY['iron_sword'], count: 1 };
            }
        }
        // Diamond chance
        if (Math.random() < 0.30) {
            slots[sIdx++] = { item: ITEM_REGISTRY['diamond'], count: 1 + Math.floor(Math.random() * 2) };
        }
        this.chests.set(key, slots);
        return slots;
    }
    damageBlock(tileX, tileY, damage) {
        const blockId = this.getBlock(tileX, tileY);
        if (blockId === BlockId.AIR || blockId === BlockId.BEDROCK) {
            return false;
        }
        const def = BLOCK_DEFINITIONS[blockId];
        if (!def)
            return false;
        const key = `${tileX},${tileY}`;
        const currentDmg = (this.blockDamage.get(key) || 0) + damage;
        this.blockDamage.set(key, currentDmg);
        const T = GAME_CONSTANTS.TILE_SIZE;
        const progress = currentDmg / def.hardness;
        // Check if broken
        if (progress >= 1.0) {
            this.breakBlock(tileX, tileY);
            return true;
        }
        // Update crack sprite overlay
        let crackIdx = 0;
        if (progress > 0.75)
            crackIdx = 3;
        else if (progress > 0.5)
            crackIdx = 2;
        else if (progress > 0.25)
            crackIdx = 1;
        let crackImg = this.crackImages.get(key);
        if (!crackImg) {
            crackImg = this.scene.add.image(tileX * T + T / 2, tileY * T + T / 2, `crack_${crackIdx}`);
            crackImg.setDepth(15);
            this.crackImages.set(key, crackImg);
        }
        else {
            crackImg.setTexture(`crack_${crackIdx}`);
        }
        return false;
    }
    clearDamage(tileX, tileY) {
        const key = `${tileX},${tileY}`;
        this.blockDamage.delete(key);
        const crack = this.crackImages.get(key);
        if (crack) {
            crack.destroy();
            this.crackImages.delete(key);
        }
    }
    isTreeTrunkBlock(blockId) {
        return (blockId === BlockId.WOOD ||
            blockId === BlockId.TREE_ROOT ||
            blockId === BlockId.TREE_BRANCH_L ||
            blockId === BlockId.TREE_BRANCH_R ||
            blockId === BlockId.DARK_WOOD ||
            blockId === BlockId.PALM_WOOD);
    }
    breakBlock(tileX, tileY) {
        const blockId = this.getBlock(tileX, tileY);
        if (blockId === BlockId.AIR || blockId === BlockId.BEDROCK)
            return;
        // Tree-Fall Cascade: if breaking ANY trunk segment, fell the entire tree above it!
        if (this.isTreeTrunkBlock(blockId)) {
            this.fellTreeFrom(tileX, tileY);
            return;
        }
        // If breaking a chest, drop all stored contents!
        if (blockId === BlockId.CHEST) {
            const key = `${tileX},${tileY}`;
            const slots = this.chests.get(key);
            if (slots) {
                for (const slot of slots) {
                    if (slot && slot.item && slot.count > 0 && this.onItemDrop) {
                        this.onItemDrop(tileX, tileY, slot.item.id, slot.count);
                    }
                }
                this.chests.delete(key);
            }
            if (this.onChestClosed) {
                this.onChestClosed(tileX, tileY);
            }
        }
        // Remove from foreground grid and layer
        this.foreground[tileX][tileY] = BlockId.AIR;
        this.foregroundLayer.removeTileAt(tileX, tileY);
        this.clearDamage(tileX, tileY);
        // If breaking a leaf block of a tree, check if crown needs to be removed
        if (blockId === BlockId.LEAVES) {
            const treeIdx = this.activeTrees.findIndex(t => {
                const halfW = (t.crownVariant === 2 || t.crownVariant === 3) ? 2 : 1;
                const topY = t.crownVariant === 1 ? t.treeTopY - 3 : t.treeTopY - 2;
                return Math.abs(t.x - tileX) <= halfW && tileY <= t.treeTopY && tileY >= topY;
            });
            if (treeIdx !== -1) {
                const tree = this.activeTrees[treeIdx];
                if (tree.crownSprite) {
                    this.emitLeafBurst(tree.x * GAME_CONSTANTS.TILE_SIZE + 12, tree.treeTopY * GAME_CONSTANTS.TILE_SIZE - 20, tree.colorVariant);
                    tree.crownSprite.destroy();
                    tree.crownSprite = undefined;
                }
            }
        }
        // Trigger broken callback
        if (this.onBlockBroken) {
            this.onBlockBroken(tileX, tileY, blockId);
        }
    }
    fellTreeFrom(tileX, startY) {
        // 1. Break the initial trunk block
        const initialBlockId = this.getBlock(tileX, startY);
        this.foreground[tileX][startY] = BlockId.AIR;
        this.foregroundLayer.removeTileAt(tileX, startY);
        this.clearDamage(tileX, startY);
        if (this.onBlockBroken) {
            this.onBlockBroken(tileX, startY, initialBlockId);
        }
        // 2. Cascade upwards breaking all trunk blocks above
        let currY = startY - 1;
        while (currY >= 0 && this.isTreeTrunkBlock(this.getBlock(tileX, currY))) {
            const bId = this.getBlock(tileX, currY);
            this.foreground[tileX][currY] = BlockId.AIR;
            this.foregroundLayer.removeTileAt(tileX, currY);
            this.clearDamage(tileX, currY);
            if (this.onBlockBroken) {
                this.onBlockBroken(tileX, currY, bId);
            }
            currY--;
        }
        // 3. Find and destroy tree crown
        const treeIdx = this.activeTrees.findIndex(t => t.x === tileX && startY >= t.treeTopY - 1 && startY <= t.surfaceY);
        if (treeIdx !== -1) {
            const tree = this.activeTrees[treeIdx];
            if (tree.crownSprite) {
                this.emitLeafBurst(tree.x * GAME_CONSTANTS.TILE_SIZE + 12, tree.treeTopY * GAME_CONSTANTS.TILE_SIZE - 20, tree.colorVariant);
                tree.crownSprite.destroy();
                tree.crownSprite = undefined;
            }
            if (tree.branchSprites) {
                for (const b of tree.branchSprites) {
                    this.emitLeafBurst(b.x, b.y, tree.colorVariant);
                    b.destroy();
                }
                tree.branchSprites = [];
            }
            // Clear canopy proxy blocks from foreground
            const isConifer = tree.crownVariant === 5 || tree.crownVariant === 6;
            const isWillow = tree.crownVariant === 7;
            const isPalm = tree.crownVariant === 8;
            const halfW = (tree.crownVariant === 2 || tree.crownVariant === 3 || isConifer || isWillow || isPalm) ? 2 : 1;
            const topY = isConifer ? tree.treeTopY - 4 : (tree.crownVariant === 1 || isWillow ? tree.treeTopY - 3 : tree.treeTopY - 2);
            for (let lx = tree.x - halfW; lx <= tree.x + halfW; lx++) {
                for (let ly = topY; ly <= tree.treeTopY; ly++) {
                    if (lx >= 0 && lx < this.width && ly >= 0) {
                        const blk = this.foreground[lx][ly];
                        if (blk === BlockId.LEAVES || blk === BlockId.DARK_LEAVES || blk === BlockId.SNOW) {
                            this.foreground[lx][ly] = BlockId.AIR;
                            this.foregroundLayer.removeTileAt(lx, ly);
                            this.clearDamage(lx, ly);
                        }
                    }
                }
            }
            // Drop strictly 1, 2, or 3 saplings per felled tree (not 10+)
            const saplingsToDrop = 1 + Math.floor(Math.random() * 3);
            for (let s = 0; s < saplingsToDrop; s++) {
                if (this.onBlockBroken) {
                    this.onBlockBroken(tree.x, tree.treeTopY, BlockId.SAPLING);
                }
            }
            this.activeTrees.splice(treeIdx, 1);
        }
    }
    emitLeafBurst(worldX, worldY, colorVariant = 0) {
        const pal = CROWN_PALETTES[colorVariant] || CROWN_PALETTES[0];
        for (let i = 0; i < 16; i++) {
            const p = this.scene.add.image(worldX + (Math.random() - 0.5) * 44, worldY + (Math.random() - 0.5) * 36, 'particle_chip');
            p.setTint(Math.random() > 0.4 ? pal.particlePrimary : pal.particleSecondary);
            p.setDepth(15);
            this.scene.tweens.add({
                targets: p,
                x: p.x + (Math.random() - 0.5) * 48,
                y: p.y + 25 + Math.random() * 40,
                alpha: 0,
                duration: 450 + Math.random() * 350,
                onComplete: () => p.destroy()
            });
        }
    }
    growTreeAt(tileX, surfaceY) {
        if (this.getBlock(tileX, surfaceY) !== BlockId.SAPLING)
            return;
        // Pick sturdy height for grown saplings (4-7 blocks high, rare 8)
        const roll = Math.random();
        let trunkHeight;
        if (roll < 0.40) {
            trunkHeight = 4 + Math.floor(Math.random() * 2);
        }
        else if (roll < 0.85) {
            trunkHeight = 6 + Math.floor(Math.random() * 2);
        }
        else {
            trunkHeight = 8;
        }
        const treeTopY = surfaceY - trunkHeight + 1;
        // Determine biome to grow authentic flora!
        const biome = BiomeSystem.getBiomeAt(tileX, surfaceY);
        let crownVariant = Math.floor(Math.random() * 5); // Default: oaks 0..4
        let colorVariant = [0, 1, 3][Math.floor(Math.random() * 3)];
        let woodBlock = BlockId.WOOD;
        let leafBlock = BlockId.LEAVES;
        let isDarkWood = false;
        if (biome.id === BiomeId.FROZEN_PEAKS) {
            // Frozen Peaks: Snowy Conifer or Boreal Pine
            crownVariant = Math.random() < 0.65 ? 5 : 6;
            colorVariant = Math.random() < 0.75 ? 4 : 2; // 4: snow_frost, 2: teal
            leafBlock = BlockId.SNOW;
        }
        else if (biome.id === BiomeId.DARK_FOREST) {
            // Dark Forest: Gloom Willow with purple/amethyst leaves
            crownVariant = Math.random() < 0.70 ? 7 : 1;
            colorVariant = Math.random() < 0.75 ? 5 : 2; // 5: dark_amethyst, 2: teal
            woodBlock = BlockId.DARK_WOOD;
            leafBlock = BlockId.DARK_LEAVES;
            isDarkWood = true;
        }
        else if (biome.id === BiomeId.DESERT) {
            // Desert: Tropical Desert Palm
            crownVariant = 8;
            colorVariant = 6;
            woodBlock = BlockId.PALM_WOOD;
        }
        const isConifer = crownVariant === 5 || crownVariant === 6;
        const isWillow = crownVariant === 7;
        const isPalm = crownVariant === 8;
        const canopyTop = isConifer ? treeTopY - 4 : (crownVariant === 1 || isWillow ? treeTopY - 3 : treeTopY - 2);
        // Check space above
        for (let ty = surfaceY - 1; ty >= canopyTop; ty--) {
            if (ty < 0 || this.isSolid(tileX, ty))
                return; // Obstacle above
        }
        // Remove sapling
        this.foreground[tileX][surfaceY] = BlockId.AIR;
        this.foregroundLayer.removeTileAt(tileX, surfaceY);
        // 1. Root base
        const rootBlock = isDarkWood ? BlockId.DARK_WOOD : (isPalm ? BlockId.PALM_WOOD : BlockId.TREE_ROOT);
        this.foreground[tileX][surfaceY] = rootBlock;
        this.foregroundLayer.putTileAt(rootBlock, tileX, surfaceY);
        // 2. Trunk with dynamic leafy branches (palms have no side branches)
        const branchSpots = [];
        if (!isPalm && trunkHeight >= 4) {
            const bRoll = Math.random();
            if (trunkHeight >= 6) {
                if (bRoll < 0.55) {
                    branchSpots.push({ y: surfaceY - 2, side: 'L' });
                    branchSpots.push({ y: surfaceY - 4, side: 'R' });
                }
                else if (bRoll < 0.85) {
                    branchSpots.push({ y: surfaceY - 3, side: 'R' });
                    branchSpots.push({ y: surfaceY - 5, side: 'L' });
                }
                else {
                    branchSpots.push({ y: surfaceY - 3, side: Math.random() < 0.5 ? 'L' : 'R' });
                }
            }
            else {
                if (bRoll < 0.85) {
                    branchSpots.push({ y: surfaceY - 2, side: Math.random() < 0.5 ? 'L' : 'R' });
                }
            }
        }
        for (let ty = surfaceY - 1; ty >= treeTopY; ty--) {
            this.foreground[tileX][ty] = woodBlock;
            this.foregroundLayer.putTileAt(woodBlock, tileX, ty);
        }
        // 3. Create Crown Sprite & Large Branch Sprites (Clean pixel-art canopy, no fake square tiles)
        const T = GAME_CONSTANTS.TILE_SIZE;
        const crownKey = `tree_crown_${crownVariant}_${colorVariant}`;
        const crown = this.scene.add.image(tileX * T + T / 2, treeTopY * T + 18, this.scene.textures.exists(crownKey) ? crownKey : 'tree_crown');
        crown.setDepth(2);
        crown.setOrigin(0.5, 1.0);
        const branchSprites = [];
        const darkSuffix = isDarkWood ? '_dark' : '';
        for (const b of branchSpots) {
            if (b.side === 'L') {
                const bSprite = this.scene.add.image(tileX * T + 5, b.y * T + 12, `tree_branch_left_${colorVariant}${darkSuffix}`);
                bSprite.setOrigin(47 / 48, 35 / 42);
                bSprite.setDepth(1);
                branchSprites.push(bSprite);
            }
            else {
                const bSprite = this.scene.add.image(tileX * T + 19, b.y * T + 12, `tree_branch_right_${colorVariant}${darkSuffix}`);
                bSprite.setOrigin(0, 35 / 42);
                bSprite.setDepth(1);
                branchSprites.push(bSprite);
            }
        }
        this.activeTrees.push({
            x: tileX,
            surfaceY: surfaceY + 1,
            treeTopY,
            trunkHeight,
            crownVariant,
            colorVariant,
            crownSprite: crown,
            branchSprites,
            branchSpots,
            isDarkWood
        });
        // Growth particle poof
        this.emitLeafBurst(tileX * T + T / 2, surfaceY * T, colorVariant);
    }
    update(delta) {
        if (this.plantedSaplings.length > 0) {
            const now = Date.now();
            for (let i = this.plantedSaplings.length - 1; i >= 0; i--) {
                const s = this.plantedSaplings[i];
                if (now - s.plantedAt >= s.growTime) {
                    this.plantedSaplings.splice(i, 1);
                    this.growTreeAt(s.x, s.y);
                }
            }
        }
    }
    canPlaceBlock(tileX, tileY, blockId, playerBounds) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        // Target tile must be Air
        if (this.foreground[tileX][tileY] !== BlockId.AIR) {
            return false;
        }
        // Sapling placement: must be planted on top of fertile Grass or Dirt
        if (blockId === BlockId.SAPLING) {
            const floorBlock = this.getBlock(tileX, tileY + 1);
            return floorBlock === BlockId.GRASS || floorBlock === BlockId.DIRT;
        }
        const T = GAME_CONSTANTS.TILE_SIZE;
        const blockRect = new Phaser.Geom.Rectangle(tileX * T, tileY * T, T, T);
        // Solid blocks cannot be placed directly inside player bounding box
        const def = BLOCK_DEFINITIONS[blockId];
        if (def && def.isSolid) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, blockRect)) {
                return false;
            }
        }
        // Classic Sandbox placement rule: Must be adjacent to an existing solid block or background wall
        const hasSolidNeighbor = this.isSolid(tileX - 1, tileY) ||
            this.isSolid(tileX + 1, tileY) ||
            this.isSolid(tileX, tileY - 1) ||
            this.isSolid(tileX, tileY + 1) ||
            this.background[tileX][tileY] !== BlockId.AIR;
        return hasSolidNeighbor;
    }
    placeBlock(tileX, tileY, blockId) {
        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }
        const def = BLOCK_DEFINITIONS[blockId];
        if (!def)
            return false;
        if (def.isWall) {
            // Place as wall in background layer
            this.background[tileX][tileY] = blockId;
            this.backgroundLayer.putTileAt(blockId, tileX, tileY);
        }
        else {
            // If placing dirt with air directly above, turn it into lush grass block
            if (blockId === BlockId.DIRT && tileY > 0 && this.foreground[tileX][tileY - 1] === BlockId.AIR) {
                blockId = BlockId.GRASS;
            }
            // Place in foreground layer
            this.foreground[tileX][tileY] = blockId;
            this.foregroundLayer.putTileAt(blockId, tileX, tileY);
            // If planting a sapling, track it for natural tree growth!
            if (blockId === BlockId.SAPLING) {
                this.plantedSaplings.push({
                    x: tileX,
                    y: tileY,
                    plantedAt: Date.now(),
                    growTime: 12000 + Math.random() * 8000 // 12-20s growth time
                });
            }
            if (def.isSolid) {
                this.updateCollisions();
            }
        }
        return true;
    }
    worldToTile(worldX, worldY) {
        const T = GAME_CONSTANTS.TILE_SIZE;
        return {
            x: Math.floor(worldX / T),
            y: Math.floor(worldY / T)
        };
    }
    tileToWorld(tileX, tileY) {
        const T = GAME_CONSTANTS.TILE_SIZE;
        return {
            x: tileX * T,
            y: tileY * T
        };
    }
}
