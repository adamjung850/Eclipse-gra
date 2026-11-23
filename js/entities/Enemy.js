import { GAME_CONSTANTS } from '../types/index.js';
export const ENEMY_TYPES = {
    slime: {
        id: 'slime',
        name: 'Zielony Szlam',
        texture: 'enemy_slime_green',
        width: 24,
        height: 20,
        bodyWidth: 18,
        bodyHeight: 14,
        maxHp: 32,
        damage: 8,
        defense: 1,
        speed: 55, // Spokojne, powolne skoki w stylu Terrarii
        xpReward: 15,
        behavior: 'slime',
        drops: [
            { itemId: 'torch', min: 2, max: 4, chance: 0.8 },
            { itemId: 'wood', min: 1, max: 3, chance: 0.6 },
            { itemId: 'sapling', min: 1, max: 2, chance: 0.4 }
        ]
    },
    crawler: {
        id: 'crawler',
        name: 'Skalny Pełzacz',
        texture: 'enemy_crawler',
        width: 26,
        height: 16,
        bodyWidth: 20,
        bodyHeight: 13,
        maxHp: 55,
        damage: 14,
        defense: 4,
        speed: 78,
        xpReward: 25,
        behavior: 'crawler',
        drops: [
            { itemId: 'coal', min: 1, max: 3, chance: 0.75 },
            { itemId: 'copper_ore', min: 1, max: 2, chance: 0.5 },
            { itemId: 'stone', min: 2, max: 5, chance: 0.9 }
        ]
    },
    skeleton: {
        id: 'skeleton',
        name: 'Szkielet Górnika',
        texture: 'enemy_skeleton',
        width: 20,
        height: 36,
        bodyWidth: 16,
        bodyHeight: 32,
        maxHp: 85,
        damage: 18,
        defense: 6,
        speed: 62,
        xpReward: 45,
        behavior: 'skeleton',
        drops: [
            { itemId: 'iron_ore', min: 1, max: 3, chance: 0.65 },
            { itemId: 'coal', min: 2, max: 4, chance: 0.8 },
            { itemId: 'torch', min: 3, max: 6, chance: 0.7 },
            { itemId: 'iron_bar', min: 1, max: 1, chance: 0.15 }
        ]
    },
    bat: {
        id: 'bat',
        name: 'Otchłanny Nietoperz',
        texture: 'enemy_bat',
        width: 24,
        height: 16,
        bodyWidth: 18,
        bodyHeight: 12,
        maxHp: 28,
        damage: 12,
        defense: 2,
        speed: 105,
        xpReward: 20,
        behavior: 'bat',
        flying: true,
        drops: [
            { itemId: 'astral_crystal', min: 1, max: 1, chance: 0.12 },
            { itemId: 'torch', min: 1, max: 3, chance: 0.5 },
            { itemId: 'coal', min: 1, max: 2, chance: 0.6 }
        ]
    }
};
export class Enemy extends Phaser.Physics.Arcade.Sprite {
    config;
    enemyName;
    hp;
    maxHp;
    damage;
    defense;
    xpReward;
    // Slime Variant (3 colors x 3 sizes)
    slimeVariant;
    slimeScale = 1.0;
    // AI & Internal state
    aiTimer = 0;
    hopCooldown = 1000; // ms
    wanderDirection = 1;
    flashTimer = 0;
    stunTimer = 0; // Hitstun during knockback
    isInvulnerable = false;
    invulnTimer = 0;
    jumpCooldown = 0; // Fixes infinite jumping / insect flying bug
    // Slime Aggro & Pursuit (chase player when damaged)
    slimeAggroTimer = 0;
    // Slime Dynamic Cyclops Eye
    eyePupilGraphic;
    stareAtPlayerTimer = 0;
    idleEyeTimer = 0;
    pupilTargetX = 0;
    pupilTargetY = 0;
    pupilCurrentX = 0;
    pupilCurrentY = 0;
    // Visual Health Bar
    hpBarGraphic;
    // Advanced Physics & Squash/Stretch Juice
    wasInAir = false;
    isSquashing = false;
    // On death callback
    onKilled;
    constructor(scene, x, y, typeKey, variant) {
        const baseConfig = ENEMY_TYPES[typeKey] || ENEMY_TYPES.slime;
        const config = { ...baseConfig };
        let enemyTexture = config.texture;
        let computedScale = 1.0;
        let computedName = config.name;
        // Initialize Slime Variations (3 colors x 3 sizes)
        let slimeVar;
        if (config.behavior === 'slime') {
            if (!variant) {
                const colors = ['green', 'blue', 'red'];
                const sizes = ['small', 'medium', 'large'];
                slimeVar = {
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: sizes[Math.floor(Math.random() * sizes.length)]
                };
            }
            else {
                slimeVar = variant;
            }
            enemyTexture = `enemy_slime_${slimeVar.color}`;
            // Color stat adjustments
            let hpMult = 1.0;
            let dmgMult = 1.0;
            let colorName = 'Zielony Szlam';
            if (slimeVar.color === 'blue') {
                hpMult = 1.35;
                dmgMult = 1.15;
                colorName = 'Błękitny Szlam';
            }
            else if (slimeVar.color === 'red') {
                hpMult = 1.1;
                dmgMult = 1.5;
                colorName = 'Karmazynowy Szlam';
            }
            // Size adjustments
            let sizePrefix = '';
            if (slimeVar.size === 'small') {
                computedScale = 0.72;
                hpMult *= 0.7;
                dmgMult *= 0.8;
                sizePrefix = 'Mały ';
            }
            else if (slimeVar.size === 'medium') {
                computedScale = 1.0;
                sizePrefix = '';
            }
            else if (slimeVar.size === 'large') {
                computedScale = 1.45;
                hpMult *= 1.6;
                dmgMult *= 1.35;
                sizePrefix = 'Wielki ';
            }
            computedName = `${sizePrefix}${colorName}`;
            config.maxHp = Math.round(config.maxHp * hpMult);
            config.damage = Math.round(config.damage * dmgMult);
            config.xpReward = Math.round(config.xpReward * (computedScale >= 1.2 ? 1.6 : computedScale <= 0.8 ? 0.8 : 1.0));
        }
        super(scene, x, y, enemyTexture);
        this.config = config;
        this.enemyName = computedName;
        this.slimeVariant = slimeVar;
        this.slimeScale = computedScale;
        this.hp = config.maxHp;
        this.maxHp = config.maxHp;
        this.damage = config.damage;
        this.defense = config.defense;
        this.xpReward = config.xpReward;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(18);
        this.setScale(this.slimeScale);
        this.initPhysics();
        this.hpBarGraphic = scene.add.graphics();
        this.hpBarGraphic.setDepth(25);
        // Dynamic pupil for Slime's big eye
        if (this.config.behavior === 'slime') {
            this.eyePupilGraphic = scene.add.graphics();
            this.eyePupilGraphic.setDepth(19);
        }
    }
    initPhysics() {
        const body = this.body;
        if (!body)
            return;
        // Use unscaled texture coordinates: Phaser automatically scales body width/height and offset by gameObject.scaleX / scaleY!
        const offsetX = Math.floor((this.config.width - this.config.bodyWidth) / 2);
        const offsetY = Math.floor(this.config.height - this.config.bodyHeight);
        body.setSize(this.config.bodyWidth, this.config.bodyHeight);
        body.setOffset(offsetX, offsetY);
        if (this.config.flying) {
            body.setAllowGravity(false);
            body.setGravityY(0);
            body.setBounce(0.2, 0.2);
        }
        else {
            body.setAllowGravity(true);
            body.setGravityY(GAME_CONSTANTS.GRAVITY);
            body.setMaxVelocity(280, 650);
            body.setBounce(0, 0);
            body.setDragX(this.config.behavior === 'slime' ? 320 : 180);
        }
        this.setCollideWorldBounds(true);
    }
    triggerLandingSquash() {
        if (this.isSquashing || !this.active)
            return;
        this.isSquashing = true;
        const baseScale = this.slimeScale;
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            scaleX: baseScale * 1.25,
            scaleY: baseScale * 0.78,
            duration: 85,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.active) {
                    this.setScale(baseScale);
                    this.isSquashing = false;
                }
            }
        });
    }
    triggerJumpStretch() {
        if (!this.active || this.isSquashing)
            return;
        const baseScale = this.slimeScale;
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            scaleX: baseScale * 0.85,
            scaleY: baseScale * 1.20,
            duration: 110,
            yoyo: true,
            ease: 'Sine.easeOut',
            onComplete: () => {
                if (this.active && !this.isSquashing) {
                    this.setScale(baseScale);
                }
            }
        });
    }
    updateEnemy(delta, playerX, playerY) {
        const body = this.body;
        if (!body || !this.active)
            return;
        // Ensure ground enemies have active gravity identical to the player at all times
        if (!this.config.flying && body.gravity.y !== GAME_CONSTANTS.GRAVITY) {
            body.setAllowGravity(true);
            body.setGravityY(GAME_CONSTANTS.GRAVITY);
        }
        const isGrounded = body.blocked.down || body.touching.down;
        // Advanced Physics Juice: Landing squash when hitting the ground from mid-air
        if (this.wasInAir && isGrounded && body.velocity.y >= 0 && !this.config.flying) {
            this.triggerLandingSquash();
        }
        this.wasInAir = !isGrounded;
        // Handle hit flash
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
            if (this.flashTimer <= 0) {
                this.clearTint();
            }
        }
        // Handle i-frames
        if (this.invulnTimer > 0) {
            this.invulnTimer -= delta;
            if (this.invulnTimer <= 0) {
                this.isInvulnerable = false;
            }
        }
        // Handle Slime Aggro duration
        if (this.slimeAggroTimer > 0) {
            this.slimeAggroTimer -= delta;
        }
        // Handle hitstun (knockback momentum without AI overwrite)
        if (this.stunTimer > 0) {
            this.stunTimer -= delta;
            if (isGrounded) {
                body.setVelocityX(body.velocity.x * 0.85);
            }
        }
        else {
            // Execute behavior AI
            this.executeAI(delta, playerX, playerY);
        }
        // Update Slime's Dynamic Eye
        if (this.config.behavior === 'slime') {
            this.updateSlimeEye(delta, playerX, playerY);
        }
        // Update HP Bar position & display
        this.updateHpBar();
    }
    updateSlimeEye(delta, playerX, playerY) {
        if (!this.eyePupilGraphic || !this.active)
            return;
        this.eyePupilGraphic.clear();
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const scale = this.slimeScale;
        if (this.stareAtPlayerTimer > 0 || this.slimeAggroTimer > 0) {
            // Stare directly at the player after being attacked / when aggroed!
            if (this.stareAtPlayerTimer > 0)
                this.stareAtPlayerTimer -= delta;
            const angle = Math.atan2(dy, dx);
            this.pupilTargetX = Math.cos(angle) * (2.2 * scale);
            this.pupilTargetY = Math.sin(angle) * (1.5 * scale);
        }
        else {
            // Idle: look left and right periodically
            this.idleEyeTimer -= delta;
            if (this.idleEyeTimer <= 0) {
                this.idleEyeTimer = 1400 + Math.random() * 1600;
                const roll = Math.random();
                if (roll < 0.35) {
                    this.pupilTargetX = -2.1 * scale; // Look left
                    this.pupilTargetY = 0;
                }
                else if (roll < 0.70) {
                    this.pupilTargetX = 2.1 * scale; // Look right
                    this.pupilTargetY = 0;
                }
                else {
                    this.pupilTargetX = 0; // Look center
                    this.pupilTargetY = 0;
                }
            }
        }
        // Smooth lerp to target pupil position
        this.pupilCurrentX += (this.pupilTargetX - this.pupilCurrentX) * 0.18;
        this.pupilCurrentY += (this.pupilTargetY - this.pupilCurrentY) * 0.18;
        // Eye center matches texture center (12, 10 on 24x20)
        const eyeCenterX = Math.round(this.x);
        const eyeCenterY = Math.round(this.y);
        const px = Math.round(eyeCenterX + this.pupilCurrentX);
        const py = Math.round(eyeCenterY + this.pupilCurrentY);
        const pupilSize = Math.max(2, Math.round(3 * scale));
        const glintSize = Math.max(1, Math.round(1 * scale));
        const halfPupil = Math.floor(pupilSize / 2);
        // Dark pupil
        this.eyePupilGraphic.fillStyle(0x090d16, 1);
        this.eyePupilGraphic.fillRect(px - halfPupil, py - halfPupil, pupilSize, pupilSize);
        // White eye shine glint (at top-left)
        this.eyePupilGraphic.fillStyle(0xffffff, 0.9);
        this.eyePupilGraphic.fillRect(px - halfPupil, py - halfPupil, glintSize, glintSize);
    }
    executeAI(delta, playerX, playerY) {
        const body = this.body;
        if (!body)
            return;
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distToPlayer = Math.sqrt(dx * dx + dy * dy);
        const dirToPlayer = dx > 0 ? 1 : -1;
        const isGrounded = body.blocked.down || body.touching.down;
        switch (this.config.behavior) {
            case 'slime': {
                this.hopCooldown -= delta;
                if (isGrounded) {
                    // Strong ground friction: stops completely between hops
                    body.setVelocityX(body.velocity.x * 0.70);
                    // If time to hop:
                    if (this.hopCooldown <= 0) {
                        const isAggro = this.slimeAggroTimer > 0;
                        const chaseDist = isAggro ? 420 : 250;
                        if (distToPlayer < chaseDist) {
                            if (isAggro) {
                                // Aggro pursuit: calm, low, steady hops directly towards player (Terraria style)
                                this.hopCooldown = 1100 + Math.random() * 400;
                                const hopStrengthX = 46 + Math.random() * 12;
                                const hopStrengthY = -165; // Clean natural hop (~1.2 tiles)
                                body.setVelocityX(dirToPlayer * hopStrengthX);
                                body.setVelocityY(hopStrengthY);
                                this.setFlipX(dirToPlayer < 0);
                                this.triggerJumpStretch();
                            }
                            else {
                                // Calm, gentle idle-approach (Terraria style)
                                this.hopCooldown = 1800 + Math.random() * 800;
                                const hopStrengthX = 32 + Math.random() * 10;
                                const hopStrengthY = -145; // Gentle low hop (~0.9 tiles)
                                body.setVelocityX(dirToPlayer * hopStrengthX);
                                body.setVelocityY(hopStrengthY);
                                this.setFlipX(dirToPlayer < 0);
                                this.triggerJumpStretch();
                            }
                        }
                        else {
                            // Idle hopping: occasionally wander slowly
                            this.hopCooldown = 2400 + Math.random() * 1500;
                            if (Math.random() < 0.55) {
                                this.wanderDirection = Math.random() > 0.5 ? 1 : -1;
                                body.setVelocityX(this.wanderDirection * 26);
                                body.setVelocityY(-135);
                                this.setFlipX(this.wanderDirection < 0);
                                this.triggerJumpStretch();
                            }
                        }
                    }
                }
                break;
            }
            case 'crawler': {
                if (this.jumpCooldown > 0) {
                    this.jumpCooldown -= delta;
                }
                if (distToPlayer < 380) {
                    // Pursuit mode
                    body.setVelocityX(dirToPlayer * this.config.speed);
                    this.setFlipX(dirToPlayer < 0);
                    // Obstacle avoidance: ONLY hop once if grounded and moving down/flat
                    // Strict rate-limiting prevents infinite flying bug
                    if (isGrounded && this.jumpCooldown <= 0 && body.velocity.y >= 0) {
                        if (body.blocked.left || body.blocked.right) {
                            this.jumpCooldown = 750; // Cannot jump again for 750ms!
                            body.setVelocityY(-240); // Gentle single hop to climb 1-tile ledge
                            body.setVelocityX(dirToPlayer * (this.config.speed + 10));
                        }
                    }
                }
                else {
                    // Idle crawl
                    this.aiTimer += delta;
                    if (this.aiTimer > 2800) {
                        this.aiTimer = 0;
                        this.wanderDirection = this.wanderDirection === 1 ? -1 : 1;
                    }
                    else if (isGrounded && (body.blocked.left || body.blocked.right) && this.jumpCooldown <= 0) {
                        this.jumpCooldown = 600;
                        this.wanderDirection = this.wanderDirection === 1 ? -1 : 1;
                    }
                    body.setVelocityX(this.wanderDirection * 35);
                    this.setFlipX(this.wanderDirection < 0);
                }
                break;
            }
            case 'skeleton': {
                if (this.jumpCooldown > 0) {
                    this.jumpCooldown -= delta;
                }
                if (distToPlayer < 360) {
                    // Pursuit mode
                    body.setVelocityX(dirToPlayer * this.config.speed);
                    this.setFlipX(dirToPlayer < 0);
                    // Jump up if obstacle ahead or player above - strictly rate-limited
                    if (isGrounded && this.jumpCooldown <= 0 && body.velocity.y >= 0) {
                        if (body.blocked.left || body.blocked.right || (dy < -35 && Math.abs(dx) < 90)) {
                            this.jumpCooldown = 800; // Cannot jump again for 800ms!
                            body.setVelocityY(-260);
                            body.setVelocityX(dirToPlayer * (this.config.speed + 10));
                        }
                    }
                }
                else {
                    // Idle patrol
                    this.aiTimer += delta;
                    if (this.aiTimer > 3200) {
                        this.aiTimer = 0;
                        this.wanderDirection = this.wanderDirection === 1 ? -1 : 1;
                    }
                    else if (isGrounded && (body.blocked.left || body.blocked.right) && this.jumpCooldown <= 0) {
                        this.jumpCooldown = 600;
                        this.wanderDirection = this.wanderDirection === 1 ? -1 : 1;
                    }
                    body.setVelocityX(this.wanderDirection * 28);
                    this.setFlipX(this.wanderDirection < 0);
                }
                break;
            }
            case 'bat': {
                this.aiTimer += delta * 0.003;
                if (distToPlayer < 400) {
                    // Undulating flight towards player
                    const wave = Math.sin(this.aiTimer * 3.5) * 35;
                    const targetY = playerY + wave - 15;
                    const angle = Math.atan2(targetY - this.y, playerX - this.x);
                    body.setVelocityX(Math.cos(angle) * this.config.speed);
                    body.setVelocityY(Math.sin(angle) * this.config.speed);
                    this.setFlipX(dx < 0);
                }
                else {
                    // Gentle hovering in cavern
                    body.setVelocityX(Math.sin(this.aiTimer) * 25);
                    body.setVelocityY(Math.cos(this.aiTimer * 1.5) * 20);
                }
                break;
            }
        }
    }
    takeDamage(amount, knockbackX = 0, knockbackY = -140) {
        if (this.isInvulnerable) {
            return { finalDamage: 0, isDead: false };
        }
        // Armor damage mitigation
        const defReduction = Math.floor(this.defense * 0.5);
        const finalDamage = Math.max(1, amount - defReduction);
        this.hp -= finalDamage;
        this.isInvulnerable = true;
        this.invulnTimer = 220; // 220ms i-frames
        this.stunTimer = 180; // Hitstun during flinch arc
        // Organic upward flinch hop under natural gravity
        let hopY = knockbackY;
        if (!this.config.flying) {
            // Natural organic hop scaled by size: small slimes hop slightly higher, large slimes slightly lower
            const scaleFactor = Math.sqrt(this.slimeScale || 1.0);
            hopY = Math.round(-145 / scaleFactor);
        }
        if (this.config.behavior === 'slime') {
            this.stareAtPlayerTimer = 8000;
            this.slimeAggroTimer = 8000;
            // Controlled horizontal flinch
            knockbackX = Math.sign(knockbackX) * Math.min(Math.abs(knockbackX), 55);
        }
        // Flash white/red
        this.setTint(0xff3333);
        this.flashTimer = 200;
        // Apply knockback impulse to physics body
        const body = this.body;
        if (body) {
            if (!this.config.flying) {
                body.setAllowGravity(true);
                body.setGravityY(GAME_CONSTANTS.GRAVITY);
            }
            body.setVelocityX(knockbackX);
            body.setVelocityY(hopY);
        }
        // Advanced squash & stretch on hit: squeeze horizontally & stretch vertically
        const baseScale = this.slimeScale;
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            scaleX: baseScale * 0.82,
            scaleY: baseScale * 1.25,
            duration: 75,
            yoyo: true,
            ease: 'Quad.easeOut',
            onComplete: () => {
                if (this.active && !this.isSquashing) {
                    this.setScale(baseScale);
                }
            }
        });
        const isDead = this.hp <= 0;
        if (isDead) {
            this.die();
        }
        return { finalDamage, isDead };
    }
    updateHpBar() {
        this.hpBarGraphic.clear();
        // Only render HP bar if injured
        if (this.hp >= this.maxHp || this.hp <= 0)
            return;
        const barW = Math.round(24 * Math.max(0.8, this.slimeScale));
        const barH = 3;
        const barX = Math.round(this.x - barW / 2);
        const barY = Math.round(this.y - (this.config.height * this.slimeScale) / 2 - 8);
        // Dark background
        this.hpBarGraphic.fillStyle(0x0e1117, 0.85);
        this.hpBarGraphic.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        // Red backing
        this.hpBarGraphic.fillStyle(0xd90429, 0.9);
        this.hpBarGraphic.fillRect(barX, barY, barW, barH);
        // Green dynamic fill
        const healthPct = Math.max(0, Math.min(1, this.hp / this.maxHp));
        this.hpBarGraphic.fillStyle(0x22c55e, 1);
        this.hpBarGraphic.fillRect(barX, barY, Math.round(barW * healthPct), barH);
    }
    die() {
        if (!this.active)
            return;
        if (this.hpBarGraphic) {
            this.hpBarGraphic.destroy();
        }
        if (this.eyePupilGraphic) {
            this.eyePupilGraphic.destroy();
        }
        if (this.onKilled) {
            this.onKilled(this);
        }
        this.destroy();
    }
    destroy(fromScene) {
        if (this.hpBarGraphic) {
            this.hpBarGraphic.destroy();
        }
        if (this.eyePupilGraphic) {
            this.eyePupilGraphic.destroy();
        }
        super.destroy(fromScene);
    }
}
