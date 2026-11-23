import { ITEM_REGISTRY } from '../world/ItemTypes.js';
export class DroppedItem extends Phaser.Physics.Arcade.Sprite {
    itemId;
    amount;
    lifeTime = 0;
    isCollected = false;
    constructor(scene, x, y, itemId, amount = 1) {
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
            this.body.setBounce(0.35);
            this.body.setGravityY(650);
            this.body.setVelocity((Math.random() - 0.5) * 120, -160 - Math.random() * 80);
            this.setCollideWorldBounds(true);
        }
    }
    updateItem(delta, playerX, playerY, onPickup) {
        if (this.isCollected)
            return;
        this.lifeTime += delta;
        const body = this.body;
        if (body && body.gravity.y !== 650) {
            body.setAllowGravity(true);
            body.setGravityY(650);
        }
        // Don't pick up during first 300ms to allow arc toss
        if (this.lifeTime < 300)
            return;
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distSq = dx * dx + dy * dy;
        // Magnetic pickup radius (85px)
        if (distSq < 85 * 85) {
            const dist = Math.sqrt(distSq);
            const speed = 280;
            if (this.body) {
                this.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
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
