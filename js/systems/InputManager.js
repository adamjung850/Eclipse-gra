import { GAME_CONSTANTS } from '../types/index.js';
export class InputManager {
    scene;
    player;
    // Key objects
    keyA;
    keyD;
    keyW;
    keyS;
    keySpace;
    keyE;
    keyEsc;
    keyQ;
    cursors;
    // Number keys 1-9
    numKeys = [];
    // Callbacks
    onToggleInventory;
    onToggleMenu;
    onDropItem;
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.initKeys();
        this.initMouseWheel();
    }
    initKeys() {
        const kb = this.scene.input.keyboard;
        if (!kb)
            return;
        this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.keySpace = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.keyQ = kb.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.cursors = kb.createCursorKeys();
        // 1-9 hotbar selection
        const numberKeyCodes = [
            Phaser.Input.Keyboard.KeyCodes.ONE,
            Phaser.Input.Keyboard.KeyCodes.TWO,
            Phaser.Input.Keyboard.KeyCodes.THREE,
            Phaser.Input.Keyboard.KeyCodes.FOUR,
            Phaser.Input.Keyboard.KeyCodes.FIVE,
            Phaser.Input.Keyboard.KeyCodes.SIX,
            Phaser.Input.Keyboard.KeyCodes.SEVEN,
            Phaser.Input.Keyboard.KeyCodes.EIGHT,
            Phaser.Input.Keyboard.KeyCodes.NINE
        ];
        numberKeyCodes.forEach((code, idx) => {
            const key = kb.addKey(code);
            key.on('down', () => {
                this.player.selectedSlot = idx;
            });
            this.numKeys.push(key);
        });
        // Toggle Inventory on 'E'
        this.keyE.on('down', () => {
            if (this.onToggleInventory)
                this.onToggleInventory();
        });
        // Toggle Menu on 'ESC'
        this.keyEsc.on('down', () => {
            if (this.onToggleMenu)
                this.onToggleMenu();
        });
        // Drop item on 'Q'
        this.keyQ.on('down', () => {
            if (this.onDropItem)
                this.onDropItem();
        });
    }
    initMouseWheel() {
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                // Next slot
                this.player.selectedSlot = (this.player.selectedSlot + 1) % GAME_CONSTANTS.HOTBAR_SLOTS;
            }
            else if (deltaY < 0) {
                // Prev slot
                this.player.selectedSlot =
                    (this.player.selectedSlot - 1 + GAME_CONSTANTS.HOTBAR_SLOTS) % GAME_CONSTANTS.HOTBAR_SLOTS;
            }
        });
    }
    update(delta) {
        const moveLeft = this.keyA.isDown || this.cursors.left.isDown;
        const moveRight = this.keyD.isDown || this.cursors.right.isDown;
        const jumpPressed = Phaser.Input.Keyboard.JustDown(this.keySpace) ||
            Phaser.Input.Keyboard.JustDown(this.keyW) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.up);
        const jumpHeld = this.keySpace.isDown || this.keyW.isDown || this.cursors.up.isDown;
        this.player.updatePlayer(delta, moveLeft, moveRight, jumpPressed, jumpHeld);
    }
}
