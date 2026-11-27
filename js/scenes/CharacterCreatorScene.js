import { DEFAULT_CHARACTER_CONFIG, loadSavedCharacterConfig, setActiveCharacterConfig } from '../types/CharacterConfig.js';
import { CharacterRenderer } from '../textures/CharacterRenderer.js';
import { renderBinaryCrystalFrame } from '../textures/BinaryCrystal3D.js';
import { BlockId } from '../types/index.js';
const EYE_COLORS = [
    '#38bdf8', '#2563eb', '#22c55e', '#78350f',
    '#d97706', '#94a3b8', '#a855f7', '#ef4444'
];
const HAIR_COLORS = [
    '#111827', '#3b2416', '#784421', '#eab308', '#ea580c',
    '#e2e8f0', '#2563eb', '#ec4899', '#9333ea', '#16a34a'
];
const OUTFIT_COLORS = [
    '#1e293b', '#2563eb', '#dc2626', '#16a34a', '#9333ea',
    '#d97706', '#0891b2', '#f8fafc', '#5c3a21', '#be185d'
];
export class CharacterCreatorScene extends Phaser.Scene {
    config;
    activeTab = 'body';
    previewMode = 'idle';
    previewFacingLeft = false;
    previewSprite;
    pedestalGraphics;
    bgGraphics;
    caveBgImage;
    binaryLogoImage;
    titleLogoImage;
    stars = [];
    motes = [];
    uiRoot = null;
    nameModal = null;
    isTransitioning = false;
    worldId;
    worldName;
    introBackdrop;
    introShade;
    introFog;
    undergroundLayer;
    loadingBadge = null;
    loadingTimer;
    menuBgY = 0;
    menuBgScale = 0;
    constructor() {
        super('CharacterCreatorScene');
    }
    create(data) {
        this.worldId = data?.worldId;
        this.worldName = data?.worldName;
        this.menuBgY = data?.menuBgY ?? -this.scale.height;
        this.menuBgScale = data?.menuBgScale ?? 0;
        this.introBackdrop = undefined;
        this.introShade = undefined;
        this.introFog = undefined;
        this.undergroundLayer = undefined;
        this.isTransitioning = false;
        this.motes = [];
        this.stars = [];
        this.config = { ...DEFAULT_CHARACTER_CONFIG, ...loadSavedCharacterConfig() };
        const controlsPill = document.querySelector('.controls-pill');
        if (controlsPill)
            controlsPill.style.display = 'none';
        CharacterRenderer.renderPlayerTextures(this, this.config);
        // 1. Jaskinia z menu — ta sama tekstura i ten sam kadr, żeby tło było ciągłe
        this.bgGraphics = this.add.graphics();
        this.bgGraphics.setDepth(1);
        if (this.textures.exists('__delveria_menu_real_cave__')) {
            this.caveBgImage = this.add.image(0, 0, '__delveria_menu_real_cave__');
            this.caveBgImage.setOrigin(0.5, 0);
            this.caveBgImage.setAlpha(1);
            this.caveBgImage.setDepth(0);
        }
        // Drifting cyan crystal motes
        for (let i = 0; i < 35; i++) {
            const rect = this.add.rectangle(Math.random() * this.scale.width, Math.random() * this.scale.height, Math.random() < 0.5 ? 2 : 3, Math.random() < 0.5 ? 2 : 3, 0x38bdf8, 0.25 + Math.random() * 0.4);
            rect.setDepth(2);
            this.motes.push({
                rect,
                vy: 14 + Math.random() * 22,
                phase: Math.random() * Math.PI * 2
            });
        }
        for (let i = 0; i < 55; i++) {
            this.stars.push({
                x: Math.random(),
                y: Math.random(),
                r: Math.random() < 0.7 ? 1 : 2,
                phase: Math.random() * Math.PI * 2
            });
        }
        // 2. Binary 0/1 Crystal Logo behind the character + Sculpted Delveria Title at top
        const binaryKey = this.textures.exists('__delveria_menu_live_01_crystal_lg__')
            ? '__delveria_menu_live_01_crystal_lg__'
            : (this.textures.exists('__delveria_binary_crystal__') ? '__delveria_binary_crystal__' : null);
        if (binaryKey) {
            this.binaryLogoImage = this.add.image(0, 0, binaryKey);
            this.binaryLogoImage.setAlpha(0.55);
            this.binaryLogoImage.setDepth(3);
            this.tweens.add({
                targets: this.binaryLogoImage,
                alpha: { from: 0.45, to: 0.68 },
                duration: 2400,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
        if (this.textures.exists('__delveria_epic_title_v5__')) {
            this.titleLogoImage = this.add.image(0, 0, '__delveria_epic_title_v5__');
            this.titleLogoImage.setDepth(4);
        }
        // 3. Pedestal & Halo under character
        this.pedestalGraphics = this.add.graphics();
        this.pedestalGraphics.setDepth(5);
        // 4. Live 6x Zoomed Pixel-Art Character Preview
        this.previewSprite = this.add.sprite(0, 0, 'player_idle');
        this.previewSprite.setScale(6);
        this.previewSprite.setDepth(10);
        this.layoutPreview();
        this.updatePreviewAnimation();
        this.scale.on('resize', () => {
            if (this.scene.isActive()) {
                this.layoutPreview();
            }
        });
        // 5. Build HUD-matched HTML/CSS Creator Panel on the right
        this.buildCreatorDOM();
        // 6. Płynny wjazd: kamera startuje na kadrze jaskini z menu i podjeżdża do kreatora
        this.playIntro();
        this.events.once('shutdown', () => {
            this.cleanupDOM();
        });
    }
    /**
     * Wjazd kamery z menu do scenki kreatora — bez cięcia i bez czerni.
     * Kamera startuje o wysokość ekranu niżej, na tym samym kadrze jaskini co menu,
     * i jedzie w górę — tak samo, jak później wynurzenie na powierzchnię świata.
     */
    playIntro() {
        const W = this.scale.width;
        const H = this.scale.height;
        const cam = this.cameras.main;
        const menuScale = this.menuBgScale > 0 ? this.menuBgScale : 1;
        // Nakładka z menu (przyciemnienie, kryształ, tytuł) pod scenką kreatora — tyle tylko,
        // ile trzeba, żeby pierwsza klatka była tą samą, którą gracz widział przed animacją.
        const backdrop = this.add.container(0, H).setDepth(1.5);
        backdrop.add(this.add.rectangle(W / 2, H / 2, W, H, 0x02040a, 0.36));
        if (this.textures.exists('__delveria_menu_real_cave__')
            && this.textures.exists('__delveria_menu_live_01_crystal_lg__')) {
            const cave = this.textures.get('__delveria_menu_real_cave__').getSourceImage();
            const groundY = this.menuBgY + cave.height * menuScale - 24 * 1.6 * menuScale;
            const crystal = this.add.image(W / 2, groundY, '__delveria_menu_live_01_crystal_lg__');
            crystal.setOrigin(0.5, 1);
            crystal.setScale(Math.max(0.95, menuScale * 0.48));
            crystal.setBlendMode(Phaser.BlendModes.ADD);
            backdrop.add(crystal);
        }
        if (this.textures.exists('__delveria_epic_title_v5__')) {
            const title = this.add.image(W / 2, H * 0.21, '__delveria_epic_title_v5__');
            const texW = title.texture.getSourceImage().width || 500;
            title.setScale(Math.min(1, (W * 0.78) / texW));
            backdrop.add(title);
        }
        this.introBackdrop = backdrop;
        // Ta sama zasłona co na kadrze menu — dzięki temu styk obu kadrów jest niewidoczny
        this.introShade = this.add.rectangle(W / 2, H / 2, W, H, 0x02040a, 0.36).setDepth(0.8);
        // Miękki pas mroku na styku kadrów — warstwy skały nie łamią się w ostrą linię
        const fog = this.add.graphics().setDepth(2);
        fog.fillGradientStyle(0x04060e, 0x04060e, 0x04060e, 0x04060e, 0, 0, 0.7, 0.7);
        fog.fillRect(0, H - 130, W, 130);
        fog.fillGradientStyle(0x04060e, 0x04060e, 0x04060e, 0x04060e, 0.7, 0.7, 0, 0);
        fog.fillRect(0, H, W, 130);
        fog.setAlpha(0);
        this.introFog = fog;
        this.tweens.add({ targets: fog, alpha: 1, duration: 260, ease: 'Sine.easeOut' });
        // Własny, ciemniejszy klimat komnaty wjeżdża dopiero po dojechaniu kamery
        this.bgGraphics.setAlpha(0);
        // Kamera o ekran niżej: widzi dokładnie to, co menu w chwili kliknięcia
        cam.scrollY = H;
        if (this.uiRoot) {
            this.uiRoot.style.opacity = '0';
            this.uiRoot.style.pointerEvents = 'none';
            this.uiRoot.style.transition = 'opacity 0.32s ease';
        }
        const logo = this.binaryLogoImage;
        const title = this.titleLogoImage;
        const pedestal = this.pedestalGraphics;
        const sprite = this.previewSprite;
        // Pulsowanie logo przejmuje animacja wejścia i wraca po jej zakończeniu
        if (logo)
            this.tweens.killTweensOf(logo);
        [logo, title, pedestal, sprite].forEach((obj) => obj?.setAlpha(0));
        this.tweens.add({
            targets: cam,
            scrollY: 0,
            duration: 1150,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                // Kamera dojechała: nakładka z menu znika dopiero teraz, żeby nigdy nie mignęła pustka
                this.introBackdrop?.destroy(true);
                this.introBackdrop = undefined;
                cam.scrollY = 0;
                if (this.introShade) {
                    const shade = this.introShade;
                    const fog = this.introFog;
                    this.introShade = undefined;
                    this.introFog = undefined;
                    this.tweens.add({
                        targets: fog ? [shade, fog] : shade,
                        alpha: 0,
                        duration: 420,
                        ease: 'Sine.easeOut',
                        onComplete: () => {
                            shade.destroy();
                            fog?.destroy();
                        }
                    });
                }
                if (logo) {
                    this.tweens.add({
                        targets: logo,
                        alpha: { from: 0.45, to: 0.68 },
                        duration: 2400,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                }
            }
        });
        this.tweens.add({ targets: this.bgGraphics, alpha: 1, duration: 460, delay: 690, ease: 'Sine.easeInOut' });
        if (logo)
            this.tweens.add({ targets: logo, alpha: 0.55, duration: 620, delay: 220, ease: 'Sine.easeOut' });
        if (title)
            this.tweens.add({ targets: title, alpha: 1, duration: 620, delay: 220, ease: 'Sine.easeOut' });
        if (pedestal)
            this.tweens.add({ targets: pedestal, alpha: 1, duration: 620, delay: 320, ease: 'Sine.easeOut' });
        if (sprite)
            this.tweens.add({ targets: sprite, alpha: 1, duration: 620, delay: 320, ease: 'Sine.easeOut' });
        // HUD pojawia się dopiero, gdy kamera dojeżdża do scenki kreatora
        this.time.delayedCall(1020, () => {
            if (this.uiRoot) {
                this.uiRoot.style.pointerEvents = '';
                this.uiRoot.style.opacity = '1';
            }
        });
    }
    update(time, delta) {
        if (!this.bgGraphics || !this.scene.isActive())
            return;
        const W = this.scale.width;
        const H = this.scale.height;
        const dt = Math.min(delta, 50) / 1000;
        this.bgGraphics.clear();
        this.bgGraphics.fillGradientStyle(0x050810, 0x050810, 0x0c1528, 0x0c1528, 0.72, 0.72, 0.52, 0.52);
        this.bgGraphics.fillRect(0, 0, W, H);
        for (const s of this.stars) {
            const a = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(time * 0.002 + s.phase));
            this.bgGraphics.fillStyle(0x7dd3fc, a);
            this.bgGraphics.fillRect(Math.floor(s.x * W), Math.floor(s.y * H), s.r, s.r);
        }
        for (const m of this.motes) {
            m.rect.y -= m.vy * dt;
            m.rect.x += Math.sin(time * 0.0018 + m.phase) * 10 * dt;
            if (m.rect.y < -8) {
                m.rect.y = H + 8;
                m.rect.x = Math.random() * W;
            }
        }
        this.animatePreview(time);
    }
    /** Ożywia podgląd postaci: oddech w postoju i unoszenie w skoku (piksele bez rozmycia). */
    animatePreview(time) {
        if (!this.previewSprite)
            return;
        const baseY = this.getStageCenter().y;
        if (this.previewMode === 'walk') {
            this.previewSprite.y = baseY;
            return;
        }
        if (this.previewMode === 'jump') {
            // Skok: unoszenie + przebieranie nogami w powietrzu
            this.previewSprite.y = baseY - 8 + Math.sin(time * 0.006) * 5;
            const frame = Math.floor(time / 180) % 2 === 0 ? 'player_jump' : 'player_walk_1';
            if (this.textures.exists(frame) && this.previewSprite.texture.key !== frame) {
                this.previewSprite.setTexture(frame);
            }
            return;
        }
        // Postój: spokojne oddychanie (unoszenie klatki o 2 px w górę i w dół)
        if (this.previewSprite.texture.key !== 'player_idle' && this.textures.exists('player_idle')) {
            this.previewSprite.setTexture('player_idle');
        }
        this.previewSprite.y = baseY + Math.sin(time * 0.0016) * 3;
    }
    getStageCenter() {
        const W = this.scale.width;
        const H = this.scale.height;
        const panelSpace = W > 820 ? 440 : 0;
        const stageX = Math.max(150, (W - panelSpace) / 2);
        const stageY = H * 0.52;
        return { x: stageX, y: stageY };
    }
    layoutPreview() {
        const W = this.scale.width;
        const H = this.scale.height;
        const { x, y } = this.getStageCenter();
        this.previewSprite.setPosition(x, y);
        if (this.caveBgImage) {
            const tex = this.caveBgImage.texture.getSourceImage();
            let scale = this.menuBgScale;
            if ((!scale || scale <= 0) && tex && tex.width > 0 && tex.height > 0) {
                scale = Math.max(W / tex.width, H / tex.height);
            }
            this.caveBgImage.setScale(scale || 1);
            this.caveBgImage.setPosition(W / 2, Math.min(H + this.menuBgY, -24));
        }
        if (this.binaryLogoImage) {
            this.binaryLogoImage.setPosition(x, y - 10);
            const tex = this.binaryLogoImage.texture.getSourceImage();
            if (tex && tex.width > 0) {
                const targetH = Math.min(340, H * 0.5);
                this.binaryLogoImage.setScale(targetH / tex.height);
            }
        }
        if (this.titleLogoImage) {
            this.titleLogoImage.setPosition(x, Math.max(58, y - 210));
            const tex = this.titleLogoImage.texture.getSourceImage();
            if (tex && tex.width > 0) {
                const maxW = Math.min(360, (W - 460) * 0.85);
                this.titleLogoImage.setScale(Math.max(0.35, maxW / tex.width));
            }
        }
        this.pedestalGraphics.clear();
        // Soft cyan arcane aura behind character
        this.pedestalGraphics.fillStyle(0x0284c7, 0.16);
        this.pedestalGraphics.fillCircle(x, y, 128);
        this.pedestalGraphics.fillStyle(0x38bdf8, 0.10);
        this.pedestalGraphics.fillCircle(x, y, 86);
        // Stone pedestal beneath character feet
        const footY = y + 126;
        this.pedestalGraphics.fillStyle(0x162238, 1);
        this.pedestalGraphics.fillRoundedRect(x - 94, footY, 188, 22, 5);
        this.pedestalGraphics.lineStyle(2, 0x38bdf8, 0.7);
        this.pedestalGraphics.strokeRoundedRect(x - 94, footY, 188, 22, 5);
        this.pedestalGraphics.fillStyle(0x09101d, 1);
        this.pedestalGraphics.fillRect(x - 76, footY + 22, 152, 12);
        const previewBar = this.uiRoot?.querySelector('.cc-preview-bar');
        if (previewBar) {
            previewBar.style.left = `${x}px`;
            previewBar.style.transform = 'translateX(-50%)';
        }
    }
    refreshCharacter() {
        CharacterRenderer.renderPlayerTextures(this, this.config);
        this.updatePreviewAnimation();
    }
    updatePreviewAnimation() {
        this.previewSprite.setFlipX(this.previewFacingLeft);
        if (this.previewMode === 'walk') {
            this.previewSprite.play('player_walk', true);
        }
        else if (this.previewMode === 'jump') {
            this.previewSprite.stop();
            this.previewSprite.setTexture('player_jump');
        }
        else {
            this.previewSprite.stop();
            this.previewSprite.setTexture('player_idle');
        }
    }
    randomizeCharacter() {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        this.config.skinTone = Math.floor(Math.random() * 101);
        this.config.weight = Math.floor(Math.random() * 101);
        this.config.expression = pick(['smile', 'neutral', 'smirk', 'fierce', 'surprised']);
        this.config.eyeColor = pick(EYE_COLORS);
        this.config.facialDetail = pick(['none', 'none', 'beard', 'mustache', 'bandage', 'scar', 'blush']);
        this.config.hairStyle = pick([
            'fluffy', 'buzz', 'short_straight', 'short_curly', 'long_straight', 'long_curly', 'mohawk', 'ponytail', 'bald'
        ]);
        this.config.hairColor = pick(HAIR_COLORS);
        this.config.topStyle = pick(['tshirt', 'hoodie', 'vest', 'coat']);
        this.config.topColor = pick(OUTFIT_COLORS);
        this.config.bottomStyle = pick(['pants', 'shorts', 'cargo', 'skirt']);
        this.config.bottomColor = pick(OUTFIT_COLORS);
        this.config.shoesStyle = pick(['sneakers', 'boots', 'sandals']);
        this.config.shoesColor = pick(OUTFIT_COLORS);
        this.config.hatStyle = pick(['none', 'none', 'cap', 'beanie', 'fedora', 'helmet', 'crown']);
        this.config.maskStyle = pick(['none', 'none', 'none', 'ninja', 'cyber', 'bandana', 'sunglasses']);
        this.config.accessoryStyle = pick(['none', 'backpack', 'cape', 'scarf', 'chain']);
        this.refreshCharacter();
        this.renderTabContent();
    }
    buildCreatorDOM() {
        this.cleanupDOM();
        const overlay = document.getElementById('ui-overlay');
        if (!overlay)
            return;
        overlay.style.display = '';
        const root = document.createElement('div');
        root.className = 'cc-root';
        root.innerHTML = `
      <div class="cc-preview-bar">
        <button class="cc-btn" data-anim="idle">Postój</button>
        <button class="cc-btn" data-anim="walk">Chód</button>
        <button class="cc-btn" data-anim="jump">Skok</button>
        <button class="cc-btn" data-action="flip">Obrót</button>
        <button class="cc-btn" data-action="random">Losuj</button>
      </div>
      <div class="cc-panel">
        <div class="cc-corner cc-tl"></div>
        <div class="cc-corner cc-tr"></div>
        <div class="cc-corner cc-bl"></div>
        <div class="cc-corner cc-br"></div>
        <div class="cc-header">
          <span class="cc-title">Kreator Postaci</span>
          <span class="cc-badge">DELVERIA</span>
        </div>
        <div class="cc-tabs">
          <button class="cc-tab active" data-tab="body">Sylwetka</button>
          <button class="cc-tab" data-tab="face">Twarz</button>
          <button class="cc-tab" data-tab="hair">Włosy</button>
          <button class="cc-tab" data-tab="outfit">Ubiór</button>
          <button class="cc-tab" data-tab="accessories">Dodatki</button>
        </div>
        <div class="cc-body" id="cc-tab-body"></div>
        <div class="cc-footer">
          <button class="cc-next-btn" id="cc-btn-next">Dalej &rarr;</button>
        </div>
      </div>
    `;
        overlay.appendChild(root);
        this.uiRoot = root;
        root.querySelectorAll('[data-anim]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.previewMode = btn.dataset.anim;
                this.updatePreviewAnimation();
            });
        });
        root.querySelector('[data-action="flip"]')?.addEventListener('click', () => {
            this.previewFacingLeft = !this.previewFacingLeft;
            this.updatePreviewAnimation();
        });
        root.querySelector('[data-action="random"]')?.addEventListener('click', () => {
            this.randomizeCharacter();
        });
        root.querySelectorAll('.cc-tab').forEach((tabBtn) => {
            tabBtn.addEventListener('click', () => {
                root.querySelectorAll('.cc-tab').forEach(t => t.classList.remove('active'));
                tabBtn.classList.add('active');
                this.activeTab = tabBtn.dataset.tab;
                this.renderTabContent();
            });
        });
        root.querySelector('#cc-btn-next')?.addEventListener('click', () => {
            this.openNameModal();
        });
        this.layoutPreview();
        this.renderTabContent();
    }
    /**
     * Draws a crisp 16x16 pixel-art icon for hats, masks, and accessories.
     */
    createAccessoryIconCanvas(kind, id) {
        const c = document.createElement('canvas');
        c.width = 16;
        c.height = 16;
        c.className = 'cc-item-icon';
        const ctx = c.getContext('2d');
        if (!ctx)
            return c;
        ctx.imageSmoothingEnabled = false;
        if (id === 'none') {
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(8, 8, 5, 0, Math.PI * 2);
            ctx.moveTo(4.5, 11.5);
            ctx.lineTo(11.5, 4.5);
            ctx.stroke();
            return c;
        }
        if (kind === 'hat') {
            if (id === 'cap') {
                ctx.fillStyle = '#1d4ed8';
                ctx.fillRect(3, 6, 9, 5);
                ctx.fillStyle = '#3b82f6';
                ctx.fillRect(4, 7, 7, 3);
                ctx.fillStyle = '#1e3a8a';
                ctx.fillRect(7, 10, 8, 2); // brim
            }
            else if (id === 'beanie') {
                ctx.fillStyle = '#b91c1c';
                ctx.fillRect(3, 5, 10, 6);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(4, 6, 8, 3);
                ctx.fillStyle = '#991b1b';
                ctx.fillRect(3, 10, 10, 3); // cuff
            }
            else if (id === 'fedora') {
                ctx.fillStyle = '#452712';
                ctx.fillRect(1, 10, 14, 2);
                ctx.fillStyle = '#784421';
                ctx.fillRect(4, 5, 8, 5);
                ctx.fillStyle = '#d97706';
                ctx.fillRect(4, 9, 8, 1);
            }
            else if (id === 'helmet') {
                ctx.fillStyle = '#475569';
                ctx.fillRect(3, 3, 10, 11);
                ctx.fillStyle = '#94a3b8';
                ctx.fillRect(4, 4, 8, 4);
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(5, 8, 7, 3);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(8, 9, 3, 1);
            }
            else if (id === 'crown') {
                ctx.fillStyle = '#eab308';
                ctx.fillRect(2, 8, 12, 4);
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(2, 5, 2, 3);
                ctx.fillRect(7, 4, 2, 4);
                ctx.fillRect(12, 5, 2, 3);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(7, 9, 2, 2);
            }
        }
        else if (kind === 'mask') {
            if (id === 'ninja') {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(2, 5, 12, 7);
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(3, 6, 10, 3);
                ctx.fillStyle = '#334155';
                ctx.fillRect(12, 6, 3, 2); // tie tail
            }
            else if (id === 'cyber') {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(2, 5, 12, 6);
                ctx.fillStyle = '#00e5ff';
                ctx.fillRect(3, 7, 10, 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(9, 7, 3, 1);
            }
            else if (id === 'bandana') {
                ctx.fillStyle = '#991b1b';
                ctx.beginPath();
                ctx.moveTo(2, 5);
                ctx.lineTo(14, 5);
                ctx.lineTo(8, 13);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(4, 6, 8, 3);
                ctx.fillStyle = '#fca5a5';
                ctx.fillRect(7, 8, 2, 1);
            }
            else if (id === 'sunglasses') {
                ctx.fillStyle = '#090d16';
                ctx.fillRect(2, 6, 5, 4);
                ctx.fillRect(9, 6, 5, 4);
                ctx.fillRect(7, 7, 2, 1);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(3, 7, 2, 1);
                ctx.fillRect(10, 7, 2, 1);
            }
        }
        else if (kind === 'accessory') {
            if (id === 'backpack') {
                ctx.fillStyle = '#452712';
                ctx.fillRect(3, 3, 10, 11);
                ctx.fillStyle = '#784421';
                ctx.fillRect(4, 4, 8, 9);
                ctx.fillStyle = '#eab308';
                ctx.fillRect(6, 7, 4, 2);
            }
            else if (id === 'cape') {
                ctx.fillStyle = '#7f1d1d';
                ctx.beginPath();
                ctx.moveTo(5, 2);
                ctx.lineTo(11, 2);
                ctx.lineTo(14, 14);
                ctx.lineTo(2, 14);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#b91c1c';
                ctx.fillRect(5, 4, 6, 9);
                ctx.fillStyle = '#eab308';
                ctx.fillRect(5, 2, 6, 2);
            }
            else if (id === 'scarf') {
                ctx.fillStyle = '#dc2626';
                ctx.fillRect(3, 4, 10, 4);
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(8, 8, 4, 6);
                ctx.fillRect(4, 5, 8, 2);
            }
            else if (id === 'chain') {
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(8, 6, 4.5, 0.2, Math.PI - 0.2);
                ctx.stroke();
                ctx.fillStyle = '#fef08a';
                ctx.fillRect(6, 10, 4, 4);
                ctx.fillStyle = '#38bdf8';
                ctx.fillRect(7, 11, 2, 2);
            }
        }
        return c;
    }
    renderTabContent() {
        const container = this.uiRoot?.querySelector('#cc-tab-body');
        if (!container)
            return;
        const optGrid = (title, options, current, onSelect) => {
            const sec = document.createElement('div');
            sec.innerHTML = `<div class="cc-section-label"><span>${title}</span></div>`;
            const grid = document.createElement('div');
            grid.className = 'cc-grid';
            options.forEach(opt => {
                const b = document.createElement('button');
                b.className = `cc-opt-btn${opt.id === current ? ' active' : ''}`;
                b.textContent = opt.label;
                b.addEventListener('click', () => {
                    onSelect(opt.id);
                    this.refreshCharacter();
                    this.renderTabContent();
                });
                grid.appendChild(b);
            });
            sec.appendChild(grid);
            return sec;
        };
        const iconGrid = (title, kind, options, current, onSelect) => {
            const currentObj = options.find(o => o.id === current);
            const sec = document.createElement('div');
            sec.innerHTML = `<div class="cc-section-label"><span>${title}</span><span class="cc-section-val">${currentObj ? currentObj.label : ''}</span></div>`;
            const grid = document.createElement('div');
            grid.className = 'cc-icon-grid';
            options.forEach(opt => {
                const b = document.createElement('button');
                b.className = `cc-icon-btn${opt.id === current ? ' active' : ''}`;
                b.title = opt.label;
                b.setAttribute('aria-label', opt.label);
                b.appendChild(this.createAccessoryIconCanvas(kind, opt.id));
                b.addEventListener('click', () => {
                    onSelect(opt.id);
                    this.refreshCharacter();
                    this.renderTabContent();
                });
                grid.appendChild(b);
            });
            sec.appendChild(grid);
            return sec;
        };
        const swatchPicker = (title, colors, current, onSelect) => {
            const sec = document.createElement('div');
            sec.innerHTML = `<div class="cc-section-label"><span>${title}</span></div>`;
            const wrap = document.createElement('div');
            wrap.className = 'cc-swatches';
            colors.forEach(c => {
                const sw = document.createElement('button');
                sw.className = `cc-swatch${c.toLowerCase() === current.toLowerCase() ? ' active' : ''}`;
                sw.style.backgroundColor = c;
                sw.addEventListener('click', () => {
                    onSelect(c);
                    this.refreshCharacter();
                    this.renderTabContent();
                });
                wrap.appendChild(sw);
            });
            sec.appendChild(wrap);
            return sec;
        };
        container.innerHTML = '';
        if (this.activeTab === 'body') {
            const weightLabel = this.config.weight < 25 ? 'Chudy'
                : this.config.weight < 45 ? 'Szczupły'
                    : this.config.weight <= 60 ? 'Normalny'
                        : this.config.weight <= 80 ? 'Masywny'
                            : 'Gruby';
            const wSec = document.createElement('div');
            wSec.innerHTML = `
        <div class="cc-section-label">
          <span>Waga / Sylwetka</span>
          <span class="cc-section-val" id="cc-weight-val">${weightLabel} (${this.config.weight}%)</span>
        </div>
        <div class="cc-slider-wrap">
          <input type="range" min="0" max="100" value="${this.config.weight}" class="cc-slider" id="cc-weight-slider" />
          <div class="cc-slider-ends"><span>Chudy</span><span>Normalny</span><span>Gruby</span></div>
        </div>
      `;
            container.appendChild(wSec);
            const wSlider = wSec.querySelector('#cc-weight-slider');
            wSlider.addEventListener('input', () => {
                this.config.weight = parseInt(wSlider.value, 10);
                const lbl = this.config.weight < 25 ? 'Chudy'
                    : this.config.weight < 45 ? 'Szczupły'
                        : this.config.weight <= 60 ? 'Normalny'
                            : this.config.weight <= 80 ? 'Masywny'
                                : 'Gruby';
                const valEl = wSec.querySelector('#cc-weight-val');
                if (valEl)
                    valEl.textContent = `${lbl} (${this.config.weight}%)`;
                this.refreshCharacter();
            });
            const skinLabel = this.config.skinTone < 25 ? 'Bardzo jasny'
                : this.config.skinTone < 45 ? 'Jasny'
                    : this.config.skinTone < 65 ? 'Średni'
                        : this.config.skinTone < 85 ? 'Opalony / Ciemny'
                            : 'Bardzo ciemny';
            const sSec = document.createElement('div');
            sSec.innerHTML = `
        <div class="cc-section-label">
          <span>Kolor skóry</span>
          <span class="cc-section-val" id="cc-skin-val">${skinLabel}</span>
        </div>
        <div class="cc-slider-wrap">
          <div class="cc-skin-gradient"></div>
          <input type="range" min="0" max="100" value="${this.config.skinTone}" class="cc-slider" id="cc-skin-slider" />
          <div class="cc-slider-ends"><span>Jasny</span><span>Średni</span><span>Ciemny</span></div>
        </div>
      `;
            container.appendChild(sSec);
            const sSlider = sSec.querySelector('#cc-skin-slider');
            sSlider.addEventListener('input', () => {
                this.config.skinTone = parseInt(sSlider.value, 10);
                const lbl = this.config.skinTone < 25 ? 'Bardzo jasny'
                    : this.config.skinTone < 45 ? 'Jasny'
                        : this.config.skinTone < 65 ? 'Średni'
                            : this.config.skinTone < 85 ? 'Opalony / Ciemny'
                                : 'Bardzo ciemny';
                const valEl = sSec.querySelector('#cc-skin-val');
                if (valEl)
                    valEl.textContent = lbl;
                this.refreshCharacter();
            });
        }
        else if (this.activeTab === 'face') {
            container.appendChild(optGrid('Wyraz twarzy', [
                { id: 'smile', label: 'Uśmiechnięty' },
                { id: 'neutral', label: 'Poważny' },
                { id: 'smirk', label: 'Uśmieszek' },
                { id: 'fierce', label: 'Groźny' },
                { id: 'surprised', label: 'Zaskoczony' }
            ], this.config.expression, (v) => { this.config.expression = v; }));
            container.appendChild(swatchPicker('Kolor oczu', EYE_COLORS, this.config.eyeColor, (c) => { this.config.eyeColor = c; }));
            container.appendChild(optGrid('Detale twarzy i zarost', [
                { id: 'none', label: 'Brak' },
                { id: 'beard', label: 'Broda' },
                { id: 'mustache', label: 'Wąsy' },
                { id: 'bandage', label: 'Plaster' },
                { id: 'scar', label: 'Blizna' },
                { id: 'blush', label: 'Rumieńce' }
            ], this.config.facialDetail, (v) => { this.config.facialDetail = v; }));
        }
        else if (this.activeTab === 'hair') {
            container.appendChild(optGrid('Fryzura', [
                { id: 'fluffy', label: 'Fluffy Hair' },
                { id: 'buzz', label: 'Buzz Cut' },
                { id: 'short_straight', label: 'Krótkie proste' },
                { id: 'short_curly', label: 'Krótkie kręcone' },
                { id: 'long_straight', label: 'Długie proste' },
                { id: 'long_curly', label: 'Długie kręcone' },
                { id: 'mohawk', label: 'Irokez' },
                { id: 'ponytail', label: 'Kucyk' },
                { id: 'bald', label: 'Łysy / Brak' }
            ], this.config.hairStyle, (v) => { this.config.hairStyle = v; }));
            container.appendChild(swatchPicker('Kolor włosów', HAIR_COLORS, this.config.hairColor, (c) => { this.config.hairColor = c; }));
        }
        else if (this.activeTab === 'outfit') {
            container.appendChild(optGrid('Górny ubiór', [
                { id: 'hoodie', label: 'Bluza z kapturem' },
                { id: 'tshirt', label: 'Koszulka' },
                { id: 'vest', label: 'Kamizelka' },
                { id: 'coat', label: 'Płaszcz' },
                { id: 'none', label: 'Bez góry' }
            ], this.config.topStyle, (v) => { this.config.topStyle = v; }));
            container.appendChild(swatchPicker('Kolor górnego ubioru', OUTFIT_COLORS, this.config.topColor, (c) => { this.config.topColor = c; }));
            container.appendChild(optGrid('Dolny ubiór', [
                { id: 'pants', label: 'Spodnie' },
                { id: 'shorts', label: 'Szorty' },
                { id: 'cargo', label: 'Bojówki' },
                { id: 'skirt', label: 'Spódnica' }
            ], this.config.bottomStyle, (v) => { this.config.bottomStyle = v; }));
            container.appendChild(swatchPicker('Kolor dolnego ubioru', OUTFIT_COLORS, this.config.bottomColor, (c) => { this.config.bottomColor = c; }));
            container.appendChild(optGrid('Obuwie', [
                { id: 'boots', label: 'Ciężkie buty' },
                { id: 'sneakers', label: 'Trampki' },
                { id: 'sandals', label: 'Sandały' },
                { id: 'none', label: 'Boso' }
            ], this.config.shoesStyle, (v) => { this.config.shoesStyle = v; }));
            container.appendChild(swatchPicker('Kolor obuwia', OUTFIT_COLORS, this.config.shoesColor, (c) => { this.config.shoesColor = c; }));
        }
        else if (this.activeTab === 'accessories') {
            // Icon-based grid for every Hat, Mask, and Accessory!
            container.appendChild(iconGrid('Czapki', 'hat', [
                { id: 'none', label: 'Brak' },
                { id: 'cap', label: 'Czapka z daszkiem' },
                { id: 'beanie', label: 'Czapka zimowa' },
                { id: 'fedora', label: 'Kapelusz' },
                { id: 'helmet', label: 'Hełm' },
                { id: 'crown', label: 'Korona' }
            ], this.config.hatStyle, (v) => { this.config.hatStyle = v; }));
            container.appendChild(iconGrid('Maski i okulary', 'mask', [
                { id: 'none', label: 'Brak' },
                { id: 'ninja', label: 'Maska Ninja' },
                { id: 'cyber', label: 'Wizjer Cyber' },
                { id: 'bandana', label: 'Bandana' },
                { id: 'sunglasses', label: 'Okulary' }
            ], this.config.maskStyle, (v) => { this.config.maskStyle = v; }));
            container.appendChild(iconGrid('Akcesoria', 'accessory', [
                { id: 'none', label: 'Brak' },
                { id: 'backpack', label: 'Plecak' },
                { id: 'cape', label: 'Peleryna' },
                { id: 'scarf', label: 'Szalik' },
                { id: 'chain', label: 'Złoty łańcuch' }
            ], this.config.accessoryStyle, (v) => { this.config.accessoryStyle = v; }));
        }
    }
    openNameModal() {
        if (this.nameModal || this.isTransitioning)
            return;
        const overlay = document.getElementById('ui-overlay');
        if (!overlay)
            return;
        const modalBg = document.createElement('div');
        modalBg.className = 'cc-modal-backdrop';
        modalBg.innerHTML = `
      <div class="cc-modal">
        <div class="cc-corner cc-tl"></div>
        <div class="cc-corner cc-tr"></div>
        <div class="cc-corner cc-bl"></div>
        <div class="cc-corner cc-br"></div>
        <h3>Nadaj imię postaci</h3>
        <p>Wpisz imię swojego bohatera przed wejściem do świata Delverii.</p>
        <input type="text" class="cc-name-input" id="cc-name-input" maxlength="20" placeholder="Wpisz imię..." value="${this.config.name || ''}" />
        <div class="cc-modal-actions">
          <button class="cc-btn" id="cc-modal-back">Wróć</button>
          <button class="cc-next-btn" id="cc-modal-confirm">Zagraj</button>
        </div>
      </div>
    `;
        overlay.appendChild(modalBg);
        this.nameModal = modalBg;
        const input = modalBg.querySelector('#cc-name-input');
        setTimeout(() => {
            input?.focus();
            input?.select();
        }, 30);
        const submit = () => {
            const raw = (input?.value || '').trim();
            this.config.name = raw.length > 0 ? raw : 'Wędrowiec';
            this.confirmAndEnterGame();
        };
        modalBg.querySelector('#cc-modal-back')?.addEventListener('click', () => {
            modalBg.remove();
            this.nameModal = null;
        });
        modalBg.querySelector('#cc-modal-confirm')?.addEventListener('click', submit);
        input?.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter')
                submit();
        });
    }
    confirmAndEnterGame() {
        if (this.isTransitioning)
            return;
        this.isTransitioning = true;
        setActiveCharacterConfig(this.config);
        // 1. HUD kreatora znika (płynnie), postać i dekoracje się rozmywają
        if (this.nameModal) {
            this.nameModal.remove();
            this.nameModal = null;
        }
        if (this.uiRoot) {
            this.uiRoot.style.pointerEvents = 'none';
            this.uiRoot.style.transition = 'opacity 0.35s ease';
            this.uiRoot.style.opacity = '0';
        }
        const decor = [
            this.previewSprite,
            this.pedestalGraphics,
            this.binaryLogoImage,
            this.titleLogoImage,
        ].filter(Boolean);
        this.tweens.add({ targets: decor, alpha: 0, duration: 520, ease: 'Sine.easeInOut' });
        // 2. Nad kreatorem pojawiają się podziemia świata — tam kamera pojedzie dalej
        this.introBackdrop?.destroy(true);
        this.introBackdrop = undefined;
        this.introShade?.destroy();
        this.introShade = undefined;
        this.introFog?.destroy();
        this.introFog = undefined;
        this.tweens.killTweensOf(this.cameras.main);
        this.cameras.main.scrollY = 0;
        this.buildUndergroundLayer();
        // 3. Kamera rusza w górę, a przy ładowaniu świata zwalnia i pokazuje plakietkę 0/1
        const cam = this.cameras.main;
        const H = this.scale.height;
        const state = { y: cam.scrollY };
        this.tweens.add({
            targets: state,
            y: -H * 0.42,
            duration: 620,
            ease: 'Cubic.easeOut',
            onUpdate: () => {
                cam.scrollY = state.y;
            },
            onComplete: () => {
                // Ładowanie świata: logo 0/1 + obracający się kryształ w prawym dolnym rogu
                this.showLoadingBadge();
                this.tweens.add({
                    targets: state,
                    y: -H,
                    duration: 1500,
                    ease: 'Sine.easeOut',
                    onUpdate: () => {
                        cam.scrollY = state.y;
                    },
                    onComplete: () => {
                        // Chwila na pełnym kadrze podziemi, zanim świat przejmie ekran
                        this.time.delayedCall(520, () => this.startWorld());
                    },
                });
            },
        });
    }
    /** Grunt nad scenką kreatora — prawdziwe kafle gry ułożone warstwami, z jaskinią i światłem komnaty. */
    buildUndergroundLayer() {
        const W = this.scale.width;
        const H = this.scale.height;
        // Kafle muszą mieć taki sam rozmiar jak w menu: jaskinia (24 px) jest tam wyświetlana
        // w skali menuBgScale, więc w przejściu bloki rosną tą samą krotnością (wielokrotność 24 px,
        // żeby pixel-art się nie rozjeżdżał).
        const caveTex = this.textures.exists('__delveria_menu_real_cave__')
            ? this.textures.get('__delveria_menu_real_cave__').getSourceImage()
            : null;
        const menuScale = this.menuBgScale > 0
            ? this.menuBgScale
            : (caveTex && caveTex.width > 0
                ? Math.max(W / caveTex.width, (H * 2.1) / caveTex.height)
                : 1.9);
        const T = 24 * Math.max(2, Math.round(menuScale));
        const key = '__cc_underground__';
        this.undergroundLayer?.destroy();
        this.undergroundLayer = undefined;
        if (this.textures.exists(key))
            this.textures.remove(key);
        const canvasTex = this.textures.createCanvas(key, W, H);
        if (!canvasTex)
            return;
        const ctx = canvasTex.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.fillStyle = '#04060b';
        ctx.fillRect(0, 0, W, H);
        const tileSource = (id) => {
            const tileKey = `tile_${id}`;
            return this.textures.exists(tileKey)
                ? this.textures.get(tileKey).getSourceImage()
                : null;
        };
        // Deterministyczny szum — warstwa wygląda tak samo przy każdym przejściu
        const noise = (x, y, seed) => {
            const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
            return n - Math.floor(n);
        };
        // Komnata kreatora, z której wynurza się kamera (dolna krawędź kadru)
        const caveCx = W * 0.5;
        const caveCy = H + T * 2.5;
        const caveRx = W * 0.47;
        const caveRy = H * 0.24;
        const inCave = (px, py) => {
            const wobble = 1 + Math.sin(px * 0.0075) * 0.11 + Math.sin(px * 0.019 + 2.1) * 0.05;
            const dx = (px - caveCx) / (caveRx * wobble);
            const dy = (py - caveCy) / (caveRy * (1 + (wobble - 1) * 0.4));
            return dx * dx + dy * dy < 1;
        };
        // Skalne kieszenie — szerokie odnogi jaskini w masywie
        const pockets = [
            { x: W * 0.14, y: H * 0.32, rx: T * 4.2, ry: T * 1.7 },
            { x: W * 0.84, y: H * 0.6, rx: T * 3.6, ry: T * 1.5 },
        ];
        const isAir = (px, py) => {
            if (inCave(px, py))
                return true;
            for (const p of pockets) {
                const dx = (px - p.x) / p.rx;
                const dy = (py - p.y) / p.ry;
                if (dx * dx + dy * dy < 1)
                    return true;
            }
            return false;
        };
        // Granica warstw: ziemia u góry (bliżej powierzchni), kamień głębiej
        const strataY = (px) => H * 0.3 + Math.sin(px * 0.0062) * T * 1.6 + Math.sin(px * 0.021 + 1.2) * T * 0.7;
        const rimBelow = (px, py, step) => isAir(px + step / 2, py + step * 1.7);
        const cols = Math.ceil(W / T) + 1;
        const rows = Math.ceil(H / T) + 1;
        const crystals = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const px = c * T;
                const py = r * T;
                const cx = px + T / 2;
                const cy = py + T / 2;
                if (isAir(cx, cy)) {
                    // Pustka nie jest czarna — widać ciemną ścianę jaskini, jak w grze
                    const backWall = tileSource(cy < strataY(cx) ? BlockId.DIRT_WALL : BlockId.STONE_WALL);
                    if (backWall)
                        ctx.drawImage(backWall, px, py, T, T);
                    ctx.fillStyle = 'rgba(4,6,12,0.74)';
                    ctx.fillRect(px, py, T, T);
                    continue;
                }
                // Ściana widoczna tylko przy krawędzi pustki — reszta zasłonięta blokami
                const rim = isAir(cx - T, cy) || isAir(cx + T, cy) || isAir(cx, cy - T) || isAir(cx, cy + T);
                if (rim) {
                    const wall = tileSource(cy < strataY(cx) ? BlockId.DIRT_WALL : BlockId.STONE_WALL);
                    if (wall)
                        ctx.drawImage(wall, px, py, T, T);
                    ctx.fillStyle = 'rgba(3,5,11,0.35)';
                    ctx.fillRect(px, py, T, T);
                    continue;
                }
                // Warstwy gruntu: ziemia, pod nią pas mchu na kamieniu, głębiej czysty kamień
                const strata = strataY(cx);
                let id;
                if (cy < strata) {
                    id = BlockId.DIRT;
                }
                else if (cy < strata + T * 1.5 && noise(c, r, 17) > 0.38) {
                    id = BlockId.MOSSY_STONE;
                }
                else {
                    id = BlockId.STONE;
                }
                // Żyły rud — falujące pasma zamiast losowej szachownicy
                const vein = Math.sin(cx * 0.011 + cy * 0.0045) +
                    Math.sin(cy * 0.016 - cx * 0.003) +
                    Math.sin((cx + cy) * 0.005);
                if (id === BlockId.STONE && cy > H * 0.36 && vein > 1.55) {
                    const region = noise(Math.floor(c / 7), Math.floor(r / 7), 3);
                    id = region > 0.92 ? BlockId.CRYSTAL_ORE
                        : region > 0.66 ? BlockId.IRON_ORE
                            : region > 0.42 ? BlockId.COPPER_ORE
                                : BlockId.COAL_ORE;
                    if (id === BlockId.CRYSTAL_ORE && crystals.length < 16 && cx > T * 4 && cx < W - T * 4) {
                        crystals.push({ x: cx, y: cy });
                    }
                }
                const fg = tileSource(id);
                if (fg)
                    ctx.drawImage(fg, px, py, T, T);
                // Cieniowanie: drobny szum kostek + większe plamy tonu, żeby grunt nie był płaski
                const patch = noise(Math.floor(c / 3), Math.floor(r / 2), 23);
                const shade = 0.03 + noise(c, r, 11) * 0.08 + Math.max(0, patch - 0.55) * 0.18;
                ctx.fillStyle = `rgba(3,5,10,${shade.toFixed(3)})`;
                ctx.fillRect(px, py, T, T);
                // Jasna krawędź odsłoniętego gruntu przy pustce — czytelny kontur jaskini
                if (rimBelow(px, py, T)) {
                    ctx.fillStyle = 'rgba(148,163,184,0.10)';
                    ctx.fillRect(px, py, T, 2);
                }
            }
        }
        // Mrok podziemi — kafle są tu w cieniu, nie w pełnym świetle
        ctx.fillStyle = 'rgba(3,5,12,0.44)';
        ctx.fillRect(0, 0, W, H);
        // Światło komnaty bijące z dołu i poświata kryształów
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const roomLight = ctx.createRadialGradient(caveCx, H + T * 3, T, caveCx, H + T * 3, H * 0.95);
        roomLight.addColorStop(0, 'rgba(56,189,248,0.20)');
        roomLight.addColorStop(0.4, 'rgba(14,116,144,0.08)');
        roomLight.addColorStop(1, 'rgba(3,5,10,0)');
        ctx.fillStyle = roomLight;
        ctx.fillRect(0, 0, W, H);
        for (const crystal of crystals) {
            const glow = ctx.createRadialGradient(crystal.x, crystal.y, 2, crystal.x, crystal.y, T * 2.6);
            glow.addColorStop(0, 'rgba(168,72,232,0.30)');
            glow.addColorStop(1, 'rgba(60,20,90,0)');
            ctx.fillStyle = glow;
            ctx.fillRect(crystal.x - T * 3, crystal.y - T * 3, T * 6, T * 6);
        }
        ctx.restore();
        // Mrok na krawędziach: styk z komnatą (dół) i z powierzchnią (góra)
        const bottomFade = ctx.createLinearGradient(0, H - T * 6, 0, H);
        bottomFade.addColorStop(0, 'rgba(3,5,10,0)');
        bottomFade.addColorStop(1, 'rgba(3,5,10,0.4)');
        ctx.fillStyle = bottomFade;
        ctx.fillRect(0, H - T * 6, W, T * 6);
        const topFade = ctx.createLinearGradient(0, 0, 0, T * 6);
        topFade.addColorStop(0, 'rgba(2,4,8,0.9)');
        topFade.addColorStop(1, 'rgba(2,4,8,0)');
        ctx.fillStyle = topFade;
        ctx.fillRect(0, 0, W, T * 6);
        const sideFade = ctx.createLinearGradient(0, 0, W * 0.16, 0);
        sideFade.addColorStop(0, 'rgba(2,4,8,0.75)');
        sideFade.addColorStop(1, 'rgba(2,4,8,0)');
        ctx.fillStyle = sideFade;
        ctx.fillRect(0, 0, W * 0.16, H);
        const sideFadeR = ctx.createLinearGradient(W, 0, W * 0.84, 0);
        sideFadeR.addColorStop(0, 'rgba(2,4,8,0.75)');
        sideFadeR.addColorStop(1, 'rgba(2,4,8,0)');
        ctx.fillStyle = sideFadeR;
        ctx.fillRect(W * 0.84, 0, W * 0.16, H);
        canvasTex.refresh();
        this.undergroundLayer = this.add.image(W / 2, -H / 2, key).setDepth(0.5);
    }
    /** Wskaźnik ładowania świata: sam klejnot 0/1 z intra, obracający się w prawym dolnym rogu. */
    showLoadingBadge() {
        if (this.loadingBadge)
            return;
        const badge = document.createElement('div');
        badge.className = 'dl-loading';
        const img = document.createElement('img');
        img.alt = '';
        badge.appendChild(img);
        document.body.appendChild(badge);
        this.loadingBadge = badge;
        // Klatki obrotu tego samego kryształu 3D co w intra — dokładane po jednej, żeby nie zacinać przejścia
        const TOTAL = 16;
        const frames = [];
        const frameAt = (i) => renderBinaryCrystalFrame({
            size: 112,
            rotY: (i / TOTAL) * Math.PI * 2,
            tiltX: 0.36,
            time: i * 160,
        }).toDataURL();
        frames.push(frameAt(0));
        img.src = frames[0];
        let shown = 0;
        this.loadingTimer = window.setInterval(() => {
            if (!badge.isConnected)
                return;
            shown = (shown + 1) % frames.length;
            img.src = frames[shown];
        }, 130);
        let next = 1;
        const buildNextFrame = () => {
            if (!badge.isConnected || next >= TOTAL)
                return;
            frames.push(frameAt(next));
            next++;
            window.requestAnimationFrame(buildNextFrame);
        };
        window.requestAnimationFrame(buildNextFrame);
    }
    /** Kamera dojechała na podziemia — oddaje sterowanie światu gracza. */
    startWorld() {
        this.cleanupDOM();
        const controlsPill = document.querySelector('.controls-pill');
        if (controlsPill)
            controlsPill.style.display = '';
        this.scene.start('GameScene', {
            worldId: this.worldId,
            worldName: this.worldName,
            fromCreator: true,
        });
    }
    cleanupDOM() {
        if (this.loadingTimer !== undefined) {
            window.clearInterval(this.loadingTimer);
            this.loadingTimer = undefined;
        }
        if (this.nameModal) {
            this.nameModal.remove();
            this.nameModal = null;
        }
        if (this.uiRoot) {
            this.uiRoot.remove();
            this.uiRoot = null;
        }
    }
}
