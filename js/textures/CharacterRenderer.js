function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean.length === 3
        ? clean.split('').map(c => c + c).join('')
        : clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}
function rgbToHex(r, g, b) {
    const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
    return '#' + [clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function shadeHex(hex, factor) {
    const [r, g, b] = hexToRgb(hex);
    if (factor < 0) {
        const k = 1 + factor;
        return rgbToHex(r * k, g * k, b * k);
    }
    return rgbToHex(r + (255 - r) * factor, g + (255 - g) * factor, b + (255 - b) * factor);
}
const SKIN_STOPS = [
    [253, 226, 210], // 0: Bardzo jasna porcelana
    [244, 200, 172], // 20: Jasna
    [226, 170, 130], // 40: Średnia / Oliwkowa
    [192, 134, 92], // 60: Opalona
    [138, 86, 54], // 80: Ciemna
    [74, 41, 26] // 100: Bardzo ciemna
];
export function getSkinColors(skinTone) {
    const t = Math.max(0, Math.min(100, skinTone)) / 100;
    const scaled = t * (SKIN_STOPS.length - 1);
    const idx = Math.min(SKIN_STOPS.length - 2, Math.floor(scaled));
    const frac = scaled - idx;
    const c1 = SKIN_STOPS[idx];
    const c2 = SKIN_STOPS[idx + 1];
    const r = c1[0] + (c2[0] - c1[0]) * frac;
    const g = c1[1] + (c2[1] - c1[1]) * frac;
    const b = c1[2] + (c2[2] - c1[2]) * frac;
    const base = rgbToHex(r, g, b);
    return {
        base,
        shadow: shadeHex(base, -0.22),
        highlight: shadeHex(base, 0.14)
    };
}
export class CharacterRenderer {
    static FRAME_W = 28;
    static FRAME_H = 42;
    /**
     * Renders a scaled preview canvas of the character's idle frame (for UI avatars).
     */
    static renderPreview(cfg, scale = 2) {
        const tmp = document.createElement('canvas');
        tmp.width = this.FRAME_W;
        tmp.height = this.FRAME_H;
        const tctx = tmp.getContext('2d');
        tctx.imageSmoothingEnabled = false;
        this.drawFrame(tctx, cfg, 0, 0);
        const out = document.createElement('canvas');
        out.width = this.FRAME_W * scale;
        out.height = this.FRAME_H * scale;
        const octx = out.getContext('2d');
        octx.imageSmoothingEnabled = false;
        octx.drawImage(tmp, 0, 0, out.width, out.height);
        return out;
    }
    /**
     * Generates all 6 player sprite frames (idle, walk_0..3, jump) from CharacterConfig.
     */
    static renderPlayerTextures(scene, cfg) {
        const frames = [
            { key: 'player_idle', legOffset: 0, armAngle: 0 },
            { key: 'player_walk_0', legOffset: -2, armAngle: 18 },
            { key: 'player_walk_1', legOffset: 0, armAngle: 0 },
            { key: 'player_walk_2', legOffset: 2, armAngle: -18 },
            { key: 'player_walk_3', legOffset: 0, armAngle: 0 },
            { key: 'player_jump', legOffset: -2, armAngle: -32 }
        ];
        for (const f of frames) {
            let canvasTex = null;
            if (scene.textures.exists(f.key)) {
                const existing = scene.textures.get(f.key);
                if (existing && existing.width === this.FRAME_W && existing.height === this.FRAME_H && existing.context) {
                    canvasTex = existing;
                }
                else {
                    scene.textures.remove(f.key);
                }
            }
            if (!canvasTex) {
                canvasTex = scene.textures.createCanvas(f.key, this.FRAME_W, this.FRAME_H);
            }
            if (!canvasTex)
                continue;
            const ctx = canvasTex.context;
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, this.FRAME_W, this.FRAME_H);
            this.drawFrame(ctx, cfg, f.legOffset, f.armAngle);
            canvasTex.refresh();
        }
        // Register walk animation once
        if (!scene.anims.exists('player_walk')) {
            scene.anims.create({
                key: 'player_walk',
                frames: [
                    { key: 'player_walk_0' },
                    { key: 'player_walk_1' },
                    { key: 'player_walk_2' },
                    { key: 'player_walk_3' }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
    }
    static drawFrame(ctx, cfg, legOffset, armAngle) {
        const cx = 14; // Horizontal center of 28px canvas
        const wNorm = Math.max(0, Math.min(100, cfg.weight)) / 100; // 0..1
        // Body proportions driven by weight slider
        const torsoW = 8 + Math.round(wNorm * 4) * 2; // 8, 10, 12, 14, 16
        const torsoX = cx - Math.floor(torsoW / 2);
        const torsoY = 16;
        const torsoH = 13;
        const headW = wNorm < 0.25 ? 8 : (wNorm >= 0.75 ? 12 : 10);
        const headX = cx - Math.floor(headW / 2);
        const headY = 6;
        const headH = 10;
        const legW = wNorm < 0.30 ? 3 : (wNorm > 0.70 ? 5 : 4);
        const armW = wNorm < 0.30 ? 3 : (wNorm > 0.75 ? 5 : 4);
        const skin = getSkinColors(cfg.skinTone);
        const hairBase = cfg.hairColor;
        const hairDark = shadeHex(hairBase, -0.26);
        const hairLight = shadeHex(hairBase, 0.20);
        const topBase = cfg.topColor;
        const topDark = shadeHex(topBase, -0.25);
        const topLight = shadeHex(topBase, 0.18);
        const botBase = cfg.bottomColor;
        const botDark = shadeHex(botBase, -0.25);
        const shoeBase = cfg.shoesColor;
        const shoeDark = shadeHex(shoeBase, -0.30);
        // =========================================================================
        // 1. BACK ACCESSORIES (Cape, Backpack, Long Hair Back)
        // =========================================================================
        if (cfg.accessoryStyle === 'cape') {
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(torsoX - 3, torsoY, 5, 18);
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(torsoX - 2, torsoY + 1, 3, 15);
        }
        else if (cfg.accessoryStyle === 'backpack') {
            ctx.fillStyle = '#452712';
            ctx.fillRect(torsoX - 4, torsoY + 1, 5, 10);
            ctx.fillStyle = '#784421';
            ctx.fillRect(torsoX - 3, torsoY + 2, 3, 8);
            ctx.fillStyle = '#eab308';
            ctx.fillRect(torsoX - 3, torsoY + 5, 2, 1);
        }
        if (cfg.hairStyle === 'long_straight' || cfg.hairStyle === 'long_curly') {
            ctx.fillStyle = hairDark;
            ctx.fillRect(headX - 2, headY + 2, 3, 15);
            if (cfg.hairStyle === 'long_curly') {
                ctx.fillStyle = hairBase;
                ctx.fillRect(headX - 3, headY + 5, 2, 4);
                ctx.fillRect(headX - 3, headY + 11, 2, 5);
            }
        }
        else if (cfg.hairStyle === 'ponytail') {
            ctx.fillStyle = hairDark;
            ctx.fillRect(headX - 3, headY + 3, 3, 4);
            ctx.fillStyle = hairBase;
            ctx.fillRect(headX - 4, headY + 6, 3, 8);
            ctx.fillStyle = '#ef4444'; // hair tie
            ctx.fillRect(headX - 1, headY + 4, 1, 2);
        }
        // =========================================================================
        // 2. LEGS & SHOES
        // =========================================================================
        const legGap = Math.max(1, Math.floor(torsoW / 4) - 1);
        const leftLegX = cx - legW - Math.floor(legGap / 2);
        const rightLegX = cx + Math.ceil(legGap / 2);
        const legTopY = torsoY + torsoH; // 29
        const drawLeg = (lx, offset, isBack) => {
            const lColor = isBack ? botDark : botBase;
            const sColor = isBack ? skin.shadow : skin.base;
            const shColor = isBack ? shoeDark : shoeBase;
            const legH = 8 - offset;
            if (cfg.bottomStyle === 'shorts') {
                ctx.fillStyle = lColor;
                ctx.fillRect(lx, legTopY, legW, 4);
                ctx.fillStyle = sColor;
                ctx.fillRect(lx, legTopY + 4, legW, Math.max(2, legH - 4));
            }
            else if (cfg.bottomStyle === 'skirt') {
                ctx.fillStyle = sColor;
                ctx.fillRect(lx, legTopY, legW, legH);
            }
            else {
                ctx.fillStyle = lColor;
                ctx.fillRect(lx, legTopY, legW, legH);
                if (cfg.bottomStyle === 'cargo') {
                    ctx.fillStyle = shadeHex(lColor, 0.15);
                    ctx.fillRect(lx, legTopY + 3, legW, 2);
                }
            }
            // Shoes
            const shoeY = legTopY + legH; // ~37
            if (cfg.shoesStyle === 'none') {
                ctx.fillStyle = sColor;
                ctx.fillRect(lx, shoeY, legW + 1, 3);
            }
            else if (cfg.shoesStyle === 'sandals') {
                ctx.fillStyle = sColor;
                ctx.fillRect(lx, shoeY, legW + 1, 2);
                ctx.fillStyle = shColor;
                ctx.fillRect(lx, shoeY + 2, legW + 1, 2);
            }
            else if (cfg.shoesStyle === 'boots') {
                ctx.fillStyle = shColor;
                ctx.fillRect(lx, shoeY - 2, legW + 1, 6);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(lx, shoeY + 3, legW + 1, 1);
            }
            else {
                // sneakers
                ctx.fillStyle = shColor;
                ctx.fillRect(lx, shoeY, legW + 1, 3);
                ctx.fillStyle = '#f8fafc'; // white sole
                ctx.fillRect(lx, shoeY + 3, legW + 1, 1);
            }
        };
        drawLeg(leftLegX, legOffset, true);
        drawLeg(rightLegX, -legOffset, false);
        if (cfg.bottomStyle === 'skirt') {
            ctx.fillStyle = botBase;
            ctx.fillRect(torsoX - 1, legTopY, torsoW + 2, 5);
            ctx.fillStyle = botDark;
            ctx.fillRect(torsoX - 1, legTopY + 4, torsoW + 2, 1);
        }
        // =========================================================================
        // 3. TORSO & UPPER OUTFIT
        // =========================================================================
        // Neck
        ctx.fillStyle = skin.shadow;
        ctx.fillRect(cx - 2, torsoY - 2, 4, 3);
        if (cfg.topStyle === 'none') {
            ctx.fillStyle = skin.base;
            ctx.fillRect(torsoX, torsoY, torsoW, torsoH);
            ctx.fillStyle = skin.shadow;
            ctx.fillRect(torsoX, torsoY, 2, torsoH);
            if (wNorm >= 0.70) {
                // Fuller belly curve
                ctx.fillStyle = skin.base;
                ctx.fillRect(torsoX - 1, torsoY + 6, torsoW + 2, 6);
            }
        }
        else {
            ctx.fillStyle = topBase;
            ctx.fillRect(torsoX, torsoY, torsoW, torsoH);
            ctx.fillStyle = topDark;
            ctx.fillRect(torsoX, torsoY, 2, torsoH);
            ctx.fillStyle = topLight;
            ctx.fillRect(torsoX + 2, torsoY + 1, torsoW - 4, 3);
            if (wNorm >= 0.70) {
                ctx.fillStyle = topBase;
                ctx.fillRect(torsoX - 1, torsoY + 6, torsoW + 2, 6);
            }
            if (cfg.topStyle === 'hoodie') {
                // Hoodie strings & kangaroo pocket
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(cx - 1, torsoY + 1, 1, 4);
                ctx.fillRect(cx + 1, torsoY + 1, 1, 4);
                ctx.fillStyle = topDark;
                ctx.fillRect(torsoX + 2, torsoY + 8, torsoW - 4, 4);
            }
            else if (cfg.topStyle === 'vest') {
                // Armor / Tactical Vest straps & gold buckle
                ctx.fillStyle = '#475569';
                ctx.fillRect(torsoX + 1, torsoY + 2, torsoW - 2, 9);
                ctx.fillStyle = '#eab308';
                ctx.fillRect(cx - 1, torsoY + 10, 3, 2);
            }
            else if (cfg.topStyle === 'coat') {
                // Long coat tail
                ctx.fillStyle = topBase;
                ctx.fillRect(torsoX - 1, torsoY + torsoH - 2, torsoW + 2, 6);
                ctx.fillStyle = topDark;
                ctx.fillRect(cx, torsoY + 2, 1, torsoH + 3);
            }
        }
        // Chest accessories (Scarf, Gold Chain)
        if (cfg.accessoryStyle === 'scarf') {
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(torsoX, torsoY - 1, torsoW, 3);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx + 1, torsoY + 2, 3, 6);
        }
        else if (cfg.accessoryStyle === 'chain') {
            ctx.fillStyle = '#facc15';
            ctx.fillRect(cx - 2, torsoY + 1, 5, 2);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(cx, torsoY + 3, 2, 2);
        }
        // =========================================================================
        // 4. HEAD & FACE
        // =========================================================================
        ctx.fillStyle = skin.base;
        ctx.fillRect(headX, headY, headW, headH);
        ctx.fillStyle = skin.shadow;
        ctx.fillRect(headX, headY, 2, headH); // Left cheek shadow
        ctx.fillStyle = skin.highlight;
        ctx.fillRect(headX + 2, headY + 1, headW - 3, 2);
        // Eyes (facing right)
        const eyeY = headY + 4;
        const eye1X = headX + Math.floor(headW * 0.42);
        const eye2X = headX + Math.floor(headW * 0.76);
        // Sclera + Iris
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(eye1X, eyeY, 2, 2);
        ctx.fillRect(eye2X, eyeY, 2, 2);
        ctx.fillStyle = cfg.eyeColor;
        ctx.fillRect(eye1X + 1, eyeY, 1, 2);
        ctx.fillRect(eye2X + 1, eyeY, 1, 2);
        // Expression (Eyebrows & Mouth)
        const mouthY = headY + 7;
        const mouthX = headX + Math.floor(headW * 0.45);
        if (cfg.expression === 'smile') {
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(mouthX, mouthY - 1, 1, 1);
            ctx.fillRect(mouthX + 1, mouthY, 3, 1);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(mouthX + 1, mouthY, 2, 1);
        }
        else if (cfg.expression === 'neutral') {
            ctx.fillStyle = skin.shadow;
            ctx.fillRect(mouthX, mouthY, 3, 1);
        }
        else if (cfg.expression === 'smirk') {
            ctx.fillStyle = shadeHex(skin.base, -0.35);
            ctx.fillRect(mouthX, mouthY - 1, 1, 1);
            ctx.fillRect(mouthX + 1, mouthY, 3, 1);
            ctx.fillStyle = hairDark;
            ctx.fillRect(eye1X, eyeY - 2, 2, 1);
        }
        else if (cfg.expression === 'fierce') {
            ctx.fillStyle = hairDark;
            ctx.fillRect(eye1X, eyeY - 1, 2, 1);
            ctx.fillRect(eye2X, eyeY - 1, 2, 1);
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(mouthX, mouthY + 1, 4, 1);
        }
        else if (cfg.expression === 'surprised') {
            ctx.fillStyle = '#7f1d1d';
            ctx.fillRect(mouthX + 1, mouthY, 2, 2);
        }
        // Facial details
        if (cfg.facialDetail === 'bandage') {
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(eye1X - 1, eyeY + 2, 3, 2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(eye1X, eyeY + 2, 1, 2);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(eye1X - 1, eyeY + 2, 1, 1);
            ctx.fillRect(eye1X + 1, eyeY + 3, 1, 1);
        }
        else if (cfg.facialDetail === 'blush') {
            ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
            ctx.fillRect(eye1X - 1, eyeY + 2, 2, 1);
            ctx.fillRect(eye2X, eyeY + 2, 2, 1);
        }
        else if (cfg.facialDetail === 'scar') {
            ctx.fillStyle = '#be123c';
            ctx.fillRect(eye1X, eyeY - 2, 1, 5);
        }
        else if (cfg.facialDetail === 'mustache') {
            ctx.fillStyle = hairDark;
            ctx.fillRect(mouthX - 1, mouthY - 1, 5, 1);
            ctx.fillRect(mouthX - 1, mouthY, 1, 1);
            ctx.fillRect(mouthX + 3, mouthY, 1, 1);
        }
        else if (cfg.facialDetail === 'beard') {
            ctx.fillStyle = hairDark;
            ctx.fillRect(headX + 2, headY + 7, headW - 2, 3);
            ctx.fillRect(headX + 3, headY + 9, headW - 4, 2);
        }
        // =========================================================================
        // 5. MASKS & EYEWEAR
        // =========================================================================
        if (cfg.maskStyle === 'ninja') {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(headX, headY + 6, headW, 4);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(headX + 2, headY + 6, headW - 2, 2);
        }
        else if (cfg.maskStyle === 'bandana') {
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(headX, headY + 6, headW, 4);
            ctx.fillStyle = '#dc2626';
            ctx.fillRect(headX + 3, headY + 7, headW - 4, 2);
        }
        else if (cfg.maskStyle === 'sunglasses') {
            ctx.fillStyle = '#090d16';
            ctx.fillRect(eye1X - 1, eyeY, 3, 2);
            ctx.fillRect(eye2X - 1, eyeY, 3, 2);
            ctx.fillRect(eye1X + 2, eyeY, eye2X - eye1X - 2, 1);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(eye1X, eyeY, 1, 1);
            ctx.fillRect(eye2X, eyeY, 1, 1);
        }
        else if (cfg.maskStyle === 'cyber') {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(headX + 2, eyeY - 1, headW - 1, 4);
            ctx.fillStyle = '#00e5ff';
            ctx.fillRect(eye1X, eyeY, headW - (eye1X - headX), 2);
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(eye2X, eyeY, 2, 1);
        }
        // =========================================================================
        // 6. HAIR STYLES (drawn unless covered by full helmet)
        // =========================================================================
        if (cfg.hatStyle !== 'helmet') {
            switch (cfg.hairStyle) {
                case 'buzz':
                    ctx.fillStyle = hairDark;
                    ctx.fillRect(headX, headY - 1, headW, 2);
                    ctx.fillRect(headX, headY, 2, 5);
                    break;
                case 'short_straight':
                    ctx.fillStyle = hairBase;
                    ctx.fillRect(headX - 1, headY - 2, headW + 2, 3);
                    ctx.fillRect(headX - 1, headY + 1, 3, 4);
                    ctx.fillStyle = hairLight;
                    ctx.fillRect(headX + 2, headY - 1, headW - 4, 1);
                    break;
                case 'short_curly':
                    ctx.fillStyle = hairBase;
                    ctx.fillRect(headX - 1, headY - 3, headW + 2, 4);
                    ctx.fillRect(headX - 2, headY, 3, 4);
                    ctx.fillStyle = hairLight;
                    ctx.fillRect(headX, headY - 3, 2, 2);
                    ctx.fillRect(headX + 4, headY - 4, 3, 2);
                    ctx.fillRect(headX + headW - 2, headY - 2, 2, 2);
                    break;
                case 'fluffy':
                    ctx.fillStyle = hairDark;
                    ctx.fillRect(headX - 2, headY - 4, headW + 4, 5);
                    ctx.fillStyle = hairBase;
                    ctx.fillRect(headX - 1, headY - 5, headW + 2, 5);
                    ctx.fillRect(headX + 2, headY - 1, headW - 1, 3); // fluffy bangs!
                    ctx.fillStyle = hairLight;
                    ctx.fillRect(headX + 1, headY - 4, 3, 2);
                    ctx.fillRect(headX + 6, headY - 5, 3, 2);
                    ctx.fillRect(headX + headW - 2, headY - 2, 2, 2);
                    break;
                case 'long_straight':
                    ctx.fillStyle = hairBase;
                    ctx.fillRect(headX - 1, headY - 2, headW + 2, 3);
                    ctx.fillRect(headX - 1, headY + 1, 3, 8);
                    ctx.fillStyle = hairLight;
                    ctx.fillRect(headX + 2, headY - 1, headW - 4, 1);
                    break;
                case 'long_curly':
                    ctx.fillStyle = hairBase;
                    ctx.fillRect(headX - 2, headY - 3, headW + 3, 4);
                    ctx.fillRect(headX - 2, headY + 1, 3, 8);
                    ctx.fillStyle = hairLight;
                    ctx.fillRect(headX + 1, headY - 3, 3, 2);
                    ctx.fillRect(headX + 5, headY - 3, 3, 2);
                    break;
                case 'mohawk':
                    ctx.fillStyle = hairDark;
                    ctx.fillRect(cx - 2, headY - 6, 4, 6);
                    ctx.fillStyle = hairBase;
                    ctx.fillRect(cx - 1, headY - 7, 3, 7);
                    ctx.fillStyle = hairLight;
                    ctx.fillRect(cx, headY - 7, 1, 4);
                    break;
                case 'ponytail':
                    ctx.fillStyle = hairBase;
                    ctx.fillRect(headX, headY - 2, headW, 3);
                    ctx.fillRect(headX, headY + 1, 2, 4);
                    break;
            }
        }
        // =========================================================================
        // 7. HATS
        // =========================================================================
        if (cfg.hatStyle === 'cap') {
            ctx.fillStyle = '#1d4ed8';
            ctx.fillRect(headX - 1, headY - 3, headW + 2, 4);
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(headX, headY - 2, headW, 2);
            // Visor brim sticking out right
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(headX + 3, headY, headW + 1, 2);
        }
        else if (cfg.hatStyle === 'beanie') {
            ctx.fillStyle = '#b91c1c';
            ctx.fillRect(headX - 1, headY - 4, headW + 2, 5);
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(headX, headY - 3, headW, 2);
            ctx.fillStyle = '#991b1b';
            ctx.fillRect(headX - 1, headY - 1, headW + 2, 2); // folded cuff
        }
        else if (cfg.hatStyle === 'fedora') {
            ctx.fillStyle = '#452712';
            ctx.fillRect(headX - 3, headY, headW + 6, 2); // wide brim
            ctx.fillStyle = '#784421';
            ctx.fillRect(headX, headY - 4, headW, 4);
            ctx.fillStyle = '#d97706';
            ctx.fillRect(headX, headY - 1, headW, 1); // band
        }
        else if (cfg.hatStyle === 'helmet') {
            ctx.fillStyle = '#475569';
            ctx.fillRect(headX - 1, headY - 2, headW + 2, 11);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(headX, headY - 1, headW, 3);
            // Visor slit
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(eye1X - 1, eyeY, headW - (eye1X - headX) + 1, 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(eye2X, eyeY, 2, 1);
        }
        else if (cfg.hatStyle === 'crown') {
            ctx.fillStyle = '#eab308';
            ctx.fillRect(headX, headY - 3, headW, 3);
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(headX, headY - 5, 2, 2);
            ctx.fillRect(cx - 1, headY - 5, 2, 2);
            ctx.fillRect(headX + headW - 2, headY - 5, 2, 2);
            ctx.fillStyle = '#ef4444'; // ruby gem
            ctx.fillRect(cx - 1, headY - 2, 2, 1);
        }
        // =========================================================================
        // 8. FOREGROUND ARM
        // =========================================================================
        ctx.save();
        ctx.translate(cx, torsoY + 3);
        ctx.rotate((armAngle * Math.PI) / 180);
        ctx.fillStyle = cfg.topStyle === 'none' ? skin.base : topLight;
        ctx.fillRect(-Math.floor(armW / 2), 0, armW, 8);
        ctx.fillStyle = skin.base; // hand
        ctx.fillRect(-Math.floor(armW / 2), 8, armW, 3);
        ctx.restore();
    }
}
