import {
  CharacterConfig,
  DEFAULT_CHARACTER_CONFIG,
  ExpressionType,
  FacialDetailType,
  HairStyleType,
  TopStyleType,
  BottomStyleType,
  ShoesStyleType,
  HatStyleType,
  MaskStyleType,
  AccessoryStyleType,
  loadSavedCharacterConfig,
  setActiveCharacterConfig
} from '../types/CharacterConfig.js';
import { CharacterRenderer } from '../textures/CharacterRenderer.js';

type CreatorTab = 'body' | 'face' | 'hair' | 'outfit' | 'accessories';
type PreviewAnimMode = 'idle' | 'walk' | 'jump';

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
  private config!: CharacterConfig;
  private activeTab: CreatorTab = 'body';
  private previewMode: PreviewAnimMode = 'idle';
  private previewFacingLeft: boolean = false;

  private previewSprite!: Phaser.GameObjects.Sprite;
  private pedestalGraphics!: Phaser.GameObjects.Graphics;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private caveBgImage?: Phaser.GameObjects.Image;
  private binaryLogoImage?: Phaser.GameObjects.Image;
  private titleLogoImage?: Phaser.GameObjects.Image;
  private stars: { x: number; y: number; r: number; phase: number }[] = [];
  private motes: { rect: Phaser.GameObjects.Rectangle; vy: number; phase: number }[] = [];

  private uiRoot: HTMLDivElement | null = null;
  private nameModal: HTMLDivElement | null = null;
  private isTransitioning: boolean = false;

  constructor() {
    super('CharacterCreatorScene');
  }

  public create(): void {
    this.isTransitioning = false;
    this.motes = [];
    this.stars = [];
    this.config = { ...DEFAULT_CHARACTER_CONFIG, ...loadSavedCharacterConfig() };

    const controlsPill = document.querySelector('.controls-pill') as HTMLElement | null;
    if (controlsPill) controlsPill.style.display = 'none';

    CharacterRenderer.renderPlayerTextures(this, this.config);

    // 1. Atmospheric Delveria Cave Background (reuse MainMenuScene texture if present)
    this.bgGraphics = this.add.graphics();
    this.bgGraphics.setDepth(0);

    if (this.textures.exists('__delveria_menu_real_cave__')) {
      this.caveBgImage = this.add.image(0, 0, '__delveria_menu_real_cave__');
      this.caveBgImage.setOrigin(0.5, 0.5);
      this.caveBgImage.setAlpha(0.45);
      this.caveBgImage.setDepth(1);
    }

    // Drifting cyan crystal motes
    for (let i = 0; i < 35; i++) {
      const rect = this.add.rectangle(
        Math.random() * this.scale.width,
        Math.random() * this.scale.height,
        Math.random() < 0.5 ? 2 : 3,
        Math.random() < 0.5 ? 2 : 3,
        0x38bdf8,
        0.25 + Math.random() * 0.4
      );
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
    this.cameras.main.fadeIn(320, 6, 8, 13);

    this.events.once('shutdown', () => {
      this.cleanupDOM();
    });
  }

  public update(time: number, delta: number): void {
    if (!this.bgGraphics || !this.scene.isActive()) return;
    const W = this.scale.width;
    const H = this.scale.height;
    const dt = Math.min(delta, 50) / 1000;

    this.bgGraphics.clear();
    this.bgGraphics.fillGradientStyle(0x050810, 0x050810, 0x0c1528, 0x0c1528, 1);
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
  }

  private getStageCenter(): { x: number; y: number } {
    const W = this.scale.width;
    const H = this.scale.height;
    const panelSpace = W > 820 ? 440 : 0;
    const stageX = Math.max(150, (W - panelSpace) / 2);
    const stageY = H * 0.52;
    return { x: stageX, y: stageY };
  }

  private layoutPreview(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const { x, y } = this.getStageCenter();
    this.previewSprite.setPosition(x, y);

    if (this.caveBgImage) {
      this.caveBgImage.setPosition(W / 2, H / 2);
      const tex = this.caveBgImage.texture.getSourceImage() as HTMLImageElement;
      if (tex && tex.width > 0 && tex.height > 0) {
        const scale = Math.max(W / tex.width, H / tex.height);
        this.caveBgImage.setScale(scale);
      }
    }

    if (this.binaryLogoImage) {
      this.binaryLogoImage.setPosition(x, y - 10);
      const tex = this.binaryLogoImage.texture.getSourceImage() as HTMLImageElement;
      if (tex && tex.width > 0) {
        const targetH = Math.min(340, H * 0.5);
        this.binaryLogoImage.setScale(targetH / tex.height);
      }
    }

    if (this.titleLogoImage) {
      this.titleLogoImage.setPosition(x, Math.max(58, y - 210));
      const tex = this.titleLogoImage.texture.getSourceImage() as HTMLImageElement;
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

    const previewBar = this.uiRoot?.querySelector('.cc-preview-bar') as HTMLElement | null;
    if (previewBar) {
      previewBar.style.left = `${x}px`;
      previewBar.style.transform = 'translateX(-50%)';
    }
  }

  private refreshCharacter(): void {
    CharacterRenderer.renderPlayerTextures(this, this.config);
    this.updatePreviewAnimation();
  }

  private updatePreviewAnimation(): void {
    this.previewSprite.setFlipX(this.previewFacingLeft);
    if (this.previewMode === 'walk') {
      this.previewSprite.play('player_walk', true);
    } else if (this.previewMode === 'jump') {
      this.previewSprite.stop();
      this.previewSprite.setTexture('player_jump');
    } else {
      this.previewSprite.stop();
      this.previewSprite.setTexture('player_idle');
    }
  }

  private randomizeCharacter(): void {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    this.config.skinTone = Math.floor(Math.random() * 101);
    this.config.weight = Math.floor(Math.random() * 101);
    this.config.expression = pick<ExpressionType>(['smile', 'neutral', 'smirk', 'fierce', 'surprised']);
    this.config.eyeColor = pick(EYE_COLORS);
    this.config.facialDetail = pick<FacialDetailType>(['none', 'none', 'beard', 'mustache', 'bandage', 'scar', 'blush']);
    this.config.hairStyle = pick<HairStyleType>([
      'fluffy', 'buzz', 'short_straight', 'short_curly', 'long_straight', 'long_curly', 'mohawk', 'ponytail', 'bald'
    ]);
    this.config.hairColor = pick(HAIR_COLORS);
    this.config.topStyle = pick<TopStyleType>(['tshirt', 'hoodie', 'vest', 'coat']);
    this.config.topColor = pick(OUTFIT_COLORS);
    this.config.bottomStyle = pick<BottomStyleType>(['pants', 'shorts', 'cargo', 'skirt']);
    this.config.bottomColor = pick(OUTFIT_COLORS);
    this.config.shoesStyle = pick<ShoesStyleType>(['sneakers', 'boots', 'sandals']);
    this.config.shoesColor = pick(OUTFIT_COLORS);
    this.config.hatStyle = pick<HatStyleType>(['none', 'none', 'cap', 'beanie', 'fedora', 'helmet', 'crown']);
    this.config.maskStyle = pick<MaskStyleType>(['none', 'none', 'none', 'ninja', 'cyber', 'bandana', 'sunglasses']);
    this.config.accessoryStyle = pick<AccessoryStyleType>(['none', 'backpack', 'cape', 'scarf', 'chain']);

    this.refreshCharacter();
    this.renderTabContent();
  }

  private buildCreatorDOM(): void {
    this.cleanupDOM();
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;
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
        this.previewMode = (btn as HTMLElement).dataset.anim as PreviewAnimMode;
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
        this.activeTab = (tabBtn as HTMLElement).dataset.tab as CreatorTab;
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
  private createAccessoryIconCanvas(kind: 'hat' | 'mask' | 'accessory', id: string): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    c.className = 'cc-item-icon';
    const ctx = c.getContext('2d');
    if (!ctx) return c;
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
      } else if (id === 'beanie') {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(3, 5, 10, 6);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(4, 6, 8, 3);
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(3, 10, 10, 3); // cuff
      } else if (id === 'fedora') {
        ctx.fillStyle = '#452712';
        ctx.fillRect(1, 10, 14, 2);
        ctx.fillStyle = '#784421';
        ctx.fillRect(4, 5, 8, 5);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(4, 9, 8, 1);
      } else if (id === 'helmet') {
        ctx.fillStyle = '#475569';
        ctx.fillRect(3, 3, 10, 11);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(4, 4, 8, 4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(5, 8, 7, 3);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(8, 9, 3, 1);
      } else if (id === 'crown') {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(2, 8, 12, 4);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(2, 5, 2, 3);
        ctx.fillRect(7, 4, 2, 4);
        ctx.fillRect(12, 5, 2, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(7, 9, 2, 2);
      }
    } else if (kind === 'mask') {
      if (id === 'ninja') {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(2, 5, 12, 7);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(3, 6, 10, 3);
        ctx.fillStyle = '#334155';
        ctx.fillRect(12, 6, 3, 2); // tie tail
      } else if (id === 'cyber') {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(2, 5, 12, 6);
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(3, 7, 10, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(9, 7, 3, 1);
      } else if (id === 'bandana') {
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(2, 5); ctx.lineTo(14, 5); ctx.lineTo(8, 13); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(4, 6, 8, 3);
        ctx.fillStyle = '#fca5a5';
        ctx.fillRect(7, 8, 2, 1);
      } else if (id === 'sunglasses') {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(2, 6, 5, 4);
        ctx.fillRect(9, 6, 5, 4);
        ctx.fillRect(7, 7, 2, 1);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(3, 7, 2, 1);
        ctx.fillRect(10, 7, 2, 1);
      }
    } else if (kind === 'accessory') {
      if (id === 'backpack') {
        ctx.fillStyle = '#452712';
        ctx.fillRect(3, 3, 10, 11);
        ctx.fillStyle = '#784421';
        ctx.fillRect(4, 4, 8, 9);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(6, 7, 4, 2);
      } else if (id === 'cape') {
        ctx.fillStyle = '#7f1d1d';
        ctx.beginPath();
        ctx.moveTo(5, 2); ctx.lineTo(11, 2); ctx.lineTo(14, 14); ctx.lineTo(2, 14); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(5, 4, 6, 9);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(5, 2, 6, 2);
      } else if (id === 'scarf') {
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(3, 4, 10, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(8, 8, 4, 6);
        ctx.fillRect(4, 5, 8, 2);
      } else if (id === 'chain') {
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

  private renderTabContent(): void {
    const container = this.uiRoot?.querySelector('#cc-tab-body') as HTMLDivElement | null;
    if (!container) return;

    const optGrid = (
      title: string,
      options: Array<{ id: string; label: string }>,
      current: string,
      onSelect: (val: string) => void
    ): HTMLElement => {
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

    const iconGrid = (
      title: string,
      kind: 'hat' | 'mask' | 'accessory',
      options: Array<{ id: string; label: string }>,
      current: string,
      onSelect: (val: string) => void
    ): HTMLElement => {
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

    const swatchPicker = (
      title: string,
      colors: string[],
      current: string,
      onSelect: (c: string) => void
    ): HTMLElement => {
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
      const wSlider = wSec.querySelector('#cc-weight-slider') as HTMLInputElement;
      wSlider.addEventListener('input', () => {
        this.config.weight = parseInt(wSlider.value, 10);
        const lbl = this.config.weight < 25 ? 'Chudy'
          : this.config.weight < 45 ? 'Szczupły'
          : this.config.weight <= 60 ? 'Normalny'
          : this.config.weight <= 80 ? 'Masywny'
          : 'Gruby';
        const valEl = wSec.querySelector('#cc-weight-val');
        if (valEl) valEl.textContent = `${lbl} (${this.config.weight}%)`;
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
      const sSlider = sSec.querySelector('#cc-skin-slider') as HTMLInputElement;
      sSlider.addEventListener('input', () => {
        this.config.skinTone = parseInt(sSlider.value, 10);
        const lbl = this.config.skinTone < 25 ? 'Bardzo jasny'
          : this.config.skinTone < 45 ? 'Jasny'
          : this.config.skinTone < 65 ? 'Średni'
          : this.config.skinTone < 85 ? 'Opalony / Ciemny'
          : 'Bardzo ciemny';
        const valEl = sSec.querySelector('#cc-skin-val');
        if (valEl) valEl.textContent = lbl;
        this.refreshCharacter();
      });
    } else if (this.activeTab === 'face') {
      container.appendChild(optGrid(
        'Wyraz twarzy',
        [
          { id: 'smile', label: 'Uśmiechnięty' },
          { id: 'neutral', label: 'Poważny' },
          { id: 'smirk', label: 'Uśmieszek' },
          { id: 'fierce', label: 'Groźny' },
          { id: 'surprised', label: 'Zaskoczony' }
        ],
        this.config.expression,
        (v) => { this.config.expression = v as ExpressionType; }
      ));
      container.appendChild(swatchPicker(
        'Kolor oczu',
        EYE_COLORS,
        this.config.eyeColor,
        (c) => { this.config.eyeColor = c; }
      ));
      container.appendChild(optGrid(
        'Detale twarzy i zarost',
        [
          { id: 'none', label: 'Brak' },
          { id: 'beard', label: 'Broda' },
          { id: 'mustache', label: 'Wąsy' },
          { id: 'bandage', label: 'Plaster' },
          { id: 'scar', label: 'Blizna' },
          { id: 'blush', label: 'Rumieńce' }
        ],
        this.config.facialDetail,
        (v) => { this.config.facialDetail = v as FacialDetailType; }
      ));
    } else if (this.activeTab === 'hair') {
      container.appendChild(optGrid(
        'Fryzura',
        [
          { id: 'fluffy', label: 'Fluffy Hair' },
          { id: 'buzz', label: 'Buzz Cut' },
          { id: 'short_straight', label: 'Krótkie proste' },
          { id: 'short_curly', label: 'Krótkie kręcone' },
          { id: 'long_straight', label: 'Długie proste' },
          { id: 'long_curly', label: 'Długie kręcone' },
          { id: 'mohawk', label: 'Irokez' },
          { id: 'ponytail', label: 'Kucyk' },
          { id: 'bald', label: 'Łysy / Brak' }
        ],
        this.config.hairStyle,
        (v) => { this.config.hairStyle = v as HairStyleType; }
      ));
      container.appendChild(swatchPicker(
        'Kolor włosów',
        HAIR_COLORS,
        this.config.hairColor,
        (c) => { this.config.hairColor = c; }
      ));
    } else if (this.activeTab === 'outfit') {
      container.appendChild(optGrid(
        'Górny ubiór',
        [
          { id: 'hoodie', label: 'Bluza z kapturem' },
          { id: 'tshirt', label: 'Koszulka' },
          { id: 'vest', label: 'Kamizelka' },
          { id: 'coat', label: 'Płaszcz' },
          { id: 'none', label: 'Bez góry' }
        ],
        this.config.topStyle,
        (v) => { this.config.topStyle = v as TopStyleType; }
      ));
      container.appendChild(swatchPicker(
        'Kolor górnego ubioru',
        OUTFIT_COLORS,
        this.config.topColor,
        (c) => { this.config.topColor = c; }
      ));
      container.appendChild(optGrid(
        'Dolny ubiór',
        [
          { id: 'pants', label: 'Spodnie' },
          { id: 'shorts', label: 'Szorty' },
          { id: 'cargo', label: 'Bojówki' },
          { id: 'skirt', label: 'Spódnica' }
        ],
        this.config.bottomStyle,
        (v) => { this.config.bottomStyle = v as BottomStyleType; }
      ));
      container.appendChild(swatchPicker(
        'Kolor dolnego ubioru',
        OUTFIT_COLORS,
        this.config.bottomColor,
        (c) => { this.config.bottomColor = c; }
      ));
      container.appendChild(optGrid(
        'Obuwie',
        [
          { id: 'boots', label: 'Ciężkie buty' },
          { id: 'sneakers', label: 'Trampki' },
          { id: 'sandals', label: 'Sandały' },
          { id: 'none', label: 'Boso' }
        ],
        this.config.shoesStyle,
        (v) => { this.config.shoesStyle = v as ShoesStyleType; }
      ));
      container.appendChild(swatchPicker(
        'Kolor obuwia',
        OUTFIT_COLORS,
        this.config.shoesColor,
        (c) => { this.config.shoesColor = c; }
      ));
    } else if (this.activeTab === 'accessories') {
      // Icon-based grid for every Hat, Mask, and Accessory!
      container.appendChild(iconGrid(
        'Czapki',
        'hat',
        [
          { id: 'none', label: 'Brak' },
          { id: 'cap', label: 'Czapka z daszkiem' },
          { id: 'beanie', label: 'Czapka zimowa' },
          { id: 'fedora', label: 'Kapelusz' },
          { id: 'helmet', label: 'Hełm' },
          { id: 'crown', label: 'Korona' }
        ],
        this.config.hatStyle,
        (v) => { this.config.hatStyle = v as HatStyleType; }
      ));
      container.appendChild(iconGrid(
        'Maski i okulary',
        'mask',
        [
          { id: 'none', label: 'Brak' },
          { id: 'ninja', label: 'Maska Ninja' },
          { id: 'cyber', label: 'Wizjer Cyber' },
          { id: 'bandana', label: 'Bandana' },
          { id: 'sunglasses', label: 'Okulary' }
        ],
        this.config.maskStyle,
        (v) => { this.config.maskStyle = v as MaskStyleType; }
      ));
      container.appendChild(iconGrid(
        'Akcesoria',
        'accessory',
        [
          { id: 'none', label: 'Brak' },
          { id: 'backpack', label: 'Plecak' },
          { id: 'cape', label: 'Peleryna' },
          { id: 'scarf', label: 'Szalik' },
          { id: 'chain', label: 'Złoty łańcuch' }
        ],
        this.config.accessoryStyle,
        (v) => { this.config.accessoryStyle = v as AccessoryStyleType; }
      ));
    }
  }

  private openNameModal(): void {
    if (this.nameModal || this.isTransitioning) return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;

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

    const input = modalBg.querySelector('#cc-name-input') as HTMLInputElement;
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
      if (e.key === 'Enter') submit();
    });
  }

  private confirmAndEnterGame(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    setActiveCharacterConfig(this.config);

    this.cameras.main.fadeOut(380, 6, 8, 13);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.cleanupDOM();
      const controlsPill = document.querySelector('.controls-pill') as HTMLElement | null;
      if (controlsPill) controlsPill.style.display = '';
      this.scene.start('GameScene');
    });
  }

  private cleanupDOM(): void {
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
