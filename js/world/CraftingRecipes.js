import { CraftingStation } from '../types/index.js';
export const CRAFTING_RECIPES = [
    // --- HANDCRAFTING (Station: HAND) ---
    {
        id: 'planks',
        resultItemId: 'plank',
        resultCount: 4,
        station: CraftingStation.HAND,
        category: 'blocks',
        ingredients: [{ itemId: 'wood', count: 1 }]
    },
    {
        id: 'torches',
        resultItemId: 'torch',
        resultCount: 4,
        station: CraftingStation.HAND,
        category: 'blocks',
        ingredients: [{ itemId: 'wood', count: 1 }, { itemId: 'coal', count: 1 }]
    },
    {
        id: 'workbench',
        resultItemId: 'workbench_item',
        resultCount: 1,
        station: CraftingStation.HAND,
        category: 'blocks',
        ingredients: [{ itemId: 'wood', count: 10 }]
    },
    {
        id: 'stone_sword',
        resultItemId: 'stone_sword',
        resultCount: 1,
        station: CraftingStation.HAND,
        category: 'weapons',
        ingredients: [{ itemId: 'stone', count: 4 }, { itemId: 'wood', count: 2 }]
    },
    {
        id: 'stone_pickaxe',
        resultItemId: 'stone_pickaxe',
        resultCount: 1,
        station: CraftingStation.HAND,
        category: 'tools',
        ingredients: [{ itemId: 'stone', count: 6 }, { itemId: 'wood', count: 3 }]
    },
    // --- ARTISAN WORKBENCH (Station: WORKBENCH) ---
    {
        id: 'bricks',
        resultItemId: 'brick',
        resultCount: 2,
        station: CraftingStation.WORKBENCH,
        category: 'blocks',
        ingredients: [{ itemId: 'stone', count: 2 }]
    },
    {
        id: 'furnace',
        resultItemId: 'furnace_item',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'blocks',
        ingredients: [{ itemId: 'stone', count: 20 }, { itemId: 'coal', count: 4 }]
    },
    {
        id: 'copper_sword',
        resultItemId: 'copper_sword',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'weapons',
        ingredients: [{ itemId: 'copper_ore', count: 6 }, { itemId: 'wood', count: 2 }]
    },
    {
        id: 'copper_pickaxe',
        resultItemId: 'copper_pickaxe',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'tools',
        ingredients: [{ itemId: 'copper_ore', count: 8 }, { itemId: 'wood', count: 3 }]
    },
    {
        id: 'hunting_bow',
        resultItemId: 'hunting_bow',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'weapons',
        ingredients: [{ itemId: 'wood', count: 8 }, { itemId: 'sapling', count: 2 }]
    },
    {
        id: 'apprentice_staff',
        resultItemId: 'apprentice_staff',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'weapons',
        ingredients: [{ itemId: 'wood', count: 8 }, { itemId: 'astral_crystal', count: 1 }]
    },
    {
        id: 'mana_pendant',
        resultItemId: 'mana_pendant',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'armor',
        ingredients: [{ itemId: 'copper_ore', count: 4 }, { itemId: 'astral_crystal', count: 2 }]
    },
    // --- SMELTING FURNACE (Station: FURNACE) ---
    {
        id: 'copper_bar',
        resultItemId: 'copper_bar',
        resultCount: 1,
        station: CraftingStation.FURNACE,
        category: 'materials',
        ingredients: [{ itemId: 'copper_ore', count: 3 }]
    },
    {
        id: 'iron_bar',
        resultItemId: 'iron_bar',
        resultCount: 1,
        station: CraftingStation.FURNACE,
        category: 'materials',
        ingredients: [{ itemId: 'iron_ore', count: 3 }, { itemId: 'coal', count: 1 }]
    },
    {
        id: 'gold_bar',
        resultItemId: 'gold_bar',
        resultCount: 1,
        station: CraftingStation.FURNACE,
        category: 'materials',
        ingredients: [{ itemId: 'gold_ore', count: 4 }, { itemId: 'coal', count: 1 }]
    },
    {
        id: 'glass',
        resultItemId: 'glass',
        resultCount: 2,
        station: CraftingStation.FURNACE,
        category: 'blocks',
        ingredients: [{ itemId: 'dirt', count: 2 }, { itemId: 'coal', count: 1 }]
    },
    {
        id: 'anvil',
        resultItemId: 'anvil_item',
        resultCount: 1,
        station: CraftingStation.FURNACE,
        category: 'blocks',
        ingredients: [{ itemId: 'iron_bar', count: 5 }]
    },
    // --- FORGEMASTER ANVIL (Station: ANVIL) ---
    {
        id: 'iron_sword',
        resultItemId: 'iron_sword',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'weapons',
        ingredients: [{ itemId: 'iron_bar', count: 6 }, { itemId: 'wood', count: 2 }]
    },
    {
        id: 'iron_dagger',
        resultItemId: 'iron_dagger',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'weapons',
        ingredients: [{ itemId: 'iron_bar', count: 4 }, { itemId: 'wood', count: 1 }]
    },
    {
        id: 'ancient_spear',
        resultItemId: 'ancient_spear',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'weapons',
        ingredients: [{ itemId: 'iron_bar', count: 8 }, { itemId: 'wood', count: 5 }]
    },
    {
        id: 'iron_pickaxe',
        resultItemId: 'iron_pickaxe',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'tools',
        ingredients: [{ itemId: 'iron_bar', count: 8 }, { itemId: 'wood', count: 3 }]
    },
    {
        id: 'golden_pickaxe',
        resultItemId: 'golden_pickaxe',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'tools',
        ingredients: [{ itemId: 'gold_bar', count: 10 }, { itemId: 'wood', count: 3 }]
    },
    {
        id: 'diamond_pickaxe',
        resultItemId: 'diamond_pickaxe',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'tools',
        ingredients: [{ itemId: 'diamond', count: 3 }, { itemId: 'wood', count: 2 }]
    },
    {
        id: 'diamond_sword',
        resultItemId: 'diamond_sword',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'weapons',
        ingredients: [{ itemId: 'diamond', count: 2 }, { itemId: 'wood', count: 1 }]
    },
    {
        id: 'diamond_chestplate',
        resultItemId: 'diamond_chestplate',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'diamond', count: 8 }]
    },
    {
        id: 'diamond_ring',
        resultItemId: 'diamond_ring',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'diamond', count: 4 }, { itemId: 'gold_bar', count: 2 }]
    },
    {
        id: 'copper_helmet',
        resultItemId: 'copper_helmet',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'copper_bar', count: 5 }]
    },
    {
        id: 'copper_chestplate',
        resultItemId: 'copper_chestplate',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'copper_bar', count: 8 }]
    },
    {
        id: 'copper_leggings',
        resultItemId: 'copper_leggings',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'copper_bar', count: 7 }]
    },
    {
        id: 'copper_boots',
        resultItemId: 'copper_boots',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'copper_bar', count: 4 }]
    },
    {
        id: 'iron_helmet',
        resultItemId: 'iron_helmet',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'iron_bar', count: 6 }]
    },
    {
        id: 'iron_chestplate',
        resultItemId: 'iron_chestplate',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'iron_bar', count: 10 }]
    },
    {
        id: 'iron_leggings',
        resultItemId: 'iron_leggings',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'iron_bar', count: 8 }]
    },
    {
        id: 'iron_boots',
        resultItemId: 'iron_boots',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'iron_bar', count: 5 }]
    },
    {
        id: 'miner_charm',
        resultItemId: 'miner_charm',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'armor',
        ingredients: [{ itemId: 'copper_bar', count: 4 }, { itemId: 'iron_bar', count: 2 }]
    },
    {
        id: 'astral_blade',
        resultItemId: 'astral_blade',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'weapons',
        ingredients: [{ itemId: 'iron_bar', count: 12 }, { itemId: 'gold_bar', count: 6 }, { itemId: 'astral_crystal', count: 4 }]
    },
    {
        id: 'astral_pickaxe',
        resultItemId: 'astral_pickaxe',
        resultCount: 1,
        station: CraftingStation.ANVIL,
        category: 'tools',
        ingredients: [{ itemId: 'gold_bar', count: 10 }, { itemId: 'astral_crystal', count: 5 }, { itemId: 'wood', count: 3 }]
    },
    // --- ALCHEMY & POTIONS ---
    {
        id: 'minor_healing_potion',
        resultItemId: 'minor_healing_potion',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'consumables',
        ingredients: [{ itemId: 'glass', count: 1 }, { itemId: 'sapling', count: 1 }]
    },
    {
        id: 'minor_mana_potion',
        resultItemId: 'minor_mana_potion',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'consumables',
        ingredients: [{ itemId: 'glass', count: 1 }, { itemId: 'astral_crystal', count: 1 }]
    },
    {
        id: 'swiftness_potion',
        resultItemId: 'swiftness_potion',
        resultCount: 1,
        station: CraftingStation.WORKBENCH,
        category: 'consumables',
        ingredients: [{ itemId: 'glass', count: 1 }, { itemId: 'copper_ore', count: 2 }]
    }
];
