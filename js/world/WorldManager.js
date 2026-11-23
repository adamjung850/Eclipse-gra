import { BlockId, GAME_CONSTANTS } from '../types/index.js';
import { BLOCK_DEFINITIONS } from './BlockTypes.js';
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
                    trunkHeight: t.trunkHeight
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
            this.backgroundLayer.setAlpha(0.92);
            this.backgroundLayer.setTint(0xccccdd);
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
            if (Math.abs(tree.x - x) <= 1 && y <= tree.treeTopY && y >= tree.treeTopY - 2) {
                return true;
            }
        }
        return false;
    }
    spawnInitialTreeCrowns() {
        const T = GAME_CONSTANTS.TILE_SIZE;
        for (const tree of this.activeTrees) {
            const crown = this.scene.add.image(tree.x * T + T / 2, tree.treeTopY * T - 18, 'tree_crown');
            crown.setDepth(0);
            crown.setOrigin(0.5, 0.5);
            tree.crownSprite = crown;
        }
    }
    updateCollisions() {
        // 1. Reset all tile collisions across the entire layer
        this.foregroundLayer.setCollisionByExclusion([], false);
        // 2. Identify all solid block IDs from BLOCK_DEFINITIONS
        const solidBlockIds = [];
        for (let id = 1; id < 32; id++) {
            const def = BLOCK_DEFINITIONS[id];
            if (def && def.isSolid) {
                solidBlockIds.push(id);
            }
        }
        this.foregroundLayer.setCollision(solidBlockIds, true);
        // 3. Explicitly disable collision on wood, leaves, torches, walls, saplings and tree parts
        const nonSolidIds = [
            BlockId.WOOD,
            BlockId.LEAVES,
            BlockId.TORCH,
            BlockId.DIRT_WALL,
            BlockId.STONE_WALL,
            BlockId.WOOD_WALL,
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
            blockId === BlockId.TREE_BRANCH_R);
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
        // If breaking a grass block, ensure the background wall shows the grass block texture (with green top), not dirt
        if (blockId === BlockId.GRASS) {
            this.background[tileX][tileY] = BlockId.GRASS;
            this.backgroundLayer.putTileAt(BlockId.GRASS, tileX, tileY);
        }
        // Remove from grids
        this.foreground[tileX][tileY] = BlockId.AIR;
        this.foregroundLayer.removeTileAt(tileX, tileY);
        this.clearDamage(tileX, tileY);
        // If breaking a leaf block of a tree, check if crown needs to be removed
        if (blockId === BlockId.LEAVES) {
            const treeIdx = this.activeTrees.findIndex(t => Math.abs(t.x - tileX) <= 1 && tileY <= t.treeTopY && tileY >= t.treeTopY - 2);
            if (treeIdx !== -1) {
                const tree = this.activeTrees[treeIdx];
                if (tree.crownSprite) {
                    this.emitLeafBurst(tree.x * GAME_CONSTANTS.TILE_SIZE + 12, tree.treeTopY * GAME_CONSTANTS.TILE_SIZE - 18);
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
        const treeIdx = this.activeTrees.findIndex(t => t.x === tileX && t.surfaceY >= startY && t.treeTopY <= startY + 2);
        if (treeIdx !== -1) {
            const tree = this.activeTrees[treeIdx];
            if (tree.crownSprite) {
                this.emitLeafBurst(tree.x * GAME_CONSTANTS.TILE_SIZE + 12, tree.treeTopY * GAME_CONSTANTS.TILE_SIZE - 18);
                tree.crownSprite.destroy();
            }
            // Clear canopy blocks and drop saplings
            for (let lx = tree.x - 1; lx <= tree.x + 1; lx++) {
                for (let ly = tree.treeTopY - 2; ly <= tree.treeTopY; ly++) {
                    if (lx >= 0 && lx < this.width && ly >= 0) {
                        if (this.foreground[lx][ly] === BlockId.LEAVES) {
                            this.foreground[lx][ly] = BlockId.AIR;
                            this.foregroundLayer.removeTileAt(lx, ly);
                            this.clearDamage(lx, ly);
                            if (this.onBlockBroken) {
                                this.onBlockBroken(lx, ly, BlockId.LEAVES);
                            }
                        }
                    }
                }
            }
            this.activeTrees.splice(treeIdx, 1);
        }
    }
    emitLeafBurst(worldX, worldY) {
        for (let i = 0; i < 12; i++) {
            const p = this.scene.add.image(worldX + (Math.random() - 0.5) * 40, worldY + (Math.random() - 0.5) * 32, 'particle_chip');
            p.setTint(Math.random() > 0.4 ? 0x279649 : 0x72ee93);
            p.setDepth(15);
            this.scene.tweens.add({
                targets: p,
                x: p.x + (Math.random() - 0.5) * 44,
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
        const trunkHeight = 5 + Math.floor(Math.random() * 3); // 5 to 7 blocks
        const treeTopY = surfaceY - trunkHeight + 1;
        // Check space above
        for (let ty = surfaceY - 1; ty >= treeTopY - 2; ty--) {
            if (ty < 0 || this.isSolid(tileX, ty))
                return; // Obstacle above
        }
        // Remove sapling
        this.foreground[tileX][surfaceY] = BlockId.AIR;
        this.foregroundLayer.removeTileAt(tileX, surfaceY);
        // 1. Root base
        this.foreground[tileX][surfaceY] = BlockId.TREE_ROOT;
        this.foregroundLayer.putTileAt(BlockId.TREE_ROOT, tileX, surfaceY);
        // 2. Trunk with branches
        const branchLY = trunkHeight >= 5 ? surfaceY - 2 : -1;
        const branchRY = trunkHeight >= 6 ? surfaceY - 4 : -1;
        for (let ty = surfaceY - 1; ty >= treeTopY; ty--) {
            let bId = BlockId.WOOD;
            if (ty === branchLY)
                bId = BlockId.TREE_BRANCH_L;
            else if (ty === branchRY)
                bId = BlockId.TREE_BRANCH_R;
            this.foreground[tileX][ty] = bId;
            this.foregroundLayer.putTileAt(bId, tileX, ty);
        }
        // 3. Mark canopy
        for (let lx = tileX - 1; lx <= tileX + 1; lx++) {
            for (let ly = treeTopY - 2; ly <= treeTopY; ly++) {
                if (lx >= 0 && lx < this.width && ly >= 0) {
                    if (this.foreground[lx][ly] === BlockId.AIR) {
                        this.foreground[lx][ly] = BlockId.LEAVES;
                    }
                }
            }
        }
        // 4. Create Crown Sprite
        const T = GAME_CONSTANTS.TILE_SIZE;
        const crown = this.scene.add.image(tileX * T + T / 2, treeTopY * T - 18, 'tree_crown');
        crown.setDepth(0);
        crown.setOrigin(0.5, 0.5);
        this.activeTrees.push({
            x: tileX,
            surfaceY: surfaceY + 1,
            treeTopY,
            trunkHeight,
            crownSprite: crown
        });
        // Growth particle poof
        this.emitLeafBurst(tileX * T + T / 2, surfaceY * T);
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
            // Synchronize background layer if empty
            if (this.background[tileX][tileY] === BlockId.AIR) {
                this.background[tileX][tileY] = blockId;
                this.backgroundLayer.putTileAt(blockId, tileX, tileY);
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
