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

export interface SurfaceBiomeRegion {
  biomeId: BiomeId;
  startX: number;
  endX: number;
}

export class BiomeSystem {
  public static surfaceRegions: SurfaceBiomeRegion[] = [];

  /**
   * Initializes randomized surface biome regions across the world width.
   * Shuffles surface biomes (Desert, Dark Forest, Frozen Peaks) while keeping
   * Greenlands near the center for a balanced player spawn.
   */
  public static initSurfaceRegions(width: number): SurfaceBiomeRegion[] {
    const otherBiomes = [BiomeId.FROZEN_PEAKS, BiomeId.DARK_FOREST, BiomeId.DESERT];
    // Fisher-Yates shuffle
    for (let i = otherBiomes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherBiomes[i], otherBiomes[j]] = [otherBiomes[j], otherBiomes[i]];
    }

    // Place Greenlands at index 1 or 2 (central 2 quarters of the world)
    const greenlandsIndex = Math.random() < 0.5 ? 1 : 2;
    const layout: BiomeId[] = [];
    let otherIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i === greenlandsIndex) {
        layout.push(BiomeId.GREENLANDS);
      } else {
        layout.push(otherBiomes[otherIdx++]);
      }
    }

    // Randomized boundary coordinates with soft variance
    const b1 = Math.round(115 + (Math.random() - 0.5) * 30);
    const b2 = Math.round(250 + (Math.random() - 0.5) * 30);
    const b3 = Math.round(380 + (Math.random() - 0.5) * 30);

    this.surfaceRegions = [
      { biomeId: layout[0], startX: 0, endX: b1 },
      { biomeId: layout[1], startX: b1, endX: b2 },
      { biomeId: layout[2], startX: b2, endX: b3 },
      { biomeId: layout[3], startX: b3, endX: width }
    ];

    return this.surfaceRegions;
  }

  public static currentSeed: number = 1337;

  private static hashInt(n: number): number {
    let x = n | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return (x ^ (x >>> 16)) >>> 0;
  }

  /**
   * Deterministic surface biome lookup for infinite horizontal worlds.
   * Region width is 112 tiles (~3.5 chunks); region 0 (around spawn x=0..111) is always GREENLANDS.
   */
  public static getSurfaceBiomeForInfiniteX(tileX: number, worldSeed: number = this.currentSeed): {
    biome: BiomeConfig;
    isBorder: boolean;
    neighborBiome: BiomeConfig;
  } {
    const regionSize = 112;
    const regionIdx = Math.floor(tileX / regionSize);
    const localX = ((tileX % regionSize) + regionSize) % regionSize;

    const pickBiomeId = (rIdx: number): BiomeId => {
      if (rIdx === 0) return BiomeId.GREENLANDS;
      const pool: BiomeId[] = [BiomeId.GREENLANDS, BiomeId.DESERT, BiomeId.FROZEN_PEAKS, BiomeId.DARK_FOREST];
      const h = this.hashInt(worldSeed ^ Math.imul(rIdx, 374761393));
      const idx = h % pool.length;
      // Avoid identical adjacent biome if possible
      const prevIdx = rIdx > 0
        ? (rIdx - 1 === 0 ? 0 : this.hashInt(worldSeed ^ Math.imul(rIdx - 1, 374761393)) % pool.length)
        : (rIdx + 1 === 0 ? 0 : this.hashInt(worldSeed ^ Math.imul(rIdx + 1, 374761393)) % pool.length);
      if (idx === prevIdx) {
        return pool[(idx + 1) % pool.length];
      }
      return pool[idx];
    };

    const curId = pickBiomeId(regionIdx);
    const curBiome = BIOME_CONFIGS[curId] || BIOME_CONFIGS[BiomeId.GREENLANDS];

    if (localX <= 3) {
      const prevBiome = BIOME_CONFIGS[pickBiomeId(regionIdx - 1)] || curBiome;
      return { biome: curBiome, isBorder: prevBiome.id !== curBiome.id, neighborBiome: prevBiome };
    }
    if (localX >= regionSize - 4) {
      const nextBiome = BIOME_CONFIGS[pickBiomeId(regionIdx + 1)] || curBiome;
      return { biome: curBiome, isBorder: nextBiome.id !== curBiome.id, neighborBiome: nextBiome };
    }

    return { biome: curBiome, isBorder: false, neighborBiome: curBiome };
  }

  /**
   * Evaluates the active biome at a given tile coordinate (x, y).
   * Subterranean depth overrides surface biomes.
   */
  public static getBiomeAt(
    tileX: number,
    tileY: number,
    surfaceY: number = GAME_CONSTANTS.SURFACE_HEIGHT,
    worldSeed: number = this.currentSeed
  ): BiomeConfig {
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

    // 2. Infinite Surface Biomes
    return this.getSurfaceBiomeForInfiniteX(tileX, worldSeed).biome;
  }

  /**
   * Helper to check if a location is subterranean.
   */
  public static isUnderground(tileY: number, surfaceY: number = GAME_CONSTANTS.SURFACE_HEIGHT): boolean {
    return tileY >= surfaceY + 6;
  }
}
