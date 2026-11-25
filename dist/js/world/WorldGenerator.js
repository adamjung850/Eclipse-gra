import { BlockId, GAME_CONSTANTS, BiomeId } from '../types/index.js';
import { BiomeSystem } from './BiomeSystem.js';
export class WorldGenerator {
    static generate(width = GAME_CONSTANTS.WORLD_WIDTH, height = GAME_CONSTANTS.WORLD_HEIGHT) {
        const foreground = [];
        const background = [];
        // Initialize empty grid
        for (let x = 0; x < width; x++) {
            foreground[x] = new Array(height).fill(BlockId.AIR);
            background[x] = new Array(height).fill(BlockId.AIR);
        }
        // Initialize randomized surface biome distribution
        BiomeSystem.initSurfaceRegions(width);
        // 1. Calculate Multi-Biome Surface Height Profile
        // All surface biomes are on the EXACT same base level with continuous, organic rolling relief (no cliff walls)
        const surfaceHeights = new Array(width);
        const seedOffset = Math.random() * 1000;
        for (let x = 0; x < width; x++) {
            const baseH = GAME_CONSTANTS.SURFACE_HEIGHT;
            // Gentle, rolling harmonic waves (max slope <= 1 block per column)
            const relief = Math.sin((x + seedOffset) * 0.022) * 5 +
                Math.cos((x + seedOffset) * 0.048) * 3 +
                Math.sin((x + seedOffset) * 0.09) * 1.5;
            surfaceHeights[x] = Math.floor(baseH + relief);
        }
        // 2. Fill Primary Strata according to Biome and Depth
        for (let x = 0; x < width; x++) {
            const surfaceY = surfaceHeights[x];
            const biome = BiomeSystem.getBiomeAt(x, surfaceY, surfaceY);
            for (let y = 0; y < height; y++) {
                if (y < surfaceY) {
                    // Air above surface
                    foreground[x][y] = BlockId.AIR;
                    background[x][y] = BlockId.AIR;
                    continue;
                }
                // Subterranean Layers by Depth
                if (y >= GAME_CONSTANTS.BEDROCK_DEPTH) {
                    // Bedrock mantle (indestructible world bottom)
                    foreground[x][y] = BlockId.BEDROCK;
                    background[x][y] = BlockId.BEDROCK;
                }
                else if (y >= GAME_CONSTANTS.VOID_DEPTH) {
                    // The Void: Cosmic voidstone & abyss
                    foreground[x][y] = Math.random() < 0.12 ? BlockId.VOID_CRYSTAL : BlockId.VOID_STONE;
                    background[x][y] = BlockId.VOID_STONE;
                }
                else if (y >= GAME_CONSTANTS.NETHER_DEPTH) {
                    // Nether: Volcanic ash, hellstone, glowing magma rock
                    const roll = Math.random();
                    if (roll < 0.14) {
                        foreground[x][y] = BlockId.LAVA_ROCK;
                        background[x][y] = BlockId.HELLSTONE;
                    }
                    else if (roll < 0.50) {
                        foreground[x][y] = BlockId.HELLSTONE;
                        background[x][y] = BlockId.HELLSTONE;
                    }
                    else {
                        foreground[x][y] = BlockId.ASH_BLOCK;
                        background[x][y] = BlockId.ASH_BLOCK;
                    }
                }
                else if (y >= GAME_CONSTANTS.CRYSTAL_DEPTH) {
                    // Crystal Caves: Stone with crystal geodes and walls
                    const isCrystal = Math.random() < 0.08;
                    foreground[x][y] = isCrystal ? BlockId.CRYSTAL_BLOCK : BlockId.STONE;
                    background[x][y] = isCrystal ? BlockId.CRYSTAL_BLOCK : BlockId.STONE;
                }
                else if (y >= surfaceY + 5) {
                    // Underground Caverns: Stone
                    if (biome.id === BiomeId.DARK_FOREST && y < surfaceY + 14 && Math.random() < 0.45) {
                        foreground[x][y] = BlockId.MOSSY_STONE;
                        background[x][y] = BlockId.MOSSY_STONE;
                    }
                    else if (biome.id === BiomeId.DESERT && y < surfaceY + 12) {
                        foreground[x][y] = BlockId.SANDSTONE;
                        background[x][y] = BlockId.SANDSTONE;
                    }
                    else {
                        foreground[x][y] = BlockId.STONE;
                        background[x][y] = BlockId.STONE;
                    }
                }
                else {
                    // Surface Biome Soil Strata with smooth organic border blending
                    let curBiome = biome;
                    for (const reg of BiomeSystem.surfaceRegions) {
                        if (Math.abs(x - reg.startX) <= 3 && reg.startX > 0) {
                            if (Math.random() < 0.5) {
                                curBiome = BiomeSystem.getBiomeAt(reg.startX - 1, surfaceY, surfaceY);
                            }
                            break;
                        }
                    }
                    if (curBiome.id === BiomeId.FROZEN_PEAKS) {
                        foreground[x][y] = y === surfaceY ? BlockId.SNOW : (y < surfaceY + 3 ? BlockId.SNOW : BlockId.ICE);
                        background[x][y] = foreground[x][y];
                    }
                    else if (curBiome.id === BiomeId.DARK_FOREST) {
                        foreground[x][y] = y === surfaceY ? BlockId.DARK_GRASS : BlockId.DARK_DIRT;
                        background[x][y] = foreground[x][y];
                    }
                    else if (curBiome.id === BiomeId.DESERT) {
                        foreground[x][y] = y < surfaceY + 3 ? BlockId.SAND : BlockId.SANDSTONE;
                        background[x][y] = foreground[x][y];
                    }
                    else {
                        // Greenlands (Default lush forest)
                        foreground[x][y] = y === surfaceY ? BlockId.GRASS : BlockId.DIRT;
                        background[x][y] = foreground[x][y];
                    }
                }
            }
        }
        // 3. Carve Natural Winding Caves (Perlin Worms & Geode Caverns)
        this.carveNaturalCaves(width, height, foreground, surfaceHeights);
        // 4. Generate Procedural Ore Veins across Biomes & Depths
        this.spawnOreVeins(width, height, foreground, surfaceHeights);
        // 5. Generate Secret Structures & Dungeons with Chests!
        this.spawnSecretStructures(width, height, foreground, background, surfaceHeights);
        // 6. Generate Procedural Flora (Trees & Cacti) on Surface
        const trees = [];
        this.spawnFlora(width, foreground, surfaceHeights, trees);
        // 7. Find Safe Player Spawn inside the peaceful Greenlands region
        const greenlandsRegion = BiomeSystem.surfaceRegions.find(r => r.biomeId === BiomeId.GREENLANDS) || BiomeSystem.surfaceRegions[1];
        const spawnTileX = Math.floor((greenlandsRegion.startX + greenlandsRegion.endX) / 2);
        const spawnTileY = surfaceHeights[spawnTileX] - 2;
        const spawnX = spawnTileX * GAME_CONSTANTS.TILE_SIZE + GAME_CONSTANTS.TILE_SIZE / 2;
        const spawnY = spawnTileY * GAME_CONSTANTS.TILE_SIZE;
        return {
            width,
            height,
            foreground,
            background,
            spawnX,
            spawnY,
            trees
        };
    }
    /**
     * Carves winding, natural caves ("zawijasy") using inertial tunnel worms.
     */
    static carveNaturalCaves(width, height, grid, surfaceHeights) {
        const spawnCenter = 185;
        const carveWorm = (params) => {
            let curX = params.x;
            let curY = params.y;
            let curAngle = params.angle;
            let angleVelocity = 0;
            const branchDepth = params.branchDepth || 0;
            for (let step = 0; step < params.length; step++) {
                const radNoise = Math.sin(step * 0.22) * 0.35 + (Math.random() - 0.5) * 0.2;
                const radius = Math.max(1.5, Math.min(2.8, params.radius + radNoise));
                const intR = Math.ceil(radius);
                for (let ox = -intR; ox <= intR; ox++) {
                    for (let oy = -intR; oy <= intR; oy++) {
                        const dist = Math.sqrt(ox * ox + oy * oy);
                        if (dist <= radius) {
                            const tx = Math.floor(curX + ox);
                            const ty = Math.floor(curY + oy);
                            if (tx >= 2 && tx < width - 2 && ty >= 0 && ty < GAME_CONSTANTS.BEDROCK_DEPTH - 2) {
                                // Spawn protection
                                const isNearSpawn = Math.abs(tx - spawnCenter) <= 8 && ty < surfaceHeights[spawnCenter] + 8;
                                if (isNearSpawn)
                                    continue;
                                if (params.isEntrance || ty >= surfaceHeights[tx] + 3) {
                                    grid[tx][ty] = BlockId.AIR;
                                }
                            }
                        }
                    }
                }
                angleVelocity = angleVelocity * 0.72 + (Math.random() - 0.5) * params.turnSpeed;
                curAngle += angleVelocity;
                const avgSurfaceY = surfaceHeights[Math.max(0, Math.min(width - 1, Math.floor(curX)))];
                if (curY > GAME_CONSTANTS.BEDROCK_DEPTH - 7) {
                    curAngle -= 0.18;
                }
                else if (!params.isEntrance && curY < avgSurfaceY + 5) {
                    curAngle += 0.18;
                }
                curX += Math.cos(curAngle) * 1.0;
                curY += Math.sin(curAngle) * 1.0;
                if (curX < 4) {
                    curX = 4;
                    curAngle = Math.PI - curAngle;
                }
                else if (curX > width - 5) {
                    curX = width - 5;
                    curAngle = Math.PI - curAngle;
                }
                if (branchDepth < 1 && step > 20 && step < params.length - 15 && Math.random() < 0.035) {
                    const branchAngle = curAngle + (Math.random() > 0.5 ? 0.75 : -0.75);
                    carveWorm({
                        x: curX,
                        y: curY,
                        angle: branchAngle,
                        length: Math.floor(params.length * 0.5),
                        radius: Math.max(1.3, params.radius - 0.25),
                        turnSpeed: params.turnSpeed * 1.1,
                        isEntrance: false,
                        branchDepth: branchDepth + 1
                    });
                }
            }
        };
        // 1. Surface Cave Entrances in each biome region
        const entranceXs = BiomeSystem.surfaceRegions.map(reg => Math.floor((reg.startX + reg.endX) / 2 + (Math.random() - 0.5) * 20));
        for (const entX of entranceXs) {
            const isRightSinking = Math.random() > 0.5;
            carveWorm({
                x: entX,
                y: surfaceHeights[entX],
                angle: isRightSinking
                    ? (Math.PI / 3 + (Math.random() - 0.5) * 0.25)
                    : ((2 * Math.PI) / 3 + (Math.random() - 0.5) * 0.25),
                length: 70,
                radius: 1.85,
                turnSpeed: 0.30,
                isEntrance: true
            });
        }
        // 2. Subterranean Winding Worms
        for (let i = 0; i < 28; i++) {
            const startX = 18 + Math.random() * (width - 36);
            const surfaceY = surfaceHeights[Math.floor(startX)];
            const startY = surfaceY + 10 + Math.random() * (GAME_CONSTANTS.BEDROCK_DEPTH - surfaceY - 22);
            const initialAngle = Math.random() * Math.PI * 2;
            carveWorm({
                x: startX,
                y: startY,
                angle: initialAngle,
                length: 75 + Math.floor(Math.random() * 45),
                radius: 1.85,
                turnSpeed: 0.36,
                isEntrance: false
            });
        }
        // 3. Crystal Geode Caverns (In Crystal Caves depth 115..160)
        for (let c = 0; c < 5; c++) {
            const gx = Math.floor(40 + Math.random() * (width - 80));
            const gy = Math.floor(GAME_CONSTANTS.CRYSTAL_DEPTH + 5 + Math.random() * 30);
            const geodeR = 5.5 + Math.random() * 2.0;
            const intR = Math.ceil(geodeR);
            for (let ox = -intR; ox <= intR; ox++) {
                for (let oy = -intR; oy <= intR; oy++) {
                    const dist = Math.sqrt(ox * ox + oy * oy * 1.15);
                    const tx = gx + ox;
                    const ty = gy + oy;
                    if (tx >= 2 && tx < width - 2 && ty < GAME_CONSTANTS.BEDROCK_DEPTH - 2) {
                        if (dist <= geodeR - 1.5) {
                            grid[tx][ty] = BlockId.AIR;
                        }
                        else if (dist <= geodeR) {
                            grid[tx][ty] = BlockId.CRYSTAL_BLOCK;
                        }
                    }
                }
            }
        }
    }
    /**
     * Spawns natural, connected ore veins with depth and biome affinities.
     */
    static spawnOreVeins(width, height, grid, surfaceHeights) {
        const placedCenters = [];
        const seedOrganicVein = (oreId, veinCount, minY, maxY, minSize, maxSize) => {
            let placed = 0;
            let attempts = 0;
            while (placed < veinCount && attempts < veinCount * 35) {
                attempts++;
                const cx = Math.floor(6 + Math.random() * (width - 12));
                const cy = Math.floor(minY + Math.random() * (maxY - minY));
                if (cy >= GAME_CONSTANTS.BEDROCK_DEPTH - 2 || (grid[cx][cy] !== BlockId.STONE && grid[cx][cy] !== BlockId.HELLSTONE && grid[cx][cy] !== BlockId.VOID_STONE)) {
                    continue;
                }
                let tooClose = false;
                for (const center of placedCenters) {
                    const distSq = (cx - center.x) ** 2 + (cy - center.y) ** 2;
                    if (distSq < 25) {
                        tooClose = true;
                        break;
                    }
                }
                if (tooClose)
                    continue;
                placedCenters.push({ x: cx, y: cy });
                const targetSize = minSize + Math.floor(Math.random() * (maxSize - minSize + 1));
                const vein = [{ x: cx, y: cy }];
                grid[cx][cy] = oreId;
                const dirs = [
                    { x: -1, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }, { x: 0, y: 1 },
                    { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
                ];
                let walkAttempts = 0;
                while (vein.length < targetSize && walkAttempts < targetSize * 12) {
                    walkAttempts++;
                    const parent = vein[Math.floor(Math.random() * vein.length)];
                    const dir = dirs[Math.floor(Math.random() * dirs.length)];
                    const nx = parent.x + dir.x;
                    const ny = parent.y + dir.y;
                    if (nx >= 2 && nx < width - 2 && ny > 30 && ny < GAME_CONSTANTS.BEDROCK_DEPTH - 2) {
                        const cur = grid[nx][ny];
                        if (cur === BlockId.STONE || cur === BlockId.HELLSTONE || cur === BlockId.VOID_STONE || cur === BlockId.SANDSTONE) {
                            grid[nx][ny] = oreId;
                            vein.push({ x: nx, y: ny });
                        }
                    }
                }
                placed++;
            }
        };
        // Coal & Copper (Shallow to mid)
        seedOrganicVein(BlockId.COAL_ORE, 55, 60, 145, 5, 8);
        seedOrganicVein(BlockId.COPPER_ORE, 45, 65, 125, 4, 7);
        // Iron (Mid depths)
        seedOrganicVein(BlockId.IRON_ORE, 40, 80, 160, 4, 6);
        // Gold (Deep caverns)
        seedOrganicVein(BlockId.GOLD_ORE, 30, 110, 185, 3, 5);
        // Diamond (Crystal depth)
        seedOrganicVein(BlockId.DIAMOND_ORE, 24, 130, 180, 2, 4);
        // Crystal Ore (Crystal Caves)
        seedOrganicVein(BlockId.CRYSTAL_ORE, 22, 140, 185, 3, 5);
        // Hellstone (Nether Layer)
        seedOrganicVein(BlockId.HELLSTONE, 35, 190, 220, 5, 8);
        // Obsidian (Nether & Bedrock interface)
        seedOrganicVein(BlockId.OBSIDIAN, 20, 195, 230, 4, 7);
        // Void Crystal (The Void)
        seedOrganicVein(BlockId.VOID_CRYSTAL, 18, 222, 233, 2, 5);
    }
    /**
     * Spawns Secret Structures (Underground Miner Cabins, Shrines, Ruined Forges)
     * each containing an interactive ancient chest with rare relics!
     */
    static spawnSecretStructures(width, height, grid, background, surfaceHeights) {
        // 1. Abandoned Underground Miner Cabins (Underground: y = 55..95)
        for (let i = 0; i < 4; i++) {
            const roomX = Math.floor(80 + i * 90 + (Math.random() - 0.5) * 40);
            const roomY = Math.floor(surfaceHeights[roomX] + 18 + Math.random() * 35);
            const rw = 8, rh = 5;
            // Carve room and place wooden frame
            for (let x = roomX; x < roomX + rw; x++) {
                for (let y = roomY; y < roomY + rh; y++) {
                    if (x >= 2 && x < width - 2 && y >= 0 && y < height - 2) {
                        background[x][y] = BlockId.WOOD_WALL;
                        if (y === roomY || y === roomY + rh - 1 || x === roomX || x === roomX + rw - 1) {
                            grid[x][y] = BlockId.PLANK;
                        }
                        else {
                            grid[x][y] = BlockId.AIR;
                        }
                    }
                }
            }
            // Place chest, workbench, and torch inside
            grid[roomX + 2][roomY + rh - 2] = BlockId.CHEST;
            grid[roomX + 5][roomY + rh - 2] = BlockId.WORKBENCH;
            grid[roomX + rw - 2][roomY + 1] = BlockId.TORCH;
        }
        // 2. Frozen Ice Shrine (in Frozen Peaks region)
        const frozenReg = BiomeSystem.surfaceRegions.find(r => r.biomeId === BiomeId.FROZEN_PEAKS);
        if (frozenReg) {
            const shrineX = Math.floor(frozenReg.startX + 20 + Math.random() * Math.max(10, (frozenReg.endX - frozenReg.startX) - 40));
            const shrineY = Math.floor(surfaceHeights[shrineX] + 12);
            const rw = 8, rh = 5;
            for (let x = shrineX; x < shrineX + rw; x++) {
                for (let y = shrineY; y < shrineY + rh; y++) {
                    if (x >= 2 && x < width - 2 && y < height - 2) {
                        background[x][y] = BlockId.STONE_WALL;
                        if (y === shrineY || y === shrineY + rh - 1 || x === shrineX || x === shrineX + rw - 1) {
                            grid[x][y] = BlockId.ICE;
                        }
                        else {
                            grid[x][y] = BlockId.AIR;
                        }
                    }
                }
            }
            grid[shrineX + 3][shrineY + rh - 2] = BlockId.CHEST;
            grid[shrineX + 4][shrineY + 1] = BlockId.TORCH;
        }
        // 3. Desert Sandstone Tomb (in Desert region)
        const desertReg = BiomeSystem.surfaceRegions.find(r => r.biomeId === BiomeId.DESERT);
        if (desertReg) {
            const tombX = Math.floor(desertReg.startX + 20 + Math.random() * Math.max(10, (desertReg.endX - desertReg.startX) - 40));
            const tombY = Math.floor(surfaceHeights[tombX] + 10);
            const rw = 9, rh = 5;
            for (let x = tombX; x < tombX + rw; x++) {
                for (let y = tombY; y < tombY + rh; y++) {
                    if (x >= 2 && x < width - 2 && y < height - 2) {
                        background[x][y] = BlockId.STONE_WALL;
                        if (y === tombY || y === tombY + rh - 1 || x === tombX || x === tombX + rw - 1) {
                            grid[x][y] = BlockId.SANDSTONE;
                        }
                        else {
                            grid[x][y] = BlockId.AIR;
                        }
                    }
                }
            }
            grid[tombX + 3][tombY + rh - 2] = BlockId.CHEST;
            grid[tombX + rw - 2][tombY + 1] = BlockId.TORCH;
        }
        // 4. Dark Forest Crypt (in Dark Forest region)
        const darkReg = BiomeSystem.surfaceRegions.find(r => r.biomeId === BiomeId.DARK_FOREST);
        if (darkReg) {
            const cryptX = Math.floor(darkReg.startX + 20 + Math.random() * Math.max(10, (darkReg.endX - darkReg.startX) - 40));
            const cryptY = Math.floor(surfaceHeights[cryptX] + 14);
            const rw = 8, rh = 5;
            for (let x = cryptX; x < cryptX + rw; x++) {
                for (let y = cryptY; y < cryptY + rh; y++) {
                    if (x >= 2 && x < width - 2 && y < height - 2) {
                        background[x][y] = BlockId.DIRT_WALL;
                        if (y === cryptY || y === cryptY + rh - 1 || x === cryptX || x === cryptX + rw - 1) {
                            grid[x][y] = BlockId.MOSSY_STONE;
                        }
                        else {
                            grid[x][y] = BlockId.AIR;
                        }
                    }
                }
            }
            grid[cryptX + 2][cryptY + rh - 2] = BlockId.CHEST;
            grid[cryptX + rw - 2][cryptY + 1] = BlockId.TORCH;
        }
        // 5. Crystal Geode Altar (Crystal Caves: y = 125..150)
        {
            const altarX = Math.floor(120 + Math.random() * 260);
            const altarY = 135;
            const rw = 8, rh = 5;
            for (let x = altarX; x < altarX + rw; x++) {
                for (let y = altarY; y < altarY + rh; y++) {
                    if (x >= 2 && x < width - 2 && y < height - 2) {
                        background[x][y] = BlockId.CRYSTAL_WALL;
                        if (y === altarY || y === altarY + rh - 1 || x === altarX || x === altarX + rw - 1) {
                            grid[x][y] = BlockId.CRYSTAL_BLOCK;
                        }
                        else {
                            grid[x][y] = BlockId.AIR;
                        }
                    }
                }
            }
            grid[altarX + 3][altarY + rh - 2] = BlockId.CHEST;
        }
        // 6. Nether Ruined Forge (Nether: y = 195..210)
        {
            const forgeX = Math.floor(100 + Math.random() * 300);
            const forgeY = 200;
            const rw = 9, rh = 5;
            for (let x = forgeX; x < forgeX + rw; x++) {
                for (let y = forgeY; y < forgeY + rh; y++) {
                    if (x >= 2 && x < width - 2 && y < height - 2) {
                        background[x][y] = BlockId.STONE_WALL;
                        if (y === forgeY || y === forgeY + rh - 1 || x === forgeX || x === forgeX + rw - 1) {
                            grid[x][y] = BlockId.HELLSTONE;
                        }
                        else {
                            grid[x][y] = BlockId.AIR;
                        }
                    }
                }
            }
            grid[forgeX + 2][forgeY + rh - 2] = BlockId.CHEST;
            grid[forgeX + 5][forgeY + rh - 2] = BlockId.FURNACE;
        }
        // 7. Void Monolith (The Void: y = 226)
        {
            const voidX = Math.floor(150 + Math.random() * 200);
            const voidY = 226;
            const rw = 7, rh = 5;
            for (let x = voidX; x < voidX + rw; x++) {
                for (let y = voidY; y < voidY + rh; y++) {
                    if (x >= 2 && x < width - 2 && y < height - 2) {
                        background[x][y] = BlockId.STONE_WALL;
                        if (y === voidY || y === voidY + rh - 1 || x === voidX || x === voidX + rw - 1) {
                            grid[x][y] = BlockId.VOID_STONE;
                        }
                        else {
                            grid[x][y] = BlockId.AIR;
                        }
                    }
                }
            }
            grid[voidX + 3][voidY + rh - 2] = BlockId.CHEST;
        }
    }
    /**
     * Spawns surface flora adapted to each biome:
     * - Greenlands: Lush Terraria oaks (palettes 0, 1, 3)
     * - Dark Forest: Gloomwood trees with dark wood and purple leaves
     * - Desert: Desert Cacti with prickly needles and branches
     * - Frozen Peaks: Snow-dusted evergreen pine trees
     */
    static spawnFlora(width, grid, surfaceHeights, trees) {
        let lastFloraX = 5;
        for (let x = 6; x < width - 6; x++) {
            if (x - lastFloraX < 4)
                continue;
            const surfaceY = surfaceHeights[x];
            const surfaceBlock = grid[x][surfaceY];
            // Desert: Spawn ONLY Cacti AND Majestic Desert Palm Trees!
            if (surfaceBlock === BlockId.SAND) {
                if (Math.random() < 0.52) {
                    const isPalm = Math.random() < 0.48;
                    if (isPalm) {
                        // Desert Palm Tree: tall segmented golden-tan palm trunk with lush tropical fronds & coconuts
                        const trunkHeight = 6 + Math.floor(Math.random() * 3); // 6 to 8 blocks tall
                        const treeTopY = surfaceY - trunkHeight;
                        const crownVariant = 8; // desert_palm
                        const colorVariant = 6; // palm_tropical
                        for (let ty = surfaceY - 1; ty >= treeTopY; ty--) {
                            grid[x][ty] = BlockId.PALM_WOOD;
                        }
                        trees.push({
                            x,
                            surfaceY,
                            treeTopY,
                            trunkHeight,
                            crownVariant,
                            colorVariant,
                            branchSpots: [], // Palms have a clean, elegant trunk
                            isDarkWood: false
                        });
                        lastFloraX = x;
                    }
                    else {
                        // Prickly Desert Cactus with arms
                        const cactusHeight = 2 + Math.floor(Math.random() * 3); // 2 to 4 blocks tall
                        for (let ty = surfaceY - 1; ty >= surfaceY - cactusHeight; ty--) {
                            grid[x][ty] = BlockId.CACTUS;
                        }
                        if (cactusHeight >= 3 && Math.random() < 0.6) {
                            const side = Math.random() < 0.5 ? -1 : 1;
                            const armX = x + side;
                            const armY = surfaceY - 2;
                            if (armX >= 0 && armX < width && grid[armX][armY] === BlockId.AIR) {
                                grid[armX][armY] = BlockId.CACTUS;
                                if (grid[armX][armY - 1] === BlockId.AIR) {
                                    grid[armX][armY - 1] = BlockId.CACTUS;
                                }
                            }
                        }
                        lastFloraX = x;
                    }
                }
                continue;
            }
            // Forest Trees: Greenlands (Oaks), Dark Forest (Gloomwood), Frozen Peaks (Snowy Conifers)
            if (surfaceBlock === BlockId.GRASS || surfaceBlock === BlockId.DARK_GRASS || surfaceBlock === BlockId.SNOW) {
                if (Math.abs(surfaceHeights[x - 1] - surfaceY) > 1 || Math.abs(surfaceHeights[x + 1] - surfaceY) > 1) {
                    continue;
                }
                if (Math.random() < 0.48) {
                    const isDarkForest = surfaceBlock === BlockId.DARK_GRASS;
                    const isFrozenPeaks = surfaceBlock === BlockId.SNOW;
                    let trunkHeight;
                    let crownVariant;
                    let colorVariant;
                    let woodBlock = BlockId.WOOD;
                    const branchSpots = [];
                    if (isFrozenPeaks) {
                        // 1. FROZEN PEAKS: Snowy Conifers & Boreal Pines with white snow caps
                        trunkHeight = 6 + Math.floor(Math.random() * 3); // 6 to 8 blocks tall
                        crownVariant = Math.random() < 0.65 ? 5 : 6; // 5: snowy_conifer, 6: boreal_pine
                        colorVariant = Math.random() < 0.75 ? 4 : 2; // 4: snow_frost (pure white snow tops), 2: teal
                        woodBlock = BlockId.WOOD;
                        grid[x][surfaceY - 1] = BlockId.TREE_ROOT;
                        // Rare pine bough near the base
                        if (trunkHeight >= 7 && Math.random() < 0.4) {
                            branchSpots.push({ y: surfaceY - 2, side: Math.random() < 0.5 ? 'L' : 'R' });
                        }
                    }
                    else if (isDarkForest) {
                        // 2. DARK FOREST: Gothic Gloom Willow with weeping dark amethyst/purple foliage
                        trunkHeight = 5 + Math.floor(Math.random() * 3); // 5 to 7 blocks tall
                        crownVariant = Math.random() < 0.70 ? 7 : 1; // 7: gloom_willow, 1: lush_canopy
                        colorVariant = Math.random() < 0.75 ? 5 : 2; // 5: dark_amethyst, 2: teal
                        woodBlock = BlockId.DARK_WOOD;
                        // Base of trunk connects directly with dark wood
                        grid[x][surfaceY - 1] = BlockId.DARK_WOOD;
                        if (trunkHeight >= 5) {
                            branchSpots.push({ y: surfaceY - 2, side: Math.random() < 0.5 ? 'L' : 'R' });
                            if (trunkHeight >= 6 && Math.random() < 0.6) {
                                branchSpots.push({ y: surfaceY - 4, side: branchSpots[0].side === 'L' ? 'R' : 'L' });
                            }
                        }
                    }
                    else {
                        // 3. GREENLANDS: Classic Diverse Terraria Oaks (round, wide, twin, lush, bushy)
                        const roll = Math.random();
                        if (roll < 0.45)
                            trunkHeight = 4;
                        else if (roll < 0.85)
                            trunkHeight = 5;
                        else
                            trunkHeight = 6;
                        crownVariant = Math.floor(Math.random() * 5); // 0..4
                        colorVariant = [0, 1, 3][Math.floor(Math.random() * 3)]; // emerald, olive, golden
                        woodBlock = BlockId.WOOD;
                        grid[x][surfaceY - 1] = BlockId.TREE_ROOT;
                        if (trunkHeight >= 5) {
                            const pRoll = Math.random();
                            if (pRoll < 0.5) {
                                branchSpots.push({ y: surfaceY - 2, side: 'L' });
                                branchSpots.push({ y: surfaceY - 3, side: 'R' });
                            }
                            else {
                                branchSpots.push({ y: surfaceY - 2, side: 'R' });
                                branchSpots.push({ y: surfaceY - 3, side: 'L' });
                            }
                        }
                        else {
                            branchSpots.push({ y: surfaceY - 2, side: Math.random() < 0.5 ? 'L' : 'R' });
                        }
                    }
                    const treeTopY = surfaceY - trunkHeight;
                    for (let ty = surfaceY - 1; ty >= treeTopY; ty--) {
                        if (ty === surfaceY - 1 && (isFrozenPeaks || !isDarkForest)) {
                            continue; // root already placed at surfaceY - 1
                        }
                        grid[x][ty] = woodBlock;
                    }
                    trees.push({
                        x,
                        surfaceY,
                        treeTopY,
                        trunkHeight,
                        crownVariant,
                        colorVariant,
                        branchSpots,
                        isDarkWood: isDarkForest
                    });
                    lastFloraX = x;
                }
            }
        }
    }
}
