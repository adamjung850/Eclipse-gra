import { TextureGenerator } from '../textures/TextureGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    // Generate all procedural pixel textures into Phaser's Texture Manager
    TextureGenerator.generateAll(this);
  }

  public create(): void {
    this.scene.start('GameScene');
  }
}
