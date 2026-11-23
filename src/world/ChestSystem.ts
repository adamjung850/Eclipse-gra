import { BiomeId, BlockId } from '../types/index.js';
import { BiomeSystem } from './BiomeSystem.js';

export interface ChestLootEntry {
  itemId: string;
  min: number;
  max: number;
  chance: number; // 0..1
}

export class ChestSystem {
  /**
   * Returns a list of items to drop when a chest at (tileX, tileY) is opened or broken.
   */
  public static getLootForChest(tileX: number, tileY: number): { itemId: string; count: number }[] {
    const biome = BiomeSystem.getBiomeAt(tileX, tileY);
    const loot: { itemId: string; count: number }[] = [];

    // 1. Guaranteed Biome Special Treasure (Choose 1 primary relic)
    let primaryRelic = 'hermes_boots';
    switch (biome.id) {
      case BiomeId.FROZEN_PEAKS:
        primaryRelic = Math.random() > 0.5 ? 'ice_blade' : 'blizzard_pendant';
        break;
      case BiomeId.DESERT:
        primaryRelic = Math.random() > 0.5 ? 'sandstorm_bottle' : 'sun_dagger';
        break;
      case BiomeId.DARK_FOREST:
        primaryRelic = Math.random() > 0.5 ? 'shadow_hood' : 'necrotic_dagger';
        break;
      case BiomeId.CRYSTAL_CAVES:
        primaryRelic = Math.random() > 0.5 ? 'crystal_wand' : 'prismatic_ring';
        break;
      case BiomeId.NETHER:
        primaryRelic = Math.random() > 0.5 ? 'hellfire_sword' : 'molten_pickaxe';
        break;
      case BiomeId.THE_VOID:
        primaryRelic = Math.random() > 0.5 ? 'void_reaver' : 'void_pickaxe';
        break;
      case BiomeId.UNDERGROUND:
      case BiomeId.GREENLANDS:
      default:
        primaryRelic = Math.random() > 0.5 ? 'hermes_boots' : 'band_of_regen';
        break;
    }
    loot.push({ itemId: primaryRelic, count: 1 });

    // 2. Useful Survival Gear & Consumables
    loot.push({ itemId: 'health_potion', count: Math.floor(2 + Math.random() * 3) });
    loot.push({ itemId: 'torch', count: Math.floor(10 + Math.random() * 15) });

    // 3. Valuables / Ore Bars
    if (Math.random() < 0.75) {
      if (biome.id === BiomeId.NETHER || biome.id === BiomeId.THE_VOID) {
        loot.push({ itemId: 'gold_ore', count: Math.floor(4 + Math.random() * 6) });
        loot.push({ itemId: 'obsidian', count: Math.floor(3 + Math.random() * 5) });
      } else if (biome.id === BiomeId.CRYSTAL_CAVES) {
        loot.push({ itemId: 'crystal_shard', count: Math.floor(3 + Math.random() * 5) });
        loot.push({ itemId: 'diamond_ore', count: Math.floor(2 + Math.random() * 3) });
      } else {
        loot.push({ itemId: 'iron_ore', count: Math.floor(4 + Math.random() * 8) });
        loot.push({ itemId: 'copper_ore', count: Math.floor(6 + Math.random() * 10) });
      }
    }

    // 4. Mana Potions for magical biomes
    if (biome.id === BiomeId.CRYSTAL_CAVES || biome.id === BiomeId.THE_VOID || biome.id === BiomeId.FROZEN_PEAKS) {
      loot.push({ itemId: 'mana_potion', count: Math.floor(2 + Math.random() * 4) });
    }

    return loot;
  }
}
