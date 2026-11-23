import { ITEM_REGISTRY } from '../world/ItemTypes.js';

export class DroppedItem extends Phaser.Physics.Arcade.Sprite {
  public itemId: string;
  public amount: number;
  private lifeTime: number = 0;
  private isCollected: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, itemId: string, amount: number = 1) {
    const itemData = ITEM_REGISTRY[itemId];
    const textureKey = itemData ? itemData.iconTexture : 'icon_dirt';
    super(scene, x, y, textureKey);

    this.itemId = itemId;
    this.amount = amount;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.8);
    this.setDepth(18);

    if (this.body) {
      this.body.setSize(14, 14);
      (this.body as Phaser.Physics.Arcade.Body).setBounce(0.35);
      (this.body as Phaser.Physics.Arcade.Body).setGravityY(650);
      (this.body as Phaser.Physics.Arcade.Body).setVelocity(
        (Math.random() - 0.5) * 120,
        -160 - Math.random() * 80
      );
      this.setCollideWorldBounds(true);
    }
  }

  public updateItem(delta: number, playerX: number, playerY: number, onPickup: (item: DroppedItem) => void): void {
    if (this.isCollected) return;

    this.lifeTime += delta;

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body && body.gravity.y !== 650) {
      body.setAllowGravity(true);
      body.setGravityY(650);
    }

    // Don't pick up during first 300ms to allow arc toss
    if (this.lifeTime < 300) return;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distSq = dx * dx + dy * dy;

    // Magnetic pickup radius (85px)
    if (distSq < 85 * 85) {
      const dist = Math.sqrt(distSq);
      const speed = 280;
      if (this.body) {
        (this.body as Phaser.Physics.Arcade.Body).setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }

      // Collect when close
      if (dist < 20) {
        this.isCollected = true;
        onPickup(this);
        this.destroy();
      }
    }
  }
}
