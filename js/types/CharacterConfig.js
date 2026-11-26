export const DEFAULT_CHARACTER_CONFIG = {
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
let activeCharacterConfig = { ...DEFAULT_CHARACTER_CONFIG };
export function getActiveCharacterConfig() {
    return activeCharacterConfig;
}
export function setActiveCharacterConfig(cfg) {
    activeCharacterConfig = { ...cfg };
    try {
        localStorage.setItem('eclipse_character_config', JSON.stringify(activeCharacterConfig));
    }
    catch {
        // Ignore storage errors
    }
}
export function loadSavedCharacterConfig() {
    try {
        const raw = localStorage.getItem('eclipse_character_config');
        if (raw) {
            const parsed = JSON.parse(raw);
            activeCharacterConfig = { ...DEFAULT_CHARACTER_CONFIG, ...parsed };
        }
    }
    catch {
        // Ignore storage errors
    }
    return activeCharacterConfig;
}
