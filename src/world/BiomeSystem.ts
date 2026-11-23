import { BiomeId, BlockId, GAME_CONSTANTS } from '../types/index.js';

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  polishName: string;
  surfaceBlock: BlockId;
  subsurfaceBlock: BlockId;
  rockBlock: BlockId;
  treeWoodBlock?: BlockId;
  treeLeavesBlock?: BlockId;
  skyColorDay: string;
  skyColorNight: string;
  ambientLight: number; // multiplier e.g. 1.0 = normal, 0.6 = dark, 1.2 = bright
  dangerLevel: number;
}

export const BIOME_CONFIGS: Record<BiomeId, BiomeConfig> = {
  [BiomeId.GREENLANDS]: {
    id: BiomeId.GREENLANDS,
    name: 'Greenlands',
    polishName: 'Zielone Równiny',
    surfaceBlock: BlockId.GRASS,
    subsurfaceBlock: BlockId.DIRT,
    rockBlock: BlockId.STONE,
    treeWoodBlock: BlockId.WOOD,
    treeLeavesBlock: BlockId.LEAVES,
    skyColorDay: '#4a90e2',
    skyColorNight: '#070b19',
    ambientLight: 1.0,
    dangerLevel: 1
  },
  [BiomeId.FROZEN_PEAKS]: {
    id: BiomeId.FROZEN_PEAKS,
    name: 'Frozen Peaks',
    polishName: 'Lodowe Góry',
    surfaceBlock: BlockId.SNOW,
    subsurfaceBlock: BlockId.ICE,
    rockBlock: BlockId.STONE,
    treeWoodBlock: BlockId.WOOD,
    treeLeavesBlock: BlockId.SNOW,
    skyColorDay: '#7aaed4',
    skyColorNight: '#0c1626',
    ambientLight: 1.1, // bright snow reflection
    dangerLevel: 2
  },
  [BiomeId.DARK_FOREST]: {
    id: BiomeId.DARK_FOREST,
    name: 'Dark Forest',
    polishName: 'Mroczny Las',
    surfaceBlock: BlockId.DARK_GRASS,
    subsurfaceBlock: BlockId.DARK_DIRT,
    rockBlock: BlockId.MOSSY_STONE,
    treeWoodBlock: BlockId.DARK_WOOD,
    treeLeavesBlock: BlockId.DARK_LEAVES,
    skyColorDay: '#383e5c',
    skyColorNight: '#080512',
    ambientLight: 0.85,
    dangerLevel: 3
  },
  [BiomeId.DESERT]: {
    id: BiomeId.DESERT,
    name: 'Desert',
    polishName: 'Pustynia Wydm',
    surfaceBlock: BlockId.SAND,
    subsurfaceBlock: BlockId.SANDSTONE,
    rockBlock: BlockId.SANDSTONE,
    skyColorDay: '#e8af60',
    skyColorNight: '#1a1005',
    ambientLight: 1.15,
    dangerLevel: 2
  },
  [BiomeId.UNDERGROUND]: {
    id: BiomeId.UNDERGROUND,
    name: 'Underground',
    polishName: 'Podziemia',
    surfaceBlock: BlockId.STONE,
    subsurfaceBlock: BlockId.STONE,
    rockBlock: BlockId.STONE,
    skyColorDay: '#161922',
    skyColorNight: '#0a0d14',
    ambientLight: 0.7,
    dangerLevel: 2
  },
  [BiomeId.CRYSTAL_CAVES]: {
    id: BiomeId.CRYSTAL_CAVES,
    name: 'Crystal Caves',
    polishName: 'Kryształowe Jaskinie',
    surfaceBlock: BlockId.CRYSTAL_BLOCK,
    subsurfaceBlock: BlockId.CRYSTAL_BLOCK,
    rockBlock: BlockId.STONE,
    skyColorDay: '#2b1c4d',
    skyColorNight: '#140c26',
    ambientLight: 0.9,
    dangerLevel: 4
  },
  [BiomeId.NETHER]: {
    id: BiomeId.NETHER,
    name: 'Nether',
    polishName: 'Piekielne Otchłanie',
    surfaceBlock: BlockId.ASH_BLOCK,
    subsurfaceBlock: BlockId.HELLSTONE,
    rockBlock: BlockId.LAVA_ROCK,
    skyColorDay: '#4a1208',
    skyColorNight: '#260603',
    ambientLight: 0.8,
    dangerLevel: 5
  },
  [BiomeId.THE_VOID]: {
    id: BiomeId.THE_VOID,
    name: 'The Void',
    polishName: 'Kosmiczna Pustka',
    surfaceBlock: BlockId.VOID_STONE,
    subsurfaceBlock: BlockId.VOID_STONE,
    rockBlock: BlockId.VOID_CRYSTAL,
    skyColorDay: '#0f051d',
    skyColorNight: '#030108',
    ambientLight: 0.5,
    dangerLevel: 6
  }
};

export class BiomeSystem {
  /**
   * Evaluates the active biome at a given tile coordinate (x, y).
   * Subterranean depth overrides surface biomes.
   */
  public static getBiomeAt(tileX: number, tileY: number, surfaceY: number = GAME_CONSTANTS.SURFACE_HEIGHT): BiomeConfig {
    // 1. Deep Subterranean Biomes
    if (tileY >= GAME_CONSTANTS.VOID_DEPTH) {
      return BIOME_CONFIGS[BiomeId.THE_VOID];
    }
    if (tileY >= GAME_CONSTANTS.NETHER_DEPTH) {
      return BIOME_CONFIGS[BiomeId.NETHER];
    }
    if (tileY >= GAME_CONSTANTS.CRYSTAL_DEPTH) {
      return BIOME_CONFIGS[BiomeId.CRYSTAL_CAVES];
    }
    if (tileY >= surfaceY + 6) {
      return BIOME_CONFIGS[BiomeId.UNDERGROUND];
    }

    // 2. Surface Biomes (Horizontal distribution across the 500-tile world)
    // Frozen Peaks: 0..115 (with transition ~105..120)
    // Greenlands (Spawn): 115..260
    // Dark Forest: 260..380
    // Desert: 380..500
    if (tileX < 115) {
      return BIOME_CONFIGS[BiomeId.FROZEN_PEAKS];
    } else if (tileX < 260) {
      return BIOME_CONFIGS[BiomeId.GREENLANDS];
    } else if (tileX < 380) {
      return BIOME_CONFIGS[BiomeId.DARK_FOREST];
    } else {
      return BIOME_CONFIGS[BiomeId.DESERT];
    }
  }

  /**
   * Helper to check if a location is subterranean.
   */
  public static isUnderground(tileY: number, surfaceY: number = GAME_CONSTANTS.SURFACE_HEIGHT): boolean {
    return tileY >= surfaceY + 6;
  }
}
