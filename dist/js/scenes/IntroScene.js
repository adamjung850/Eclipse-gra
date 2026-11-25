/**
 * Filmowe intro "Delveria" (zoptymalizowane pod stałe 60 FPS):
 * 1. Czyste czarne tło (bez napisów)
 * 2. Z punktu światła rozkwita kryształ 3D z kolorowych "0" i "1"
 * 3. Kryształ płynnie się powiększa (ZOOM IN) prosto na kamerę
 * 4. W zbliżeniu rozpada się w świetlisty pyłek
 * 5. Ze środka czarnego ekranu otwiera się mega płynne przejście do gry
 */
export class IntroScene extends Phaser.Scene {
    static TEX_KEY = '__delveria_binary_crystal__';
    static REVEAL_KEY = '__delveria_center_reveal__';
    static COLS = 104;
    static ROWS = 58;
    static CELL_W = 8;
    static CELL_H = 8;
    static CANVAS_W = IntroScene.COLS * IntroScene.CELL_W; // 832
    static CANVAS_H = IntroScene.ROWS * IntroScene.CELL_H; // 464
    canvasTex;
    ctx;
    glowCanvas;
    glowCtx;
    displayImg;
    revealTex;
    revealCtx;
    revealImg;
    vertices = [];
    triangles = [];
    zBuf = new Float32Array(IntroScene.COLS * IntroScene.ROWS);
    shadeBuf = new Float32Array(IntroScene.COLS * IntroScene.ROWS);
    hueBuf = new Float32Array(IntroScene.COLS * IntroScene.ROWS);
    bits = new Uint8Array(IntroScene.COLS * IntroScene.ROWS);
    dustParticles = [];
    elapsed = 0;
    phase = 'bloom';
    phaseTimer = 0;
    currentScale = 0.04;
    gameLaunched = false;
    finished = false;
    constructor() {
        super('IntroScene');
    }
    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.elapsed = 0;
        this.phase = 'bloom';
        this.phaseTimer = 0;
        this.currentScale = 0.04;
        this.gameLaunched = false;
        this.finished = false;
        this.dustParticles = [];
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay)
            uiOverlay.style.display = 'none';
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        this.cameras.main.setZoom(1);
        this.cameras.main.centerOn(W / 2, H / 2);
        this.buildCrystalMesh();
        for (let i = 0; i < this.bits.length; i++) {
            this.bits[i] = Math.random() < 0.5 ? 0 : 1;
        }
        // Lekka kurtyna 256x256 (szybki refresh, bez lagów)
        if (this.textures.exists(IntroScene.REVEAL_KEY)) {
            this.textures.remove(IntroScene.REVEAL_KEY);
        }
        this.revealTex = this.textures.createCanvas(IntroScene.REVEAL_KEY, 256, 256);
        this.revealCtx = this.revealTex.getContext();
        this.drawRevealMask(0);
        this.revealImg = this.add.image(W / 2, H / 2, IntroScene.REVEAL_KEY)
            .setOrigin(0.5, 0.5)
            .setDisplaySize(W + 4, H + 4)
            .setDepth(1);
        if (this.textures.exists(IntroScene.TEX_KEY)) {
            this.textures.remove(IntroScene.TEX_KEY);
        }
        this.canvasTex = this.textures.createCanvas(IntroScene.TEX_KEY, IntroScene.CANVAS_W, IntroScene.CANVAS_H);
        this.ctx = this.canvasTex.getContext();
        // Mały bufor bloomu (1/5 rozdzielczości) -> bilinear upscaling daje płynny glow bez CPU blur!
        this.glowCanvas = document.createElement('canvas');
        this.glowCanvas.width = Math.floor(IntroScene.CANVAS_W / 5);
        this.glowCanvas.height = Math.floor(IntroScene.CANVAS_H / 5);
        this.glowCtx = this.glowCanvas.getContext('2d');
        const fitScale = Math.max(W / IntroScene.CANVAS_W, H / IntroScene.CANVAS_H);
        this.displayImg = this.add.image(W / 2, H / 2, IntroScene.TEX_KEY)
            .setOrigin(0.5, 0.5)
            .setScale(fitScale)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(2);
        this.scale.on('resize', this.handleResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
        });
        this.input.once('pointerdown', () => this.skipToZoom());
        this.input.keyboard?.once('keydown-SPACE', () => this.skipToZoom());
        this.input.keyboard?.once('keydown-ENTER', () => this.skipToZoom());
        this.input.keyboard?.once('keydown-ESC', () => this.skipToZoom());
    }
    handleResize(gameSize) {
        const W = gameSize.width;
        const H = gameSize.height;
        if (this.cameras?.main) {
            this.cameras.main.setSize(W, H);
            this.cameras.main.centerOn(W / 2, H / 2);
        }
        if (this.revealImg) {
            this.revealImg.setPosition(W / 2, H / 2);
            this.revealImg.setDisplaySize(W + 4, H + 4);
        }
        if (this.displayImg) {
            const fitScale = Math.max(W / IntroScene.CANVAS_W, H / IntroScene.CANVAS_H);
            this.displayImg.setPosition(W / 2, H / 2);
            this.displayImg.setScale(fitScale);
        }
    }
    update(time, delta) {
        if (this.finished)
            return;
        const dt = Math.min(delta / 1000, 0.05);
        this.elapsed += delta;
        if (this.gameLaunched) {
            this.scene.bringToTop('IntroScene');
        }
        // 1. Rozkwit kryształu z małego punktu w środku (0 -> 2.15s)
        if (this.phase === 'bloom') {
            const bloomP = Math.min(this.elapsed / 1850, 1);
            const bloomEase = 1 - Math.pow(1 - bloomP, 3);
            this.currentScale = 0.04 + bloomEase * 0.96;
            for (let k = 0; k < 35; k++) {
                const idx = (Math.random() * this.bits.length) | 0;
                this.bits[idx] = this.bits[idx] ^ 1;
            }
            const rotY = this.elapsed * 0.00072;
            const tiltX = 0.36 + Math.sin(this.elapsed * 0.0014) * 0.08;
            this.renderBinaryCrystal(rotY, tiltX, this.currentScale, bloomEase, time, false);
            if (this.elapsed >= 2250) {
                this.phase = 'zoom';
                this.phaseTimer = 0;
            }
            return;
        }
        // 2. Dynamiczny ZOOM IN kryształu (2.25s -> 2.95s) zanim rozpadnie się w pyłek
        if (this.phase === 'zoom') {
            this.phaseTimer += delta;
            const zp = Math.min(this.phaseTimer / 700, 1);
            const zEase = zp * zp * zp;
            this.currentScale = 1.0 + zEase * 1.9; // Powiększa się wyraźnie prawie 3x!
            const rotY = this.elapsed * 0.00072 + zEase * 0.65;
            const tiltX = 0.36 + Math.sin(this.elapsed * 0.0014) * 0.08;
            this.renderBinaryCrystal(rotY, tiltX, this.currentScale, 1.0, time, false);
            if (zp >= 1) {
                this.phase = 'dissolve';
                this.phaseTimer = 0;
                this.renderBinaryCrystal(rotY, tiltX, this.currentScale, 1.0, time, true);
            }
            return;
        }
        // 3. Rozpad powiększonego kryształu w świetlisty pyłek na czarnym tle
        if (this.phase === 'dissolve') {
            this.phaseTimer += delta;
            const dp = Math.min(this.phaseTimer / 750, 1);
            this.updateAndRenderDust(dt, 1 - dp * 0.15);
            if (!this.gameLaunched && dp >= 0.40) {
                this.launchGameInBackground();
            }
            if (dp >= 1) {
                this.phase = 'reveal';
                this.phaseTimer = 0;
            }
            return;
        }
        // 4. Mega płynne otwarcie ze środka z czarnego ekranu prosto w grę
        if (this.phase === 'reveal') {
            this.phaseTimer += delta;
            const rp = Math.min(this.phaseTimer / 950, 1);
            const revealEase = -(Math.cos(Math.PI * rp) - 1) / 2;
            this.drawRevealMask(revealEase);
            this.updateAndRenderDust(dt, Math.max(0, 1 - rp * 1.25));
            if (rp >= 1) {
                this.finishIntro();
            }
        }
    }
    skipToZoom() {
        if (this.phase === 'bloom') {
            this.phase = 'zoom';
            this.phaseTimer = 0;
        }
    }
    launchGameInBackground() {
        if (this.gameLaunched)
            return;
        this.gameLaunched = true;
        this.scene.launch('MainMenuScene');
        this.scene.bringToTop('IntroScene');
    }
    finishIntro() {
        if (this.finished)
            return;
        this.finished = true;
        if (!this.gameLaunched) {
            this.launchGameInBackground();
        }
        this.scene.stop('IntroScene');
    }
    drawRevealMask(progress) {
        const ctx = this.revealCtx;
        const S = 256;
        const half = S / 2;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, S, S);
        if (progress <= 0.001) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, S, S);
            this.revealTex.refresh();
            return;
        }
        const maxR = S * 0.78;
        const outerR = Math.max(2, progress * maxR);
        const innerR = Math.max(0, outerR - 72 * (1 - progress * 0.45));
        const grad = ctx.createRadialGradient(half, half, innerR, half, half, outerR);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.45)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, S, S);
        this.revealTex.refresh();
    }
    updateAndRenderDust(dt, globalFade) {
        const ctx = this.ctx;
        const gCtx = this.glowCtx;
        const W = IntroScene.CANVAS_W;
        const H = IntroScene.CANVAS_H;
        const GW = this.glowCanvas.width;
        const GH = this.glowCanvas.height;
        ctx.clearRect(0, 0, W, H);
        gCtx.clearRect(0, 0, GW, GH);
        const scaleXGlow = GW / W;
        const scaleYGlow = GH / H;
        for (let i = 0; i < this.dustParticles.length; i++) {
            const p = this.dustParticles[i];
            p.life += dt;
            if (p.life >= p.maxLife)
                continue;
            const swirlY = Math.sin(p.life * 5.0 + p.phase) * 32;
            p.vx += 190 * dt; // Porywisty wiatr niosący pyłek w prawo
            p.x += p.vx * dt;
            p.y += (p.vy + swirlY) * dt;
            const lifeAlpha = Math.sin((1 - p.life / p.maxLife) * Math.PI * 0.5);
            const a = Phaser.Math.Clamp(lifeAlpha * globalFade, 0, 1);
            if (a <= 0.02)
                continue;
            ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${a.toFixed(2)})`;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
            if (i % 4 === 0) {
                gCtx.fillStyle = `rgba(${p.r},${p.g},${p.b},${(a * 0.35).toFixed(2)})`;
                gCtx.fillRect(p.x * scaleXGlow - 1, p.y * scaleYGlow - 1, 2, 2);
            }
        }
        // Szybki bloom bez CPU filter: płynne skalowanie z małego bufora w trybie lighter
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55;
        ctx.drawImage(this.glowCanvas, 0, 0, W, H);
        ctx.restore();
        this.canvasTex.refresh();
    }
    renderBinaryCrystal(rotY, tiltX, scaleFactor, bloomEase, time, captureDust) {
        const COLS = IntroScene.COLS;
        const ROWS = IntroScene.ROWS;
        const CW = IntroScene.CELL_W;
        const CH = IntroScene.CELL_H;
        this.zBuf.fill(-1e9);
        this.shadeBuf.fill(0);
        this.hueBuf.fill(0);
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const cosX = Math.cos(tiltX);
        const sinX = Math.sin(tiltX);
        const projX = new Float32Array(this.vertices.length);
        const projY = new Float32Array(this.vertices.length);
        const camZ = new Float32Array(this.vertices.length);
        const transV = new Array(this.vertices.length);
        const fov = 26;
        const camDist = 21;
        const halfW = COLS * 0.5;
        const halfH = ROWS * 0.5;
        for (let i = 0; i < this.vertices.length; i++) {
            const v = this.vertices[i];
            const vx = v.x * scaleFactor;
            const vy = v.y * scaleFactor;
            const vz = v.z * scaleFactor;
            const rx = vx * cosY - vz * sinY;
            const rz1 = vx * sinY + vz * cosY;
            const ry = vy * cosX - rz1 * sinX;
            const rz = vy * sinX + rz1 * cosX;
            transV[i] = { x: rx, y: ry, z: rz };
            const depth = Math.max(1.2, camDist - rz);
            const persp = fov / depth;
            projX[i] = halfW + rx * persp;
            projY[i] = halfH + ry * persp * 0.92;
            camZ[i] = rz;
        }
        const lx = -0.45, ly = -0.60, lz = 0.66;
        for (let ti = 0; ti < this.triangles.length; ti++) {
            const tri = this.triangles[ti];
            const ax = projX[tri.a], ay = projY[tri.a], az = camZ[tri.a];
            const bx = projX[tri.b], by = projY[tri.b], bz = camZ[tri.b];
            const cx = projX[tri.c], cy = projY[tri.c], cz = camZ[tri.c];
            const va = transV[tri.a];
            const vb = transV[tri.b];
            const vc = transV[tri.c];
            const ux = vb.x - va.x, uy = vb.y - va.y, uz = vb.z - va.z;
            const wx = vc.x - va.x, wy = vc.y - va.y, wz = vc.z - va.z;
            let nx = uy * wz - uz * wy;
            let ny = uz * wx - ux * wz;
            let nz = ux * wy - uy * wx;
            const nLen = Math.hypot(nx, ny, nz) || 1;
            nx /= nLen;
            ny /= nLen;
            nz /= nLen;
            const faceNz = nz < 0 ? -nz : nz;
            const faceNx = nz < 0 ? -nx : nx;
            const faceNy = nz < 0 ? -ny : ny;
            const diff = Math.max(0, faceNx * lx + faceNy * ly + faceNz * lz);
            const spec = Math.pow(Math.max(0, faceNz * 0.85 + diff * 0.35), 4) * 0.42;
            const shade = Phaser.Math.Clamp(0.38 + diff * 0.56 + spec, 0.32, 1.05);
            const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
            const maxX = Math.min(COLS - 1, Math.ceil(Math.max(ax, bx, cx)));
            const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
            const maxY = Math.min(ROWS - 1, Math.ceil(Math.max(ay, by, cy)));
            const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
            if (Math.abs(denom) < 1e-4)
                continue;
            const invDenom = 1 / denom;
            for (let py = minY; py <= maxY; py++) {
                for (let px = minX; px <= maxX; px++) {
                    const sx = px + 0.5;
                    const sy = py + 0.5;
                    const w1 = ((by - cy) * (sx - cx) + (cx - bx) * (sy - cy)) * invDenom;
                    const w2 = ((cy - ay) * (sx - cx) + (ax - cx) * (sy - cy)) * invDenom;
                    const w3 = 1 - w1 - w2;
                    if (w1 >= -0.02 && w2 >= -0.02 && w3 >= -0.02) {
                        const z = w1 * az + w2 * bz + w3 * cz;
                        const idx = py * COLS + px;
                        if (z > this.zBuf[idx]) {
                            this.zBuf[idx] = z;
                            this.shadeBuf[idx] = shade;
                            this.hueBuf[idx] = tri.hueShift + (w1 - w2) * 0.25;
                        }
                    }
                }
            }
        }
        const ctx = this.ctx;
        const gCtx = this.glowCtx;
        const GW = this.glowCanvas.width;
        const GH = this.glowCanvas.height;
        ctx.clearRect(0, 0, IntroScene.CANVAS_W, IntroScene.CANVAS_H);
        gCtx.clearRect(0, 0, GW, GH);
        ctx.font = 'bold 8px Consolas, "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const scaleXGlow = GW / IntroScene.CANVAS_W;
        const scaleYGlow = GH / IntroScene.CANVAS_H;
        const centerX = IntroScene.CANVAS_W * 0.5;
        const centerY = IntroScene.CANVAS_H * 0.5;
        if (captureDust)
            this.dustParticles = [];
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const idx = row * COLS + col;
                if (this.zBuf[idx] < -1e8)
                    continue;
                const shade = this.shadeBuf[idx] * (0.40 + bloomEase * 0.60);
                const hueMix = Phaser.Math.Clamp(0.5 + 0.5 * Math.sin(this.hueBuf[idx] * 2.6 + time * 0.0022), 0, 1);
                const baseR = 16 + hueMix * 214;
                const baseG = 195 - hueMix * 125;
                const baseB = 255 - hueMix * 25;
                const hi = Math.max(0, shade - 0.75) * 0.55;
                const r = Math.min(255, Math.round(baseR * shade + 165 * hi));
                const g = Math.min(255, Math.round(baseG * shade + 225 * hi));
                const b = Math.min(255, Math.round(baseB * shade + 255 * hi));
                const x = col * CW + CW * 0.5;
                const y = row * CH + CH * 0.5;
                const ch = this.bits[idx] === 1 ? '1' : '0';
                if (captureDust) {
                    // 3 drobinki na komórkę -> gęsty, bogaty pyłek lecący w prawo jak na filmie
                    const rightBias = Phaser.Math.Clamp((x - (centerX - 180)) / 360, 0.3, 1.3);
                    for (let k = 0; k < 3; k++) {
                        this.dustParticles.push({
                            x: x + Phaser.Math.FloatBetween(-3, 3),
                            y: y + Phaser.Math.FloatBetween(-3, 3),
                            vx: Phaser.Math.FloatBetween(120, 320) * rightBias + k * 28,
                            vy: Phaser.Math.FloatBetween(-48, 48),
                            r,
                            g,
                            b,
                            size: Math.random() < 0.30 ? 3 : 2,
                            life: 0,
                            maxLife: Phaser.Math.FloatBetween(0.95, 1.7),
                            phase: Math.random() * Math.PI * 2,
                        });
                    }
                }
                else {
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillText(ch, x, y);
                    if (shade > 0.52) {
                        gCtx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.40, shade * 0.32).toFixed(2)})`;
                        gCtx.fillRect(x * scaleXGlow - 1, y * scaleYGlow - 1, 2, 2);
                    }
                }
            }
        }
        if (!captureDust) {
            // Szybki bloom bez CPU blur: płynne skalowanie z 1/5 bufora w trybie lighter (60 FPS!)
            ctx.save();
            ctx.imageSmoothingEnabled = true;
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.55;
            ctx.drawImage(this.glowCanvas, 0, 0, IntroScene.CANVAS_W, IntroScene.CANVAS_H);
            ctx.restore();
            this.canvasTex.refresh();
        }
    }
    buildCrystalMesh() {
        this.vertices = [];
        this.triangles = [];
        const addCrystalPillar = (offsetX, offsetY, offsetZ, tiltZ, tiltX, radius, bodyH, tipH, hueShift) => {
            const sides = 6;
            const baseIdx = this.vertices.length;
            const cosZ = Math.cos(tiltZ), sinZ = Math.sin(tiltZ);
            const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
            const pushV = (x, y, z) => {
                const y1 = y * cosX - z * sinX;
                const z1 = y * sinX + z * cosX;
                const x2 = x * cosZ - y1 * sinZ;
                const y2 = x * sinZ + y1 * cosZ;
                this.vertices.push({ x: x2 + offsetX, y: y2 + offsetY, z: z1 + offsetZ });
            };
            pushV(0, -(bodyH + tipH), 0);
            pushV(0, bodyH + tipH, 0);
            for (let i = 0; i < sides; i++) {
                const a = (i / sides) * Math.PI * 2;
                pushV(Math.cos(a) * radius, -bodyH, Math.sin(a) * radius);
            }
            for (let i = 0; i < sides; i++) {
                const a = (i / sides) * Math.PI * 2;
                pushV(Math.cos(a) * radius, bodyH, Math.sin(a) * radius);
            }
            const topTip = baseIdx;
            const botTip = baseIdx + 1;
            for (let i = 0; i < sides; i++) {
                const next = (i + 1) % sides;
                const t1 = baseIdx + 2 + i;
                const t2 = baseIdx + 2 + next;
                const b1 = baseIdx + 2 + sides + i;
                const b2 = baseIdx + 2 + sides + next;
                const h = hueShift + i * 0.22;
                this.triangles.push({ a: topTip, b: t1, c: t2, hueShift: h });
                this.triangles.push({ a: t1, b: b1, c: t2, hueShift: h + 0.1 });
                this.triangles.push({ a: t2, b: b1, c: b2, hueShift: h + 0.1 });
                this.triangles.push({ a: botTip, b: b2, c: b1, hueShift: h + 0.2 });
            }
        };
        addCrystalPillar(0, 0.2, 0, 0.02, 0, 2.2, 2.8, 3.8, 0.0);
        addCrystalPillar(-3.0, 1.4, 0.5, -0.58, 0.16, 1.4, 1.8, 2.5, 0.9);
        addCrystalPillar(3.1, 1.1, -0.5, 0.54, -0.14, 1.5, 2.0, 2.7, 1.7);
        addCrystalPillar(-0.8, 2.6, 1.6, -0.24, 0.35, 1.0, 1.1, 1.5, 2.4);
    }
}
