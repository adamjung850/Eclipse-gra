import { GAME_CONSTANTS } from '../types/index.js';
import { Enemy } from './Enemy.js';
export var VormakState;
(function (VormakState) {
    VormakState[VormakState["UNDERGROUND_SWIM"] = 0] = "UNDERGROUND_SWIM";
    VormakState[VormakState["TELEGRAPHING"] = 1] = "TELEGRAPHING";
    VormakState[VormakState["BURSTING_UP"] = 2] = "BURSTING_UP";
    VormakState[VormakState["AIRBORNE_ARC"] = 3] = "AIRBORNE_ARC";
    VormakState[VormakState["DIVING_DOWN"] = 4] = "DIVING_DOWN";
    VormakState[VormakState["DEFEATED"] = 5] = "DEFEATED";
})(VormakState || (VormakState = {}));
/**
 * Individual physical segment of Vormak (Head, Body, or Tail).
 * Extends Enemy so CombatSystem detects weapon hits, projectile hits, and contact damage.
 */
export class VormakSegment extends Enemy {
    boss;
    segmentIndex;
    isHead;
    isTail;
    constructor(scene, x, y, texture, boss, segmentIndex, isHead = false, isTail = false) {
        super(scene, x, y, 'vormak');
        this.setTexture(texture);
        this.boss = boss;
        this.segmentIndex = segmentIndex;
        this.isHead = isHead;
        this.isTail = isTail;
        this.setDepth(20 - segmentIndex); // Head in front, body behind
        const body = this.body;
        if (body) {
            body.setAllowGravity(false); // Worm controls its own continuous kinematics
            if (isHead) {
                body.setSize(56, 56);
                body.setOffset(20, 20);
                this.setOrigin(0.35, 0.5); // Pivot at the neck/throat connection
            }
            else if (isTail) {
                body.setSize(44, 44);
                body.setOffset(6, 6);
                this.setOrigin(0.5, 0.5);
            }
            else {
                body.setSize(52, 52);
                body.setOffset(8, 8);
                this.setOrigin(0.5, 0.5);
            }
        }
    }
    /**
     * Overrides Enemy.takeDamage to route all segment damage to Vormak's central HP pool.
     */
    takeDamage(damage, knockbackX, knockbackY) {
        return this.boss.onSegmentHit(this, damage, knockbackX, knockbackY);
    }
    /**
     * Disables Enemy's standard AI so VormakBoss controls segment movement.
     */
    updateEnemy(delta, playerX, playerY) {
        if (this.flashTimer > 0) {
            this.flashTimer -= delta;
            if (this.flashTimer <= 0) {
                this.clearTint();
            }
        }
    }
}
/**
 * Vormak, The Earth Devourer - Colossal Terraria-style Segmented Mossy Stone Worm Boss.
 * Operates with continuous kinematic serpentine physics (zero teleportation).
 */
export class VormakBoss {
    scene;
    worldManager;
    player;
    sounds;
    enemiesGroup;
    // Boss Health & Stats
    maxHp = 750;
    hp = 750;
    isDead = false;
    // Worm Segments (1 Head + 12 Body + 1 Tail = 14 Segments)
    head;
    bodySegments = [];
    allSegments = [];
    // State Machine
    state = VormakState.UNDERGROUND_SWIM;
    stateTimer = 0;
    // Attack Emergence Targeting (Alternates under player / beside player)
    attackUnderFeet = false;
    emergencePos = { x: 0, y: 0 };
    entryPos = { x: 0, y: 0 };
    // Continuous Kinematic Motion (NO TELEPORTATION)
    headVx = 0;
    headVy = 0;
    currentSpeed = 280;
    currentAngle = 0;
    hasBreachedSurface = false;
    hasBreachedEntry = false;
    roarTimer = 5000;
    // Telegraph Visuals
    telegraphWarningSprite = null;
    telegraphGroundHighlight = null;
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
        // Spawn deep underground below player
        const spawnX = player.x;
        const spawnY = player.y + 280;
        // 1. Create Head Segment (96x96 Colossal Jaws)
        this.head = new VormakSegment(scene, spawnX, spawnY, 'boss_vormak_head', this, 0, true, false);
        this.allSegments.push(this.head);
        this.enemiesGroup.add(this.head);
        // 2. Create 12 Body Segments + 1 Tail Segment (14 segments total)
        const totalBody = 12;
        for (let i = 1; i <= totalBody; i++) {
            const isTail = i === totalBody;
            const tex = isTail ? 'boss_vormak_tail' : 'boss_vormak_body';
            const seg = new VormakSegment(scene, spawnX - i * 36, spawnY, tex, this, i, false, isTail);
            this.bodySegments.push(seg);
            this.allSegments.push(seg);
            this.enemiesGroup.add(seg);
        }
        // 3. Initialize Ground Breaking Debris Particle Emitter
        this.debrisEmitter = scene.add.particles(0, 0, 'particle_debris_stone', {
            lifespan: { min: 450, max: 950 },
            speed: { min: 160, max: 420 },
            angle: { min: 200, max: 340 }, // Explosive upward burst
            gravityY: 650,
            scale: { start: 1.4, end: 0.2 },
            emitting: false
        });
        this.debrisEmitter.setDepth(25);
        // 4. Initialize Boss Bar on UI
        if (this.uiScene) {
            this.uiScene.showBossBar('Vormak, Pożeracz Ziemi', this.hp, this.maxHp);
        }
        // 5. Start Boss Battle Music (Loud, Dark Gothic Doom Theme)
        this.sounds.setMusicMode('boss');
        // Begin swimming underground
        this.currentSpeed = 300;
        this.currentAngle = 0;
        this.state = VormakState.UNDERGROUND_SWIM;
        this.stateTimer = 1600; // First telegraph starts quickly
    }
    update(time, delta) {
        if (this.isDead)
            return;
        const dt = delta / 1000;
        // Periodic roar timer during airborne leaps
        this.roarTimer -= delta;
        if (this.roarTimer <= 0) {
            this.roarTimer = Phaser.Math.Between(6000, 10000);
            if (this.state === VormakState.AIRBORNE_ARC || this.state === VormakState.BURSTING_UP) {
                this.sounds.play('boss_roar');
                this.scene.cameras.main.shake(260, 0.010);
            }
        }
        // State machine updates
        switch (this.state) {
            case VormakState.UNDERGROUND_SWIM:
                this.updateUndergroundSwim(time, dt);
                break;
            case VormakState.TELEGRAPHING:
                this.updateTelegraphing(time, delta, dt);
                break;
            case VormakState.BURSTING_UP:
                this.updateBurstingUp(delta, dt);
                break;
            case VormakState.AIRBORNE_ARC:
                this.updateAirborneArc(delta, dt);
                break;
            case VormakState.DIVING_DOWN:
                this.updateDivingDown(delta, dt);
                break;
        }
        // Continuous inverse kinematics: all segments follow strictly at fixed distances
        this.updateSegmentChaining();
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
     * Phase 1: Boss swims smoothly underground in wide sinuous arcs.
     */
    updateUndergroundSwim(time, dt) {
        this.stateTimer -= dt * 1000;
        // Undulating subterranean patrol path
        const targetY = this.player.y + 240 + Math.sin(time * 0.003) * 50;
        const targetX = this.player.x + Math.cos(time * 0.002) * 160;
        const desiredAngle = Math.atan2(targetY - this.head.y, targetX - this.head.x);
        this.steerTowardsAngle(desiredAngle, 2.8 * dt);
        this.currentSpeed = 300;
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = this.currentAngle;
        if (this.stateTimer <= 0) {
            this.prepareTelegraph();
        }
    }
    /**
     * Determines next attack target position and initiates visual telegraphing.
     */
    prepareTelegraph() {
        this.attackUnderFeet = !this.attackUnderFeet;
        let targetX;
        if (this.attackUnderFeet) {
            // 1. Right under player's feet
            targetX = this.player.x;
        }
        else {
            // 2. Next to the player (140-180px to the left or right)
            const side = Math.random() < 0.5 ? -1 : 1;
            targetX = this.player.x + side * Phaser.Math.Between(140, 180);
        }
        // Clamp within world bounds
        const T = GAME_CONSTANTS.TILE_SIZE;
        const minX = 4 * T;
        const maxX = (GAME_CONSTANTS.WORLD_WIDTH - 4) * T;
        targetX = Phaser.Math.Clamp(targetX, minX, maxX);
        // Find ground surface height at targetX
        const tileX = Math.floor(targetX / T);
        let surfaceTileY = GAME_CONSTANTS.SURFACE_HEIGHT;
        for (let ty = 10; ty < GAME_CONSTANTS.BEDROCK_DEPTH; ty++) {
            if (this.worldManager.getBlock(tileX, ty) !== 0) {
                surfaceTileY = ty;
                break;
            }
        }
        const surfaceY = surfaceTileY * T;
        this.emergencePos = { x: targetX, y: surfaceY };
        this.hasBreachedSurface = false;
        this.hasBreachedEntry = false;
        // Create Red Exclamation Mark Telegraph
        if (!this.telegraphWarningSprite) {
            this.telegraphWarningSprite = this.scene.add.sprite(targetX, surfaceY - 32, 'vormak_warning_mark');
            this.telegraphWarningSprite.setDepth(28);
        }
        else {
            this.telegraphWarningSprite.setPosition(targetX, surfaceY - 32);
            this.telegraphWarningSprite.setVisible(true);
        }
        this.telegraphWarningSprite.setScale(1);
        // Warning Mark Pulse Bounce Tween
        this.scene.tweens.killTweensOf(this.telegraphWarningSprite);
        this.scene.tweens.add({
            targets: this.telegraphWarningSprite,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 200,
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
        this.stateTimer = 1350; // 1.35 seconds warning
    }
    /**
     * Phase 2: Ground blocks flash red with floating red exclamation mark.
     * Vormak maneuvers smoothly underground into launch position (NO TELEPORTATION).
     */
    updateTelegraphing(time, delta, dt) {
        this.stateTimer -= delta;
        // Flash ground blocks in red
        if (this.telegraphGroundHighlight) {
            this.telegraphGroundHighlight.clear();
            const flashAlpha = 0.40 + Math.sin(time * 0.028) * 0.35;
            this.telegraphGroundHighlight.fillStyle(0xef4444, flashAlpha);
            this.telegraphGroundHighlight.lineStyle(2, 0xff0000, flashAlpha + 0.25);
            const T = GAME_CONSTANTS.TILE_SIZE;
            const startX = this.emergencePos.x - 2.5 * T;
            const startY = this.emergencePos.y;
            this.telegraphGroundHighlight.fillRoundedRect(startX, startY, 5 * T, 2 * T, 4);
            this.telegraphGroundHighlight.strokeRoundedRect(startX, startY, 5 * T, 2 * T, 4);
        }
        // Seismic camera rumble before eruption
        if (this.stateTimer < 500) {
            this.scene.cameras.main.shake(100, 0.004);
        }
        // Boss steers smoothly towards launch approach point ~120px below emergence spot
        const launchPrepY = this.emergencePos.y + 130;
        const desiredAngle = Math.atan2(launchPrepY - this.head.y, this.emergencePos.x - this.head.x);
        this.steerTowardsAngle(desiredAngle, 3.8 * dt);
        this.currentSpeed = 340;
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = this.currentAngle;
        if (this.stateTimer <= 0) {
            this.startBurst();
        }
    }
    /**
     * Phase 3: Explosive high-altitude launch towards the surface.
     */
    startBurst() {
        // Hide telegraphs
        if (this.telegraphWarningSprite)
            this.telegraphWarningSprite.setVisible(false);
        if (this.telegraphGroundHighlight) {
            this.telegraphGroundHighlight.clear();
            this.telegraphGroundHighlight.setVisible(false);
        }
        // Colossal upward breach: high speed launch ascending 550+ pixels into the sky!
        const dirToPlayer = Math.sign(this.player.x - this.head.x) || (Math.random() < 0.5 ? -1 : 1);
        this.currentAngle = -Math.PI / 2 + dirToPlayer * 0.22; // Steep upward angle (~77° or ~103°)
        this.currentSpeed = 1250; // Massive explosive skyward leap speed
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.state = VormakState.BURSTING_UP;
        this.stateTimer = 720; // 720ms of sustained rocket ascent into the sky
    }
    /**
     * Phase 3 update: Rocketing skyward through the ground.
     */
    updateBurstingUp(delta, dt) {
        this.stateTimer -= delta;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = Math.atan2(this.headVy, this.headVx);
        // When crossing the surface plane moving upward: trigger earth explosion!
        if (!this.hasBreachedSurface && this.head.y <= this.emergencePos.y + 20) {
            this.hasBreachedSurface = true;
            this.triggerEarthDebrisExplosion(this.emergencePos.x, this.emergencePos.y);
            this.sounds.play('boss_emerge');
            this.sounds.play('boss_roar');
            this.scene.cameras.main.shake(400, 0.024);
        }
        if (this.stateTimer <= 0) {
            this.state = VormakState.AIRBORNE_ARC;
        }
    }
    /**
     * Phase 4: Airborne arc: gentle natural gravity lets the entire colossal serpent soar across the sky.
     */
    updateAirborneArc(delta, dt) {
        // Gentle natural gravity gives high floaty flight for all 14 segments to clear the ground
        this.headVy += 380 * dt;
        this.headVx *= 0.996; // Minimal horizontal drag
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.currentAngle = Math.atan2(this.headVy, this.headVx);
        this.head.rotation = this.currentAngle;
        // When head is descending and crosses the ground level -> start burrowing
        if (this.headVy > 0 && this.head.y >= this.emergencePos.y - 10) {
            this.startDive();
        }
    }
    /**
     * Phase 5: Head slams into the ground, crushing earth and burrowing in.
     */
    startDive() {
        this.entryPos = { x: this.head.x, y: this.head.y };
        if (!this.hasBreachedEntry) {
            this.hasBreachedEntry = true;
            this.triggerEarthDebrisExplosion(this.head.x, this.head.y);
            this.sounds.play('boss_burrow');
            this.scene.cameras.main.shake(300, 0.016);
        }
        this.currentSpeed = 520; // High speed subterranean dive plunge
        this.state = VormakState.DIVING_DOWN;
    }
    /**
     * Phase 5 update: Head plunges underground, pulling body behind it in smooth curve.
     */
    updateDivingDown(delta, dt) {
        // Steer smoothly deeper into the earth in a wide sweeping curve
        const diveCurveDir = this.headVx >= 0 ? 0.35 : -0.35;
        this.steerTowardsAngle(Math.PI / 2 + diveCurveDir, 2.2 * dt);
        this.headVx = Math.cos(this.currentAngle) * this.currentSpeed;
        this.headVy = Math.sin(this.currentAngle) * this.currentSpeed;
        this.head.x += this.headVx * dt;
        this.head.y += this.headVy * dt;
        this.head.rotation = this.currentAngle;
        // When tail has completely submerged below the ground, transition smoothly back to underground swim
        const tail = this.allSegments[this.allSegments.length - 1];
        if (tail.y > this.emergencePos.y + 60) {
            this.state = VormakState.UNDERGROUND_SWIM;
            this.stateTimer = Phaser.Math.Between(1800, 2600); // 1.8 - 2.6s underground prep
        }
    }
    /**
     * Inverse Kinematics: Chained body segments follow the segment in front at EXACT rigid distances.
     * Completely eliminates accordion stretching, squashing, and separation!
     */
    updateSegmentChaining() {
        for (let i = 1; i < this.allSegments.length; i++) {
            const prev = this.allSegments[i - 1];
            const curr = this.allSegments[i];
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const angle = Math.atan2(dy, dx); // Angle from prev to curr
            // Spacing: head-to-body = 42px, body-to-body = 36px, body-to-tail = 34px
            const spacing = i === 1 ? 42 : (curr.isTail ? 34 : 36);
            curr.x = prev.x + Math.cos(angle) * spacing;
            curr.y = prev.y + Math.sin(angle) * spacing;
            curr.rotation = angle + Math.PI; // Face forward along the serpent spine
        }
    }
    /**
     * Explodes physical stone, moss, and dirt debris when ground breaks.
     */
    triggerEarthDebrisExplosion(x, y) {
        // Explode stone chunks
        this.debrisEmitter.setTexture('particle_debris_stone');
        this.debrisEmitter.explode(16, x, y);
        // Explode moss chunks
        this.debrisEmitter.setTexture('particle_debris_moss');
        this.debrisEmitter.explode(14, x, y);
        // Explode dirt chunks
        this.debrisEmitter.setTexture('particle_debris_dirt');
        this.debrisEmitter.explode(14, x, y);
    }
    /**
     * Handles weapon and projectile hits on any of Vormak's segments.
     */
    onSegmentHit(hitSegment, damage, knockbackX, knockbackY) {
        if (this.isDead)
            return { finalDamage: 0, isDead: true };
        // Apply boss defense
        const finalDamage = Math.max(1, damage - 4);
        this.hp -= finalDamage;
        // Play realistic heavy stone armor impact crunch
        this.sounds.play('hit_stone');
        // Chipped rock debris sparks
        this.debrisEmitter.setTexture('particle_debris_stone');
        this.debrisEmitter.explode(4, hitSegment.x, hitSegment.y);
        // Flash hit segment and adjacent segments
        hitSegment.setTint(0xff4444);
        hitSegment.flashTimer = 180;
        const prevSeg = this.allSegments[hitSegment.segmentIndex - 1];
        if (prevSeg) {
            prevSeg.setTint(0xff6666);
            prevSeg.flashTimer = 140;
        }
        const nextSeg = this.allSegments[hitSegment.segmentIndex + 1];
        if (nextSeg) {
            nextSeg.setTint(0xff6666);
            nextSeg.flashTimer = 140;
        }
        // Update Boss Bar
        if (this.uiScene) {
            this.uiScene.updateBossBar(Math.max(0, this.hp), this.maxHp);
        }
        const isDead = this.hp <= 0;
        if (isDead) {
            this.die();
        }
        return { finalDamage, isDead };
    }
    /**
     * Boss defeat sequence.
     */
    die() {
        if (this.isDead)
            return;
        this.isDead = true;
        this.state = VormakState.DEFEATED;
        // Remove telegraphs
        if (this.telegraphWarningSprite)
            this.telegraphWarningSprite.destroy();
        if (this.telegraphGroundHighlight)
            this.telegraphGroundHighlight.destroy();
        // Defeat roar & explosion
        this.sounds.play('boss_roar');
        this.sounds.play('boss_emerge');
        this.sounds.play('enemy_die');
        // Massive screen shake
        this.scene.cameras.main.shake(650, 0.028);
        // Explode every segment into rubble and sparks in a cascading sequence
        this.allSegments.forEach((seg, idx) => {
            this.scene.time.delayedCall(idx * 75, () => {
                if (!seg || !seg.scene)
                    return;
                this.triggerEarthDebrisExplosion(seg.x, seg.y);
                seg.destroy();
            });
        });
        // Hide Boss Bar and revert to peaceful music
        if (this.uiScene) {
            this.uiScene.hideBossBar();
        }
        this.sounds.setMusicMode('ambient');
        // Victory text banner
        const gameScene = this.scene;
        if (gameScene && gameScene.showWorldFloatingText) {
            gameScene.showWorldFloatingText(this.player.x, this.player.y - 60, '🏆 VORMAK POKONANY!', '#38bdf8');
        }
    }
    /**
     * Cleanup on scene shutdown.
     */
    destroy() {
        this.isDead = true;
        if (this.telegraphWarningSprite)
            this.telegraphWarningSprite.destroy();
        if (this.telegraphGroundHighlight)
            this.telegraphGroundHighlight.destroy();
        this.debrisEmitter.destroy();
        this.allSegments.forEach((s) => s.destroy());
        this.allSegments = [];
    }
}
