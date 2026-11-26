import { getCurrentUser, hasSaveForCurrentUser, listRegisteredUsernames, loginAccount, logoutAccount, registerAccount, } from '../systems/AccountSystem.js';
const DEFAULT_KEYBINDS = {
    left: 'A',
    right: 'D',
    jump: 'W',
    inventory: 'E',
    drop: 'Q',
    music: 'M',
};
/**
 * Główne Menu gry "Delveria":
 * - Imponujące rzeźbione logo "DELVERIA" z metaliczno-kryształowym cieniowaniem
 * - Ozdobne pixel-artowe przyciski RPG (GRAJ, USTAWIENIA, WYJDŹ)
 * - Okno USTAWIENIA z krzyżykiem X i 3 zakładkami:
 *   1) DŹWIĘK: płynne suwaki 0–100% (Głośność główna, Muzyka, SFX)
 *   2) STEROWANIE: przypisywanie własnych klawiszy + reset do domyślnych
 *   3) GRAFIKA: selektor FPS (30, 60, 120, 144, 240, 300, UNLIMITED), suwak Shake, Pełny ekran, HUD
 */
export class MainMenuScene extends Phaser.Scene {
    static TITLE_TEX = '__delveria_epic_title_v5__';
    static BG_WORLD_TEX = '__delveria_menu_real_cave__';
    static LIVE_CRYSTAL_TEX = '__delveria_menu_live_01_crystal_lg__';
    static LIVE_COLS = 64;
    static LIVE_ROWS = 64;
    static LIVE_CELL = 6;
    static LIVE_SIZE = MainMenuScene.LIVE_COLS * MainMenuScene.LIVE_CELL;
    static T = 24;
    static COLS = 28;
    static ROWS = 46;
    static BG_W = MainMenuScene.COLS * MainMenuScene.T;
    static BG_H = MainMenuScene.ROWS * MainMenuScene.T;
    bgImage;
    bottomCrystal;
    bottomCrystalGlow;
    loadingCrystal;
    loadingCrystalGlow;
    titleGlow;
    vignetteOverlay;
    liveTex;
    liveCtx;
    liveGlowCanvas;
    liveGlowCtx;
    crystalVerts = [];
    crystalTris = [];
    liveZBuf = new Float32Array(MainMenuScene.LIVE_COLS * MainMenuScene.LIVE_ROWS);
    liveShadeBuf = new Float32Array(MainMenuScene.LIVE_COLS * MainMenuScene.LIVE_ROWS);
    liveHueBuf = new Float32Array(MainMenuScene.LIVE_COLS * MainMenuScene.LIVE_ROWS);
    liveBits = new Uint8Array(MainMenuScene.LIVE_COLS * MainMenuScene.LIVE_ROWS);
    titleSprite;
    titleBaseCanvas;
    titleDynamicTex;
    versionText;
    motes = [];
    buttons = [];
    accountTopBtn = null;
    accountDomRoot = null;
    settingsModal = null;
    activeTab = 'sound';
    listeningKeyAction = null;
    modalKeyListener = null;
    activeSliderMoveHandler = null;
    activeSliderUpHandler = null;
    fadeOutOverlay;
    isTransitioning = false;
    isAscending = false;
    ascendElapsed = 0;
    ascendStartScroll = 0;
    shimmerStarted = false;
    shimmerProgress = -0.2;
    // Ustawienia
    optMasterVol = 1.0; // 0..1
    optMusicVol = 0.8; // 0..1
    optSfxVol = 1.0; // 0..1
    optShakeIntensity = 1.0; // 0..1
    optFullscreen = false;
    optControlsHud = true;
    optFps = '60';
    keybinds = { ...DEFAULT_KEYBINDS };
    scrollProgress = 0;
    scrollElapsed = 0;
    bgScale = 1;
    ascendStartTopY = 0;
    ascendWorldStarted = false;
    constructor() {
        super('MainMenuScene');
    }
    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.isTransitioning = false;
        this.isAscending = false;
        this.ascendElapsed = 0;
        this.ascendWorldStarted = false;
        this.shimmerStarted = false;
        this.shimmerProgress = -0.2;
        this.motes = [];
        this.buttons = [];
        this.settingsModal = null;
        this.listeningKeyAction = null;
        this.scrollProgress = 0;
        this.scrollElapsed = 0;
        this.loadSettings();
        const uiOverlay = document.getElementById('ui-overlay');
        if (uiOverlay)
            uiOverlay.style.display = 'none';
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
        this.cameras.main.setZoom(1);
        this.cameras.main.centerOn(W / 2, H / 2);
        this.buildCaveWorldTexture();
        this.initLiveCrystalRenderer();
        this.buildEpicTitleTexture();
        this.bgImage = this.add.image(W / 2, 0, MainMenuScene.BG_WORLD_TEX)
            .setOrigin(0.5, 0)
            .setDepth(0);
        this.bottomCrystalGlow = this.add.image(W / 2, 0, 'light_radial_mask')
            .setOrigin(0.5, 0.5)
            .setTint(0x38bdf8)
            .setAlpha(0.28)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(1);
        this.bottomCrystal = this.add.image(W / 2, 0, MainMenuScene.LIVE_CRYSTAL_TEX)
            .setOrigin(0.5, 1)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(2);
        this.vignetteOverlay = this.add.graphics().setDepth(3);
        this.drawVignette(W, H);
        for (let i = 0; i < 30; i++) {
            const sz = Phaser.Math.Between(2, 4);
            const col = i % 3 === 0 ? 0xc084fc : (i % 2 === 0 ? 0x38bdf8 : 0x7dd3fc);
            const mote = this.add.rectangle(Phaser.Math.Between(0, W), Phaser.Math.Between(0, H), sz, sz, col, 0.5).setDepth(4).setBlendMode(Phaser.BlendModes.ADD);
            this.motes.push({
                rect: mote,
                vy: -Phaser.Math.FloatBetween(14, 34),
                vx: Phaser.Math.FloatBetween(-10, 14),
                phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
                baseAlpha: Phaser.Math.FloatBetween(0.25, 0.72),
            });
        }
        // Subtelna aura za napisem DELVERIA
        this.titleGlow = this.add.image(W / 2, H * 0.21, 'light_radial_mask')
            .setOrigin(0.5, 0.5)
            .setTint(0x0ea5e9)
            .setScale(2.1, 0.7)
            .setAlpha(0.26)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(9);
        this.titleSprite = this.add.image(W / 2, H * 0.21, MainMenuScene.TITLE_TEX)
            .setOrigin(0.5, 0.5)
            .setDepth(10);
        this.rebuildMenuButtons();
        // Przycisk "Konto" w prawym górnym rogu
        this.rebuildAccountTopButton();
        const activeUser = getCurrentUser();
        const verLabel = activeUser ? `DELVERIA • v1.0  |  Konto: ${activeUser}` : 'DELVERIA • v1.0';
        this.versionText = this.add.text(16, H - 14, verLabel, {
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '12px',
            color: '#64748b',
            stroke: '#02040a',
            strokeThickness: 3,
        }).setOrigin(0, 1).setDepth(10);
        // Średni obracający się kryształ ładowania w prawym dolnym rogu
        this.loadingCrystalGlow = this.add.image(W - 76, H - 78, 'light_radial_mask')
            .setOrigin(0.5, 0.5)
            .setTint(0x38bdf8)
            .setScale(0.55)
            .setAlpha(0)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(24);
        this.loadingCrystal = this.add.image(W - 76, H - 78, MainMenuScene.LIVE_CRYSTAL_TEX)
            .setOrigin(0.5, 0.5)
            .setScale(0.62)
            .setAlpha(0)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(25);
        this.fadeOutOverlay = this.add.rectangle(W / 2, H / 2, W * 2, H * 2, 0x000000, 0)
            .setDepth(100);
        this.layoutBackground(W, H);
        this.fitTitle(W);
        this.scale.on('resize', this.handleResize, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.handleResize, this);
            this.cleanupModalListeners();
            this.closeAccountModal();
        });
        this.input.keyboard?.on('keydown-ENTER', () => {
            if (!this.settingsModal && !this.accountDomRoot && !this.isTransitioning) {
                this.startGame();
            }
        });
        this.input.keyboard?.on('keydown-ESC', () => {
            if (this.accountDomRoot) {
                this.closeAccountModal();
                return;
            }
            if (this.settingsModal && !this.listeningKeyAction) {
                this.closeSettingsModal();
            }
        });
    }
    update(time, delta) {
        const dt = Math.min(delta / 1000, 0.05);
        const W = this.scale.width;
        const H = this.scale.height;
        if (this.isAscending) {
            this.scene.bringToTop('MainMenuScene');
            this.ascendElapsed += delta;
            this.renderLiveCrystal(time);
            const gs = this.scene.get('GameScene');
            const worldReady = Boolean(gs?.isWorldReady);
            // Płynny ruch tła jaskini w dół (efekt wznoszenia w górę).
            // Dopóki świat nie jest w pełni wygenerowany, jaskinia płynie ku górze bez odsłaniania pustki.
            const maxOffset = Math.max(0, MainMenuScene.BG_H * this.bgScale - H);
            const climbSpeed = Math.max(220, maxOffset * 0.55);
            let currentTopY = this.ascendStartTopY + (this.ascendElapsed / 1000) * climbSpeed;
            if (currentTopY > 0) {
                currentTopY = 0;
            }
            if (this.bgImage) {
                this.bgImage.setPosition(W / 2, currentTopY);
                this.bgImage.setScale(this.bgScale);
            }
            if (this.bottomCrystal && this.bottomCrystalGlow) {
                const worldScreenH = MainMenuScene.BG_H * this.bgScale;
                const crystalGroundY = currentTopY + worldScreenH - (MainMenuScene.T * 1.6) * this.bgScale;
                const cScale = Math.max(0.95, this.bgScale * 0.48);
                this.bottomCrystal.setPosition(W / 2, crystalGroundY);
                this.bottomCrystal.setScale(cScale);
                this.bottomCrystalGlow.setPosition(W / 2, crystalGroundY - 175 * cScale);
            }
            // Gdy świat jest gotowy, uruchamiamy płynny lot kamery GameScene z podziemi na trawę.
            // Szybkie (480ms) przenikanie odbywa się jeszcze głęboko pod ziemią (brak nakładania na drzewa czy niebo!).
            if (!this.ascendWorldStarted && worldReady && typeof gs?.startMenuAscend === 'function') {
                this.ascendWorldStarted = true;
                this.tweens.add({
                    targets: [this.bgImage, this.bottomCrystal, this.bottomCrystalGlow, this.vignetteOverlay],
                    alpha: 0,
                    duration: 480,
                    ease: 'Sine.easeInOut',
                });
                gs.startMenuAscend(() => {
                    if (this.shimmerStarted)
                        return;
                    this.shimmerStarted = true;
                    if (this.loadingCrystal) {
                        this.tweens.add({ targets: [this.loadingCrystal, this.loadingCrystalGlow], alpha: 0, duration: 280, ease: 'Sine.easeOut' });
                    }
                    const shimmerObj = { p: -0.25 };
                    this.tweens.add({
                        targets: shimmerObj,
                        p: 1.25,
                        duration: 420,
                        ease: 'Sine.easeInOut',
                        onUpdate: () => {
                            this.renderTitleShimmer(shimmerObj.p);
                        },
                        onComplete: () => {
                            this.renderTitleShimmer(1.5);
                            this.tweens.add({
                                targets: [this.titleSprite, this.titleGlow],
                                alpha: 0,
                                duration: 480,
                                ease: 'Sine.easeOut',
                                onComplete: () => {
                                    this.scene.stop('MainMenuScene');
                                }
                            });
                        }
                    });
                });
            }
            for (const m of this.motes) {
                m.rect.y += m.vy * dt;
                m.rect.setAlpha(m.rect.alpha * 0.96);
            }
            return;
        }
        this.scrollElapsed += delta;
        const rawT = Math.min(this.scrollElapsed / 6800, 1);
        this.scrollProgress = -(Math.cos(Math.PI * rawT) - 1) / 2;
        this.layoutBackground(W, H);
        this.renderLiveCrystal(time);
        const floatY = Math.sin(time * 0.0022) * 4;
        if (this.titleSprite) {
            this.titleSprite.y = H * 0.21 + floatY * 0.6;
        }
        if (this.titleGlow) {
            this.titleGlow.y = H * 0.21 + floatY * 0.6;
            this.titleGlow.setAlpha(0.22 + Math.sin(time * 0.003) * 0.05);
        }
        if (this.bottomCrystalGlow) {
            const pulse = 1 + Math.sin(time * 0.0035) * 0.08;
            this.bottomCrystalGlow.setScale(Math.max(0.65, this.bgScale * 0.34) * pulse);
            this.bottomCrystalGlow.setAlpha(0.24 + Math.sin(time * 0.0035) * 0.06);
        }
        for (const m of this.motes) {
            m.rect.x += m.vx * dt;
            m.rect.y += m.vy * dt;
            if (m.rect.y < -10) {
                m.rect.y = H + 10;
                m.rect.x = Phaser.Math.Between(0, W);
            }
            if (m.rect.x > W + 10)
                m.rect.x = -10;
            if (m.rect.x < -10)
                m.rect.x = W + 10;
            const tw = 0.5 + 0.5 * Math.sin(time * 0.004 + m.phase);
            m.rect.setAlpha(m.baseAlpha * tw);
        }
    }
    fitTitle(W) {
        if (!this.titleSprite)
            return;
        const maxTitleW = W * 0.78;
        const texW = this.titleSprite.width || 500;
        this.titleSprite.setScale(Math.min(1, maxTitleW / texW));
    }
    layoutBackground(W, H) {
        if (!this.bgImage)
            return;
        const minWorldScreenH = H * 2.1;
        this.bgScale = Math.max(W / MainMenuScene.BG_W, minWorldScreenH / MainMenuScene.BG_H);
        const worldScreenH = MainMenuScene.BG_H * this.bgScale;
        const maxOffset = Math.max(0, worldScreenH - H);
        const topY = -this.scrollProgress * maxOffset;
        this.bgImage.setPosition(W / 2, topY);
        this.bgImage.setScale(this.bgScale);
        if (this.bottomCrystal && this.bottomCrystalGlow) {
            const crystalGroundY = topY + worldScreenH - (MainMenuScene.T * 1.6) * this.bgScale;
            const cScale = Math.max(0.95, this.bgScale * 0.48);
            this.bottomCrystal.setPosition(W / 2, crystalGroundY);
            this.bottomCrystal.setScale(cScale);
            this.bottomCrystalGlow.setPosition(W / 2, crystalGroundY - 175 * cScale);
        }
    }
    handleResize(gameSize) {
        const W = gameSize.width;
        const H = gameSize.height;
        if (this.cameras?.main) {
            this.cameras.main.setSize(W, H);
            this.cameras.main.centerOn(W / 2, H / 2);
        }
        this.drawVignette(W, H);
        this.layoutBackground(W, H);
        if (this.titleSprite) {
            this.titleSprite.setPosition(W / 2, H * 0.21);
            this.fitTitle(W);
        }
        if (this.titleGlow) {
            this.titleGlow.setPosition(W / 2, H * 0.21);
        }
        const gap = 54;
        const btnStartY = H * 0.48 - ((this.buttons.length - 1) * gap) / 2;
        this.buttons.forEach((btn, i) => {
            btn.container.setPosition(W / 2, btnStartY + i * gap);
        });
        if (this.accountTopBtn) {
            this.accountTopBtn.container.setPosition(W - this.accountTopBtn.width / 2 - 20, 34);
        }
        if (this.versionText) {
            this.versionText.setPosition(16, H - 14);
        }
        if (this.loadingCrystal) {
            this.loadingCrystal.setPosition(W - 76, H - 78);
        }
        if (this.loadingCrystalGlow) {
            this.loadingCrystalGlow.setPosition(W - 76, H - 78);
        }
        if (this.fadeOutOverlay) {
            this.fadeOutOverlay.setPosition(W / 2, H / 2);
            this.fadeOutOverlay.setSize(W * 2, H * 2);
        }
        if (this.settingsModal) {
            this.settingsModal.setPosition(W / 2, H / 2);
        }
    }
    loadSettings() {
        try {
            const m = localStorage.getItem('delveria_vol_master');
            if (m !== null)
                this.optMasterVol = Phaser.Math.Clamp(parseFloat(m), 0, 1);
            const mu = localStorage.getItem('delveria_vol_music');
            if (mu !== null)
                this.optMusicVol = Phaser.Math.Clamp(parseFloat(mu), 0, 1);
            const sf = localStorage.getItem('delveria_vol_sfx');
            if (sf !== null)
                this.optSfxVol = Phaser.Math.Clamp(parseFloat(sf), 0, 1);
            const sh = localStorage.getItem('delveria_shake_val');
            if (sh !== null)
                this.optShakeIntensity = Phaser.Math.Clamp(parseFloat(sh), 0, 1);
            this.optFullscreen = localStorage.getItem('delveria_fullscreen') === '1';
            this.optControlsHud = localStorage.getItem('delveria_controls_hud') !== '0';
            const fps = localStorage.getItem('delveria_fps');
            if (fps && ['30', '60', '120', '144', '240', '300', 'unlimited'].includes(fps)) {
                this.optFps = fps;
            }
            const rawKb = localStorage.getItem('delveria_keybinds');
            if (rawKb) {
                this.keybinds = { ...DEFAULT_KEYBINDS, ...JSON.parse(rawKb) };
            }
            this.sound.volume = this.optMasterVol;
            this.sound.mute = this.optMasterVol <= 0.001;
        }
        catch {
            // Ignore storage errors
        }
    }
    saveVal(key, val) {
        try {
            localStorage.setItem(key, val);
        }
        catch {
            // Ignore
        }
    }
    applyFps(fps) {
        this.optFps = fps;
        this.saveVal('delveria_fps', fps);
        const target = fps === 'unlimited' ? 999 : parseInt(fps, 10);
        const loop = this.game.loop;
        if (loop) {
            loop.targetFps = target;
            loop._target = 1000 / target;
        }
    }
    async applyFullscreen(enabled) {
        this.optFullscreen = enabled;
        this.saveVal('delveria_fullscreen', enabled ? '1' : '0');
        try {
            const tauri = window.__TAURI__;
            if (tauri?.core?.invoke) {
                await tauri.core.invoke('set_fullscreen', { fullscreen: enabled });
                return;
            }
        }
        catch {
            // Fallback
        }
        if (enabled && !this.scale.isFullscreen) {
            this.scale.startFullscreen();
        }
        else if (!enabled && this.scale.isFullscreen) {
            this.scale.stopFullscreen();
        }
    }
    startGame() {
        if (this.isTransitioning)
            return;
        this.isTransitioning = true;
        this.isAscending = true;
        this.ascendElapsed = 0;
        this.ascendStartScroll = this.scrollProgress;
        const W = this.scale.width;
        const H = this.scale.height;
        const minWorldScreenH = H * 2.1;
        this.bgScale = Math.max(W / MainMenuScene.BG_W, minWorldScreenH / MainMenuScene.BG_H);
        const maxOffset = Math.max(0, MainMenuScene.BG_H * this.bgScale - H);
        this.ascendStartTopY = -this.scrollProgress * maxOffset;
        // 1. Guziki i napis wersji znikają, napis DELVERIA zostaje!
        this.closeAccountModal();
        if (this.accountTopBtn) {
            this.accountTopBtn.container.disableInteractive();
            this.tweens.add({ targets: this.accountTopBtn.container, alpha: 0, duration: 200 });
        }
        this.buttons.forEach((btn) => {
            btn.container.disableInteractive();
            this.tweens.add({
                targets: btn.container,
                alpha: 0,
                y: btn.container.y + 16,
                duration: 240,
                ease: 'Sine.easeIn',
            });
        });
        if (this.versionText) {
            this.tweens.add({ targets: this.versionText, alpha: 0, duration: 200 });
        }
        if (this.bottomCrystal && this.bottomCrystalGlow) {
            this.tweens.add({ targets: [this.bottomCrystal, this.bottomCrystalGlow], alpha: 0, duration: 220, ease: 'Sine.easeIn' });
        }
        if (this.loadingCrystal) {
            this.tweens.add({ targets: this.loadingCrystal, alpha: 1, duration: 180, ease: 'Sine.easeOut' });
        }
        if (this.loadingCrystalGlow) {
            this.tweens.add({ targets: this.loadingCrystalGlow, alpha: 0.28, duration: 180, ease: 'Sine.easeOut' });
        }
        // 2. Płynne przejście do Kreatora Postaci przed wejściem do świata Delverii
        this.cameras.main.fadeOut(320, 6, 8, 13);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('CharacterCreatorScene');
        });
    }
    startSavedGame() {
        if (this.isTransitioning)
            return;
        this.isTransitioning = true;
        this.closeAccountModal();
        this.cameras.main.fadeOut(320, 6, 8, 13);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('GameScene', { loadSave: true });
        });
    }
    rebuildMenuButtons() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.buttons.forEach((b) => b.container.destroy());
        this.buttons = [];
        const hasSave = hasSaveForCurrentUser();
        const gap = 54;
        const btnCount = hasSave ? 4 : 3;
        const btnStartY = H * 0.48 - ((btnCount - 1) * gap) / 2;
        let bIdx = 0;
        if (hasSave) {
            const continueBtn = this.createMenuButton(W / 2, btnStartY + gap * bIdx++, 276, 46, 'KONTYNUUJ', true, () => {
                this.startSavedGame();
            });
            this.buttons.push(continueBtn);
        }
        const playBtn = this.createMenuButton(W / 2, btnStartY + gap * bIdx++, 276, hasSave ? 42 : 48, hasSave ? 'NOWA GRA' : 'GRAJ', !hasSave, () => {
            this.startGame();
        });
        const settingsBtn = this.createMenuButton(W / 2, btnStartY + gap * bIdx++, 276, 44, 'USTAWIENIA', false, () => {
            this.openSettingsModal('sound');
        });
        const quitBtn = this.createMenuButton(W / 2, btnStartY + gap * bIdx++, 276, 44, 'WYJDŹ', false, () => {
            this.quitApp();
        });
        this.buttons.push(playBtn, settingsBtn, quitBtn);
    }
    rebuildAccountTopButton() {
        const W = this.scale.width;
        if (this.accountTopBtn) {
            this.accountTopBtn.container.destroy();
            this.accountTopBtn = null;
        }
        const user = getCurrentUser();
        const label = user ? `KONTO: ${user}` : 'KONTO';
        const btnW = Math.min(240, Math.max(146, label.length * 10 + 44));
        this.accountTopBtn = this.createMenuButton(W - btnW / 2 - 20, 34, btnW, 38, label, false, () => {
            if (this.accountDomRoot) {
                this.closeAccountModal();
            }
            else {
                this.openAccountModal();
            }
        });
        this.accountTopBtn.container.setDepth(20);
        if (this.versionText) {
            this.versionText.setText(user ? `DELVERIA • v1.0  |  Konto: ${user}` : 'DELVERIA • v1.0');
        }
    }
    closeAccountModal() {
        if (this.accountDomRoot) {
            this.accountDomRoot.remove();
            this.accountDomRoot = null;
        }
    }
    openAccountModal() {
        if (this.settingsModal || this.isTransitioning)
            return;
        this.closeAccountModal();
        const root = document.createElement('div');
        root.className = 'ac-root';
        root.style.background = 'rgba(2, 6, 14, 0.55)';
        root.style.pointerEvents = 'auto';
        const card = document.createElement('div');
        card.className = 'ac-card';
        card.innerHTML = `
      <div class="cc-corner tl"></div>
      <div class="cc-corner tr"></div>
      <div class="cc-corner bl"></div>
      <div class="cc-corner br"></div>
    `;
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'ac-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', () => this.closeAccountModal());
        card.appendChild(closeBtn);
        const activeUser = getCurrentUser();
        const header = document.createElement('div');
        header.className = 'ac-header';
        header.innerHTML = `
      <div class="ac-title">KONTO DELVERIA</div>
      <div class="ac-subtitle">${activeUser ? `Zalogowano jako: ${activeUser}` : 'Zaloguj się lub utwórz konto, aby zapisywać postęp gry'}</div>
    `;
        card.appendChild(header);
        const existingUsers = listRegisteredUsernames();
        let mode = existingUsers.length > 0 ? 'login' : 'register';
        const tabs = document.createElement('div');
        tabs.className = 'ac-tabs';
        const loginTabBtn = document.createElement('button');
        loginTabBtn.type = 'button';
        loginTabBtn.className = 'ac-tab';
        loginTabBtn.textContent = 'Logowanie';
        const regTabBtn = document.createElement('button');
        regTabBtn.type = 'button';
        regTabBtn.className = 'ac-tab';
        regTabBtn.textContent = 'Tworzenie konta';
        tabs.append(loginTabBtn, regTabBtn);
        card.appendChild(tabs);
        const loginField = document.createElement('div');
        loginField.className = 'ac-field';
        const loginLbl = document.createElement('label');
        loginLbl.className = 'ac-label';
        loginLbl.textContent = 'Login';
        const loginInput = document.createElement('input');
        loginInput.type = 'text';
        loginInput.className = 'ac-input';
        loginInput.placeholder = 'Wpisz login (min. 3 znaki)...';
        loginInput.maxLength = 20;
        if (activeUser)
            loginInput.value = activeUser;
        loginField.append(loginLbl, loginInput);
        card.appendChild(loginField);
        if (existingUsers.length > 0) {
            const savedRow = document.createElement('div');
            savedRow.className = 'ac-saved-row';
            const savedLbl = document.createElement('span');
            savedLbl.className = 'ac-saved-lbl';
            savedLbl.textContent = 'Konta:';
            savedRow.appendChild(savedLbl);
            existingUsers.slice(0, 4).forEach((uname) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'ac-chip';
                chip.textContent = uname;
                chip.addEventListener('click', () => {
                    loginInput.value = uname;
                    mode = 'login';
                    syncMode();
                    passInput.focus();
                });
                savedRow.appendChild(chip);
            });
            card.appendChild(savedRow);
        }
        const passField = document.createElement('div');
        passField.className = 'ac-field';
        const passLbl = document.createElement('label');
        passLbl.className = 'ac-label';
        passLbl.textContent = 'Hasło';
        const passInput = document.createElement('input');
        passInput.type = 'password';
        passInput.className = 'ac-input';
        passInput.placeholder = 'Wpisz hasło (min. 4 znaki)...';
        passInput.maxLength = 64;
        passField.append(passLbl, passInput);
        card.appendChild(passField);
        const msgEl = document.createElement('div');
        msgEl.className = 'ac-msg';
        card.appendChild(msgEl);
        const submitBtn = document.createElement('button');
        submitBtn.type = 'button';
        submitBtn.className = 'ac-submit';
        card.appendChild(submitBtn);
        if (activeUser) {
            const logoutBtn = document.createElement('button');
            logoutBtn.type = 'button';
            logoutBtn.className = 'ac-logout';
            logoutBtn.textContent = 'Wyloguj się';
            logoutBtn.addEventListener('click', () => {
                logoutAccount();
                this.rebuildAccountTopButton();
                this.rebuildMenuButtons();
                this.closeAccountModal();
            });
            card.appendChild(logoutBtn);
        }
        const syncMode = () => {
            loginTabBtn.classList.toggle('active', mode === 'login');
            regTabBtn.classList.toggle('active', mode === 'register');
            submitBtn.textContent = mode === 'login' ? 'ZALOGUJ SIĘ →' : 'UTWÓRZ KONTO →';
            msgEl.textContent = '';
            msgEl.classList.remove('ok');
        };
        syncMode();
        loginTabBtn.addEventListener('click', () => {
            mode = 'login';
            syncMode();
        });
        regTabBtn.addEventListener('click', () => {
            mode = 'register';
            syncMode();
        });
        const handleSubmit = async () => {
            msgEl.textContent = '';
            msgEl.classList.remove('ok');
            const res = mode === 'login'
                ? await loginAccount(loginInput.value, passInput.value)
                : await registerAccount(loginInput.value, passInput.value);
            if (!res.ok) {
                msgEl.textContent = res.error || 'Wystąpił błąd.';
                return;
            }
            msgEl.classList.add('ok');
            msgEl.textContent = mode === 'login'
                ? `Zalogowano jako ${res.username}!`
                : `Konto ${res.username} utworzone!`;
            this.rebuildAccountTopButton();
            this.rebuildMenuButtons();
            setTimeout(() => {
                this.closeAccountModal();
            }, 450);
        };
        submitBtn.addEventListener('click', handleSubmit);
        [loginInput, passInput].forEach((inp) => {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                }
            });
        });
        root.addEventListener('click', (e) => {
            if (e.target === root)
                this.closeAccountModal();
        });
        root.appendChild(card);
        document.body.appendChild(root);
        this.accountDomRoot = root;
        setTimeout(() => {
            if (loginInput.value.trim().length > 0)
                passInput.focus();
            else
                loginInput.focus();
        }, 50);
    }
    async quitApp() {
        try {
            const tauri = window.__TAURI__;
            if (tauri?.core?.invoke) {
                await tauri.core.invoke('quit_app');
                return;
            }
            if (tauri?.window?.getCurrentWindow) {
                await tauri.window.getCurrentWindow().close();
                return;
            }
        }
        catch {
            // Fallback
        }
        window.close();
    }
    /**
     * Ozdobny pixel-artowy przycisk RPG z krystalicznymi narożnikami i znacznikami hover.
     */
    createMenuButton(x, y, width, height, text, primary, onClick) {
        const container = this.add.container(x, y).setDepth(12);
        const bg = this.add.graphics();
        const label = this.add.text(0, 0, text, {
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: primary ? '20px' : '16px',
            fontStyle: 'bold',
            color: primary ? '#e0f2fe' : '#cbd5e1',
            stroke: '#02040a',
            strokeThickness: 4,
            letterSpacing: 4,
        }).setOrigin(0.5, 0.5);
        const ornaments = this.add.text(0, 0, `◆   ${' '.repeat(text.length + 2)}   ◆`, {
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '14px',
            color: '#7dd3fc',
        }).setOrigin(0.5, 0.5).setAlpha(0);
        container.add([bg, ornaments, label]);
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });
        const btn = { container, bg, label, ornaments, width, height, primary };
        this.drawButtonBg(btn, false);
        container.on('pointerover', () => {
            if (this.isTransitioning || this.settingsModal)
                return;
            this.drawButtonBg(btn, true);
            label.setColor('#ffffff');
            ornaments.setAlpha(1);
            this.tweens.add({ targets: container, scale: 1.04, duration: 100, ease: 'Sine.easeOut' });
        });
        container.on('pointerout', () => {
            this.drawButtonBg(btn, false);
            label.setColor(primary ? '#e0f2fe' : '#cbd5e1');
            ornaments.setAlpha(0);
            this.tweens.add({ targets: container, scale: 1.0, duration: 100, ease: 'Sine.easeOut' });
        });
        container.on('pointerdown', () => {
            if (this.isTransitioning || this.settingsModal)
                return;
            onClick();
        });
        return btn;
    }
    drawButtonBg(btn, hovered) {
        const { bg, width, height, primary } = btn;
        const hw = width / 2;
        const hh = height / 2;
        bg.clear();
        const fillMain = primary
            ? (hovered ? 0x0e2d4d : 0x081a30)
            : (hovered ? 0x131d33 : 0x070b15);
        const borderOuter = 0x02040a;
        const borderMain = primary
            ? (hovered ? 0x7dd3fc : 0x38bdf8)
            : (hovered ? 0xc084fc : 0x334155);
        const gemColor = primary ? 0x7dd3fc : (hovered ? 0xe879f9 : 0x475569);
        // Zewnętrzna ciemna ramka RPG
        bg.fillStyle(borderOuter, 0.98);
        bg.fillRect(-hw - 3, -hh - 3, width + 6, height + 6);
        // Wewnętrzne wypełnienie
        bg.fillStyle(fillMain, 0.94);
        bg.fillRect(-hw, -hh, width, height);
        // Górny jasny refleks
        bg.fillStyle(0xffffff, hovered ? 0.16 : 0.06);
        bg.fillRect(-hw + 2, -hh + 2, width - 4, 3);
        // Dolny cień
        bg.fillStyle(0x000000, 0.35);
        bg.fillRect(-hw + 2, hh - 4, width - 4, 2);
        // Obramowanie główne
        bg.lineStyle(hovered ? 2 : 1, borderMain, hovered ? 1 : 0.85);
        bg.strokeRect(-hw, -hh, width, height);
        // Kryształowe nity w 4 rogach przycisku
        const cSz = 4;
        bg.fillStyle(gemColor, 1);
        bg.fillRect(-hw - 1, -hh - 1, cSz, cSz);
        bg.fillRect(hw - cSz + 1, -hh - 1, cSz, cSz);
        bg.fillRect(-hw - 1, hh - cSz + 1, cSz, cSz);
        bg.fillRect(hw - cSz + 1, hh - cSz + 1, cSz, cSz);
    }
    cleanupModalListeners() {
        if (this.modalKeyListener) {
            window.removeEventListener('keydown', this.modalKeyListener, true);
            this.modalKeyListener = null;
        }
        if (this.activeSliderMoveHandler) {
            this.input.off('pointermove', this.activeSliderMoveHandler);
            this.activeSliderMoveHandler = null;
        }
        if (this.activeSliderUpHandler) {
            this.input.off('pointerup', this.activeSliderUpHandler);
            this.activeSliderUpHandler = null;
        }
    }
    closeSettingsModal() {
        this.listeningKeyAction = null;
        this.cleanupModalListeners();
        if (this.settingsModal) {
            this.settingsModal.destroy();
            this.settingsModal = null;
        }
    }
    openSettingsModal(tab) {
        this.activeTab = tab;
        this.closeSettingsModal();
        const W = this.scale.width;
        const H = this.scale.height;
        const modal = this.add.container(W / 2, H / 2).setDepth(40);
        const backdrop = this.add.rectangle(0, 0, W * 2, H * 2, 0x000000, 0.80)
            .setInteractive();
        // Symetryczne wymiary panelu — nic nie jest ucięte
        const pw = 620;
        const ph = 460;
        const panel = this.add.graphics();
        // Ciemna zewnętrzna otoczka
        panel.fillStyle(0x010308, 0.98);
        panel.fillRect(-pw / 2 - 4, -ph / 2 - 4, pw + 8, ph + 8);
        // Tło panelu
        panel.fillStyle(0x050914, 0.98);
        panel.fillRect(-pw / 2, -ph / 2, pw, ph);
        // Pasek nagłówka
        panel.fillStyle(0x091428, 1);
        panel.fillRect(-pw / 2, -ph / 2, pw, 50);
        // Ramka
        panel.lineStyle(2, 0x38bdf8, 0.9);
        panel.strokeRect(-pw / 2, -ph / 2, pw, ph);
        panel.lineStyle(1, 0x1e293b, 1);
        panel.lineBetween(-pw / 2, -ph / 2 + 50, pw / 2, -ph / 2 + 50);
        // Nity w rogach okna
        panel.fillStyle(0x7dd3fc, 1);
        panel.fillRect(-pw / 2 - 2, -ph / 2 - 2, 6, 6);
        panel.fillRect(pw / 2 - 4, -ph / 2 - 2, 6, 6);
        panel.fillRect(-pw / 2 - 2, ph / 2 - 4, 6, 6);
        panel.fillRect(pw / 2 - 4, ph / 2 - 4, 6, 6);
        const header = this.add.text(-pw / 2 + 24, -ph / 2 + 25, 'USTAWIENIA', {
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#7dd3fc',
            letterSpacing: 4,
        }).setOrigin(0, 0.5);
        // Krzyżyk [✕] w prawym górnym rogu
        const closeX = pw / 2 - 26;
        const closeY = -ph / 2 + 25;
        const closeBg = this.add.graphics();
        const drawCloseBtn = (hover) => {
            closeBg.clear();
            closeBg.fillStyle(hover ? 0x7f1d1d : 0x0e172a, 1);
            closeBg.fillRect(closeX - 15, closeY - 15, 30, 30);
            closeBg.lineStyle(1, hover ? 0xf87171 : 0x334155, 1);
            closeBg.strokeRect(closeX - 15, closeY - 15, 30, 30);
        };
        drawCloseBtn(false);
        const closeTxt = this.add.text(closeX, closeY, '✕', {
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#e2e8f0',
        }).setOrigin(0.5, 0.5);
        const closeHit = this.add.rectangle(closeX, closeY, 34, 34, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        closeHit.on('pointerover', () => {
            drawCloseBtn(true);
            closeTxt.setColor('#ffffff');
        });
        closeHit.on('pointerout', () => {
            drawCloseBtn(false);
            closeTxt.setColor('#e2e8f0');
        });
        closeHit.on('pointerdown', () => this.closeSettingsModal());
        modal.add([backdrop, panel, header, closeBg, closeTxt, closeHit]);
        // 3 symetryczne zakładki: 3 * 176 + 2 * 12 = 552 -> po 34px marginesu z każdej strony!
        const tabs = [
            { id: 'sound', label: 'DŹWIĘK' },
            { id: 'controls', label: 'STEROWANIE' },
            { id: 'graphics', label: 'GRAFIKA' },
        ];
        const tabW = 176;
        const tabH = 36;
        const tabGap = 12;
        const tabStartX = -(tabW + tabGap);
        const tabY = -ph / 2 + 80;
        tabs.forEach((t, idx) => {
            const tx = tabStartX + idx * (tabW + tabGap);
            const isActive = this.activeTab === t.id;
            const tBg = this.add.graphics();
            tBg.fillStyle(isActive ? 0x0c2440 : 0x090e1a, 1);
            tBg.fillRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH);
            tBg.lineStyle(isActive ? 2 : 1, isActive ? 0x38bdf8 : 0x1e293b, 1);
            tBg.strokeRect(tx - tabW / 2, tabY - tabH / 2, tabW, tabH);
            const tTxt = this.add.text(tx, tabY, t.label, {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '14px',
                fontStyle: 'bold',
                color: isActive ? '#ffffff' : '#94a3b8',
                letterSpacing: 2,
            }).setOrigin(0.5, 0.5);
            const tHit = this.add.rectangle(tx, tabY, tabW, tabH, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            tHit.on('pointerdown', () => {
                if (this.activeTab !== t.id) {
                    this.openSettingsModal(t.id);
                }
            });
            modal.add([tBg, tTxt, tHit]);
        });
        const contentTopY = -ph / 2 + 136;
        // Płynny suwak (drag + click)
        const addSliderRow = (rowIdx, title, desc, initialVal, onChange) => {
            const ry = contentTopY + rowIdx * 72;
            const boxW = pw - 68;
            const rowBg = this.add.graphics();
            rowBg.fillStyle(0x080e1c, 0.92);
            rowBg.fillRect(-boxW / 2, ry - 26, boxW, 56);
            rowBg.lineStyle(1, 0x1e293b, 1);
            rowBg.strokeRect(-boxW / 2, ry - 26, boxW, 56);
            const tLabel = this.add.text(-boxW / 2 + 16, ry - 9, title, {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '15px',
                fontStyle: 'bold',
                color: '#e2e8f0',
            }).setOrigin(0, 0.5);
            const tDesc = this.add.text(-boxW / 2 + 16, ry + 11, desc, {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '11px',
                color: '#64748b',
            }).setOrigin(0, 0.5);
            const trackW = 152;
            const trackX = boxW / 2 - 218; // Lewa krawędź paska suwaka (16px luzu przed napisem 100%)
            const pctText = this.add.text(boxW / 2 - 16, ry, `${Math.round(initialVal * 100)}%`, {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#7dd3fc',
            }).setOrigin(1, 0.5);
            const sliderG = this.add.graphics();
            const drawSlider = (val) => {
                sliderG.clear();
                // Tło toru
                sliderG.fillStyle(0x0f172a, 1);
                sliderG.fillRect(trackX, ry - 5, trackW, 10);
                sliderG.lineStyle(1, 0x334155, 1);
                sliderG.strokeRect(trackX, ry - 5, trackW, 10);
                // Wypełnienie
                const fillW = Math.round(trackW * val);
                if (fillW > 0) {
                    sliderG.fillStyle(0x0284c7, 1);
                    sliderG.fillRect(trackX + 1, ry - 4, Math.max(0, fillW - 1), 8);
                    sliderG.fillStyle(0x38bdf8, 1);
                    sliderG.fillRect(trackX + 1, ry - 4, Math.max(0, fillW - 1), 3);
                }
                // Uchwyt suwaka
                const knobX = trackX + fillW;
                sliderG.fillStyle(0xe0f2fe, 1);
                sliderG.fillRect(knobX - 5, ry - 10, 10, 20);
                sliderG.lineStyle(1, 0x0284c7, 1);
                sliderG.strokeRect(knobX - 5, ry - 10, 10, 20);
            };
            drawSlider(initialVal);
            const updateFromPointer = (pointer) => {
                const localX = pointer.x - W / 2;
                const v = Phaser.Math.Clamp((localX - trackX) / trackW, 0, 1);
                drawSlider(v);
                pctText.setText(`${Math.round(v * 100)}%`);
                onChange(v);
            };
            const hit = this.add.rectangle(trackX + trackW / 2, ry, trackW + 20, 34, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerdown', (pointer) => {
                updateFromPointer(pointer);
                this.cleanupModalListeners();
                this.activeSliderMoveHandler = (p) => {
                    if (p.isDown)
                        updateFromPointer(p);
                };
                this.activeSliderUpHandler = () => {
                    this.cleanupModalListeners();
                };
                this.input.on('pointermove', this.activeSliderMoveHandler);
                this.input.on('pointerup', this.activeSliderUpHandler);
            });
            modal.add([rowBg, tLabel, tDesc, sliderG, pctText, hit]);
        };
        const addSwitchRow = (ry, title, desc, initialVal, onToggle) => {
            const boxW = pw - 68;
            const rowBg = this.add.graphics();
            rowBg.fillStyle(0x080e1c, 0.92);
            rowBg.fillRect(-boxW / 2, ry - 22, boxW, 46);
            rowBg.lineStyle(1, 0x1e293b, 1);
            rowBg.strokeRect(-boxW / 2, ry - 22, boxW, 46);
            const tLabel = this.add.text(-boxW / 2 + 16, ry - 7, title, {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#e2e8f0',
            }).setOrigin(0, 0.5);
            const tDesc = this.add.text(-boxW / 2 + 16, ry + 9, desc, {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '11px',
                color: '#64748b',
            }).setOrigin(0, 0.5);
            const swX = boxW / 2 - 48;
            const swG = this.add.graphics();
            const drawSwitch = (on) => {
                swG.clear();
                swG.fillStyle(on ? 0x0369a1 : 0x1e293b, 1);
                swG.fillRect(swX - 28, ry - 11, 56, 22);
                swG.lineStyle(1, on ? 0x7dd3fc : 0x475569, 1);
                swG.strokeRect(swX - 28, ry - 11, 56, 22);
                swG.fillStyle(on ? 0xe0f2fe : 0x94a3b8, 1);
                swG.fillRect(on ? swX + 4 : swX - 24, ry - 8, 20, 16);
            };
            drawSwitch(initialVal);
            let curr = initialVal;
            const hit = this.add.rectangle(swX, ry, 64, 30, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                curr = !curr;
                drawSwitch(curr);
                onToggle(curr);
            });
            modal.add([rowBg, tLabel, tDesc, swG, hit]);
        };
        if (this.activeTab === 'sound') {
            addSliderRow(0, 'Głośność główna', 'Ogólny poziom dźwięku w całej grze', this.optMasterVol, (v) => {
                this.optMasterVol = v;
                this.sound.volume = v;
                this.sound.mute = v <= 0.001;
                this.saveVal('delveria_vol_master', v.toFixed(2));
            });
            addSliderRow(1, 'Muzyka w tle', 'Głośność ścieżki dźwiękowej podczas gry', this.optMusicVol, (v) => {
                this.optMusicVol = v;
                this.saveVal('delveria_vol_music', v.toFixed(2));
            });
            addSliderRow(2, 'Efekty dźwiękowe (SFX)', 'Kopanie, walka, boss i interfejs', this.optSfxVol, (v) => {
                this.optSfxVol = v;
                this.saveVal('delveria_vol_sfx', v.toFixed(2));
            });
        }
        else if (this.activeTab === 'controls') {
            const actions = [
                { key: 'left', label: 'Ruch w lewo' },
                { key: 'right', label: 'Ruch w prawo' },
                { key: 'jump', label: 'Skok (lub SPACE)' },
                { key: 'inventory', label: 'Ekwipunek i crafting' },
                { key: 'drop', label: 'Wyrzucenie przedmiotu' },
                { key: 'music', label: 'Muzyka WŁ. / WYŁ.' },
            ];
            const boxW = pw - 68;
            const keyBtnLabels = {};
            const keyBtnDrawers = {};
            actions.forEach((act, idx) => {
                const ry = contentTopY - 6 + idx * 42;
                const rowBg = this.add.graphics();
                rowBg.fillStyle(0x080e1c, 0.9);
                rowBg.fillRect(-boxW / 2, ry - 17, boxW, 36);
                rowBg.lineStyle(1, 0x1e293b, 0.9);
                rowBg.strokeRect(-boxW / 2, ry - 17, boxW, 36);
                const lbl = this.add.text(-boxW / 2 + 16, ry, act.label, {
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: '14px',
                    color: '#e2e8f0',
                }).setOrigin(0, 0.5);
                const btnX = boxW / 2 - 74;
                const kBg = this.add.graphics();
                const drawK = (listening) => {
                    kBg.clear();
                    kBg.fillStyle(listening ? 0x0c4a6e : 0x0f172a, 1);
                    kBg.fillRect(btnX - 58, ry - 13, 116, 26);
                    kBg.lineStyle(1, listening ? 0xfacc15 : 0x38bdf8, 1);
                    kBg.strokeRect(btnX - 58, ry - 13, 116, 26);
                };
                drawK(false);
                const kTxt = this.add.text(btnX, ry, this.keybinds[act.key], {
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    fontStyle: 'bold',
                    color: '#7dd3fc',
                }).setOrigin(0.5, 0.5);
                keyBtnLabels[act.key] = kTxt;
                keyBtnDrawers[act.key] = drawK;
                const hit = this.add.rectangle(btnX, ry, 120, 30, 0x000000, 0)
                    .setInteractive({ useHandCursor: true });
                hit.on('pointerdown', () => {
                    // Reset poprzedniego nasłuchiwania
                    if (this.listeningKeyAction) {
                        keyBtnDrawers[this.listeningKeyAction]?.(false);
                        keyBtnLabels[this.listeningKeyAction]?.setText(this.keybinds[this.listeningKeyAction]);
                        keyBtnLabels[this.listeningKeyAction]?.setColor('#7dd3fc');
                    }
                    this.listeningKeyAction = act.key;
                    drawK(true);
                    kTxt.setText('NACIŚNIJ...');
                    kTxt.setColor('#fde047');
                    if (this.modalKeyListener) {
                        window.removeEventListener('keydown', this.modalKeyListener, true);
                    }
                    this.modalKeyListener = (ev) => {
                        ev.preventDefault();
                        ev.stopPropagation();
                        if (ev.key === 'Escape') {
                            drawK(false);
                            kTxt.setText(this.keybinds[act.key]);
                            kTxt.setColor('#7dd3fc');
                            this.listeningKeyAction = null;
                            window.removeEventListener('keydown', this.modalKeyListener, true);
                            this.modalKeyListener = null;
                            return;
                        }
                        const normalized = this.normalizeKeyCodeName(ev);
                        if (normalized) {
                            this.keybinds[act.key] = normalized;
                            this.saveVal('delveria_keybinds', JSON.stringify(this.keybinds));
                            drawK(false);
                            kTxt.setText(normalized);
                            kTxt.setColor('#7dd3fc');
                            this.listeningKeyAction = null;
                            window.removeEventListener('keydown', this.modalKeyListener, true);
                            this.modalKeyListener = null;
                        }
                    };
                    window.addEventListener('keydown', this.modalKeyListener, true);
                });
                modal.add([rowBg, lbl, kBg, kTxt, hit]);
            });
            // Przycisk "Przywróć domyślne" + info o myszce
            const footerY = ph / 2 - 36;
            const mouseInfo = this.add.text(-boxW / 2, footerY, 'LPM: Atak/Kopanie  •  PPM: Skrzynia  •  1-9: Pasek', {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '11px',
                color: '#64748b',
            }).setOrigin(0, 0.5);
            const rstX = boxW / 2 - 74;
            const rstBg = this.add.graphics();
            rstBg.fillStyle(0x11192b, 1);
            rstBg.fillRect(rstX - 66, footerY - 13, 132, 26);
            rstBg.lineStyle(1, 0x475569, 1);
            rstBg.strokeRect(rstX - 66, footerY - 13, 132, 26);
            const rstTxt = this.add.text(rstX, footerY, 'DOMYŚLNE', {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '12px',
                fontStyle: 'bold',
                color: '#cbd5e1',
            }).setOrigin(0.5, 0.5);
            const rstHit = this.add.rectangle(rstX, footerY, 134, 28, 0x000000, 0)
                .setInteractive({ useHandCursor: true });
            rstHit.on('pointerdown', () => {
                this.keybinds = { ...DEFAULT_KEYBINDS };
                this.saveVal('delveria_keybinds', JSON.stringify(this.keybinds));
                this.openSettingsModal('controls');
            });
            modal.add([mouseInfo, rstBg, rstTxt, rstHit]);
        }
        else if (this.activeTab === 'graphics') {
            const boxW = pw - 68;
            // 1. Sekcja FPS (bezpośredni wybór z listy: 30, 60, 120, 144, 240, 300, UNLIMITED)
            const fpsY = contentTopY + 8;
            const fpsBox = this.add.graphics();
            fpsBox.fillStyle(0x080e1c, 0.92);
            fpsBox.fillRect(-boxW / 2, fpsY - 30, boxW, 74);
            fpsBox.lineStyle(1, 0x1e293b, 1);
            fpsBox.strokeRect(-boxW / 2, fpsY - 30, boxW, 74);
            const fpsTitle = this.add.text(-boxW / 2 + 16, fpsY - 14, 'LIMIT KLATEK (FPS)', {
                fontFamily: 'Consolas, "Courier New", monospace',
                fontSize: '14px',
                fontStyle: 'bold',
                color: '#e2e8f0',
            }).setOrigin(0, 0.5);
            modal.add([fpsBox, fpsTitle]);
            const fpsOptions = [
                { val: '30', label: '30' },
                { val: '60', label: '60' },
                { val: '120', label: '120' },
                { val: '144', label: '144' },
                { val: '240', label: '240' },
                { val: '300', label: '300' },
                { val: 'unlimited', label: 'MAX' },
            ];
            const optW = 68;
            const optGap = 6;
            const totalOptW = fpsOptions.length * optW + (fpsOptions.length - 1) * optGap;
            const optStartX = -totalOptW / 2 + optW / 2;
            const optY = fpsY + 18;
            const fpsDrawers = [];
            fpsOptions.forEach((opt, i) => {
                const ox = optStartX + i * (optW + optGap);
                const oBg = this.add.graphics();
                const oTxt = this.add.text(ox, optY, opt.label, {
                    fontFamily: 'Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    fontStyle: 'bold',
                    color: '#cbd5e1',
                }).setOrigin(0.5, 0.5);
                const drawOpt = () => {
                    const sel = this.optFps === opt.val;
                    oBg.clear();
                    oBg.fillStyle(sel ? 0x0369a1 : 0x0f172a, 1);
                    oBg.fillRect(ox - optW / 2, optY - 13, optW, 26);
                    oBg.lineStyle(sel ? 2 : 1, sel ? 0x7dd3fc : 0x334155, 1);
                    oBg.strokeRect(ox - optW / 2, optY - 13, optW, 26);
                    oTxt.setColor(sel ? '#ffffff' : '#94a3b8');
                };
                drawOpt();
                fpsDrawers.push(drawOpt);
                const oHit = this.add.rectangle(ox, optY, optW, 28, 0x000000, 0)
                    .setInteractive({ useHandCursor: true });
                oHit.on('pointerdown', () => {
                    this.applyFps(opt.val);
                    fpsDrawers.forEach(fn => fn());
                });
                modal.add([oBg, oTxt, oHit]);
            });
            // 2. Suwak intensywności wstrząsów kamery (0% - 100%)
            addSliderRow(1.25, 'Wstrząsy kamery (Shake)', 'Siła drgań ekranu podczas walki z bossem', this.optShakeIntensity, (v) => {
                this.optShakeIntensity = v;
                this.saveVal('delveria_shake_val', v.toFixed(2));
            });
            // 3. Pełny ekran (Switch)
            addSwitchRow(contentTopY + 178, 'Pełny ekran', 'Przełącza okno gry w tryb pełnoekranowy', this.optFullscreen, (v) => {
                this.applyFullscreen(v);
            });
            // 4. Podpowiedzi klawiszy HUD (Switch)
            addSwitchRow(contentTopY + 236, 'Podpowiedzi klawiszy (HUD)', 'Pokazuje panel skrótów w prawym górnym rogu gry', this.optControlsHud, (v) => {
                this.optControlsHud = v;
                this.saveVal('delveria_controls_hud', v ? '1' : '0');
            });
        }
        this.settingsModal = modal;
    }
    normalizeKeyCodeName(ev) {
        if (ev.code === 'Space')
            return 'SPACE';
        if (ev.code === 'ShiftLeft' || ev.code === 'ShiftRight')
            return 'SHIFT';
        if (ev.code === 'ControlLeft' || ev.code === 'ControlRight')
            return 'CTRL';
        if (ev.code === 'ArrowUp')
            return 'UP';
        if (ev.code === 'ArrowDown')
            return 'DOWN';
        if (ev.code === 'ArrowLeft')
            return 'LEFT';
        if (ev.code === 'ArrowRight')
            return 'RIGHT';
        if (ev.code.startsWith('Key') && ev.code.length === 4) {
            return ev.code.slice(3).toUpperCase();
        }
        if (/^[a-zA-Z]$/.test(ev.key)) {
            return ev.key.toUpperCase();
        }
        return null;
    }
    drawVignette(W, H) {
        const g = this.vignetteOverlay;
        g.clear();
        g.fillStyle(0x02040a, 0.36);
        g.fillRect(0, 0, W, H);
    }
    buildCaveWorldTexture() {
        const KEY = MainMenuScene.BG_WORLD_TEX;
        if (this.textures.exists(KEY))
            return;
        const T = MainMenuScene.T;
        const cols = MainMenuScene.COLS;
        const rows = MainMenuScene.ROWS;
        const W = MainMenuScene.BG_W;
        const H = MainMenuScene.BG_H;
        const canvas = document.createElement('canvas');
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const getTileImg = (id) => {
            const key = `tile_${id}`;
            if (!this.textures.exists(key))
                return null;
            return this.textures.get(key).getSourceImage();
        };
        const drawTile = (id, c, r, darkenAlpha = 0) => {
            const img = getTileImg(id);
            if (img)
                ctx.drawImage(img, c * T, r * T, T, T);
            if (darkenAlpha > 0) {
                ctx.fillStyle = `rgba(2, 4, 12, ${darkenAlpha})`;
                ctx.fillRect(c * T, r * T, T, T);
            }
        };
        const hash = (x, y) => {
            const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
            return n - Math.floor(n);
        };
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const rnd = hash(c, r);
                const centerDist = Math.abs(c - cols * 0.5 + Math.sin(r * 0.28) * 1.8);
                const tunnelHalfW = r < 15 ? 4.5 : (r < 31 ? 6.2 : 8.0);
                const isFloor = r >= rows - 2;
                const isWall = centerDist > tunnelHalfW || isFloor;
                if (!isWall) {
                    const wallId = r < 16 ? 17 : 39;
                    drawTile(wallId, c, r, r < 16 ? 0.55 : 0.62);
                    continue;
                }
                let blockId = 2;
                if (r < 15) {
                    if (rnd > 0.93)
                        blockId = 7;
                    else if (rnd > 0.85)
                        blockId = 8;
                    else
                        blockId = 2;
                }
                else if (r < 31) {
                    if (rnd > 0.92)
                        blockId = 38;
                    else if (rnd > 0.84)
                        blockId = 10;
                    else if (rnd > 0.25)
                        blockId = 36;
                    else
                        blockId = 2;
                }
                else {
                    if (isFloor) {
                        blockId = (c >= 11 && c <= 16) ? 38 : (rnd > 0.7 ? 14 : 43);
                    }
                    else if (rnd > 0.90) {
                        blockId = 44;
                    }
                    else if (rnd > 0.78) {
                        blockId = 38;
                    }
                    else if (rnd > 0.40) {
                        blockId = 14;
                    }
                    else {
                        blockId = 43;
                    }
                }
                drawTile(blockId, c, r, 0.14);
            }
        }
        this.textures.addCanvas(KEY, canvas);
        this.textures.get(KEY)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    initLiveCrystalRenderer() {
        for (let i = 0; i < this.liveBits.length; i++) {
            this.liveBits[i] = Math.random() < 0.5 ? 0 : 1;
        }
        if (this.textures.exists(MainMenuScene.LIVE_CRYSTAL_TEX)) {
            this.textures.remove(MainMenuScene.LIVE_CRYSTAL_TEX);
        }
        this.liveTex = this.textures.createCanvas(MainMenuScene.LIVE_CRYSTAL_TEX, MainMenuScene.LIVE_SIZE, MainMenuScene.LIVE_SIZE);
        this.liveCtx = this.liveTex.getContext();
        this.liveGlowCanvas = document.createElement('canvas');
        this.liveGlowCanvas.width = Math.floor(MainMenuScene.LIVE_SIZE / 5);
        this.liveGlowCanvas.height = Math.floor(MainMenuScene.LIVE_SIZE / 5);
        this.liveGlowCtx = this.liveGlowCanvas.getContext('2d');
        this.crystalVerts = [];
        this.crystalTris = [];
        const addCrystalPillar = (ox, oy, oz, tz, tx, radius, bodyH, tipH, hueShift) => {
            const sides = 6;
            const baseIdx = this.crystalVerts.length;
            const cosZ = Math.cos(tz), sinZ = Math.sin(tz);
            const cosX = Math.cos(tx), sinX = Math.sin(tx);
            const pushV = (x, y, z) => {
                const y1 = y * cosX - z * sinX;
                const z1 = y * sinX + z * cosX;
                const x2 = x * cosZ - y1 * sinZ;
                const y2 = x * sinZ + y1 * cosZ;
                this.crystalVerts.push({ x: x2 + ox, y: y2 + oy, z: z1 + oz });
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
                const t1 = baseIdx + 2 + i, t2 = baseIdx + 2 + next;
                const b1 = baseIdx + 2 + sides + i, b2 = baseIdx + 2 + sides + next;
                const h = hueShift + i * 0.22;
                this.crystalTris.push({ a: topTip, b: t1, c: t2, hueShift: h });
                this.crystalTris.push({ a: t1, b: b1, c: t2, hueShift: h + 0.1 });
                this.crystalTris.push({ a: t2, b: b1, c: b2, hueShift: h + 0.1 });
                this.crystalTris.push({ a: botTip, b: b2, c: b1, hueShift: h + 0.2 });
            }
        };
        addCrystalPillar(0, 0.2, 0, 0.02, 0, 2.2, 2.8, 3.8, 0.0);
        addCrystalPillar(-3.0, 1.4, 0.5, -0.58, 0.16, 1.4, 1.8, 2.5, 0.9);
        addCrystalPillar(3.1, 1.1, -0.5, 0.54, -0.14, 1.5, 2.0, 2.7, 1.7);
        addCrystalPillar(-0.8, 2.6, 1.6, -0.24, 0.35, 1.0, 1.1, 1.5, 2.4);
    }
    renderLiveCrystal(time) {
        const COLS = MainMenuScene.LIVE_COLS;
        const ROWS = MainMenuScene.LIVE_ROWS;
        const CELL = MainMenuScene.LIVE_CELL;
        const SIZE = MainMenuScene.LIVE_SIZE;
        for (let k = 0; k < 20; k++) {
            const idx = (Math.random() * this.liveBits.length) | 0;
            this.liveBits[idx] = this.liveBits[idx] ^ 1;
        }
        this.liveZBuf.fill(-1e9);
        this.liveShadeBuf.fill(0);
        this.liveHueBuf.fill(0);
        const rotY = time * 0.00065;
        const tiltX = 0.34 + Math.sin(time * 0.0012) * 0.06;
        const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
        const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);
        const fov = 24.5, camDist = 17.5;
        const trans = new Array(this.crystalVerts.length);
        const projX = new Float32Array(this.crystalVerts.length);
        const projY = new Float32Array(this.crystalVerts.length);
        const camZ = new Float32Array(this.crystalVerts.length);
        for (let i = 0; i < this.crystalVerts.length; i++) {
            const v = this.crystalVerts[i];
            const rx = v.x * cosY - v.z * sinY;
            const rz1 = v.x * sinY + v.z * cosY;
            const ry = v.y * cosX - rz1 * sinX;
            const rz = v.y * sinX + rz1 * cosX;
            trans[i] = { x: rx, y: ry, z: rz };
            const persp = fov / Math.max(1.2, camDist - rz);
            projX[i] = COLS * 0.5 + rx * persp;
            projY[i] = ROWS * 0.54 + ry * persp;
            camZ[i] = rz;
        }
        const lx = -0.45, ly = -0.60, lz = 0.66;
        for (const tri of this.crystalTris) {
            const ax = projX[tri.a], ay = projY[tri.a], az = camZ[tri.a];
            const bx = projX[tri.b], by = projY[tri.b], bz = camZ[tri.b];
            const cx = projX[tri.c], cy = projY[tri.c], cz = camZ[tri.c];
            const va = trans[tri.a], vb = trans[tri.b], vc = trans[tri.c];
            const ux = vb.x - va.x, uy = vb.y - va.y, uz = vb.z - va.z;
            const wx = vc.x - va.x, wy = vc.y - va.y, wz = vc.z - va.z;
            let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
            const nLen = Math.hypot(nx, ny, nz) || 1;
            nx /= nLen;
            ny /= nLen;
            nz /= nLen;
            const fnz = Math.abs(nz), fnx = nz < 0 ? -nx : nx, fny = nz < 0 ? -ny : ny;
            const diff = Math.max(0, fnx * lx + fny * ly + fnz * lz);
            const spec = Math.pow(Math.max(0, fnz * 0.85 + diff * 0.35), 4) * 0.42;
            const shade = Phaser.Math.Clamp(0.38 + diff * 0.56 + spec, 0.34, 1.05);
            const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
            if (Math.abs(denom) < 1e-4)
                continue;
            const invD = 1 / denom;
            const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
            const maxX = Math.min(COLS - 1, Math.ceil(Math.max(ax, bx, cx)));
            const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
            const maxY = Math.min(ROWS - 1, Math.ceil(Math.max(ay, by, cy)));
            for (let py = minY; py <= maxY; py++) {
                for (let px = minX; px <= maxX; px++) {
                    const sx = px + 0.5, sy = py + 0.5;
                    const w1 = ((by - cy) * (sx - cx) + (cx - bx) * (sy - cy)) * invD;
                    const w2 = ((cy - ay) * (sx - cx) + (ax - cx) * (sy - cy)) * invD;
                    const w3 = 1 - w1 - w2;
                    if (w1 >= -0.02 && w2 >= -0.02 && w3 >= -0.02) {
                        const z = w1 * az + w2 * bz + w3 * cz;
                        const idx = py * COLS + px;
                        if (z > this.liveZBuf[idx]) {
                            this.liveZBuf[idx] = z;
                            this.liveShadeBuf[idx] = shade;
                            this.liveHueBuf[idx] = tri.hueShift + (w1 - w2) * 0.25;
                        }
                    }
                }
            }
        }
        const ctx = this.liveCtx;
        const gCtx = this.liveGlowCtx;
        const GW = this.liveGlowCanvas.width;
        const GH = this.liveGlowCanvas.height;
        ctx.clearRect(0, 0, SIZE, SIZE);
        gCtx.clearRect(0, 0, GW, GH);
        ctx.font = 'bold 7px Consolas, "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const scaleX = GW / SIZE;
        const scaleY = GH / SIZE;
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const idx = row * COLS + col;
                if (this.liveZBuf[idx] < -1e8)
                    continue;
                const shade = this.liveShadeBuf[idx];
                const hm = Phaser.Math.Clamp(0.5 + 0.5 * Math.sin(this.liveHueBuf[idx] * 2.6 + time * 0.0022), 0, 1);
                const br = 16 + hm * 214, bg = 195 - hm * 125, bb = 255 - hm * 25;
                const hi = Math.max(0, shade - 0.75) * 0.55;
                const r = Math.min(255, Math.round(br * shade + 165 * hi));
                const g = Math.min(255, Math.round(bg * shade + 225 * hi));
                const b = Math.min(255, Math.round(bb * shade + 255 * hi));
                const x = col * CELL + CELL * 0.5;
                const y = row * CELL + CELL * 0.5;
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillText(this.liveBits[idx] === 1 ? '1' : '0', x, y);
                if (shade > 0.58) {
                    gCtx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.28, shade * 0.22).toFixed(2)})`;
                    gCtx.fillRect(x * scaleX - 1, y * scaleY - 1, 2, 2);
                }
            }
        }
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35;
        ctx.drawImage(this.liveGlowCanvas, 0, 0, SIZE, SIZE);
        ctx.restore();
        this.liveTex.refresh();
    }
    /**
     * Epickie, rzeźbione pixel-artowe logo "DELVERIA" na siatce 9x12 z kryształowymi szeryfami,
     * 4-tonowym cieniowaniem, grubym obrysem i głębokim cieniem 3D.
     */
    buildEpicTitleTexture() {
        const KEY = MainMenuScene.TITLE_TEX;
        const GLYPHS = {
            D: [
                '######## ',
                '#########',
                '###   ###',
                '###    ##',
                '###    ##',
                '###    ##',
                '###    ##',
                '###    ##',
                '###    ##',
                '###   ###',
                '#########',
                '######## ',
            ],
            E: [
                '#########',
                '#########',
                '###      ',
                '###      ',
                '#######  ',
                '#######  ',
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '#########',
                '#########',
            ],
            L: [
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '###      ',
                '#########',
                '#########',
            ],
            V: [
                '###   ###',
                '###   ###',
                '###   ###',
                '###   ###',
                '###   ###',
                ' ### ### ',
                ' ### ### ',
                '  #####  ',
                '  #####  ',
                '   ###   ',
                '   ###   ',
                '    #    ',
            ],
            R: [
                '######## ',
                '#########',
                '###   ###',
                '###   ###',
                '######## ',
                '#######  ',
                '###  ### ',
                '###   ###',
                '###   ###',
                '###   ###',
                '###   ###',
                '###   ###',
            ],
            I: [
                '#########',
                '#########',
                '   ###   ',
                '   ###   ',
                '   ###   ',
                '   ###   ',
                '   ###   ',
                '   ###   ',
                '   ###   ',
                '   ###   ',
                '#########',
                '#########',
            ],
            A: [
                '    #    ',
                '   ###   ',
                '  #####  ',
                ' ### ### ',
                '###   ###',
                '#########',
                '#########',
                '###   ###',
                '###   ###',
                '###   ###',
                '###   ###',
                '###   ###',
            ],
        };
        const WORD = ['D', 'E', 'L', 'V', 'E', 'R', 'I', 'A'];
        const GW = 9, GH = 12, GAP = 2, BORDER = 2, SHADOW_Y = 3, SCALE = 5;
        const totalW = WORD.length * GW + (WORD.length - 1) * GAP + BORDER * 2;
        const totalH = GH + BORDER * 2 + SHADOW_Y;
        const canvas = document.createElement('canvas');
        canvas.width = totalW * SCALE;
        canvas.height = totalH * SCALE;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const dot = (x, y, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
        };
        const px = (li, gx, gy) => {
            const g = GLYPHS[WORD[li]];
            return !!(g && gy >= 0 && gy < GH && gx >= 0 && gx < GW && g[gy][gx] === '#');
        };
        // 1. Głęboki cień 3D (przesunięty o +1 w prawo i +SHADOW_Y w dół)
        for (let li = 0; li < WORD.length; li++) {
            const bx = BORDER + li * (GW + GAP);
            for (let gy = -BORDER; gy < GH + BORDER + SHADOW_Y; gy++) {
                for (let gx = -BORDER; gx < GW + BORDER + 1; gx++) {
                    let hit = false;
                    for (let dy = -BORDER; dy <= BORDER && !hit; dy++) {
                        for (let dx = -BORDER; dx <= BORDER && !hit; dx++) {
                            if (px(li, gx - 1 + dx, gy - SHADOW_Y + dy))
                                hit = true;
                        }
                    }
                    if (hit)
                        dot(bx + gx, BORDER + gy, '#090218');
                }
            }
        }
        // 2. Gruby czarny obrys 8-kierunkowy
        for (let li = 0; li < WORD.length; li++) {
            const bx = BORDER + li * (GW + GAP);
            for (let gy = -BORDER; gy < GH + BORDER; gy++) {
                for (let gx = -BORDER; gx < GW + BORDER; gx++) {
                    if (px(li, gx, gy))
                        continue;
                    let outline = false;
                    for (let dy = -BORDER; dy <= BORDER && !outline; dy++) {
                        for (let dx = -BORDER; dx <= BORDER && !outline; dx++) {
                            if (px(li, gx + dx, gy + dy))
                                outline = true;
                        }
                    }
                    if (outline)
                        dot(bx + gx, BORDER + gy, '#02040a');
                }
            }
        }
        // 3. Kryształowo-metaliczne 4-tonowe cieniowanie liter + górny lodowy połysk
        for (let li = 0; li < WORD.length; li++) {
            const bx = BORDER + li * (GW + GAP);
            for (let gy = 0; gy < GH; gy++) {
                let col = '#38bdf8';
                if (gy <= 1)
                    col = '#f0fdff'; // ostry lodowy błysk
                else if (gy <= 3)
                    col = '#7dd3fc'; // jasny cyjan
                else if (gy <= 6)
                    col = '#0ea5e9'; // nasycony błękit
                else if (gy <= 9)
                    col = '#6366f1'; // indygo
                else
                    col = '#a855f7'; // ametystowy spód
                for (let gx = 0; gx < GW; gx++) {
                    if (px(li, gx, gy)) {
                        // Skośny błysk pryzmatyczny biegnący przez środek liter
                        const bevel = !px(li, gx, gy - 1) && gy > 0 ? '#e0f2fe' : col;
                        dot(bx + gx, BORDER + gy, bevel);
                    }
                }
            }
        }
        // Zachowujemy bazowy canvas, żeby zrobić na nim płynne podświetlenie od lewej do prawej
        this.titleBaseCanvas = canvas;
        if (this.textures.exists(KEY)) {
            this.textures.remove(KEY);
        }
        this.titleDynamicTex = this.textures.createCanvas(KEY, canvas.width, canvas.height);
        this.titleDynamicTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.titleDynamicTex.getContext().drawImage(canvas, 0, 0);
        this.titleDynamicTex.refresh();
    }
    /**
     * Przesuwa świetlisty błysk po samych pikselach liter "DELVERIA" od lewej do prawej.
     */
    renderTitleShimmer(progress) {
        if (!this.titleDynamicTex || !this.titleBaseCanvas)
            return;
        const ctx = this.titleDynamicTex.getContext();
        const w = this.titleBaseCanvas.width;
        const h = this.titleBaseCanvas.height;
        ctx.globalCompositeOperation = 'source-over';
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(this.titleBaseCanvas, 0, 0);
        if (progress >= -0.25 && progress <= 1.25) {
            const cx = progress * w;
            const bandW = w * 0.18;
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            const grad = ctx.createLinearGradient(cx - bandW, 0, cx + bandW, 0);
            grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
            grad.addColorStop(0.45, 'rgba(186, 246, 255, 0.78)');
            grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
            grad.addColorStop(0.55, 'rgba(186, 246, 255, 0.78)');
            grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }
        this.titleDynamicTex.refresh();
    }
}
