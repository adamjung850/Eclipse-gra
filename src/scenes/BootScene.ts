import { TextureGenerator } from '../textures/TextureGenerator.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    // Preload external block, wall, and custom generated UI / Boss textures
    this.load.image('texture_dirt', 'assets/textures/dirt.png');
    this.load.image('texture_grass', 'assets/textures/grass_block.png');
    this.load.image('texture_dirt_wall', 'assets/textures/dirt_wall.png');
    this.load.image('bossbar_vormak_frame', 'assets/textures/bossbar_vormak_frame.png?v=6.9');
    this.load.image('bossbar_vormak_fill', 'assets/textures/bossbar_vormak_fill.png?v=6.9');
    this.load.image('bossbar_vormak_title', 'assets/textures/bossbar_vormak_title.png?v=6.9');
    this.load.image('boss_vormak_head', 'assets/textures/boss_vormak_head.png?v=6.9');
    this.load.image('boss_vormak_jaw', 'assets/textures/boss_vormak_jaw.png?v=6.9');
    this.load.image('boss_vormak_body', 'assets/textures/boss_vormak_body.png?v=6.9');
    this.load.image('boss_vormak_tail', 'assets/textures/boss_vormak_tail.png?v=6.9');
    this.load.image('boss_vormak_claw', 'assets/textures/boss_vormak_claw.png?v=6.9');
  }

  public create(): void {
    // Generate all procedural and loaded pixel textures into Phaser's Texture Manager
    TextureGenerator.generateAll(this);
    this.scene.start('IntroScene');
  }
}
