export enum CursorState {
  DEFAULT = 'default',
  DEFAULT_DOWN = 'default_down',
  INTERACT = 'interact',
  INTERACT_DOWN = 'interact_down',
  TARGET = 'target',
  GRAB = 'grab',
  GRAB_OPEN = 'grab_open'
}

export class CursorManager {
  private static instance: CursorManager | null = null;

  private game: Phaser.Game;
  private canvas: HTMLCanvasElement | null = null;
  private currentState: CursorState = CursorState.DEFAULT;

  // Interaction State Flags
  private isPointerDown: boolean = false;
  private isHoveringUI: boolean = false;
  private isHoldingItem: boolean = false;
  private isHoveringEnemy: boolean = false;
  private isHoveringDroppedItem: boolean = false;
  private isTileInReach: boolean = false;

  // CSS cursor definitions
  private cursorCss: Record<CursorState, string> = {} as any;
  public dataUrls: Record<string, string> = {};

  // Pixel Art Matrices (16x16 logical)
  private readonly ARROW_NORMAL = [
    '. # . . . . . . . . . . . . . .',
    '# W # . . . . . . . . . . . . .',
    '# W W # . . . . . . . . . . . .',
    '# W W W # . . . . . . . . . . .',
    '# W W W W # . . . . . . . . . .',
    '# W W W W W # . . . . . . . . .',
    '# W W W W W W # . . . . . . . .',
    '# W W W W W W W # . . . . . . .',
    '# W W W W W W W W # . . . . . .',
    '# W W W W W W W W W # . . . . .',
    '# W W W W W # # # # # # . . . .',
    '# W W S W W # . . . . . . . . .',
    '# W S . # W W # . . . . . . . .',
    '# S . . # W W # . . . . . . . .',
    '# . . . . # W W # . . . . . . .',
    '. . . . . . # # . . . . . . . .'
  ];

  private readonly ARROW_PRESSED = [
    '. . . . . . . . . . . . . . . .',
    '. . # . . . . . . . . . . . . .',
    '. # W # . . . . . . . . . . . .',
    '. # W W # . . . . . . . . . . .',
    '. # W W W # . . . . . . . . . .',
    '. # W W W W # . . . . . . . . .',
    '. # W W W W W # . . . . . . . .',
    '. # W W W W W W # . . . . . . .',
    '. # W W W W W W W # . . . . . .',
    '. # W W W W W W W W # . . . . .',
    '. # W W W W # # # # # # . . . .',
    '. # W W S W # . . . . . . . . .',
    '. # W S . # W W # . . . . . . .',
    '. # S . . # W W # . . . . . . .',
    '. . . . . . # # # . . . . . . .',
    '. . . . . . . . . . . . . . . .'
  ];

  private readonly INTERACT_NORMAL = [
    '. # . . . . . . . . . . . . . .',
    '# H # . . . . . . . . . . . . .',
    '# H R # . . . . . . . . . . . .',
    '# H R R # . . . . . . . . . . .',
    '# H R R R # . . . . . . . . . .',
    '# H R R R R # . . . . . . . . .',
    '# H R R R R R # . . . . . . . .',
    '# H R R R R R R # . . . . . . .',
    '# H R R R R R R R # . . . . . .',
    '# H R R R R R R R R # . . . . .',
    '# H R R R R # # # # # # . . . .',
    '# H R S R R # . . . . . . . . .',
    '# R S . # R R # . . . . . . . .',
    '# S . . # R R # . . . . . . . .',
    '# . . . . # R R # . . . . . . .',
    '. . . . . . # # . . . . . . . .'
  ];

  private readonly INTERACT_PRESSED = [
    '. . . . . . . . . . . . . . . .',
    '. . # . . . . . . . . . . . . .',
    '. # H # . . . . . . . . . . . .',
    '. # H R # . . . . . . . . . . .',
    '. # H R R # . . . . . . . . . .',
    '. # H R R R # . . . . . . . . .',
    '. # H R R R R # . . . . . . . .',
    '. # H R R R R R # . . . . . . .',
    '. # H R R R R R R # . . . . . .',
    '. # H R R R R R R R # . . . . .',
    '. # H R R R # # # # # # . . . .',
    '. # H R S R # . . . . . . . . .',
    '. # R S . # R R # . . . . . . .',
    '. # S . . # R R # . . . . . . .',
    '. . . . . . # # # . . . . . . .',
    '. . . . . . . . . . . . . . . .'
  ];

  private readonly TARGET_LAYOUT = [
    '. . . . . . # # # # . . . . . .',
    '. . . . . . # H R # . . . . . .',
    '. . . . . . # H R # . . . . . .',
    '. . . . . . # H R # . . . . . .',
    '. . . . . . . # # . . . . . . .',
    '. . . . . . . . . . . . . . . .',
    '# # # # . . . # # . . . # # # #',
    '# H H H # . # H R # . # H H H #',
    '# R R R # . # R R # . # R R R #',
    '# # # # . . . # # . . . # # # #',
    '. . . . . . . . . . . . . . . .',
    '. . . . . . . # # . . . . . . .',
    '. . . . . . # H R # . . . . . .',
    '. . . . . . # H R # . . . . . .',
    '. . . . . . # H R # . . . . . .',
    '. . . . . . # # # # . . . . . .'
  ];

  private readonly GRAB_CLOSED = [
    '. . . . . # # . . # # . . . . .',
    '. . . . # R R # # R R # . . . .',
    '. . # # # R R # R R R # . # # .',
    '. # R R # R R # R R R # # R R #',
    '. # R R # R R # R R R # R R R #',
    '. # R R # R R # R R R # R R R #',
    '. # R R R R R R R R R R R R R #',
    '. . # R R R R R R R R R R R R #',
    '. . # R R R R R R R R R R R # .',
    '. . . # R R R R R R R R R R # .',
    '. . . # R R R R R R R R R # . .',
    '. . . . # R R R R R R R # . . .',
    '. . . . # R R R R R R R # . . .',
    '. . . . . # # # # # # # . . . .',
    '. . . . . . . . . . . . . . . .',
    '. . . . . . . . . . . . . . . .'
  ];

  private readonly GRAB_OPEN = [
    '. . # # . . # # . . # # . . . .',
    '. # W W # # W W # # W W # # # .',
    '. # W W # # W W # # W W # W W #',
    '. # W W # # W W # # W W # W W #',
    '. # W W # # W W # # W W # W W #',
    '# # W W # # W W # # W W # W W #',
    '# W W W # # W W # # W W # W W #',
    '# W W W W W W W W W W W W W W #',
    '# W W W W W W W W W W W W W # .',
    '. # W W W W W W W W W W W W # .',
    '. . # W W W W W W W W W W # . .',
    '. . # W W W W W W W W W W # . .',
    '. . . # W W W W W W W W # . . .',
    '. . . # W W W W W W W W # . . .',
    '. . . . # # # # # # # # . . . .',
    '. . . . . . . . . . . . . . . .'
  ];

  constructor(game: Phaser.Game) {
    this.game = game;
    this.canvas = game.canvas;
    this.initCursors();
    this.bindEvents();
    this.updateState();
  }

  public static getInstance(game?: Phaser.Game): CursorManager {
    if (!CursorManager.instance && game) {
      CursorManager.instance = new CursorManager(game);
    }
    return CursorManager.instance!;
  }

  private initCursors(): void {
    const mapDefault: Record<string, string> = {
      '#': '#10121a',
      'W': '#ffffff',
      'S': '#cbd5e1'
    };

    const mapInteract: Record<string, string> = {
      '#': '#280508',
      'R': '#ff2a44',
      'H': '#ff94a0',
      'S': '#b91c1c'
    };

    const mapTarget: Record<string, string> = {
      '#': '#280508',
      'R': '#ff2a44',
      'H': '#ff94a0'
    };

    const mapGrab: Record<string, string> = {
      '#': '#280508',
      'R': '#ff2a44',
      'H': '#ff94a0'
    };

    // Render 16x16 scaled 2x to 32x32 crisp canvas data URLs
    this.dataUrls['default'] = this.generateDataUrl(this.ARROW_NORMAL, mapDefault, 2);
    this.dataUrls['default_down'] = this.generateDataUrl(this.ARROW_PRESSED, mapDefault, 2);
    this.dataUrls['interact'] = this.generateDataUrl(this.INTERACT_NORMAL, mapInteract, 2);
    this.dataUrls['interact_down'] = this.generateDataUrl(this.INTERACT_PRESSED, mapInteract, 2);
    this.dataUrls['target'] = this.generateDataUrl(this.TARGET_LAYOUT, mapTarget, 2);
    this.dataUrls['grab'] = this.generateDataUrl(this.GRAB_CLOSED, mapGrab, 2);
    this.dataUrls['grab_open'] = this.generateDataUrl(this.GRAB_OPEN, mapDefault, 2);

    // CSS cursor strings with appropriate hotspots (scaled 2x: tip at 2, 2; center at 15, 15; hand at 14, 14)
    this.cursorCss = {
      [CursorState.DEFAULT]: `url('${this.dataUrls['default']}') 2 2, default`,
      [CursorState.DEFAULT_DOWN]: `url('${this.dataUrls['default_down']}') 4 4, default`,
      [CursorState.INTERACT]: `url('${this.dataUrls['interact']}') 2 2, pointer`,
      [CursorState.INTERACT_DOWN]: `url('${this.dataUrls['interact_down']}') 4 4, pointer`,
      [CursorState.TARGET]: `url('${this.dataUrls['target']}') 15 15, crosshair`,
      [CursorState.GRAB]: `url('${this.dataUrls['grab']}') 14 14, grabbing`,
      [CursorState.GRAB_OPEN]: `url('${this.dataUrls['grab_open']}') 14 14, grab`
    };
  }

  private generateDataUrl(layout: string[], colorMap: Record<string, string>, scale: number = 2): string {
    const width = layout[0].split(' ').length;
    const height = layout.length;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < height; y++) {
      const tokens = layout[y].split(' ');
      for (let x = 0; x < width; x++) {
        const color = colorMap[tokens[x]];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  private bindEvents(): void {
    // Window-level pointerdown/pointerup for tactile click feedback
    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isPointerDown = true;
        this.updateState();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isPointerDown = false;
        this.updateState();
      }
    });

    // Hook HTML DOM interactive overlays
    document.querySelectorAll('.interactive').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        this.setUIHover(true);
      });
      el.addEventListener('mouseleave', () => {
        this.setUIHover(false);
      });
    });
  }

  public setUIHover(hovering: boolean): void {
    if (this.isHoveringUI !== hovering) {
      this.isHoveringUI = hovering;
      this.updateState();
    }
  }

  public setHoldingItem(holding: boolean): void {
    if (this.isHoldingItem !== holding) {
      this.isHoldingItem = holding;
      this.updateState();
    }
  }

  public setEnemyTarget(targeted: boolean): void {
    if (this.isHoveringEnemy !== targeted) {
      this.isHoveringEnemy = targeted;
      this.updateState();
    }
  }

  public setDroppedItemHover(hovered: boolean): void {
    if (this.isHoveringDroppedItem !== hovered) {
      this.isHoveringDroppedItem = hovered;
      this.updateState();
    }
  }

  public setTileInReach(inReach: boolean): void {
    if (this.isTileInReach !== inReach) {
      this.isTileInReach = inReach;
      this.updateState();
    }
  }

  public updateState(): void {
    let targetState: CursorState;

    if (this.isHoldingItem) {
      targetState = CursorState.GRAB;
    } else if (this.isHoveringUI) {
      targetState = this.isPointerDown ? CursorState.INTERACT_DOWN : CursorState.INTERACT;
    } else if (this.isHoveringEnemy) {
      targetState = CursorState.TARGET;
    } else if (this.isHoveringDroppedItem) {
      targetState = this.isPointerDown ? CursorState.INTERACT_DOWN : CursorState.INTERACT;
    } else if (this.isTileInReach) {
      targetState = this.isPointerDown ? CursorState.INTERACT_DOWN : CursorState.INTERACT;
    } else {
      targetState = this.isPointerDown ? CursorState.DEFAULT_DOWN : CursorState.DEFAULT;
    }

    this.applyCursor(targetState);
  }

  private applyCursor(state: CursorState): void {
    this.currentState = state;
    const css = this.cursorCss[state] || this.cursorCss[CursorState.DEFAULT];

    if (this.canvas) {
      this.canvas.style.cursor = css;
    }
    document.body.style.cursor = css;

    // Synchronize Phaser scene input managers if available
    const gameScenes = this.game.scene?.getScenes(true) || [];
    for (const sc of gameScenes) {
      if (sc.input) {
        sc.input.setDefaultCursor(css);
      }
    }
  }

  public getCurrentState(): CursorState {
    return this.currentState;
  }

  public isUIHovered(): boolean {
    return this.isHoveringUI;
  }

  public isItemHeld(): boolean {
    return this.isHoldingItem;
  }
}
