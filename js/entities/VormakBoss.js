import { GAME_CONSTANTS } from '../types/index.js';
import { Enemy } from './Enemy.js';
import { DroppedItem } from './DroppedItem.js';
export var VormakState;
(function (VormakState) {
    VormakState[VormakState["INTRO_BREACH"] = 0] = "INTRO_BREACH";
    VormakState[VormakState["UNDERGROUND_SWIM"] = 1] = "UNDERGROUND_SWIM";
    VormakState[VormakState["TELEGRAPHING"] = 2] = "TELEGRAPHING";
    VormakState[VormakState["BREACH_LEAP"] = 3] = "BREACH_LEAP";
    VormakState[VormakState["AIRBORNE_ARC"] = 4] = "AIRBORNE_ARC";
    VormakState[VormakState["SURFACE_CHARGE"] = 5] = "SURFACE_CHARGE";
    VormakState[VormakState["DIVING_DOWN"] = 6] = "DIVING_DOWN";
    VormakState[VormakState["STALAGMITE_QUAKE"] = 7] = "STALAGMITE_QUAKE";
    VormakState[VormakState["CYAN_RAY_BARRAGE"] = 8] = "CYAN_RAY_BARRAGE";
    VormakState[VormakState["DEEP_ABYSS_SLAM"] = 9] = "DEEP_ABYSS_SLAM";
    VormakState[VormakState["DEFEATED"] = 10] = "DEFEATED"; // Cascading explosive destruction
})(VormakState || (VormakState = {}));
/**
 * Custom Projectile fired by Vormak (Earth Spikes, Toxic Spores, Ground Shockwaves, Cyan Plasma, Stalagmites).
 */
export class VormakProjectile extends Phaser.Physics.Arcade.Sprite {
    projType;
    damage;
    lifespanTimer;
    constructor(scene, x, y, texture, projType, damage, vx, vy, lifespan = 3500) {
        super(scene, x, y, texture);
        this.projType = projType;
        this.damage = damage;
        this.lifespanTimer = lifespan;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(24);
        const body = this.body;
        if (body) {
            body.setVelocity(vx, vy);
            if (projType === 'spike') {
                body.setSize(12, 10);
                body.setAllowGravity(false);
                this.rotation = Math.atan2(vy, vx);
            }
            else if (projType === 'spore') {
                body.setSize(10, 10);
                body.setGravityY(420);
            }
            else if (projType === 'shockwave') {
                body.setSize(22, 14);
                body.setAllowGravity(false);
            }
            else if (projType === 'plasma') {
                body.setSize(16, 16);
                body.setAllowGravity(false);
            }
            else if (projType === 'stalagmite') {
                body.setSize(18, 44);
                body.setAllowGravity(false);
                body.setImmovable(true);
            }
        }
    }
    updateProjectile(delta, playerX, playerY) {
        this.lifespanTimer -= delta;
        if (this.lifespanTimer <= 0) {
            this.destroy();
            return false;
        }
        if (this.projType === 'spike' && this.body) {
            this.rotation = Math.atan2(this.body.velocity.y, this.body.velocity.x);
        }
        else if (this.projType === 'plasma' && this.body && playerX !== undefined && playerY !== undefined) {
            // Gentle homing adjustment towards player
            const angleToPlayer = Math.atan2(playerY - this.y, playerX - this.x);
            const currAngle = Math.atan2(this.body.velocity.y, this.body.velocity.x);
            const diff = Phaser.Math.Angle.Wrap(angleToPlayer - currAngle);
            const newAngle = currAngle + Math.sign(diff) * Math.min(Math.abs(diff), 1.8 * (delta / 1000));
            const speed = 330;
            this.body.velocity.x = Math.cos(newAngle) * speed;
            this.body.velocity.y = Math.sin(newAngle) * speed;
            this.rotation += 9 * (delta / 1000);
        }
        return true;
    }
}
export class VormakSegment extends Enemy {
    boss;
    segmentIndex;
    isHead;
    isTail;
    isBurrowing = true; // Bypasses world block separation in Arcade physics
    constructor(scene, x, y, texture, boss, segmentIndex, isHead = false, isTail = false) {
        super(scene, x, y, 'vormak');
        this.setTexture(texture);
        this.boss = boss;
        this.segmentIndex = segmentIndex;
        this.isHead = isHead;
        this.isTail = isTail;
        this.isBurrowing = true;
        this.setDepth(20 - segmentIndex); // Head in front, body behind
        const body = this.body;
        if (body) {
            body.setAllowGravity(false); // Worm controls its own continuous kinematics
            // Circular hitboxes tuned cleanly to generated boss sprites (118x107 head, 91x52 body, 84x46 tail)
            if (isHead) {
                body.setCircle(32, 34, 21);
                this.setOrigin(0.35, 0.5); // Pivot at skull/jaw center-back
            }
            else if (isTail) {
                body.setCircle(18, 25, 5);
                this.setOrigin(0.75, 0.5); // Pivot at right crystal socket collar
            }
            else {
                body.setCircle(23, 22, 3);
                this.setOrigin(0.5, 0.5);
            }
        }
    }
    /**
     * Overrides Enemy.takeDamage to route all segment damage to Vormak's central HP pool.
     */
    takeDamage(damage, knockbackX, knockbackY, bypassDefense = false) {
        return this.boss.onSegmentHit(this, damage, knockbackX, knockbackY, bypassDefense);
    }
    /**
     * Prevents ambient enemy spawner / stray systems from destroying individual boss segments.
     */
    die() {
        if (this.boss && !this.boss.isDead)
            return;
        super.die();
    }
    /**
     * Disables Enemy's standard AI so VormakBoss controls segment movement.
     */
    updateEnemy(delta, playerX, playerY) {
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
            if (this.flashTimer <= 0) {
                this.boss.applyPhaseTint(this);
            }
        }
    }
}
/**
 * Vormak, The Earth Devourer - Colossal Terraria-style Segmented Mossy Stone Worm Boss.
 * Operates with continuous kinematic serpentine physics (zero teleportation) and multi-phase combat.
 */
export class VormakBoss {
    scene;
    worldManager;
    player;
    sounds;
    enemiesGroup;
    // Boss Health & Stats
    maxHp = 1000;
    hp = 1000;
    isDead = false;
    hitCooldown = 0; // Prevents multi-segment damage stacking in 1 swing
    // Boss Phases
    phase = 1; // 1: 100%-65%, 2: 65%-30% (Enraged), 3: <30% (Berserk)
    // Worm Segments (1 Head + 8 Body + 1 Tail) + Animated Lower Jaw + 4 Digging Wing-Claws
    head;
    lowerJaw = null;
    diggingLimbs = [];
    limbAnimPhase = 0;
    limbDigDebrisTimer = 0;
    bodySegments = [];
    allSegments = [];
    // State Machine
    state = VormakState.INTRO_BREACH;
    stateTimer = 0;
    airborneWatchdogTimer = 0; // Guaranteed failsafe so boss never stays airborne
    // Attack Emergence Targeting
    nextAttackType = 'leap';
    emergencePos = { x: 0, y: 0 };
    barrageShotsRemaining = 0;
    barrageShotTimer = 0;
    quakeSpikesRemaining = 0;
    quakeSpikeTimer = 0;
    quakeDir = 1;
    quakeOriginX = 0;
    pendingSpikes = []; // Telegraphed sequential stalagmite spikes
    // Kinematic Motion
    headVx = 0;
    headVy = 0;
    currentSpeed = 340;
    currentAngle = 0;
    hasBreachedSurface = false;
    hasBreachedEntry = false;
    hasFiredSpikes = false;
    roarTimer = 5000;
    // Projectiles & Minions
    enemyProjectiles;
    spawnedLarvae = [];
    // Telegraph Visuals
    telegraphWarningSprite = null;
    telegraphGroundHighlight = null;
    // Neon Energy Linkages between Segments
    neonJointGraphics;
    // Particle Emitter for earth crushing & stone explosions
    debrisEmitter;
    // UI Scene Ref
    uiScene = null;
    constructor(scene, worldManager, player, sounds, enemiesGroup) {
        this.scene = scene;
        this.worldManager = worldManager;
        this.player = player;
        this.sounds = sounds;
        this.enemiesGroup = enemiesGroup;
        this.uiScene = scene.scene.get('UIScene');
        // Glowing Cyan Neon Joint Linkages (rendered cleanly behind armor plates)
        this.neonJointGraphics = scene.add.graphics();
        this.neonJointGraphics.setDepth(5);
        // 1. Initial Test Spawn Position: Right next to player on the surface!
        const T = GAME_CONSTANTS.TILE_SIZE;
        const surfaceTileY = this.findSurfaceTileY(player.x + 220);
        const spawnX = player.x + 220;
        const spawnY = surfaceTileY * T;
        // 2. Initialize Projectile Physics Group
        this.enemyProjectiles = scene.physics.add.group();
        this.enemyProjectiles.defaults = {};
        // Projectiles overlap with player
        scene.physics.add.overlap(this.player, this.enemyProjectiles, (playerObj, projObj) => {
            const proj = projObj;
            if (!proj.active)
                return;
            this.handleProjectilePlayerHit(proj);
        });
        // Spikes & spores collide with solid ground blocks
        scene.physics.add.collider(this.enemyProjectiles, this.worldManager.foregroundLayer, (projObj) => {
            const proj = projObj;
            if (proj.projType === 'shockwave' || proj.projType === 'stalagmite')
                return; // Shockwaves & stalagmites skim ground
            this.debrisEmitter.explode(4, proj.x, proj.y);
            proj.destroy();
        });
        // 3. Create Head Segment (118x107 Horned Basalt Wyrm Skull matching Boss Bar)
        this.head = new VormakSegment(scene, spawnX, spawnY, 'boss_vormak_head', this, 0, true, false);
        this.allSegments.push(this.head);
        this.enemiesGroup.add(this.head);
        // 3b. Articulated Lower Jaw ("buzia") that snaps, chews, and roars cleanly from skull hinge!
        if (scene.textures.exists('boss_vormak_jaw')) {
            this.lowerJaw = scene.add.sprite(spawnX, spawnY, 'boss_vormak_jaw');
            this.lowerJaw.setOrigin(0.5, 0.5);
            this.lowerJaw.setDepth(19.6); // Nested directly under Upper Skull (depth 20)
        }
        // 4. Create 8 Armored Body Segments + 1 Barbed Tail Stinger (10 segments total, ~630px long)
        const totalBody = 9;
        for (let i = 1; i <= totalBody; i++) {
            const isTail = i === totalBody;
            const tex = isTail ? 'boss_vormak_tail' : 'boss_vormak_body';
            // Line them up initially in an arching curve trailing down into the earth
            const segX = spawnX + i * 52;
            const segY = spawnY + i * 32;
            const seg = new VormakSegment(scene, segX, segY, tex, this, i, false, isTail);
            this.bodySegments.push(seg);
            this.allSegments.push(seg);
            this.enemiesGroup.add(seg);
        }
        // 4b. Create 4 Bossbar-matched Digging Wing-Claws (front pair on seg 1, rear pair on seg 3)
        this.createDiggingLimbs();
        // 5. Initialize Ground Breaking Debris Particle Emitter
        this.debrisEmitter = scene.add.particles(0, 0, 'particle_debris_stone', {
            lifespan: { min: 450, max: 950 },
            speed: { min: 160, max: 420 },
            angle: { min: 200, max: 340 }, // Explosive upward burst
            gravityY: 650,
            scale: { start: 1.4, end: 0.2 },
            emitting: false
        });
        this.debrisEmitter.setDepth(25);
        // 6. Initialize Boss Bar on UI
        if (this.uiScene) {
            this.uiScene.showBossBar('VORMAK', this.hp, this.maxHp);
        }
        // 7. Start Boss Battle Music (Loud, Dark Gothic Doom Theme)
        this.sounds.setMusicMode('boss');
        // 8. Start Intro Breach: Spawns directly beside the player with a thunderous roar!
        this.triggerEarthDebrisExplosion(spawnX, spawnY);
        this.sounds.play('boss_emerge');
        this.sounds.play('boss_roar');
        this.scene.cameras.main.shake(220, 0.005);
        // Initial leap launch
        this.currentAngle = -Math.PI * 0.75; // Leaps upward and to the left toward player
        this.head.rotation = this.currentAngle;
        this.currentSpeed = 580;
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.state = VormakState.INTRO_BREACH;
        this.stateTimer = 900;
    }
    update(time, delta) {
        if (this.isDead)
            return;
        const dt = delta / 1000;
        if (this.hitCooldown > 0) {
            this.hitCooldown -= delta;
        }
        // Update active boss projectiles
        const projs = this.enemyProjectiles.getChildren();
        for (let i = projs.length - 1; i >= 0; i--) {
            const p = projs[i];
            if (p && p.active) {
                p.updateProjectile(delta, this.player.x, this.player.y);
            }
        }
        // Check boss phase transitions
        this.checkPhaseTransitions();
        // Periodic roar timer during airborne leaps
        this.roarTimer -= delta;
        if (this.roarTimer <= 0) {
            this.roarTimer = Phaser.Math.Between(5000, 8000);
            if (this.state === VormakState.AIRBORNE_ARC || this.state === VormakState.BREACH_LEAP) {
                this.sounds.play('boss_roar');
                this.scene.cameras.main.shake(160, 0.003);
                // Phase 3 Berserk: Roar fires 8-way stone nova!
                if (this.phase === 3) {
                    this.fireStoneNova();
                }
            }
        }
        // Airborne Watchdog: Prevents Vormak from ever remaining in the sky indefinitely
        const isAirborne = this.state === VormakState.INTRO_BREACH ||
            this.state === VormakState.BREACH_LEAP ||
            this.state === VormakState.AIRBORNE_ARC ||
            this.state === VormakState.DEEP_ABYSS_SLAM;
        if (isAirborne) {
            this.airborneWatchdogTimer += delta;
            // After 1.7s in the air, aggressively guide boss back down toward earth and player
            if (this.airborneWatchdogTimer > 1700) {
                this.headVy = Math.max(this.headVy + 1500 * dt, 420);
                const dirToPlayer = Math.sign(this.player.x - this.head.x);
                this.headVx += dirToPlayer * 600 * dt;
            }
            // Absolute failsafe: After 2.6s total in air, force dive!
            if (this.airborneWatchdogTimer > 2600) {
                this.airborneWatchdogTimer = 0;
                this.startDive();
            }
        }
        else {
            this.airborneWatchdogTimer = 0;
        }
        // State machine updates
        switch (this.state) {
            case VormakState.INTRO_BREACH:
                this.updateIntroBreach(dt);
                break;
            case VormakState.UNDERGROUND_SWIM:
                this.updateUndergroundSwim(time, dt);
                break;
            case VormakState.TELEGRAPHING:
                this.updateTelegraphing(time, delta, dt);
                break;
            case VormakState.BREACH_LEAP:
                this.updateBreachLeap(delta, dt);
                break;
            case VormakState.AIRBORNE_ARC:
                this.updateAirborneArc(delta, dt);
                break;
            case VormakState.SURFACE_CHARGE:
                this.updateSurfaceCharge(delta, dt);
                break;
            case VormakState.DIVING_DOWN:
                this.updateDivingDown(delta, dt);
                break;
            case VormakState.STALAGMITE_QUAKE:
                this.updateStalagmiteQuake(delta, dt);
                break;
            case VormakState.CYAN_RAY_BARRAGE:
                this.updateCyanRayBarrage(delta, dt);
                break;
            case VormakState.DEEP_ABYSS_SLAM:
                this.updateDeepAbyssSlam(delta, dt);
                break;
        }
        // Continuous inverse kinematics + animated lower jaw chomp + 4 digging wing-claws
        this.updateSegmentChaining(time, delta);
    }
    /**
     * Smooth angular steering towards a target heading angle.
     */
    steerTowardsAngle(targetAngle, maxTurn) {
        const diff = Phaser.Math.Angle.Wrap(targetAngle - this.currentAngle);
        if (Math.abs(diff) < maxTurn) {
            this.currentAngle = targetAngle;
        }
        else {
            this.currentAngle += Math.sign(diff) * maxTurn;
        }
    }
    /**
     * Helper to find top solid block at world column tileX.
     */
    findSurfaceTileY(worldX) {
        const T = GAME_CONSTANTS.TILE_SIZE;
        const tileX = Phaser.Math.Clamp(Math.floor(worldX / T), 4, GAME_CONSTANTS.WORLD_WIDTH - 5);
        if (this.worldManager.surfaceYCache && this.worldManager.surfaceYCache[tileX]) {
            return this.worldManager.surfaceYCache[tileX];
        }
        return Math.floor(this.player.y / T) + 1;
    }
    /**
     * Intro Breach: Immediately leaps into view beside player, arcing into the ground.
     */
    updateIntroBreach(dt) {
        this.stateTimer -= dt * 1000;
        this.headVy += 600 * dt; // Gravity arc
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.currentAngle = Math.atan2(this.headVy, this.headVx);
        this.head.rotation = this.currentAngle;
        const surfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
        if ((this.headVy > 0 && this.head.y >= surfaceY - 10) || this.stateTimer <= 0) {
            this.startDive();
        }
    }
    /**
     * Phase checking: 1 -> 2 (Enraged) -> 3 (Berserk).
     */
    checkPhaseTransitions() {
        if (this.phase === 1 && this.hp <= this.maxHp * 0.65) {
            this.phase = 2;
            this.sounds.play('boss_roar');
            this.scene.cameras.main.shake(200, 0.004);
            this.scene.showWorldFloatingText?.(this.player.x, this.player.y - 60, '🔥 VORMAK WPADA W GNIEW! (FAZA 2)', '#f97316');
            this.applyPhaseTintAll();
            this.spawnMinionLarvae(2);
        }
        else if (this.phase === 2 && this.hp <= this.maxHp * 0.30) {
            this.phase = 3;
            this.sounds.play('boss_roar');
            this.sounds.play('boss_emerge');
            this.scene.cameras.main.shake(260, 0.005);
            this.scene.showWorldFloatingText?.(this.player.x, this.player.y - 60, '⚡ KATAKLIZM! VORMAK W AMOKU! (FAZA 3)', '#ef4444');
            this.applyPhaseTintAll();
            this.spawnMinionLarvae(3);
        }
    }
    applyPhaseTint(segment) {
        if (this.phase === 2) {
            segment.setTint(0xffaa66);
        }
        else if (this.phase === 3) {
            segment.setTint(0xff5555);
        }
        else {
            segment.clearTint();
        }
    }
    applyPhaseTintAll() {
        this.allSegments.forEach(s => this.applyPhaseTint(s));
    }
    /**
     * Phase 1: Boss swims smoothly underground in wide sinuous arcs deep in the bedrock.
     */
    updateUndergroundSwim(time, dt) {
        this.stateTimer -= dt * 1000;
        // Speed scales with phase and surges cleanly underground if player runs far away
        const distToPlayer = Phaser.Math.Distance.Between(this.head.x, this.head.y, this.player.x, this.player.y);
        const baseSpeed = this.phase === 1 ? 340 : (this.phase === 2 ? 410 : 470);
        this.currentSpeed = distToPlayer > 700 ? 780 : (distToPlayer > 440 ? baseSpeed + 180 : baseSpeed);
        // Undulating deep subterranean patrol path staying in combat proximity (240 - 340px below player)
        const targetY = this.player.y + 270 + Math.sin(time * 0.003) * 55;
        const targetX = this.player.x + Math.cos(time * 0.002) * 180;
        const desiredAngle = Math.atan2(targetY - this.head.y, targetX - this.head.x);
        // Smooth angular steering so the wyrm body bends fluidly without kinks
        const turnRate = distToPlayer > 500 ? 4.2 : (this.phase === 1 ? 2.4 : (this.phase === 2 ? 2.9 : 3.4));
        this.steerTowardsAngle(desiredAngle, turnRate * dt);
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = this.currentAngle;
        // Gentle subterranean micro-tremor dust (no jarring camera shake)
        if (distToPlayer < 600 && Math.random() < 0.03) {
            const surfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
            this.debrisEmitter.explode(1, this.head.x, surfaceY);
            this.scene.cameras.main.shake(50, 0.0012);
        }
        // Only initiate telegraph once Vormak has actually swum into attack proximity
        if (this.stateTimer <= 0 && distToPlayer <= 450) {
            this.prepareTelegraph();
        }
    }
    /**
     * Determines next attack target position and initiates visual telegraphing.
     * Attacks:
     * - 'leap': High Breach Leap with spikes/spores
     * - 'charge': Horizontal Trench Ram across terrain
     * - 'quake': Subterranean Seismic Stalagmite Quake (ground spikes wave)
     * - 'plasma': Cyan Neon Geode Barrage (homing electric plasma bolts)
     * - 'slam': Deep Abyss Slam (straight vertical eruption under player)
     */
    prepareTelegraph() {
        const roll = Math.random();
        if (this.phase === 1) {
            if (roll < 0.38)
                this.nextAttackType = 'leap';
            else if (roll < 0.70)
                this.nextAttackType = 'charge';
            else
                this.nextAttackType = 'quake';
        }
        else if (this.phase === 2) {
            if (roll < 0.28)
                this.nextAttackType = 'leap';
            else if (roll < 0.52)
                this.nextAttackType = 'charge';
            else if (roll < 0.76)
                this.nextAttackType = 'plasma';
            else
                this.nextAttackType = 'quake';
        }
        else {
            if (roll < 0.20)
                this.nextAttackType = 'leap';
            else if (roll < 0.40)
                this.nextAttackType = 'charge';
            else if (roll < 0.60)
                this.nextAttackType = 'plasma';
            else if (roll < 0.80)
                this.nextAttackType = 'quake';
            else
                this.nextAttackType = 'slam';
        }
        let targetX;
        if (this.nextAttackType === 'leap') {
            const offset = (Math.random() - 0.5) * 140;
            targetX = this.player.x + offset;
        }
        else if (this.nextAttackType === 'charge') {
            const side = Math.random() < 0.5 ? -1 : 1;
            targetX = this.player.x + side * 220;
        }
        else if (this.nextAttackType === 'plasma') {
            const side = Math.random() < 0.5 ? -1 : 1;
            targetX = this.player.x + side * 160;
        }
        else if (this.nextAttackType === 'quake') {
            targetX = this.player.x;
        }
        else {
            // slam
            targetX = this.player.x;
        }
        const T = GAME_CONSTANTS.TILE_SIZE;
        targetX = Phaser.Math.Clamp(targetX, 5 * T, (GAME_CONSTANTS.WORLD_WIDTH - 6) * T);
        const surfaceTileY = this.findSurfaceTileY(targetX);
        const surfaceY = surfaceTileY * T;
        this.emergencePos = { x: targetX, y: surfaceY };
        this.hasBreachedSurface = false;
        this.hasBreachedEntry = false;
        this.hasFiredSpikes = false;
        // Create Red/Cyan Exclamation Mark Telegraph
        if (!this.telegraphWarningSprite) {
            this.telegraphWarningSprite = this.scene.add.sprite(targetX, surfaceY - 32, 'vormak_warning_mark');
            this.telegraphWarningSprite.setDepth(28);
        }
        else {
            this.telegraphWarningSprite.setPosition(targetX, surfaceY - 32);
            this.telegraphWarningSprite.setVisible(true);
        }
        this.telegraphWarningSprite.setScale(1);
        this.scene.tweens.killTweensOf(this.telegraphWarningSprite);
        this.scene.tweens.add({
            targets: this.telegraphWarningSprite,
            scaleX: 1.35,
            scaleY: 1.35,
            duration: 180,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut'
        });
        // Create Red Flashing Ground Highlight Graphic
        if (!this.telegraphGroundHighlight) {
            this.telegraphGroundHighlight = this.scene.add.graphics();
            this.telegraphGroundHighlight.setDepth(15);
        }
        else {
            this.telegraphGroundHighlight.clear();
            this.telegraphGroundHighlight.setVisible(true);
        }
        this.sounds.play('boss_warn');
        this.state = VormakState.TELEGRAPHING;
        // Faster warning in higher phases for increased challenge
        this.stateTimer = this.phase === 1 ? 1200 : (this.phase === 2 ? 950 : 750);
    }
    /**
     * Phase 2 telegraph update: Ground blocks flash red with warning mark.
     */
    updateTelegraphing(time, delta, dt) {
        this.stateTimer -= delta;
        if (this.telegraphGroundHighlight) {
            this.telegraphGroundHighlight.clear();
            const flashAlpha = 0.40 + Math.sin(time * 0.032) * 0.35;
            const highlightColor = this.nextAttackType === 'plasma' ? 0x00e5ff : 0xef4444;
            this.telegraphGroundHighlight.fillStyle(highlightColor, flashAlpha);
            this.telegraphGroundHighlight.lineStyle(2, this.nextAttackType === 'plasma' ? 0x38bdf8 : 0xff0000, flashAlpha + 0.25);
            const T = GAME_CONSTANTS.TILE_SIZE;
            const startX = this.emergencePos.x - 2.5 * T;
            const startY = this.emergencePos.y;
            this.telegraphGroundHighlight.fillRoundedRect(startX, startY, 5 * T, 2 * T, 4);
            this.telegraphGroundHighlight.strokeRoundedRect(startX, startY, 5 * T, 2 * T, 4);
        }
        // Gentle seismic camera rumble before eruption
        if (this.stateTimer < 450) {
            this.scene.cameras.main.shake(60, 0.0015);
        }
        // Smoothly steer towards launch approach point below emergence spot (catching up seamlessly if distant)
        const launchPrepY = this.emergencePos.y + (this.nextAttackType === 'plasma' ? 30 : 95);
        const distToPrep = Phaser.Math.Distance.Between(this.head.x, this.head.y, this.emergencePos.x, launchPrepY);
        const desiredAngle = Math.atan2(launchPrepY - this.head.y, this.emergencePos.x - this.head.x);
        this.steerTowardsAngle(desiredAngle, 3.6 * dt);
        const basePrepSpeed = this.phase === 1 ? 390 : 450;
        this.currentSpeed = distToPrep > 220 ? 640 : basePrepSpeed;
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = this.currentAngle;
        if (this.stateTimer <= 0) {
            if (this.nextAttackType === 'charge') {
                this.startSurfaceCharge();
            }
            else if (this.nextAttackType === 'quake') {
                this.startStalagmiteQuake();
            }
            else if (this.nextAttackType === 'plasma') {
                this.startCyanRayBarrage();
            }
            else if (this.nextAttackType === 'slam') {
                this.startDeepAbyssSlam();
            }
            else {
                this.startBreachLeap();
            }
        }
    }
    /**
     * Attack 1: Breach Leap - Erupts skyward in a majestic, smoothly curved arc.
     */
    startBreachLeap() {
        this.cleanupTelegraph();
        const dirToPlayer = Math.sign(this.player.x - this.head.x) || (Math.random() < 0.5 ? -1 : 1);
        const targetLaunchAngle = -Math.PI / 2 + dirToPlayer * 0.34;
        // Blend from current heading smoothly instead of abrupt 180° velocity jerk
        this.steerTowardsAngle(targetLaunchAngle, 1.45);
        this.currentSpeed = this.phase === 1 ? 660 : (this.phase === 2 ? 740 : 810);
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.state = VormakState.BREACH_LEAP;
        this.stateTimer = 460;
    }
    updateBreachLeap(delta, dt) {
        this.stateTimer -= delta;
        // Smoothly arc upward toward player sky crest
        const dirToPlayer = Math.sign(this.player.x - this.head.x) || 1;
        const launchAngle = -Math.PI / 2 + dirToPlayer * 0.32;
        this.steerTowardsAngle(launchAngle, 4.5 * dt);
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = Math.atan2(this.headVy, this.headVx);
        const breachSurfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
        if (!this.hasBreachedSurface && this.head.y <= breachSurfaceY + 20) {
            this.hasBreachedSurface = true;
            this.triggerEarthDebrisExplosion(this.head.x, breachSurfaceY);
            this.sounds.play('boss_emerge');
            this.sounds.play('boss_roar');
            this.scene.cameras.main.shake(180, 0.004);
        }
        if (this.stateTimer <= 0) {
            this.state = VormakState.AIRBORNE_ARC;
            this.stateTimer = 1600;
        }
    }
    /**
     * Airborne Arc: Controlled gravity lets the entire serpent soar within camera view.
     * Spits stone spikes and spores at apex!
     */
    updateAirborneArc(delta, dt) {
        this.stateTimer -= delta;
        // Realistic gravity pulls serpent naturally back down
        this.headVy += 650 * dt;
        this.headVx *= 0.992;
        // Gently steer head X towards player if drifting too far (> 240px away)
        const distToPlayerX = this.player.x - this.head.x;
        if (Math.abs(distToPlayerX) > 240) {
            this.headVx += Math.sign(distToPlayerX) * 450 * dt;
        }
        // Anti-stratosphere clamp: if head reaches 180px above player, accelerate descent so boss stays on screen!
        if (this.head.y < this.player.y - 180) {
            this.headVy += 1400 * dt;
        }
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        // Clamp head X within world boundaries
        const T = GAME_CONSTANTS.TILE_SIZE;
        this.head.x = Phaser.Math.Clamp(this.head.x, 3 * T, (GAME_CONSTANTS.WORLD_WIDTH - 4) * T);
        this.currentAngle = Math.atan2(this.headVy, this.headVx);
        this.head.rotation = this.currentAngle;
        // Spits stone spikes at apex when beginning descent!
        if (!this.hasFiredSpikes && this.headVy > -40) {
            this.hasFiredSpikes = true;
            this.fireEarthSpikes();
            if (this.phase >= 2) {
                this.fireToxicSpores();
            }
        }
        // Head re-enters the ground
        const surfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
        if ((this.headVy > 0 && this.head.y >= surfaceY - 10) || this.stateTimer <= 0) {
            this.startDive();
        }
    }
    /**
     * Attack 2: Surface Trench Charge - Skims horizontally across the ground at player height!
     */
    startSurfaceCharge() {
        this.cleanupTelegraph();
        const dirToPlayer = Math.sign(this.player.x - this.head.x) || 1;
        const targetChargeAngle = dirToPlayer > 0 ? 0 : Math.PI;
        this.steerTowardsAngle(targetChargeAngle, 1.4);
        this.currentSpeed = this.phase === 1 ? 470 : (this.phase === 2 ? 540 : 600);
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.triggerEarthDebrisExplosion(this.head.x, this.head.y);
        this.sounds.play('boss_emerge');
        this.scene.cameras.main.shake(150, 0.0035);
        this.state = VormakState.SURFACE_CHARGE;
        this.stateTimer = 1100; // Charges across the arena
    }
    updateSurfaceCharge(delta, dt) {
        this.stateTimer -= delta;
        // Follows local terrain height smoothly with level horizontal steering
        const desiredY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE - 20;
        const dirToCharge = this.headVx >= 0 ? 0 : Math.PI;
        this.steerTowardsAngle(dirToCharge, 4.5 * dt);
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.head.y += (desiredY - this.head.y) * 5.0 * dt;
        this.head.x += this.headVx * dt;
        this.head.rotation = Math.atan2((desiredY - this.head.y) * 2.2, this.headVx);
        // Kicks up dust particles along the ground
        if (Math.random() < 0.4) {
            this.debrisEmitter.explode(2, this.head.x, this.head.y + 15);
        }
        if (this.stateTimer <= 0) {
            this.startDive();
        }
    }
    /**
     * Attack 3: Subterranean Seismic Stalagmite Quake - Bedrock spikes burst up in sequence towards player!
     * Overhauled with clear 600ms visual and audio telegraph warning per spike!
     */
    startStalagmiteQuake() {
        this.cleanupTelegraph();
        this.cleanupPendingSpikes();
        this.state = VormakState.STALAGMITE_QUAKE;
        const count = this.phase === 1 ? 5 : (this.phase === 2 ? 7 : 9);
        const dir = Math.sign(this.player.x - this.head.x) || (Math.random() < 0.5 ? -1 : 1);
        this.quakeDir = dir;
        this.quakeOriginX = this.head.x;
        this.pendingSpikes = [];
        const T = GAME_CONSTANTS.TILE_SIZE;
        for (let i = 0; i < count; i++) {
            const spikeX = Phaser.Math.Clamp(this.quakeOriginX + dir * (i + 1) * 54, 4 * T, (GAME_CONSTANTS.WORLD_WIDTH - 5) * T);
            const surfaceY = this.findSurfaceTileY(spikeX) * T;
            const telegraphDelay = 80 + i * 200; // Sequential ripple: 80ms, 280ms, 480ms, 680ms...
            const eruptDelay = telegraphDelay + 600; // Clear 600ms reaction window!
            this.pendingSpikes.push({
                x: spikeX,
                y: surfaceY,
                telegraphDelay,
                eruptDelay,
                telegraphSpawned: false
            });
        }
        // Total duration: long enough for all spikes to complete
        this.stateTimer = 80 + (count - 1) * 200 + 600 + 400;
        this.sounds.play('boss_burrow');
        this.sounds.play('boss_warn');
        this.scene.cameras.main.shake(180, 0.003);
    }
    updateStalagmiteQuake(delta, dt) {
        this.stateTimer -= delta;
        // Head cruises smoothly deep under ground during the quake without snapping angle
        const targetQuakeAngle = this.quakeDir > 0 ? 0 : Math.PI;
        this.steerTowardsAngle(targetQuakeAngle, 3.2 * dt);
        this.currentSpeed = 260;
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = this.currentAngle;
        for (let i = this.pendingSpikes.length - 1; i >= 0; i--) {
            const p = this.pendingSpikes[i];
            p.telegraphDelay -= delta;
            p.eruptDelay -= delta;
            // 1. Trigger visual & audio telegraph 600ms before eruption!
            if (!p.telegraphSpawned && p.telegraphDelay <= 0) {
                p.telegraphSpawned = true;
                // Ground crack fissure sprite
                const crack = this.scene.add.sprite(p.x, p.y + 4, 'telegraph_spike_crack');
                crack.setOrigin(0.5, 1.0);
                crack.setDepth(14);
                crack.setScale(0.85);
                this.scene.tweens.add({
                    targets: crack,
                    scaleX: 1.15,
                    scaleY: 1.15,
                    alpha: { from: 0.6, to: 1.0 },
                    yoyo: true,
                    repeat: 2,
                    duration: 100
                });
                p.crackSprite = crack;
                // Glowing red hazard warning glyph ("⚠️") directly above the crack
                const marker = this.scene.add.text(p.x, p.y - 18, '⚠️', {
                    fontSize: '13px',
                    stroke: '#000000',
                    strokeThickness: 3
                });
                marker.setOrigin(0.5, 0.5);
                marker.setDepth(25);
                this.scene.tweens.add({
                    targets: marker,
                    scale: { from: 0.8, to: 1.25 },
                    yoyo: true,
                    repeat: 2,
                    duration: 100
                });
                p.warningMarker = marker;
                // Ground debris puff & warning sound
                this.debrisEmitter.explode(2, p.x, p.y);
                this.sounds.play('boss_warn');
            }
            // 2. Erupt spike after 600ms warning telegraph!
            if (p.eruptDelay <= 0) {
                if (p.crackSprite) {
                    p.crackSprite.destroy();
                }
                if (p.warningMarker) {
                    p.warningMarker.destroy();
                }
                // Create physical bedrock stalagmite spike projectile
                const spike = new VormakProjectile(this.scene, p.x, p.y - 20, 'proj_stalagmite_spike', 'stalagmite', this.phase === 1 ? 16 : 22, 0, -60, 1000);
                this.enemyProjectiles.add(spike);
                // Explosive rock eruption particles & subtle tremor
                this.triggerEarthDebrisExplosion(p.x, p.y);
                this.sounds.play('hit_stone');
                this.scene.cameras.main.shake(80, 0.002);
                // Remove from pending list
                this.pendingSpikes.splice(i, 1);
            }
        }
        if (this.stateTimer <= 0) {
            this.cleanupPendingSpikes();
            this.startDive();
        }
    }
    cleanupPendingSpikes() {
        for (const p of this.pendingSpikes) {
            if (p.crackSprite)
                p.crackSprite.destroy();
            if (p.warningMarker)
                p.warningMarker.destroy();
        }
        this.pendingSpikes = [];
    }
    /**
     * Attack 4: Cyan Neon Geode Barrage - Reared jaws unleash high-speed electric plasma bolts!
     */
    startCyanRayBarrage() {
        this.cleanupTelegraph();
        this.state = VormakState.CYAN_RAY_BARRAGE;
        this.stateTimer = 1900;
        this.barrageShotsRemaining = this.phase === 1 ? 5 : (this.phase === 2 ? 7 : 9);
        this.barrageShotTimer = 400; // 400ms charge-up pause before firing
        // Emerges smoothly near the telegraph surface spot (no jarring cross-map teleport!)
        const surfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
        this.head.y = Math.max(this.head.y - 36, surfaceY - 26);
        this.currentAngle = Math.atan2(this.player.y - this.head.y, this.player.x - this.head.x);
        this.head.rotation = this.currentAngle;
        this.headVx = 0;
        this.headVy = 0;
        this.triggerEarthDebrisExplosion(this.head.x, surfaceY);
        this.sounds.play('boss_emerge');
        this.sounds.play('boss_warn');
        this.scene.cameras.main.shake(150, 0.003);
    }
    updateCyanRayBarrage(delta, dt) {
        this.stateTimer -= delta;
        this.barrageShotTimer -= delta;
        // Track player aim
        const angleToPlayer = Math.atan2(this.player.y - this.head.y, this.player.x - this.head.x);
        this.currentAngle = angleToPlayer;
        this.head.rotation = this.currentAngle;
        // Rapid barrage fire
        if (this.barrageShotsRemaining > 0 && this.barrageShotTimer <= 0) {
            this.barrageShotTimer = this.phase === 1 ? 190 : 140;
            this.barrageShotsRemaining--;
            const speed = 340;
            const spread = (Math.random() - 0.5) * 0.22;
            const fireAngle = angleToPlayer + spread;
            const vx = Math.cos(fireAngle) * speed;
            const vy = Math.sin(fireAngle) * speed;
            const plasma = new VormakProjectile(this.scene, this.head.x + Math.cos(fireAngle) * 32, this.head.y + Math.sin(fireAngle) * 32, 'proj_cyan_plasma', 'plasma', this.phase === 1 ? 15 : 20, vx, vy, 3200);
            this.enemyProjectiles.add(plasma);
            this.sounds.play('attack_magic');
            this.debrisEmitter.explode(3, this.head.x, this.head.y);
        }
        if (this.stateTimer <= 0 || (this.barrageShotsRemaining <= 0 && this.barrageShotTimer < -300)) {
            this.startDive();
        }
    }
    /**
     * Attack 5: Deep Abyss Slam - Launches vertically from 400px deep under player!
     */
    startDeepAbyssSlam() {
        this.cleanupTelegraph();
        this.state = VormakState.DEEP_ABYSS_SLAM;
        this.stateTimer = 900;
        // Launches upward continuously from underground approach position (no sudden snap!)
        const surfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
        this.currentAngle = -Math.PI / 2;
        this.head.rotation = this.currentAngle;
        this.headVx = Phaser.Math.Clamp((this.player.x - this.head.x) * 0.6, -120, 120);
        this.headVy = -760;
        this.sounds.play('boss_emerge');
        this.sounds.play('boss_roar');
        this.triggerEarthDebrisExplosion(this.head.x, surfaceY);
        this.scene.cameras.main.shake(220, 0.005);
        // Releases shockwaves on both sides at eruption
        this.spawnGroundShockwaves(this.head.x, surfaceY);
    }
    updateDeepAbyssSlam(delta, dt) {
        this.stateTimer -= delta;
        this.head.y += this.headVy * dt;
        this.headVy += 850 * dt; // Gravity decelerates ascent
        // Clamp apex so it stays in camera
        if (this.head.y < this.player.y - 220) {
            this.headVy += 1200 * dt;
        }
        this.currentAngle = Math.atan2(this.headVy, this.headVx);
        this.head.rotation = this.currentAngle;
        const surfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
        if ((this.headVy > 0 && this.head.y >= surfaceY - 10) || this.stateTimer <= 0) {
            this.startDive();
        }
    }
    /**
     * Head slams into the ground, crushing earth, burrowing deep into subterranean crust, and releasing shockwaves!
     */
    startDive() {
        if (!this.hasBreachedEntry) {
            this.hasBreachedEntry = true;
            this.triggerEarthDebrisExplosion(this.head.x, this.head.y);
            this.sounds.play('boss_burrow');
            this.scene.cameras.main.shake(150, 0.0035);
            // Release Ground Shockwaves to the left and right!
            this.spawnGroundShockwaves(this.head.x, this.head.y);
        }
        this.currentSpeed = this.phase === 1 ? 460 : 540;
        this.state = VormakState.DIVING_DOWN;
    }
    updateDivingDown(delta, dt) {
        // Steers deeper into the earth in a wide sweeping curve downwards
        const diveCurveDir = this.headVx >= 0 ? 0.35 : -0.35;
        this.steerTowardsAngle(Math.PI / 2 + diveCurveDir, 2.8 * dt);
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = this.currentAngle;
        // Plunges deep down into the stone crust (260 - 360px below surface)
        const surfaceY = this.findSurfaceTileY(this.head.x) * GAME_CONSTANTS.TILE_SIZE;
        const targetDeepDepth = surfaceY + (this.phase === 1 ? 260 : 340);
        if (this.head.y >= targetDeepDepth) {
            this.state = VormakState.UNDERGROUND_SWIM;
            this.stateTimer = this.phase === 1 ? Phaser.Math.Between(1800, 2600) : Phaser.Math.Between(1200, 1900);
        }
    }
    /**
     * Spits a fan of 3 sharp stone spikes towards the player.
     */
    fireEarthSpikes() {
        const count = this.phase === 1 ? 3 : (this.phase === 2 ? 4 : 5);
        const angleToPlayer = Math.atan2(this.player.y - this.head.y, this.player.x - this.head.x);
        const speed = 290;
        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 0.22;
            const angle = angleToPlayer + spread;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const spike = new VormakProjectile(this.scene, this.head.x, this.head.y, 'proj_earth_spike', 'spike', 14, vx, vy);
            this.enemyProjectiles.add(spike);
        }
        this.sounds.play('boss_warn');
    }
    /**
     * Fires 3 volcanic/magma spores from body segments high into the air.
     */
    fireToxicSpores() {
        const indices = [3, 7, 11];
        indices.forEach(idx => {
            const seg = this.allSegments[idx];
            if (!seg)
                return;
            const vx = (Math.random() - 0.5) * 160;
            const vy = -Phaser.Math.Between(260, 380);
            const spore = new VormakProjectile(this.scene, seg.x, seg.y, 'proj_toxic_spore', 'spore', 16, vx, vy, 4000);
            this.enemyProjectiles.add(spore);
        });
    }
    /**
     * Spawns ground shockwaves travelling left and right along the terrain.
     */
    spawnGroundShockwaves(x, y) {
        [-1, 1].forEach(dir => {
            const shock = new VormakProjectile(this.scene, x + dir * 20, y - 8, 'proj_shockwave', 'shockwave', 12, dir * 220, 0, 1800);
            if (dir < 0)
                shock.setFlipX(true);
            this.enemyProjectiles.add(shock);
        });
    }
    /**
     * Phase 3 Berserk: 8-way radial stone nova burst.
     */
    fireStoneNova() {
        const count = 8;
        const speed = 280;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const spike = new VormakProjectile(this.scene, this.head.x, this.head.y, 'proj_earth_spike', 'spike', 16, vx, vy);
            this.enemyProjectiles.add(spike);
        }
    }
    /**
     * Summons Vormak Larva minions to fight on the ground.
     */
    spawnMinionLarvae(count) {
        for (let i = 0; i < count; i++) {
            const offset = (i - (count - 1) / 2) * 90;
            const spawnX = this.player.x + offset;
            const surfaceY = this.findSurfaceTileY(spawnX) * GAME_CONSTANTS.TILE_SIZE - 16;
            const larva = new Enemy(this.scene, spawnX, surfaceY, 'vormak_larva');
            larva.setTexture('enemy_vormak_larva');
            this.spawnedLarvae.push(larva);
            this.enemiesGroup.add(larva);
            this.triggerEarthDebrisExplosion(spawnX, surfaceY);
        }
    }
    /**
     * Handles projectile collision with player.
     */
    handleProjectilePlayerHit(proj) {
        const knockbackDir = proj.x < this.player.x ? 1 : -1;
        const result = this.player.takeDamage(proj.damage, knockbackDir * 125, -135);
        this.sounds.play('player_hurt');
        if (result.tookDamage) {
            this.scene.showCombatFloatingText?.(this.player.x, this.player.y - 20, `-${result.damageDealt} PŻ`, '#ef4444', 13);
        }
        this.debrisEmitter.explode(6, proj.x, proj.y);
        proj.destroy();
    }
    /**
     * Inverse Kinematics: Chained body segments follow the segment in front at EXACT rigid distances.
     * Also renders glowing electric cyan neon linkages between all segment joints!
     */
    updateSegmentChaining(time = 0, delta = 16) {
        this.neonJointGraphics.clear();
        // Keep horned skull upright regardless of left/right heading
        const headCos = Math.cos(this.head.rotation);
        if (headCos < -0.08)
            this.head.setFlipY(true);
        else if (headCos > 0.08)
            this.head.setFlipY(false);
        // Animate articulated lower jaw ("buzia")
        this.updateLowerJaw(time);
        // Smooth maximum angular flex (~16 deg) per joint prevents unnatural kinks or loops
        const MAX_JOINT_BEND = 0.28;
        for (let i = 1; i < this.allSegments.length; i++) {
            const prev = this.allSegments[i - 1];
            const curr = this.allSegments[i];
            if (!prev || !prev.active || !curr || !curr.active)
                continue;
            const prevBackAngle = prev.rotation + Math.PI;
            const rawBackAngle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const bendDiff = Phaser.Math.Angle.Wrap(rawBackAngle - prevBackAngle);
            const clampedBackAngle = prevBackAngle + Phaser.Math.Clamp(bendDiff, -MAX_JOINT_BEND, MAX_JOINT_BEND);
            // Spacing tuned cleanly to generated sprites:
            // head->body1 = 52px, body->body = 68px, body->tail = 38px (tucks tail collar cleanly under body crystal)
            const spacing = i === 1 ? 52 : (curr.isTail ? 38 : 68);
            curr.x = prev.x + Math.cos(clampedBackAngle) * spacing;
            curr.y = prev.y + Math.sin(clampedBackAngle) * spacing;
            curr.rotation = clampedBackAngle + Math.PI;
            // Orient segment upright cleanly
            const segCos = Math.cos(curr.rotation);
            if (segCos < -0.08)
                curr.setFlipY(true);
            else if (segCos > 0.08)
                curr.setFlipY(false);
            // Keep Arcade Physics body position aligned with sprite position
            const body = curr.body;
            if (body) {
                body.position.x = curr.x - body.halfWidth;
                body.position.y = curr.y - body.halfHeight;
            }
            // Render glowing electric cyan neon spine energy behind armor joints
            const mx = (prev.x + curr.x) / 2;
            const my = (prev.y + curr.y) / 2;
            this.neonJointGraphics.lineStyle(9, 0x0284c7, 0.38);
            this.neonJointGraphics.lineBetween(prev.x, prev.y, curr.x, curr.y);
            this.neonJointGraphics.lineStyle(4, 0x00e5ff, 0.85);
            this.neonJointGraphics.lineBetween(prev.x, prev.y, curr.x, curr.y);
            this.neonJointGraphics.fillStyle(0x0284c7, 0.50);
            this.neonJointGraphics.fillCircle(mx, my, 8);
            this.neonJointGraphics.fillStyle(0x00e5ff, 0.90);
            this.neonJointGraphics.fillCircle(mx, my, 4.5);
        }
        // Update 4 articulated digging wing-claws synced directly with updated body segment transforms
        this.updateDiggingLimbs(time, delta);
    }
    /**
     * Animates Vormak's articulated lower mandible: chomping during leaps/charges,
     * holding wide open during plasma breath, and chewing gently underground.
     */
    updateLowerJaw(time) {
        if (!this.lowerJaw || !this.lowerJaw.active || !this.head || !this.head.active)
            return;
        const localX = 28.75;
        const localY = this.head.flipY ? -4.90 : 4.90;
        const cosA = Math.cos(this.head.rotation);
        const sinA = Math.sin(this.head.rotation);
        const worldJawX = this.head.x + localX * cosA - localY * sinA;
        const worldJawY = this.head.y + localX * sinA + localY * cosA;
        let jawOpen;
        if (this.state === VormakState.CYAN_RAY_BARRAGE) {
            // Wide roaring open mouth pouring cyan plasma bolts
            jawOpen = 0.16 + Math.sin(time * 0.030) * 0.05;
        }
        else if (this.state === VormakState.BREACH_LEAP ||
            this.state === VormakState.AIRBORNE_ARC ||
            this.state === VormakState.SURFACE_CHARGE ||
            this.state === VormakState.DEEP_ABYSS_SLAM ||
            this.state === VormakState.INTRO_BREACH) {
            // Ferocious snapping chomp cycle during aerial / charge lunges!
            jawOpen = -0.06 + Math.sin(time * 0.017) * 0.23;
        }
        else if (this.state === VormakState.TELEGRAPHING || this.state === VormakState.STALAGMITE_QUAKE) {
            jawOpen = -0.08 + Math.sin(time * 0.014) * 0.18;
        }
        else {
            // Rhythmic subterranean chewing through rock
            jawOpen = -0.11 + Math.sin(time * 0.009) * 0.17;
        }
        this.lowerJaw.setPosition(worldJawX, worldJawY);
        this.lowerJaw.setFlipY(this.head.flipY);
        const appliedOpen = this.head.flipY ? -jawOpen : jawOpen;
        this.lowerJaw.rotation = this.head.rotation + appliedOpen;
        // Mirror white hit flash or boss phase tint onto lower jaw cleanly
        if (this.head.flashTimer > 0) {
            this.lowerJaw.setTint(0xffffff);
        }
        else if (this.phase === 2) {
            this.lowerJaw.setTint(0xffaa66);
        }
        else if (this.phase === 3) {
            this.lowerJaw.setTint(0xff5555);
        }
        else {
            this.lowerJaw.clearTint();
        }
    }
    /**
     * Attaches 4 articulated bossbar-matched basalt wing-claws to Vormak's chest & mid torso
     * (foreground & background alternating pairs) so all 4 limbs are visibly clawing and flying.
     */
    createDiggingLimbs() {
        if (!this.scene.textures.exists('boss_vormak_claw'))
            return;
        const frontSeg = this.bodySegments[0];
        const rearSeg = this.bodySegments[2];
        if (!frontSeg || !rearSeg)
            return;
        const specs = [
            { seg: frontSeg, bg: false, depth: 19.3, phase: 0, scale: 1.00, lx: 2, ly: 7 },
            { seg: frontSeg, bg: true, depth: 10.6, phase: Math.PI, scale: 0.94, lx: 11, ly: 1 },
            { seg: rearSeg, bg: false, depth: 18.3, phase: Math.PI * 0.55, scale: 0.86, lx: 2, ly: 7 },
            { seg: rearSeg, bg: true, depth: 10.4, phase: Math.PI * 1.55, scale: 0.80, lx: 10, ly: 1 }
        ];
        for (const spec of specs) {
            const sprite = this.scene.add.sprite(spec.seg.x, spec.seg.y, 'boss_vormak_claw');
            sprite.setOrigin(0.5, 0.5);
            sprite.setDepth(spec.depth);
            sprite.setScale(spec.scale);
            if (spec.bg) {
                sprite.setTint(0x7f97ae);
            }
            this.diggingLimbs.push({
                sprite,
                segment: spec.seg,
                isBackground: spec.bg,
                phaseOffset: spec.phase,
                baseScale: spec.scale,
                anchorLocalX: spec.lx,
                anchorLocalY: spec.ly
            });
        }
    }
    /**
     * Drives a circular mole/wyrm digging gait underground & on charges,
     * or spreads the 4 wing-claws in sweeping winged arcs while leaping/roaring.
     */
    updateDiggingLimbs(_time, delta) {
        if (this.diggingLimbs.length === 0)
            return;
        const dt = Math.min(delta, 50) / 1000;
        const isAirborneOrRoaring = this.state === VormakState.INTRO_BREACH ||
            this.state === VormakState.BREACH_LEAP ||
            this.state === VormakState.AIRBORNE_ARC ||
            this.state === VormakState.CYAN_RAY_BARRAGE;
        const speedFactor = isAirborneOrRoaring
            ? 7.2
            : (this.state === VormakState.SURFACE_CHARGE ||
                this.state === VormakState.DEEP_ABYSS_SLAM ||
                this.state === VormakState.TELEGRAPHING
                ? 14.0
                : 10.0);
        this.limbAnimPhase += dt * (speedFactor + (this.phase - 1) * 1.8);
        this.limbDigDebrisTimer -= delta;
        const spawnDigChips = !isAirborneOrRoaring && this.limbDigDebrisTimer <= 0;
        if (this.limbDigDebrisTimer <= 0) {
            this.limbDigDebrisTimer = 135;
        }
        for (const limb of this.diggingLimbs) {
            if (!limb.sprite || !limb.sprite.active || !limb.segment || !limb.segment.active)
                continue;
            const phase = this.limbAnimPhase + limb.phaseOffset;
            const swingAngle = isAirborneOrRoaring
                ? 0.08 + Math.sin(phase) * 0.34
                : 0.36 - Math.cos(phase) * 0.44;
            const elbowX = isAirborneOrRoaring ? Math.cos(phase) * 4.0 : Math.cos(phase) * 6.5;
            const elbowY = isAirborneOrRoaring ? Math.sin(phase) * 3.0 - 2.5 : Math.sin(phase) * 5.0;
            const flipY = limb.segment.flipY;
            const cosS = Math.cos(limb.segment.rotation);
            const sinS = Math.sin(limb.segment.rotation);
            const lx = limb.anchorLocalX + elbowX;
            const ly = (flipY ? -1 : 1) * (limb.anchorLocalY + elbowY);
            limb.sprite.setPosition(limb.segment.x + lx * cosS - ly * sinS, limb.segment.y + lx * sinS + ly * cosS);
            limb.sprite.setFlipY(flipY);
            limb.sprite.rotation = limb.segment.rotation + (flipY ? -swingAngle : swingAngle);
            limb.sprite.setScale(limb.baseScale * (1 + Math.sin(phase) * 0.06), limb.baseScale * (1 - Math.sin(phase) * 0.04));
            if (limb.segment.flashTimer > 0) {
                limb.sprite.setTint(0xffffff);
            }
            else if (limb.isBackground) {
                limb.sprite.setTint(this.phase === 3 ? 0xb83838 : this.phase === 2 ? 0xb87642 : 0x7f97ae);
            }
            else if (this.phase === 2) {
                limb.sprite.setTint(0xffaa66);
            }
            else if (this.phase === 3) {
                limb.sprite.setTint(0xff5555);
            }
            else {
                limb.sprite.clearTint();
            }
            // Throw dirt/stone debris chips from foreground talons actively raking through earth
            if (spawnDigChips && !limb.isBackground && Math.cos(phase) < 0.25) {
                const tipDist = 42 * limb.baseScale;
                const tipAngle = limb.sprite.rotation + (flipY ? -0.82 : 0.82);
                const tipX = limb.sprite.x + Math.cos(tipAngle) * tipDist;
                const tipY = limb.sprite.y + Math.sin(tipAngle) * tipDist;
                const groundY = this.findSurfaceTileY(tipX) * GAME_CONSTANTS.TILE_SIZE;
                if (tipY >= groundY - 10) {
                    this.debrisEmitter.setTexture('particle_debris_stone');
                    this.debrisEmitter.explode(2, tipX, tipY);
                }
            }
        }
    }
    /**
     * Explodes physical stone, moss, and dirt debris when ground breaks.
     */
    triggerEarthDebrisExplosion(x, y) {
        this.debrisEmitter.setTexture('particle_debris_stone');
        this.debrisEmitter.explode(16, x, y);
        this.debrisEmitter.setTexture('particle_debris_moss');
        this.debrisEmitter.explode(14, x, y);
        this.debrisEmitter.setTexture('particle_debris_dirt');
        this.debrisEmitter.explode(14, x, y);
    }
    cleanupTelegraph() {
        this.cleanupPendingSpikes();
        if (this.telegraphWarningSprite)
            this.telegraphWarningSprite.setVisible(false);
        if (this.telegraphGroundHighlight) {
            this.telegraphGroundHighlight.clear();
            this.telegraphGroundHighlight.setVisible(false);
        }
    }
    /**
     * Handles weapon and projectile hits on any of Vormak's segments.
     */
    onSegmentHit(hitSegment, damage, knockbackX, knockbackY, bypassDefense = false) {
        if (this.isDead)
            return { finalDamage: 0, isDead: true };
        // Prevent multi-segment damage stacking on the same frame from a single swing
        if (this.hitCooldown > 0) {
            return { finalDamage: 0, isDead: false };
        }
        this.hitCooldown = 110; // 110ms global hit cooldown
        // Segment damage multiplier (bypassed when bare-hand punch deals exact 2/4 HP)
        const multiplier = hitSegment.isHead ? 1.0 : (hitSegment.isTail ? 0.85 : 0.65);
        const baseDamage = bypassDefense
            ? Math.max(1, damage)
            : Math.max(1, Math.round((damage - 4) * multiplier));
        this.hp -= baseDamage;
        // Stone crunch hit sound
        this.sounds.play('hit_stone');
        // Chipped rock debris sparks
        this.debrisEmitter.setTexture('particle_debris_stone');
        this.debrisEmitter.explode(4, hitSegment.x, hitSegment.y);
        // Flash hit segment white/crimson
        hitSegment.setTint(0xffffff);
        hitSegment.flashTimer = 160;
        // Update Boss Bar
        if (this.uiScene) {
            this.uiScene.updateBossBar(Math.max(0, this.hp), this.maxHp);
        }
        const isDead = this.hp <= 0;
        if (isDead) {
            this.die();
        }
        return { finalDamage: baseDamage, isDead };
    }
    /**
     * Boss defeat sequence & generous loot drop.
     */
    die() {
        if (this.isDead)
            return;
        this.isDead = true;
        this.state = VormakState.DEFEATED;
        this.cleanupTelegraph();
        this.sounds.play('boss_roar');
        this.sounds.play('boss_emerge');
        this.sounds.play('enemy_die');
        this.scene.cameras.main.shake(320, 0.007);
        if (this.lowerJaw) {
            this.lowerJaw.destroy();
            this.lowerJaw = null;
        }
        this.diggingLimbs.forEach(l => l.sprite?.destroy());
        this.diggingLimbs = [];
        this.diggingLimbs.forEach((limb) => {
            const delay = limb.segment.segmentIndex * 60;
            this.scene.time.delayedCall(delay, () => {
                if (limb.sprite && limb.sprite.scene) {
                    this.debrisEmitter.setTexture('particle_debris_stone');
                    this.debrisEmitter.explode(6, limb.sprite.x, limb.sprite.y);
                    limb.sprite.destroy();
                }
            });
        });
        this.diggingLimbs = [];
        // Explode every segment into rubble and sparks in cascading sequence
        this.allSegments.forEach((seg, idx) => {
            this.scene.time.delayedCall(idx * 60, () => {
                if (!seg || !seg.scene)
                    return;
                this.triggerEarthDebrisExplosion(seg.x, seg.y);
                seg.destroy();
            });
        });
        // Destroy active boss projectiles
        this.enemyProjectiles.clear(true, true);
        // Spawn Generous Boss Loot at death location
        const gameScene = this.scene;
        const dropGroup = gameScene.droppedItems;
        const dropX = this.head.x;
        const dropY = this.head.y;
        if (dropGroup) {
            const drops = [
                { id: 'ancient_spear', count: 1 },
                { id: 'gold_ore', count: 12 },
                { id: 'diamond', count: 6 },
                { id: 'crystal_block', count: 6 },
                { id: 'stone', count: 25 },
                { id: 'iron_ore', count: 10 }
            ];
            drops.forEach((d, idx) => {
                this.scene.time.delayedCall(300 + idx * 80, () => {
                    const offsetX = (Math.random() - 0.5) * 48;
                    const offsetY = (Math.random() - 0.5) * 24;
                    const dropped = new DroppedItem(this.scene, dropX + offsetX, dropY + offsetY, d.id, d.count);
                    dropGroup.add(dropped);
                });
            });
        }
        // Award XP
        this.player.gainXp(1000);
        // Hide Boss Bar and revert to peaceful music
        if (this.uiScene) {
            this.uiScene.hideBossBar();
        }
        this.sounds.setMusicMode('ambient');
        // Victory text banner
        if (gameScene && gameScene.showWorldFloatingText) {
            gameScene.showWorldFloatingText(this.player.x, this.player.y - 70, '🏆 VORMAK POKONANY!', '#38bdf8');
        }
    }
    /**
     * Cleanup on scene shutdown.
     */
    destroy() {
        this.isDead = true;
        this.cleanupTelegraph();
        if (this.telegraphWarningSprite)
            this.telegraphWarningSprite.destroy();
        if (this.telegraphGroundHighlight)
            this.telegraphGroundHighlight.destroy();
        if (this.neonJointGraphics)
            this.neonJointGraphics.destroy();
        if (this.lowerJaw) {
            this.lowerJaw.destroy();
            this.lowerJaw = null;
        }
        this.diggingLimbs.forEach(l => l.sprite?.destroy());
        this.diggingLimbs = [];
        this.diggingLimbs.forEach((limb) => {
            const delay = limb.segment.segmentIndex * 60;
            this.scene.time.delayedCall(delay, () => {
                if (limb.sprite && limb.sprite.scene) {
                    this.debrisEmitter.setTexture('particle_debris_stone');
                    this.debrisEmitter.explode(6, limb.sprite.x, limb.sprite.y);
                    limb.sprite.destroy();
                }
            });
        });
        this.diggingLimbs = [];
        this.debrisEmitter.destroy();
        this.enemyProjectiles.clear(true, true);
        this.spawnedLarvae.forEach(l => l.destroy());
        this.spawnedLarvae = [];
        this.allSegments.forEach(s => s.destroy());
        this.allSegments = [];
    }
}
