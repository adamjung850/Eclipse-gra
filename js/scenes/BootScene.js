import { TextureGenerator } from '../textures/TextureGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    TextureGenerator.generateAll(this);
  }

  create() {
    this.scene.start('GameScene');
  }
}
