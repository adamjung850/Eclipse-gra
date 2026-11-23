import { ITEM_REGISTRY } from '../world/ItemTypes.js';

export class DroppedItem extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, itemId, amount = 1) {
    const itemData = ITEM_REGISTRY[itemId];
    const textureKey = itemData ? itemData.iconTexture : 'icon_dirt';
    super(scene, x, y, textureKey);

    this.itemId = itemId;
    this.amount = amount;
    this.lifeTime = 0;
    this.isCollected = false;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(0.8);
    this.setDepth(18);

    if (this.body) {
      this.body.setSize(14, 14);
      this.body.setBounce(0.35);
      this.body.setGravityY(650);
      this.body.setVelocity(
        (Math.random() - 0.5) * 120,
        -160 - Math.random() * 80
      );
      this.setCollideWorldBounds(true);
    }
  }

  updateItem(delta, playerX, playerY, onPickup) {
    if (this.isCollected) return;

    this.lifeTime += delta;
    if (this.lifeTime < 300) return;

    const dx = playerX - this.x;
    const dy = playerY - this.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < 85 * 85) {
      const dist = Math.sqrt(distSq);
      const speed = 280;
      if (this.body) {
        this.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      }

      if (dist < 20) {
        this.isCollected = true;
        onPickup(this);
        this.destroy();
      }
    }
  }
}
