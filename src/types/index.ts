/**
 * PROJECT: ECLIPSE – THE LOST WORLD
 * Type definitions & Constants
 */

export enum BlockId {
  AIR = 0,
  DIRT = 1,
  STONE = 2,
  GRASS = 3,
  WOOD = 4,
  LEAVES = 5,
  COPPER_ORE = 6,
  IRON_ORE = 7,
  COAL_ORE = 8,
  GOLD_ORE = 9,
  CRYSTAL_ORE = 10,
  BRICK = 11,
  PLANK = 12,
  GLASS = 13,
  OBSIDIAN = 14,
  BEDROCK = 15,
  DIRT_WALL = 16,
  STONE_WALL = 17,
  WOOD_WALL = 18,
  TORCH = 19,
  WORKBENCH = 20,
  FURNACE = 21,
  ANVIL = 22,
  DIAMOND_ORE = 23
}

export enum ItemRarity {
  COMMON = 'Zwykły',
  UNCOMMON = 'Niezwykły',
  RARE = 'Rzadki',
  EPIC = 'Epicki',
  LEGENDARY = 'Legendarny',
  MYTHICAL = 'Mityczny',
  DIVINE = 'Boski'
}

export enum ItemCategory {
  WEAPON = 'Broń',
  ARMOR = 'Pancerz',
  ACCESSORY = 'Akcesorium',
  TOOL = 'Narzędzie',
  BLOCK = 'Blok',
  WALL = 'Ściana',
  CONSUMABLE = 'Użytkowy',
  MATERIAL = 'Materiał'
}

export enum EquipSlotType {
  HELMET = 'helmet',
  CHEST = 'chest',
  LEGS = 'legs',
  BOOTS = 'boots',
  RING_1 = 'ring1',
  RING_2 = 'ring2',
  AMULET = 'amulet',
  CAPE = 'cape'
}

export enum CraftingStation {
  HAND = 'hand',
  WORKBENCH = 'workbench',
  FURNACE = 'furnace',
  ANVIL = 'anvil',
  ALCHEMY = 'alchemy'
}

export interface BlockConfig {
  id: BlockId;
  name: string;
  hardness: number;
  isSolid: boolean;
  isTransparent: boolean;
  isWall?: boolean;
  isStation?: CraftingStation;
  lightLevel?: number;
  dropItemId: string;
  dropMin: number;
  dropMax: number;
  color: number;
  particleColor: number;
  soundType: 'dirt' | 'stone' | 'wood' | 'glass' | 'metal';
}

export interface ItemData {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  description: string;
  iconTexture: string;
  maxStack: number;
  isPlaceable?: boolean;
  placeBlockId?: BlockId;
  equipSlot?: EquipSlotType;
  toolPower?: number; // Mining power
  damage?: number; // Weapon damage
  defense?: number; // Armor defense
  critChance?: number; // e.g. 0.05 = 5%
  hpBonus?: number;
  manaBonus?: number;
  speedBonus?: number; // e.g. 0.20 (+20% speed)
  healAmount?: number;
  manaHealAmount?: number;
  value: number; // Gold coins value
  obtainInfo: string;
}

export interface InventorySlot {
  item: ItemData | null;
  count: number;
}

export interface RecipeIngredient {
  itemId: string;
  count: number;
}

export interface CraftingRecipe {
  id: string;
  resultItemId: string;
  resultCount: number;
  station: CraftingStation;
  category: 'all' | 'tools' | 'weapons' | 'armor' | 'blocks' | 'consumables' | 'materials';
  ingredients: RecipeIngredient[];
}

export interface WorldSettings {
  width: number;
  height: number;
  tileSize: number;
  surfaceLevel: number;
  cavernLevel: number;
  bedrockLevel: number;
}

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

export const RARITY_COLORS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: '#e2e8f0',     // Bright clean slate
  [ItemRarity.UNCOMMON]: '#22c55e',   // Emerald Green
  [ItemRarity.RARE]: '#38bdf8',       // Cyan Blue
  [ItemRarity.EPIC]: '#a855f7',       // Amethyst Purple
  [ItemRarity.LEGENDARY]: '#f59e0b',  // Golden Amber
  [ItemRarity.MYTHICAL]: '#ef4444',   // Crimson Red
  [ItemRarity.DIVINE]: '#f43f5e'      // Celestial Pink/Red
};
