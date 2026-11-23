import { TextureGenerator } from '../textures/TextureGenerator.js';
export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }
    preload() {
        // Preload external block and wall textures
        this.load.image('texture_dirt', 'assets/textures/dirt.png');
        this.load.image('texture_grass', 'assets/textures/grass_block.png');
        this.load.image('texture_dirt_wall', 'assets/textures/dirt_wall.png');
    }
    create() {
        // Generate all procedural and loaded pixel textures into Phaser's Texture Manager
        TextureGenerator.generateAll(this);
        this.scene.start('GameScene');
    }
}
