export type ExpressionType = 'smile' | 'neutral' | 'smirk' | 'fierce' | 'surprised';
export type FacialDetailType = 'none' | 'beard' | 'mustache' | 'bandage' | 'scar' | 'blush';
export type HairStyleType =
  | 'bald'
  | 'buzz'
  | 'fluffy'
  | 'short_straight'
  | 'short_curly'
  | 'long_straight'
  | 'long_curly'
  | 'mohawk'
  | 'ponytail';

export type TopStyleType = 'tshirt' | 'hoodie' | 'vest' | 'coat' | 'none';
export type BottomStyleType = 'pants' | 'shorts' | 'cargo' | 'skirt';
export type ShoesStyleType = 'sneakers' | 'boots' | 'sandals' | 'none';
export type HatStyleType = 'none' | 'cap' | 'beanie' | 'fedora' | 'helmet' | 'crown';
export type MaskStyleType = 'none' | 'ninja' | 'cyber' | 'bandana' | 'sunglasses';
export type AccessoryStyleType = 'none' | 'backpack' | 'cape' | 'scarf' | 'chain';

export interface CharacterConfig {
  name: string;
  skinTone: number; // 0 (najjaśniejszy) .. 100 (najciemniejszy)
  weight: number;   // 0 (chudy) .. 100 (gruby)
  expression: ExpressionType;
  eyeColor: string;
  facialDetail: FacialDetailType;
  hairStyle: HairStyleType;
  hairColor: string;
  topStyle: TopStyleType;
  topColor: string;
  bottomStyle: BottomStyleType;
  bottomColor: string;
  shoesStyle: ShoesStyleType;
  shoesColor: string;
  hatStyle: HatStyleType;
  maskStyle: MaskStyleType;
  accessoryStyle: AccessoryStyleType;
}

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  name: 'Wędrowiec',
  skinTone: 25,
  weight: 45,
  expression: 'smile',
  eyeColor: '#38bdf8',
  facialDetail: 'none',
  hairStyle: 'fluffy',
  hairColor: '#3b2416',
  topStyle: 'hoodie',
  topColor: '#2563eb',
  bottomStyle: 'pants',
  bottomColor: '#1e293b',
  shoesStyle: 'boots',
  shoesColor: '#5c3a21',
  hatStyle: 'none',
  maskStyle: 'none',
  accessoryStyle: 'backpack'
};

let activeCharacterConfig: CharacterConfig = { ...DEFAULT_CHARACTER_CONFIG };

export function getActiveCharacterConfig(): CharacterConfig {
  return activeCharacterConfig;
}

export function setActiveCharacterConfig(cfg: CharacterConfig): void {
  activeCharacterConfig = { ...cfg };
  try {
    localStorage.setItem('eclipse_character_config', JSON.stringify(activeCharacterConfig));
  } catch {
    // Ignore storage errors
  }
}

export function loadSavedCharacterConfig(): CharacterConfig {
  try {
    const raw = localStorage.getItem('eclipse_character_config');
    if (raw) {
      const parsed = JSON.parse(raw);
      activeCharacterConfig = { ...DEFAULT_CHARACTER_CONFIG, ...parsed };
    }
  } catch {
    // Ignore storage errors
  }
  return activeCharacterConfig;
}
