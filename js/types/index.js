/**
 * PROJECT: ECLIPSE – THE LOST WORLD
 * Type definitions & Constants (Runtime JS)
 */

export const BlockId = Object.freeze({
  AIR: 0,
  DIRT: 1,
  STONE: 2,
  GRASS: 3,
  WOOD: 4,
  LEAVES: 5,
  COPPER_ORE: 6,
  IRON_ORE: 7,
  COAL_ORE: 8,
  GOLD_ORE: 9,
  CRYSTAL_ORE: 10,
  BRICK: 11,
  PLANK: 12,
  GLASS: 13,
  OBSIDIAN: 14,
  BEDROCK: 15,
  DIRT_WALL: 16,
  STONE_WALL: 17,
  WOOD_WALL: 18,
  TORCH: 19,
  WORKBENCH: 20,
  FURNACE: 21,
  ANVIL: 22
});

export const ItemRarity = Object.freeze({
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  EPIC: 'Epic',
  LEGENDARY: 'Legendary',
  MYTHICAL: 'Mythical',
  DIVINE: 'Divine'
});

export const ItemCategory = Object.freeze({
  WEAPON: 'Weapon',
  ARMOR: 'Armor',
  ACCESSORY: 'Accessory',
  TOOL: 'Tool',
  BLOCK: 'Block',
  WALL: 'Wall',
  CONSUMABLE: 'Consumable',
  MATERIAL: 'Material'
});

export const EquipSlotType = Object.freeze({
  HELMET: 'helmet',
  CHEST: 'chest',
  LEGS: 'legs',
  BOOTS: 'boots',
  RING_1: 'ring1',
  RING_2: 'ring2',
  AMULET: 'amulet',
  CAPE: 'cape'
});

export const CraftingStation = Object.freeze({
  HAND: 'hand',
  WORKBENCH: 'workbench',
  FURNACE: 'furnace',
  ANVIL: 'anvil',
  ALCHEMY: 'alchemy'
});

export const GAME_CONSTANTS = Object.freeze({
  TILE_SIZE: 24,
  WORLD_WIDTH: 200,
  WORLD_HEIGHT: 120,
  SURFACE_HEIGHT: 38,
  CAVERN_DEPTH: 65,
  BEDROCK_DEPTH: 116,
  GRAVITY: 980,
  PLAYER_SPEED: 210,
  PLAYER_JUMP_VELOCITY: -370,
  PLAYER_REACH_TILES: 6.5,
  HOTBAR_SLOTS: 9,
  BACKPACK_SLOTS: 36,
  TOTAL_INVENTORY_SLOTS: 45
});

export const RARITY_COLORS = Object.freeze({
  [ItemRarity.COMMON]: '#e2e8f0',
  [ItemRarity.UNCOMMON]: '#22c55e',
  [ItemRarity.RARE]: '#38bdf8',
  [ItemRarity.EPIC]: '#a855f7',
  [ItemRarity.LEGENDARY]: '#f59e0b',
  [ItemRarity.MYTHICAL]: '#ef4444',
  [ItemRarity.DIVINE]: '#f43f5e'
});
