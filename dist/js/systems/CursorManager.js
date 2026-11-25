export var CursorState;
(function (CursorState) {
    CursorState["DEFAULT"] = "default";
    CursorState["DEFAULT_DOWN"] = "default_down";
    CursorState["INTERACT"] = "interact";
    CursorState["INTERACT_DOWN"] = "interact_down";
    CursorState["TARGET"] = "target";
    CursorState["GRAB"] = "grab";
    CursorState["GRAB_OPEN"] = "grab_open";
})(CursorState || (CursorState = {}));
export class CursorManager {
    static instance = null;
    game;
    canvas = null;
    currentState = CursorState.DEFAULT;
    // Interaction State Flags
    isPointerDown = false;
    isHoveringUI = false;
    isHoldingItem = false;
    isHoveringEnemy = false;
    isHoveringDroppedItem = false;
    isTileInReach = false;
    // CSS cursor definitions
    cursorCss = {};
    dataUrls = {};
    // Pixel Art Matrices (16x16 logical)
    ARROW_NORMAL = [
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
    ARROW_PRESSED = [
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
    INTERACT_NORMAL = [
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
    INTERACT_PRESSED = [
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
    TARGET_LAYOUT = [
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
    GRAB_CLOSED = [
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
    GRAB_OPEN = [
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
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.initCursors();
        this.bindEvents();
        this.updateState();
    }
    static getInstance(game) {
        if (!CursorManager.instance && game) {
            CursorManager.instance = new CursorManager(game);
        }
        return CursorManager.instance;
    }
    initCursors() {
        const mapDefault = {
            '#': '#10121a',
            'W': '#ffffff',
            'S': '#cbd5e1'
        };
        const mapInteract = {
            '#': '#280508',
            'R': '#ff2a44',
            'H': '#ff94a0',
            'S': '#b91c1c'
        };
        const mapTarget = {
            '#': '#280508',
            'R': '#ff2a44',
            'H': '#ff94a0'
        };
        const mapGrab = {
            '#': '#280508',
            'R': '#ff2a44',
            'H': '#ff94a0'
        };
        // Render crisp 16x16 pixel art canvas data URLs (classic 1:1 retro scale)
        this.dataUrls['default'] = this.generateDataUrl(this.ARROW_NORMAL, mapDefault, 1);
        this.dataUrls['default_down'] = this.generateDataUrl(this.ARROW_PRESSED, mapDefault, 1);
        this.dataUrls['interact'] = this.generateDataUrl(this.INTERACT_NORMAL, mapInteract, 1);
        this.dataUrls['interact_down'] = this.generateDataUrl(this.INTERACT_PRESSED, mapInteract, 1);
        this.dataUrls['target'] = this.generateDataUrl(this.TARGET_LAYOUT, mapTarget, 1);
        this.dataUrls['grab'] = this.generateDataUrl(this.GRAB_CLOSED, mapGrab, 1);
        this.dataUrls['grab_open'] = this.generateDataUrl(this.GRAB_OPEN, mapDefault, 1);
        // CSS cursor strings with appropriate hotspots (scale 1: tip at 1, 1; center at 7, 7)
        this.cursorCss = {
            [CursorState.DEFAULT]: `url('${this.dataUrls['default']}') 1 1, default`,
            [CursorState.DEFAULT_DOWN]: `url('${this.dataUrls['default_down']}') 2 2, default`,
            [CursorState.INTERACT]: `url('${this.dataUrls['interact']}') 1 1, pointer`,
            [CursorState.INTERACT_DOWN]: `url('${this.dataUrls['interact_down']}') 2 2, pointer`,
            [CursorState.TARGET]: `url('${this.dataUrls['target']}') 7 7, crosshair`,
            [CursorState.GRAB]: `url('${this.dataUrls['grab']}') 7 7, grabbing`,
            [CursorState.GRAB_OPEN]: `url('${this.dataUrls['grab_open']}') 7 7, grab`
        };
    }
    generateDataUrl(layout, colorMap, scale = 2) {
        const width = layout[0].split(' ').length;
        const height = layout.length;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return '';
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
    bindEvents() {
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
    setUIHover(hovering) {
        if (this.isHoveringUI !== hovering) {
            this.isHoveringUI = hovering;
            this.updateState();
        }
    }
    setHoldingItem(holding) {
        if (this.isHoldingItem !== holding) {
            this.isHoldingItem = holding;
            this.updateState();
        }
    }
    setEnemyTarget(targeted) {
        if (this.isHoveringEnemy !== targeted) {
            this.isHoveringEnemy = targeted;
            this.updateState();
        }
    }
    setDroppedItemHover(hovered) {
        if (this.isHoveringDroppedItem !== hovered) {
            this.isHoveringDroppedItem = hovered;
            this.updateState();
        }
    }
    setTileInReach(inReach) {
        if (this.isTileInReach !== inReach) {
            this.isTileInReach = inReach;
            this.updateState();
        }
    }
    updateState() {
        let targetState;
        if (this.isHoldingItem) {
            targetState = CursorState.GRAB;
        }
        else if (this.isHoveringUI) {
            targetState = this.isPointerDown ? CursorState.INTERACT_DOWN : CursorState.INTERACT;
        }
        else if (this.isHoveringEnemy) {
            targetState = CursorState.TARGET;
        }
        else if (this.isHoveringDroppedItem) {
            targetState = this.isPointerDown ? CursorState.INTERACT_DOWN : CursorState.INTERACT;
        }
        else if (this.isTileInReach) {
            targetState = this.isPointerDown ? CursorState.INTERACT_DOWN : CursorState.INTERACT;
        }
        else {
            targetState = this.isPointerDown ? CursorState.DEFAULT_DOWN : CursorState.DEFAULT;
        }
        this.applyCursor(targetState);
    }
    applyCursor(state) {
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
    getCurrentState() {
        return this.currentState;
    }
    isUIHovered() {
        return this.isHoveringUI;
    }
    resetAll() {
        this.isHoveringUI = false;
        this.isHoldingItem = false;
        this.isHoveringEnemy = false;
        this.isHoveringDroppedItem = false;
        this.isTileInReach = false;
        this.isPointerDown = false;
        this.updateState();
    }
    isItemHeld() {
        return this.isHoldingItem;
    }
}
