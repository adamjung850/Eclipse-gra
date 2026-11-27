import { GAME_CONSTANTS } from '../types/index.js';
import { getActiveCharacterConfig, loadSavedCharacterConfig } from '../types/CharacterConfig.js';
const ACCOUNTS_KEY = 'delveria_accounts_v1';
const CURRENT_USER_KEY = 'delveria_current_user';
const AUTOSAVE_ENABLED_KEY = 'delveria_autosave_enabled';
const AUTOSAVE_INTERVAL_KEY = 'delveria_autosave_interval_sec';
const SAVE_PREFIX = 'delveria_save_v1_';
const WORLDS_INDEX_PREFIX = 'delveria_worlds_v1_';
async function syncDatabaseToDisk() {
    try {
        const tauri = window.__TAURI__;
        if (!tauri?.core?.invoke)
            return;
        const dump = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('delveria_')) {
                const v = localStorage.getItem(k);
                if (v !== null)
                    dump[k] = v;
            }
        }
        await tauri.core.invoke('db_write', { data: JSON.stringify(dump) });
    }
    catch {
        // Ignore disk DB errors in browser mode
    }
}
export async function initAccountDatabase() {
    try {
        const tauri = window.__TAURI__;
        if (!tauri?.core?.invoke)
            return;
        const raw = await tauri.core.invoke('db_read');
        if (!raw)
            return;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
            for (const [k, v] of Object.entries(parsed)) {
                if (k.startsWith('delveria_') && typeof v === 'string') {
                    if (k === ACCOUNTS_KEY || !localStorage.getItem(k)) {
                        localStorage.setItem(k, v);
                    }
                }
            }
            if (!parsed[CURRENT_USER_KEY]) {
                const cur = localStorage.getItem(CURRENT_USER_KEY);
                const accsRaw = parsed[ACCOUNTS_KEY];
                if (cur && typeof accsRaw === 'string') {
                    try {
                        const accs = JSON.parse(accsRaw);
                        if (!accs[normalizeUserKey(cur)]) {
                            localStorage.removeItem(CURRENT_USER_KEY);
                        }
                    }
                    catch {
                        // Ignore
                    }
                }
            }
        }
    }
    catch {
        // Ignore
    }
}
function normalizeUserKey(username) {
    return username.trim().toLowerCase();
}
async function hashPassword(password, salt) {
    const input = `${salt}::${password}::delveria`;
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const data = new TextEncoder().encode(input);
            const buf = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(buf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');
        }
    }
    catch {
        // Fallback below if crypto.subtle is unavailable
    }
    let h1 = 0x811c9dc5;
    let h2 = 0x9e3779b9;
    for (let i = 0; i < input.length; i++) {
        const ch = input.charCodeAt(i);
        h1 ^= ch;
        h1 = Math.imul(h1, 0x01000193);
        h2 ^= ch + ((h2 << 5) + (h2 >>> 2));
        h2 = Math.imul(h2, 0x85ebca6b);
    }
    return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}
function readAccountsMap() {
    try {
        const raw = localStorage.getItem(ACCOUNTS_KEY);
        if (!raw)
            return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}
function writeAccountsMap(map) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map));
    void syncDatabaseToDisk();
}
export function listRegisteredUsernames() {
    const map = readAccountsMap();
    return Object.values(map)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((a) => a.username);
}
export function getCurrentUser() {
    try {
        const u = localStorage.getItem(CURRENT_USER_KEY);
        return u && u.trim().length > 0 ? u.trim() : null;
    }
    catch {
        return null;
    }
}
export function setCurrentUser(username) {
    try {
        if (username && username.trim()) {
            localStorage.setItem(CURRENT_USER_KEY, username.trim());
        }
        else {
            localStorage.removeItem(CURRENT_USER_KEY);
        }
    }
    catch {
        // Ignore storage errors
    }
}
export function logoutAccount() {
    setCurrentUser(null);
}
export async function registerAccount(usernameRaw, password) {
    const username = usernameRaw.trim();
    if (username.length < 4) {
        return { ok: false, error: 'Login musi mieć minimum 4 znaki.' };
    }
    if (username.length > 20) {
        return { ok: false, error: 'Login może mieć maksymalnie 20 znaków.' };
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
        return { ok: false, error: 'Login może zawierać tylko litery, cyfry i _ . -' };
    }
    if (password.length < 5) {
        return { ok: false, error: 'Hasło musi mieć minimum 5 znaków.' };
    }
    if (!/\d/.test(password)) {
        return { ok: false, error: 'Hasło musi zawierać co najmniej jedną cyfrę.' };
    }
    const key = normalizeUserKey(username);
    const accounts = readAccountsMap();
    if (accounts[key]) {
        return { ok: false, error: 'Konto o takim loginie już istnieje.' };
    }
    const passwordHash = await hashPassword(password, key);
    accounts[key] = {
        username,
        passwordHash,
        createdAt: Date.now(),
    };
    writeAccountsMap(accounts);
    setCurrentUser(username);
    return { ok: true, username };
}
export async function loginAccount(usernameRaw, password) {
    const username = usernameRaw.trim();
    if (!username) {
        return { ok: false, error: 'Wpisz login.' };
    }
    if (!password) {
        return { ok: false, error: 'Wpisz hasło.' };
    }
    const key = normalizeUserKey(username);
    const accounts = readAccountsMap();
    const record = accounts[key];
    if (!record) {
        return { ok: false, error: 'Nie znaleziono konta o takim loginie.' };
    }
    const passwordHash = await hashPassword(password, key);
    if (passwordHash !== record.passwordHash) {
        return { ok: false, error: 'Nieprawidłowe hasło.' };
    }
    setCurrentUser(record.username);
    return { ok: true, username: record.username };
}
export function getAutoSaveEnabled() {
    try {
        const val = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
        return val === null ? true : val === '1';
    }
    catch {
        return true;
    }
}
export function setAutoSaveEnabled(enabled) {
    try {
        localStorage.setItem(AUTOSAVE_ENABLED_KEY, enabled ? '1' : '0');
    }
    catch {
        // Ignore
    }
}
export function getAutoSaveIntervalSec() {
    try {
        const val = parseInt(localStorage.getItem(AUTOSAVE_INTERVAL_KEY) || '60', 10);
        if ([30, 60, 120, 300].includes(val))
            return val;
        return 60;
    }
    catch {
        return 60;
    }
}
export function setAutoSaveIntervalSec(sec) {
    try {
        localStorage.setItem(AUTOSAVE_INTERVAL_KEY, String(sec));
    }
    catch {
        // Ignore
    }
}
function getSaveKeyForUser(username, worldId) {
    const base = `${SAVE_PREFIX}${normalizeUserKey(username)}`;
    return worldId ? `${base}__${worldId}` : base;
}
function getWorldsIndexKey(username) {
    return `${WORLDS_INDEX_PREFIX}${normalizeUserKey(username)}`;
}
export function listWorldsForUser(username) {
    if (!username)
        return [];
    try {
        const raw = localStorage.getItem(getWorldsIndexKey(username));
        const list = raw ? JSON.parse(raw) : [];
        // Migracja starego pojedynczego zapisu jeśli istnieje
        const legacyRaw = localStorage.getItem(getSaveKeyForUser(username));
        if (legacyRaw && list.length === 0) {
            const parsed = JSON.parse(legacyRaw);
            const legacyId = 'world_1';
            localStorage.setItem(getSaveKeyForUser(username, legacyId), legacyRaw);
            const migrated = {
                id: legacyId,
                name: 'Świat Główny',
                createdAt: parsed.savedAt || Date.now(),
                updatedAt: parsed.savedAt || Date.now(),
                hasSaveData: true,
            };
            list.push(migrated);
            localStorage.setItem(getWorldsIndexKey(username), JSON.stringify(list));
            void syncDatabaseToDisk();
        }
        return list.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    catch {
        return [];
    }
}
export function createNewWorldMeta(username, worldNameRaw) {
    const name = (worldNameRaw || '').trim() || 'Nowy Świat';
    const now = Date.now();
    const meta = {
        id: `w_${now}_${Math.floor(Math.random() * 1000)}`,
        name,
        createdAt: now,
        updatedAt: now,
        hasSaveData: false,
    };
    if (username) {
        const list = listWorldsForUser(username);
        list.unshift(meta);
        localStorage.setItem(getWorldsIndexKey(username), JSON.stringify(list));
        void syncDatabaseToDisk();
    }
    return meta;
}
export function deleteWorldForUser(username, worldId) {
    const list = listWorldsForUser(username).filter((w) => w.id !== worldId);
    localStorage.setItem(getWorldsIndexKey(username), JSON.stringify(list));
    localStorage.removeItem(getSaveKeyForUser(username, worldId));
    void syncDatabaseToDisk();
}
export function hasSaveForCurrentUser() {
    const user = getCurrentUser();
    if (!user)
        return false;
    return listWorldsForUser(user).some((w) => w.hasSaveData) || localStorage.getItem(getSaveKeyForUser(user)) !== null;
}
export function getSaveMetaForCurrentUser() {
    const data = loadGameProgressForCurrentUser();
    if (!data)
        return null;
    return {
        savedAt: data.savedAt,
        characterName: data.character?.name || data.username,
    };
}
export function loadGameProgressForCurrentUser(worldId) {
    const user = getCurrentUser();
    if (!user)
        return null;
    try {
        const targetId = worldId || listWorldsForUser(user)[0]?.id;
        const raw = targetId
            ? (localStorage.getItem(getSaveKeyForUser(user, targetId)) || localStorage.getItem(getSaveKeyForUser(user)))
            : localStorage.getItem(getSaveKeyForUser(user));
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !parsed.world || !parsed.player)
            return null;
        return parsed;
    }
    catch {
        return null;
    }
}
export function encodeGridRle(grid, width, height) {
    const rle = [];
    let prev = -1;
    let count = 0;
    for (let x = 0; x < width; x++) {
        const col = grid[x];
        for (let y = 0; y < height; y++) {
            const val = col[y];
            if (val === prev) {
                count++;
            }
            else {
                if (count > 0) {
                    rle.push(prev, count);
                }
                prev = val;
                count = 1;
            }
        }
    }
    if (count > 0) {
        rle.push(prev, count);
    }
    return rle;
}
export function decodeGridRle(rle, width, height) {
    const grid = Array.from({ length: width }, () => new Array(height).fill(0));
    let idx = 0;
    let remaining = 0;
    let val = 0;
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            while (remaining <= 0 && idx < rle.length) {
                val = rle[idx++];
                remaining = rle[idx++];
            }
            grid[x][y] = val;
            remaining--;
        }
    }
    return grid;
}
export function saveGameProgress(gameScene) {
    const user = getCurrentUser();
    if (!user) {
        return { ok: false, error: 'Brak zalogowanego konta.' };
    }
    if (!gameScene || !gameScene.player || !gameScene.worldManager) {
        return { ok: false, error: 'Świat gry nie jest gotowy do zapisu.' };
    }
    try {
        const wm = gameScene.worldManager;
        const p = gameScene.player;
        const charCfg = getActiveCharacterConfig() || loadSavedCharacterConfig();
        const savedAt = Date.now();
        const trees = (wm.activeTrees || []).map((t) => ({
            x: t.x,
            surfaceY: t.surfaceY,
            treeTopY: t.treeTopY,
            trunkHeight: t.trunkHeight,
            crownVariant: t.crownVariant,
            colorVariant: t.colorVariant,
            branchSpots: t.branchSpots,
            isDarkWood: t.isDarkWood,
        }));
        const worldId = gameScene.activeWorldId || listWorldsForUser(user)[0]?.id || 'world_1';
        const worldName = gameScene.activeWorldName || 'Świat Główny';
        const savedChunks = [];
        if (wm.chunks && typeof wm.chunks.values === 'function') {
            const cw = wm.chunkWidth || GAME_CONSTANTS.CHUNK_WIDTH;
            for (const ch of wm.chunks.values()) {
                if (ch.modified) {
                    savedChunks.push({
                        chunkIndex: ch.chunkIndex,
                        fgRle: encodeGridRle(ch.foreground, cw, wm.height),
                        bgRle: encodeGridRle(ch.background, cw, wm.height),
                        modified: true,
                    });
                }
            }
        }
        const torchesArr = wm.placedTorches instanceof Map
            ? Array.from(wm.placedTorches.values())
            : Array.from(wm.placedTorches.values());
        const state = {
            version: 1,
            worldId,
            worldName,
            username: user,
            savedAt,
            character: charCfg,
            player: {
                x: Math.round(p.x),
                y: Math.round(p.y),
                hp: p.hp,
                maxHp: p.maxHp,
                mana: p.mana,
                maxMana: p.maxMana,
                selectedSlot: p.selectedSlot ?? 0,
                inventory: (p.inventory || []).map((slot) => slot && slot.item ? { itemId: slot.item.id, count: slot.count } : { itemId: '', count: 0 }),
            },
            world: {
                width: wm.width,
                height: wm.height,
                worldSeed: wm.worldSeed,
                chunks: savedChunks,
                chests: Array.from(wm.chests.entries()),
                placedTorches: torchesArr,
                trees,
                cycleTimeMs: typeof gameScene.dayNightSystem?.getCycleTimeMs === 'function'
                    ? gameScene.dayNightSystem.getCycleTimeMs()
                    : 108000,
            },
        };
        localStorage.setItem(getSaveKeyForUser(user, worldId), JSON.stringify(state));
        // Zaktualizuj metadane świata na liście światów konta
        const worlds = listWorldsForUser(user);
        const idx = worlds.findIndex((w) => w.id === worldId);
        if (idx >= 0) {
            worlds[idx].updatedAt = savedAt;
            worlds[idx].hasSaveData = true;
            worlds[idx].name = worldName;
        }
        else {
            worlds.unshift({ id: worldId, name: worldName, createdAt: savedAt, updatedAt: savedAt, hasSaveData: true });
        }
        localStorage.setItem(getWorldsIndexKey(user), JSON.stringify(worlds));
        void syncDatabaseToDisk();
        return { ok: true, savedAt };
    }
    catch (err) {
        return { ok: false, error: 'Błąd zapisu postępu gry.' };
    }
}
