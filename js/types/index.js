/**
 * PROJECT: ECLIPSE – THE LOST WORLD
 * Type definitions & Constants
 */
export var BlockId;
(function (BlockId) {
    BlockId[BlockId["AIR"] = 0] = "AIR";
    BlockId[BlockId["DIRT"] = 1] = "DIRT";
    BlockId[BlockId["STONE"] = 2] = "STONE";
    BlockId[BlockId["GRASS"] = 3] = "GRASS";
    BlockId[BlockId["WOOD"] = 4] = "WOOD";
    BlockId[BlockId["LEAVES"] = 5] = "LEAVES";
    BlockId[BlockId["COPPER_ORE"] = 6] = "COPPER_ORE";
    BlockId[BlockId["IRON_ORE"] = 7] = "IRON_ORE";
    BlockId[BlockId["COAL_ORE"] = 8] = "COAL_ORE";
    BlockId[BlockId["GOLD_ORE"] = 9] = "GOLD_ORE";
    BlockId[BlockId["CRYSTAL_ORE"] = 10] = "CRYSTAL_ORE";
    BlockId[BlockId["BRICK"] = 11] = "BRICK";
    BlockId[BlockId["PLANK"] = 12] = "PLANK";
    BlockId[BlockId["GLASS"] = 13] = "GLASS";
    BlockId[BlockId["OBSIDIAN"] = 14] = "OBSIDIAN";
    BlockId[BlockId["BEDROCK"] = 15] = "BEDROCK";
    BlockId[BlockId["DIRT_WALL"] = 16] = "DIRT_WALL";
    BlockId[BlockId["STONE_WALL"] = 17] = "STONE_WALL";
    BlockId[BlockId["WOOD_WALL"] = 18] = "WOOD_WALL";
    BlockId[BlockId["TORCH"] = 19] = "TORCH";
    BlockId[BlockId["WORKBENCH"] = 20] = "WORKBENCH";
    BlockId[BlockId["FURNACE"] = 21] = "FURNACE";
    BlockId[BlockId["ANVIL"] = 22] = "ANVIL";
    BlockId[BlockId["DIAMOND_ORE"] = 23] = "DIAMOND_ORE";
})(BlockId || (BlockId = {}));
export var ItemRarity;
(function (ItemRarity) {
    ItemRarity["COMMON"] = "Zwyk\u0142y";
    ItemRarity["UNCOMMON"] = "Niezwyk\u0142y";
    ItemRarity["RARE"] = "Rzadki";
    ItemRarity["EPIC"] = "Epicki";
    ItemRarity["LEGENDARY"] = "Legendarny";
    ItemRarity["MYTHICAL"] = "Mityczny";
    ItemRarity["DIVINE"] = "Boski";
})(ItemRarity || (ItemRarity = {}));
export var ItemCategory;
(function (ItemCategory) {
    ItemCategory["WEAPON"] = "Bro\u0144";
    ItemCategory["ARMOR"] = "Pancerz";
    ItemCategory["ACCESSORY"] = "Akcesorium";
    ItemCategory["TOOL"] = "Narz\u0119dzie";
    ItemCategory["BLOCK"] = "Blok";
    ItemCategory["WALL"] = "\u015Aciana";
    ItemCategory["CONSUMABLE"] = "U\u017Cytkowy";
    ItemCategory["MATERIAL"] = "Materia\u0142";
})(ItemCategory || (ItemCategory = {}));
export var EquipSlotType;
(function (EquipSlotType) {
    EquipSlotType["HELMET"] = "helmet";
    EquipSlotType["CHEST"] = "chest";
    EquipSlotType["LEGS"] = "legs";
    EquipSlotType["BOOTS"] = "boots";
    EquipSlotType["RING_1"] = "ring1";
    EquipSlotType["RING_2"] = "ring2";
    EquipSlotType["AMULET"] = "amulet";
    EquipSlotType["CAPE"] = "cape";
})(EquipSlotType || (EquipSlotType = {}));
export var CraftingStation;
(function (CraftingStation) {
    CraftingStation["HAND"] = "hand";
    CraftingStation["WORKBENCH"] = "workbench";
    CraftingStation["FURNACE"] = "furnace";
    CraftingStation["ANVIL"] = "anvil";
    CraftingStation["ALCHEMY"] = "alchemy";
})(CraftingStation || (CraftingStation = {}));
export const GAME_CONSTANTS = {
    TILE_SIZE: 24,
    WORLD_WIDTH: 500,
    WORLD_HEIGHT: 240,
    SURFACE_HEIGHT: 55,
    CAVERN_DEPTH: 110,
    BEDROCK_DEPTH: 232,
    GRAVITY: 980,
    PLAYER_SPEED: 210,
    PLAYER_JUMP_VELOCITY: -370,
    PLAYER_REACH_TILES: 6.5,
    HOTBAR_SLOTS: 9,
    BACKPACK_SLOTS: 36, // 4 rows x 9 columns
    TOTAL_INVENTORY_SLOTS: 45 // 9 hotbar + 36 backpack
};
export const RARITY_COLORS = {
    [ItemRarity.COMMON]: '#e2e8f0', // Bright clean slate
    [ItemRarity.UNCOMMON]: '#22c55e', // Emerald Green
    [ItemRarity.RARE]: '#38bdf8', // Cyan Blue
    [ItemRarity.EPIC]: '#a855f7', // Amethyst Purple
    [ItemRarity.LEGENDARY]: '#f59e0b', // Golden Amber
    [ItemRarity.MYTHICAL]: '#ef4444', // Crimson Red
    [ItemRarity.DIVINE]: '#f43f5e' // Celestial Pink/Red
};
