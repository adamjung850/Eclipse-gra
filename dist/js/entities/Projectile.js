export class Projectile extends Phaser.Physics.Arcade.Sprite {
    damage;
    critChance;
    isMagic;
    lifespanTimer = 3000;
    constructor(scene, x, y, texture, damage, critChance, velocityX, velocityY, isMagic = false) {
        super(scene, x, y, texture);
        this.damage = damage;
        this.critChance = critChance;
        this.isMagic = isMagic;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(21);
        this.initPhysics(velocityX, velocityY);
    }
    initPhysics(vx, vy) {
        const body = this.body;
        if (!body)
            return;
        if (this.isMagic) {
            body.setSize(8, 8);
            body.setAllowGravity(false);
        }
        else {
            body.setSize(12, 4);
            body.setGravityY(350); // slight ballistic trajectory for arrows
        }
        body.setVelocity(vx, vy);
        this.updateAngle();
    }
    updateProjectile(delta) {
        this.lifespanTimer -= delta;
        if (this.lifespanTimer <= 0) {
            this.destroy();
            return;
        }
        this.updateAngle();
    }
    updateAngle() {
        const body = this.body;
        if (body) {
            if (this.isMagic) {
                this.rotation += 0.12; // mystical spin
            }
            else {
                this.rotation = Math.atan2(body.velocity.y, body.velocity.x);
            }
        }
    }
}
