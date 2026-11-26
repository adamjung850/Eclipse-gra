import { InventorySlot } from '../types/index.js';
import { CharacterConfig, getActiveCharacterConfig, loadSavedCharacterConfig } from '../types/CharacterConfig.js';
import { TreeRecord } from '../world/WorldGenerator.js';

export interface AccountRecord {
  username: string;
  passwordHash: string;
  createdAt: number;
}

export interface SavedGameState {
  version: 1;
  username: string;
  savedAt: number;
  character: CharacterConfig;
  player: {
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    mana: number;
    maxMana: number;
    selectedSlot: number;
    inventory: { itemId: string; count: number }[];
  };
  world: {
    width: number;
    height: number;
    fgRle: number[];
    bgRle: number[];
    chests: [string, InventorySlot[]][];
    placedTorches: number[];
    trees: TreeRecord[];
    cycleTimeMs: number;
  };
}

const ACCOUNTS_KEY = 'delveria_accounts_v1';
const CURRENT_USER_KEY = 'delveria_current_user';
const AUTOSAVE_ENABLED_KEY = 'delveria_autosave_enabled';
const AUTOSAVE_INTERVAL_KEY = 'delveria_autosave_interval_sec';
const SAVE_PREFIX = 'delveria_save_v1_';

function normalizeUserKey(username: string): string {
  return username.trim().toLowerCase();
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}::${password}::delveria`;
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
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

function readAccountsMap(): Record<string, AccountRecord> {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAccountsMap(map: Record<string, AccountRecord>): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map));
}

export function listRegisteredUsernames(): string[] {
  const map = readAccountsMap();
  return Object.values(map)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((a) => a.username);
}

export function getCurrentUser(): string | null {
  try {
    const u = localStorage.getItem(CURRENT_USER_KEY);
    return u && u.trim().length > 0 ? u.trim() : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(username: string | null): void {
  try {
    if (username && username.trim()) {
      localStorage.setItem(CURRENT_USER_KEY, username.trim());
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function logoutAccount(): void {
  setCurrentUser(null);
}

export async function registerAccount(
  usernameRaw: string,
  password: string
): Promise<{ ok: boolean; error?: string; username?: string }> {
  const username = usernameRaw.trim();
  if (username.length < 3) {
    return { ok: false, error: 'Login musi mieć co najmniej 3 znaki.' };
  }
  if (username.length > 20) {
    return { ok: false, error: 'Login może mieć maksymalnie 20 znaków.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    return { ok: false, error: 'Login może zawierać tylko litery, cyfry i _ . -' };
  }
  if (password.length < 4) {
    return { ok: false, error: 'Hasło musi mieć co najmniej 4 znaki.' };
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

export async function loginAccount(
  usernameRaw: string,
  password: string
): Promise<{ ok: boolean; error?: string; username?: string }> {
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

export function getAutoSaveEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
    return val === null ? true : val === '1';
  } catch {
    return true;
  }
}

export function setAutoSaveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOSAVE_ENABLED_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore
  }
}

export function getAutoSaveIntervalSec(): number {
  try {
    const val = parseInt(localStorage.getItem(AUTOSAVE_INTERVAL_KEY) || '60', 10);
    if ([30, 60, 120, 300].includes(val)) return val;
    return 60;
  } catch {
    return 60;
  }
}

export function setAutoSaveIntervalSec(sec: number): void {
  try {
    localStorage.setItem(AUTOSAVE_INTERVAL_KEY, String(sec));
  } catch {
    // Ignore
  }
}

function getSaveKeyForUser(username: string): string {
  return `${SAVE_PREFIX}${normalizeUserKey(username)}`;
}

export function hasSaveForCurrentUser(): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  try {
    return localStorage.getItem(getSaveKeyForUser(user)) !== null;
  } catch {
    return false;
  }
}

export function getSaveMetaForCurrentUser(): { savedAt: number; characterName: string } | null {
  const data = loadGameProgressForCurrentUser();
  if (!data) return null;
  return {
    savedAt: data.savedAt,
    characterName: data.character?.name || data.username,
  };
}

export function loadGameProgressForCurrentUser(): SavedGameState | null {
  const user = getCurrentUser();
  if (!user) return null;
  try {
    const raw = localStorage.getItem(getSaveKeyForUser(user));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedGameState;
    if (!parsed || parsed.version !== 1 || !parsed.world || !parsed.player) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function encodeGridRle(grid: number[][], width: number, height: number): number[] {
  const rle: number[] = [];
  let prev = -1;
  let count = 0;
  for (let x = 0; x < width; x++) {
    const col = grid[x];
    for (let y = 0; y < height; y++) {
      const val = col[y];
      if (val === prev) {
        count++;
      } else {
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

export function decodeGridRle(rle: number[], width: number, height: number): number[][] {
  const grid: number[][] = Array.from({ length: width }, () => new Array(height).fill(0));
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

export function saveGameProgress(gameScene: any): { ok: boolean; savedAt?: number; error?: string } {
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

    const trees: TreeRecord[] = (wm.activeTrees || []).map((t: any) => ({
      x: t.x,
      surfaceY: t.surfaceY,
      treeTopY: t.treeTopY,
      trunkHeight: t.trunkHeight,
      crownVariant: t.crownVariant,
      colorVariant: t.colorVariant,
      branchSpots: t.branchSpots,
      isDarkWood: t.isDarkWood,
    }));

    const state: SavedGameState = {
      version: 1,
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
        inventory: (p.inventory || []).map((slot: InventorySlot) =>
          slot && slot.item ? { itemId: slot.item.id, count: slot.count } : { itemId: '', count: 0 }
        ),
      },
      world: {
        width: wm.width,
        height: wm.height,
        fgRle: encodeGridRle(wm.foreground, wm.width, wm.height),
        bgRle: encodeGridRle(wm.background, wm.width, wm.height),
        chests: Array.from((wm.chests as Map<string, InventorySlot[]>).entries()),
        placedTorches: Array.from((wm.placedTorches as Set<number>).values()),
        trees,
        cycleTimeMs: typeof gameScene.dayNightSystem?.getCycleTimeMs === 'function'
          ? gameScene.dayNightSystem.getCycleTimeMs()
          : 108000,
      },
    };

    localStorage.setItem(getSaveKeyForUser(user), JSON.stringify(state));
    return { ok: true, savedAt };
  } catch (err) {
    return { ok: false, error: 'Błąd zapisu postępu gry.' };
  }
}
