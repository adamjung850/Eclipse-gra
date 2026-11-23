interface SkyKeyframe {
  progress: number;
  top: { r: number; g: number; b: number };
  bottom: { r: number; g: number; b: number };
}

interface Star {
  xPct: number;
  yPct: number;
  size: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

export class DayNightSystem {
  private scene: Phaser.Scene;

  // Exact Timings: 5 min Day (300,000ms), 5 min Night (300,000ms) = 10 min Total
  public static readonly DAY_DURATION_MS: number = 300000;
  public static readonly NIGHT_DURATION_MS: number = 300000;
  public static readonly TOTAL_CYCLE_MS: number = 600000;

  // Start at mid-morning (~0.18 progress, around 108,000ms) for a welcoming bright daylight start
  private cycleTimeMs: number = 108000;

  // Visual Scene GameObjects
  private skyGraphic: Phaser.GameObjects.Graphics;
  private starsGraphic: Phaser.GameObjects.Graphics;
  private sunSprite: Phaser.GameObjects.Image;
  private moonSprite: Phaser.GameObjects.Image;

  // Procedural Starfield
  private stars: Star[] = [];
  private totalStars: number = 85;

  // 8 Continuous Sky Keyframes for smooth color interpolation (0 stepped jumps)
  private readonly skyKeyframes: SkyKeyframe[] = [
    // 0.00: Sunrise / Dawn (Day starts, Sun rises on East horizon)
    {
      progress: 0.0,
      top: { r: 76, g: 35, b: 72 },
      bottom: { r: 251, g: 146, b: 60 }
    },
    // 0.08: Early Morning (Sun climbs, warm golden glow spreads)
    {
      progress: 0.08,
      top: { r: 38, g: 95, b: 155 },
      bottom: { r: 254, g: 215, b: 170 }
    },
    // 0.25: Midday / Noon (Sun at highest peak, crisp azure sky)
    {
      progress: 0.25,
      top: { r: 14, g: 125, b: 205 },
      bottom: { r: 165, g: 243, b: 252 }
    },
    // 0.42: Late Afternoon (Sun descending towards West)
    {
      progress: 0.42,
      top: { r: 35, g: 85, b: 160 },
      bottom: { r: 253, g: 186, b: 116 }
    },
    // 0.50: Sunset / Dusk (Day ends, Sun sets on West horizon, Moon rises on East)
    {
      progress: 0.50,
      top: { r: 76, g: 29, b: 149 },
      bottom: { r: 234, g: 88, b: 12 }
    },
    // 0.58: Twilight (Night sets in, stars awaken, indigo glow)
    {
      progress: 0.58,
      top: { r: 15, g: 20, b: 55 },
      bottom: { r: 67, g: 56, b: 202 }
    },
    // 0.75: Midnight (Moon at highest peak, deep starry dark sky)
    {
      progress: 0.75,
      top: { r: 3, g: 7, b: 18 },
      bottom: { r: 15, g: 23, b: 42 }
    },
    // 0.92: Pre-Dawn (Moon setting on West, faint morning violet on East)
    {
      progress: 0.92,
      top: { r: 22, g: 16, b: 46 },
      bottom: { r: 52, g: 45, b: 125 }
    },
    // 1.00: Full cycle wrap back to 0.00
    {
      progress: 1.0,
      top: { r: 76, g: 35, b: 72 },
      bottom: { r: 251, g: 146, b: 60 }
    }
  ];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // 1. Sky Gradient Canvas (scrollFactor 0, lowest background depth -10)
    this.skyGraphic = scene.add.graphics();
    this.skyGraphic.setScrollFactor(0);
    this.skyGraphic.setDepth(-10);

    // 2. Stars Canvas (depth -9)
    this.starsGraphic = scene.add.graphics();
    this.starsGraphic.setScrollFactor(0);
    this.starsGraphic.setDepth(-9);

    // 3. Sun Sprite (depth -8, behind foreground world and trees)
    this.sunSprite = scene.add.image(0, 0, 'celestial_sun');
    this.sunSprite.setScrollFactor(0);
    this.sunSprite.setDepth(-8);
    this.sunSprite.setOrigin(0.5, 0.5);

    // 4. Moon Sprite (depth -8)
    this.moonSprite = scene.add.image(0, 0, 'celestial_moon');
    this.moonSprite.setScrollFactor(0);
    this.moonSprite.setDepth(-8);
    this.moonSprite.setOrigin(0.5, 0.5);

    // 5. Initialize Starfield
    this.initStars();

    // Initial render
    this.update(0);
  }

  private initStars(): void {
    this.stars = [];
    for (let i = 0; i < this.totalStars; i++) {
      this.stars.push({
        xPct: Math.random(),
        yPct: Math.random() * 0.72, // Stars occupy upper 72% of the sky
        size: Math.random() < 0.2 ? 2 : 1, // Mostly 1px crisp pixel stars, some 2px
        brightness: 0.65 + Math.random() * 0.35,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.002 + Math.random() * 0.004
      });
    }
  }

  public update(delta: number): void {
    // Advance continuous cycle time
    this.cycleTimeMs = (this.cycleTimeMs + delta) % DayNightSystem.TOTAL_CYCLE_MS;
    const progress = this.cycleTimeMs / DayNightSystem.TOTAL_CYCLE_MS; // 0.0 to 1.0

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Compute visible viewport coordinates accounting for camera zoom
    const camera = this.scene.cameras.main;
    const zoom = camera ? (camera.zoom || 1.0) : 1.0;
    const cx = width / 2;
    const cy = height / 2;
    const halfVisW = (width / 2) / zoom;
    const halfVisH = (height / 2) / zoom;

    const visLeft = cx - halfVisW;
    const visRight = cx + halfVisW;
    const visTop = cy - halfVisH;
    const visBottom = cy + halfVisH;

    // 1. Render Fluid Sky Gradient
    this.renderSky(progress, visLeft, visRight, visTop, visBottom, halfVisW, halfVisH);

    // 2. Render Twinkling Stars
    const starAlpha = this.getStarAlpha(progress);
    this.renderStars(this.cycleTimeMs, starAlpha, visLeft, visTop, halfVisW, halfVisH);

    // 3. Move Sun & Moon along parabolic celestial arcs from East (Left) to West (Right)
    this.updateCelestialPositions(progress, visLeft, visRight, visTop, visBottom);
  }

  private renderSky(
    progress: number,
    visLeft: number,
    visRight: number,
    visTop: number,
    visBottom: number,
    halfVisW: number,
    halfVisH: number
  ): void {
    // Find surrounding keyframes
    let k1 = this.skyKeyframes[0];
    let k2 = this.skyKeyframes[1];

    for (let i = 0; i < this.skyKeyframes.length - 1; i++) {
      if (progress >= this.skyKeyframes[i].progress && progress <= this.skyKeyframes[i + 1].progress) {
        k1 = this.skyKeyframes[i];
        k2 = this.skyKeyframes[i + 1];
        break;
      }
    }

    const span = k2.progress - k1.progress;
    const factor = span > 0 ? (progress - k1.progress) / span : 0;

    // Smooth Cosine Interpolation for organic natural sky blending
    const smoothFactor = (1 - Math.cos(factor * Math.PI)) / 2;

    const topR = Math.round(k1.top.r + (k2.top.r - k1.top.r) * smoothFactor);
    const topG = Math.round(k1.top.g + (k2.top.g - k1.top.g) * smoothFactor);
    const topB = Math.round(k1.top.b + (k2.top.b - k1.top.b) * smoothFactor);
    const topColor = (topR << 16) | (topG << 8) | topB;

    const botR = Math.round(k1.bottom.r + (k2.bottom.r - k1.bottom.r) * smoothFactor);
    const botG = Math.round(k1.bottom.g + (k2.bottom.g - k1.bottom.g) * smoothFactor);
    const botB = Math.round(k1.bottom.b + (k2.bottom.b - k1.bottom.b) * smoothFactor);
    const botColor = (botR << 16) | (botG << 8) | botB;

    this.skyGraphic.clear();
    this.skyGraphic.fillGradientStyle(topColor, topColor, botColor, botColor, 1);
    this.skyGraphic.fillRect(visLeft - 40, visTop - 40, (halfVisW * 2) + 80, (halfVisH * 2) + 80);
  }

  private getStarAlpha(progress: number): number {
    // Daytime: progress < 0.50 (Sun is up) -> stars invisible
    // Nighttime: progress >= 0.50 (Moon is up) -> stars bright
    // Fade in during sunset (0.45 -> 0.52)
    // Fade out during sunrise (0.96 -> 0.04)
    if (progress < 0.45) {
      if (progress < 0.04) {
        return Math.max(0, 1.0 - progress / 0.04);
      }
      return 0;
    } else if (progress >= 0.45 && progress < 0.52) {
      return (progress - 0.45) / 0.07;
    } else if (progress >= 0.52 && progress < 0.96) {
      return 1.0;
    } else {
      return Math.max(0, 1.0 - (progress - 0.96) / 0.08);
    }
  }

  private renderStars(
    timeMs: number,
    baseAlpha: number,
    visLeft: number,
    visTop: number,
    halfVisW: number,
    halfVisH: number
  ): void {
    this.starsGraphic.clear();
    if (baseAlpha <= 0.01) return;

    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const sx = Math.floor(visLeft + s.xPct * (halfVisW * 2));
      const sy = Math.floor(visTop + s.yPct * (halfVisH * 2));

      // Subtle twinkling sinusoidal variation
      const twinkle = Math.sin(timeMs * s.twinkleSpeed + s.twinklePhase);
      const alpha = Math.max(0, Math.min(1, baseAlpha * (s.brightness + twinkle * 0.22)));

      this.starsGraphic.fillStyle(0xffffff, alpha);
      this.starsGraphic.fillRect(sx, sy, s.size, s.size);
    }
  }

  private updateCelestialPositions(
    progress: number,
    visLeft: number,
    visRight: number,
    visTop: number,
    visBottom: number
  ): void {
    const startX = visLeft - 25;
    const endX = visRight + 25;
    const horizonY = visTop + (visBottom - visTop) * 0.74; // Rises and sets at 74% visible height
    const peakY = visTop + (visBottom - visTop) * 0.16;    // Peaks high in the sky at 16% visible height
    const arcHeight = horizonY - peakY;

    if (progress < 0.5) {
      // -------------------------------------------------------------
      // DAYTIME (0.0 to 0.5): Sun travels from East (left) to West (right)
      // -------------------------------------------------------------
      const dayProgress = progress / 0.5; // 0.0 (Dawn) -> 1.0 (Dusk)

      this.sunSprite.setVisible(true);
      this.moonSprite.setVisible(false);

      const sunX = startX + (endX - startX) * dayProgress;
      // Smooth sinusoidal parabolic elevation
      const sunY = horizonY - arcHeight * Math.sin(dayProgress * Math.PI);

      this.sunSprite.setPosition(Math.round(sunX), Math.round(sunY));
      this.sunSprite.setAngle(dayProgress * 60);

      // Smooth fade at horizon edges
      let sunAlpha = 1.0;
      if (dayProgress < 0.06) {
        sunAlpha = dayProgress / 0.06;
      } else if (dayProgress > 0.94) {
        sunAlpha = (1.0 - dayProgress) / 0.06;
      }
      this.sunSprite.setAlpha(Math.max(0, Math.min(1, sunAlpha)));
    } else {
      // -------------------------------------------------------------
      // NIGHTTIME (0.5 to 1.0): Moon travels from East (left) to West (right)
      // -------------------------------------------------------------
      const nightProgress = (progress - 0.5) / 0.5; // 0.0 (Dusk) -> 1.0 (Dawn)

      this.sunSprite.setVisible(false);
      this.moonSprite.setVisible(true);

      const moonX = startX + (endX - startX) * nightProgress;
      const moonY = horizonY - arcHeight * Math.sin(nightProgress * Math.PI);

      this.moonSprite.setPosition(Math.round(moonX), Math.round(moonY));
      this.moonSprite.setAngle(-12 + nightProgress * 24);

      // Smooth fade at horizon edges
      let moonAlpha = 1.0;
      if (nightProgress < 0.06) {
        moonAlpha = nightProgress / 0.06;
      } else if (nightProgress > 0.94) {
        moonAlpha = (1.0 - nightProgress) / 0.06;
      }
      this.moonSprite.setAlpha(Math.max(0, Math.min(1, moonAlpha)));
    }
  }

  public isNight(): boolean {
    const progress = this.cycleTimeMs / DayNightSystem.TOTAL_CYCLE_MS;
    return progress >= 0.5;
  }

  public getCycleProgress(): number {
    return this.cycleTimeMs / DayNightSystem.TOTAL_CYCLE_MS;
  }

  public getTimeString(): string {
    const isNight = this.isNight();
    const progress = this.getCycleProgress();
    const phaseProgress = isNight ? (progress - 0.5) / 0.5 : progress / 0.5;
    const remainingSeconds = Math.max(0, Math.floor((1.0 - phaseProgress) * (DayNightSystem.DAY_DURATION_MS / 1000)));
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    const timeFormatted = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    return isNight ? `🌙 Noc [${timeFormatted}]` : `☀️ Dzień [${timeFormatted}]`;
  }
}
