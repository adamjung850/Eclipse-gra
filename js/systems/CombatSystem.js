import { ItemCategory } from '../types/index.js';
import { Projectile } from '../entities/Projectile.js';
import { DroppedItem } from '../entities/DroppedItem.js';
export class CombatSystem {
    scene;
    player;
    enemies;
    projectiles;
    droppedItems;
    worldManager;
    sounds;
    // Particle Emitter for impacts
    sparkEmitter;
    // Cooldown timers
    lastAttackTime = 0;
    // Slash effect sprite pool
    slashSprite;
    constructor(scene, player, enemies, projectiles, droppedItems, worldManager, sounds) {
        this.scene = scene;
        this.player = player;
        this.enemies = enemies;
        this.projectiles = projectiles;
        this.droppedItems = droppedItems;
        this.worldManager = worldManager;
        this.sounds = sounds;
        // Initialize slash effect
        this.slashSprite = scene.add.sprite(0, 0, 'effect_slash');
        this.slashSprite.setDepth(22);
        this.slashSprite.setVisible(false);
        // Initialize hit spark particles
        this.sparkEmitter = scene.add.particles(0, 0, 'particle_spark', {
            lifespan: 300,
            speed: { min: 60, max: 180 },
            scale: { start: 1.2, end: 0.1 },
            gravityY: 300,
            emitting: false
        });
        this.sparkEmitter.setDepth(26);
        this.initColliders();
    }
    initColliders() {
        // 1. Projectiles collide with solid world blocks
        this.scene.physics.add.collider(this.projectiles, this.worldManager.foregroundLayer, (projObj) => {
            const proj = projObj;
            this.sparkEmitter.explode(4, proj.x, proj.y);
            proj.destroy();
        });
        // 2. Projectiles hit enemies
        this.scene.physics.add.overlap(this.projectiles, this.enemies, (projObj, enemyObj) => {
            const proj = projObj;
            const enemy = enemyObj;
            if (!proj.active || !enemy.active)
                return;
            this.handleProjectileHit(proj, enemy);
        });
        // 3. Enemies collide with solid world blocks
        this.scene.physics.add.collider(this.enemies, this.worldManager.foregroundLayer);
        // 4. Enemy contact damage on player
        this.scene.physics.add.overlap(this.player, this.enemies, (pObj, eObj) => {
            const enemy = eObj;
            if (!enemy.active)
                return;
            this.handleEnemyContactDamage(enemy);
        });
    }
    update(time, delta, pointer) {
        // 1. Update Projectiles
        const projs = this.projectiles.getChildren();
        for (let i = projs.length - 1; i >= 0; i--) {
            const p = projs[i];
            if (p && p.active) {
                p.updateProjectile(delta);
            }
        }
        // 2. Update Enemies AI
        const enemyList = this.enemies.getChildren();
        for (let i = enemyList.length - 1; i >= 0; i--) {
            const e = enemyList[i];
            if (e && e.active) {
                e.updateEnemy(delta, this.player.x, this.player.y);
            }
        }
    }
    /**
     * Attempts player weapon attack. Returns true if weapon attack was performed.
     */
    handlePlayerAttack(time, pointer) {
        const selectedItem = this.player.getSelectedItem();
        if (!selectedItem)
            return false;
        // Check if item is a weapon or tool capable of swinging
        const isWeapon = selectedItem.category === ItemCategory.WEAPON;
        const isTool = selectedItem.category === ItemCategory.TOOL;
        if (!isWeapon && !isTool)
            return false;
        // Check attack speed cooldown
        const cooldown = isWeapon ? 320 : 250;
        if (time - this.lastAttackTime < cooldown)
            return false;
        this.lastAttackTime = time;
        const camera = this.scene.cameras.main;
        const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
        // Flip player towards attack target
        this.player.isFacingLeft = worldPoint.x < this.player.x;
        this.player.setFlipX(this.player.isFacingLeft);
        // Handle distinct weapon types
        if (selectedItem.id === 'hunting_bow') {
            this.fireBow(worldPoint.x, worldPoint.y, selectedItem);
        }
        else if (selectedItem.id === 'apprentice_staff') {
            this.castMagicStaff(worldPoint.x, worldPoint.y, selectedItem);
        }
        else {
            // Melee Sword, Dagger, Spear, Pickaxe, Axe
            this.performMeleeSwing(worldPoint.x, worldPoint.y, selectedItem);
        }
        return true;
    }
    performMeleeSwing(targetX, targetY, item) {
        // Trigger arm swing
        this.player.triggerToolSwing(targetX, targetY);
        this.sounds.play('sword_swing');
        // Display crescent slash arc
        const slashOffset = this.player.isFacingLeft ? -24 : 24;
        const slashAngle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
        this.slashSprite.setPosition(this.player.x + slashOffset, this.player.y - 2);
        this.slashSprite.setRotation(slashAngle);
        this.slashSprite.setFlipY(this.player.isFacingLeft);
        this.slashSprite.setVisible(true);
        this.slashSprite.setAlpha(0.9);
        this.scene.tweens.add({
            targets: this.slashSprite,
            alpha: 0,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 160,
            onComplete: () => {
                this.slashSprite.setVisible(false);
                this.slashSprite.setScale(1, 1);
            }
        });
        // Check hit against enemies in front arc
        const reach = (item.id === 'ancient_spear' ? 70 : 52);
        const enemies = this.enemies.getChildren();
        for (const enemy of enemies) {
            if (!enemy.active || enemy.isInvulnerable)
                continue;
            const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
            if (dist <= reach) {
                const isClose = dist <= 34; // Always hit nearby enemies within swing radius
                const isEnemyInFront = (enemy.x < this.player.x) === this.player.isFacingLeft;
                if (isClose || isEnemyInFront) {
                    this.applyDamageToEnemy(enemy, item);
                }
            }
        }
    }
    fireBow(targetX, targetY, bowItem) {
        this.player.triggerToolSwing(targetX, targetY);
        this.sounds.play('bow_shoot');
        const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
        const speed = 560;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const spawnX = this.player.x + (this.player.isFacingLeft ? -16 : 16);
        const spawnY = this.player.y - 4;
        const arrow = new Projectile(this.scene, spawnX, spawnY, 'proj_arrow', bowItem.damage || 20, (this.player.critChance + (bowItem.critChance || 0)), vx, vy, false);
        this.projectiles.add(arrow);
    }
    castMagicStaff(targetX, targetY, staffItem) {
        const manaCost = 8;
        if (this.player.mana < manaCost) {
            this.showCombatFloatingText(this.player.x, this.player.y - 25, 'Brak Many!', '#38bdf8');
            return;
        }
        this.player.mana -= manaCost;
        this.player.triggerToolSwing(targetX, targetY);
        this.sounds.play('magic_cast');
        const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
        const speed = 440;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const spawnX = this.player.x + (this.player.isFacingLeft ? -18 : 18);
        const spawnY = this.player.y - 6;
        const magicBolt = new Projectile(this.scene, spawnX, spawnY, 'proj_magic', staffItem.damage || 32, (this.player.critChance + (staffItem.critChance || 0)), vx, vy, true);
        this.projectiles.add(magicBolt);
    }
    handleProjectileHit(proj, enemy) {
        const baseDamage = proj.damage;
        const isCrit = Math.random() < proj.critChance;
        const damage = isCrit ? Math.round(baseDamage * 1.8) : baseDamage;
        const knockbackDir = proj.body?.velocity.x ? Math.sign(proj.body.velocity.x) : 1;
        const knockbackX = knockbackDir * (isCrit ? 60 : 42);
        const knockbackY = isCrit ? -155 : -135;
        const result = enemy.takeDamage(damage, knockbackX, knockbackY);
        this.sparkEmitter.explode(8, enemy.x, enemy.y);
        proj.destroy();
        if (result.finalDamage > 0) {
            if (isCrit) {
                this.sounds.play('hit_crit');
                this.showCombatFloatingText(enemy.x, enemy.y - 18, `KRYTYK! ${result.finalDamage}`, '#facc15', 15);
            }
            else {
                this.sounds.play('hit_enemy');
                this.showCombatFloatingText(enemy.x, enemy.y - 14, `-${result.finalDamage}`, '#ffffff', 12);
            }
        }
        if (result.isDead) {
            this.handleEnemyDefeated(enemy);
        }
    }
    applyDamageToEnemy(enemy, weaponItem) {
        const baseDamage = weaponItem.damage || 6;
        const isCrit = Math.random() < (this.player.critChance + (weaponItem.critChance || 0));
        const damage = isCrit ? Math.round(baseDamage * 1.8) : baseDamage;
        const knockbackDir = this.player.isFacingLeft ? -1 : 1;
        const knockbackX = knockbackDir * (isCrit ? 65 : 45);
        const knockbackY = isCrit ? -155 : -135;
        const result = enemy.takeDamage(damage, knockbackX, knockbackY);
        this.sparkEmitter.explode(10, enemy.x, enemy.y);
        if (result.finalDamage > 0) {
            if (isCrit) {
                this.sounds.play('hit_crit');
                this.showCombatFloatingText(enemy.x, enemy.y - 18, `KRYTYK! ${result.finalDamage}`, '#facc15', 15);
            }
            else {
                this.sounds.play('hit_enemy');
                this.showCombatFloatingText(enemy.x, enemy.y - 14, `-${result.finalDamage}`, '#ffffff', 12);
            }
        }
        if (result.isDead) {
            this.handleEnemyDefeated(enemy);
        }
    }
    handleEnemyContactDamage(enemy) {
        const knockbackDir = enemy.x < this.player.x ? 1 : -1;
        const knockbackX = knockbackDir * 125;
        const result = this.player.takeDamage(enemy.damage, knockbackX, -145);
        // Gently nudge enemy horizontally away, maintaining natural physics
        const enemyBody = enemy.body;
        if (enemyBody) {
            enemyBody.setVelocityX(-knockbackDir * 28);
        }
        if (result.tookDamage) {
            this.sounds.play('player_hurt');
            this.showCombatFloatingText(this.player.x, this.player.y - 20, `-${result.damageDealt} PŻ`, '#ef4444', 13);
            if (result.isDead) {
                this.sounds.play('player_hurt');
                this.showCombatFloatingText(this.player.x, this.player.y - 35, 'ZGINĄŁEŚ! Odrodzono w punkcie startowym', '#f43f5e', 14);
                this.player.respawn();
            }
        }
    }
    handleEnemyDefeated(enemy) {
        this.sounds.play('enemy_die');
        this.sparkEmitter.explode(18, enemy.x, enemy.y);
        // 1. Award XP
        const leveledUp = this.player.gainXp(enemy.xpReward);
        this.showCombatFloatingText(enemy.x, enemy.y - 24, `+${enemy.xpReward} PD`, '#38bdf8', 12);
        if (leveledUp) {
            this.sounds.play('level_up');
            this.showCombatFloatingText(this.player.x, this.player.y - 45, `AWANS! Poziom ${this.player.level}`, '#facc15', 16);
        }
        // 2. Spawn Loot Drops
        for (const drop of enemy.config.drops) {
            if (Math.random() <= drop.chance) {
                const count = Phaser.Math.Between(drop.min, drop.max);
                if (count > 0) {
                    const dropOffset = (Math.random() - 0.5) * 16;
                    const dropped = new DroppedItem(this.scene, enemy.x + dropOffset, enemy.y, drop.itemId, count);
                    this.droppedItems.add(dropped);
                }
            }
        }
    }
    showCombatFloatingText(worldX, worldY, text, color = '#ffffff', fontSize = 12) {
        const floatText = this.scene.add.text(worldX, worldY, text, {
            fontFamily: 'monospace',
            fontSize: `${fontSize}px`,
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        });
        floatText.setOrigin(0.5, 0.5);
        floatText.setDepth(50);
        this.scene.tweens.add({
            targets: floatText,
            y: worldY - 32,
            alpha: 0,
            duration: 850,
            ease: 'Power1',
            onComplete: () => {
                floatText.destroy();
            }
        });
    }
}
