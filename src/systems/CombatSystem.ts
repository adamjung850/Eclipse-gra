import { ItemCategory, ItemData } from '../types/index.js';
import { Player } from '../entities/Player.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { DroppedItem } from '../entities/DroppedItem.js';
import { WorldManager } from '../world/WorldManager.js';
import { SoundSynthesizer } from './SoundSynthesizer.js';

export class CombatSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Phaser.Physics.Arcade.Group;
  private projectiles: Phaser.Physics.Arcade.Group;
  private droppedItems: Phaser.Physics.Arcade.Group;
  private worldManager: WorldManager;
  private sounds: SoundSynthesizer;

  // Particle Emitter for impacts
  private sparkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  // Cooldown timers
  private lastAttackTime: number = 0;

  // Slash effect sprite pool
  private slashSprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group,
    projectiles: Phaser.Physics.Arcade.Group,
    droppedItems: Phaser.Physics.Arcade.Group,
    worldManager: WorldManager,
    sounds: SoundSynthesizer
  ) {
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

  private initColliders(): void {
    // 1. Projectiles collide with solid world blocks across all streamed chunks
    this.worldManager.registerCollider(
      this.projectiles,
      (projObj: any) => {
        const proj = projObj as Projectile;
        this.sparkEmitter.explode(4, proj.x, proj.y);
        proj.destroy();
      }
    );

    // 2. Projectiles hit enemies
    this.scene.physics.add.overlap(
      this.projectiles,
      this.enemies,
      (projObj, enemyObj) => {
        const proj = projObj as Projectile;
        const enemy = enemyObj as Enemy;
        if (!proj.active || !enemy.active) return;

        this.handleProjectileHit(proj, enemy);
      }
    );

    // 3. Enemies collide with solid world blocks (excluding burrowing worm segments)
    this.worldManager.registerCollider(
      this.enemies,
      undefined,
      (enemyObj: any) => {
        const enemy = enemyObj as any;
        return !enemy.isBurrowing;
      }
    );

    // 4. Enemy contact damage on player
    this.scene.physics.add.overlap(this.player, this.enemies, (pObj, eObj) => {
      const enemy = eObj as Enemy;
      if (!enemy.active) return;
      this.handleEnemyContactDamage(enemy);
    });
  }

  public update(time: number, delta: number, pointer: Phaser.Input.Pointer): void {
    // 1. Update Projectiles
    const projs = this.projectiles.getChildren() as Projectile[];
    for (let i = projs.length - 1; i >= 0; i--) {
      const p = projs[i];
      if (p && p.active) {
        p.updateProjectile(delta);
      }
    }

    // 2. Update Enemies AI
    const enemyList = this.enemies.getChildren() as Enemy[];
    for (let i = enemyList.length - 1; i >= 0; i--) {
      const e = enemyList[i];
      if (e && e.active) {
        e.updateEnemy(delta, this.player.x, this.player.y);
      }
    }
  }

  /**
   * Returns true if pointer is currently hovering an active enemy hitbox.
   */
  public isPointerOverEnemy(pointer: Phaser.Input.Pointer): boolean {
    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    const enemyList = this.enemies.getChildren() as Enemy[];
    for (let i = 0; i < enemyList.length; i++) {
      const e = enemyList[i];
      if (!e || !e.active || !e.visible) continue;
      const bounds = e.getBounds();
      if (
        worldPoint.x >= bounds.x - 10 &&
        worldPoint.x <= bounds.right + 10 &&
        worldPoint.y >= bounds.y - 10 &&
        worldPoint.y <= bounds.bottom + 10
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Attempts player weapon, tool, or bare-hand punch attack. Returns true if an attack was performed.
   */
  public handlePlayerAttack(time: number, pointer: Phaser.Input.Pointer): boolean {
    const selectedItem = this.player.getSelectedItem();

    const isWeapon = selectedItem?.category === ItemCategory.WEAPON;
    const isTool = selectedItem?.category === ItemCategory.TOOL;
    const isBareHand = !isWeapon && !isTool;

    // Check attack speed cooldown
    const cooldown = isWeapon ? 320 : (isTool ? 250 : 260);
    if (time - this.lastAttackTime < cooldown) return false;
    this.lastAttackTime = time;

    const camera = this.scene.cameras.main;
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);

    // Flip player towards attack target
    this.player.isFacingLeft = worldPoint.x < this.player.x;
    this.player.setFlipX(this.player.isFacingLeft);

    // Handle distinct weapon types or bare-hand punch ("łapka")
    if (selectedItem?.id === 'hunting_bow') {
      this.fireBow(worldPoint.x, worldPoint.y, selectedItem);
    } else if (selectedItem?.id === 'apprentice_staff') {
      this.castMagicStaff(worldPoint.x, worldPoint.y, selectedItem);
    } else {
      // Melee Sword, Dagger, Spear, Pickaxe, Axe, or Bare Fist (null / non-weapon)
      this.performMeleeSwing(worldPoint.x, worldPoint.y, isBareHand ? null : selectedItem);
    }

    return true;
  }

  private performMeleeSwing(targetX: number, targetY: number, item: ItemData | null): void {
    const isBareHand = !item;

    // Trigger arm swing (or fist punch swoosh when unarmed)
    this.player.triggerToolSwing(targetX, targetY);
    this.sounds.play('sword_swing');

    // Display crescent slash/punch arc
    const slashOffset = this.player.isFacingLeft ? -22 : 22;
    const slashAngle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    const arcScale = isBareHand ? 0.65 : 1.0;

    this.slashSprite.setPosition(this.player.x + slashOffset, this.player.y - 2);
    this.slashSprite.setRotation(slashAngle);
    this.slashSprite.setFlipY(this.player.isFacingLeft);
    this.slashSprite.setScale(arcScale, arcScale);
    this.slashSprite.setVisible(true);
    this.slashSprite.setAlpha(isBareHand ? 0.7 : 0.9);

    this.scene.tweens.add({
      targets: this.slashSprite,
      alpha: 0,
      scaleX: arcScale * 1.25,
      scaleY: arcScale * 1.25,
      duration: isBareHand ? 120 : 160,
      onComplete: () => {
        this.slashSprite.setVisible(false);
        this.slashSprite.setScale(1, 1);
      }
    });

    // Check hit against enemies in front arc (accounting for large boss segment radius!)
    const reach = item ? (item.id === 'ancient_spear' ? 70 : 54) : 50;
    const enemies = this.enemies.getChildren() as Enemy[];

    for (const enemy of enemies) {
      if (!enemy.active || enemy.isInvulnerable) continue;

      const isBossSeg = !!(enemy as any).boss;
      const segRadius = isBossSeg ? ((enemy as any).isHead ? 38 : 28) : 14;
      const effectiveReach = reach + segRadius;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist <= effectiveReach) {
        const isClose = dist <= 36 + segRadius; // Always hit nearby enemies within swing/punch radius
        const isEnemyInFront = (enemy.x < this.player.x) === this.player.isFacingLeft;
        if (isClose || isEnemyInFront) {
          this.applyDamageToEnemy(enemy, item);
        }
      }
    }
  }

  private fireBow(targetX: number, targetY: number, bowItem: ItemData): void {
    this.player.triggerToolSwing(targetX, targetY);
    this.sounds.play('bow_shoot');

    const angle = Math.atan2(targetY - this.player.y, targetX - this.player.x);
    const speed = 560;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const spawnX = this.player.x + (this.player.isFacingLeft ? -16 : 16);
    const spawnY = this.player.y - 4;

    const arrow = new Projectile(
      this.scene,
      spawnX,
      spawnY,
      'proj_arrow',
      bowItem.damage || 20,
      (this.player.critChance + (bowItem.critChance || 0)),
      vx,
      vy,
      false
    );
    this.projectiles.add(arrow);
  }

  private castMagicStaff(targetX: number, targetY: number, staffItem: ItemData): void {
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

    const magicBolt = new Projectile(
      this.scene,
      spawnX,
      spawnY,
      'proj_magic',
      staffItem.damage || 32,
      (this.player.critChance + (staffItem.critChance || 0)),
      vx,
      vy,
      true
    );
    this.projectiles.add(magicBolt);
  }

  private handleProjectileHit(proj: Projectile, enemy: Enemy): void {
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
      } else {
        this.sounds.play('hit_enemy');
        this.showCombatFloatingText(enemy.x, enemy.y - 14, `-${result.finalDamage}`, '#ffffff', 12);
      }
    }

    if (result.isDead) {
      this.handleEnemyDefeated(enemy);
    }
  }

  private applyDamageToEnemy(enemy: Enemy, weaponItem: ItemData | null): void {
    const isBareHand = !weaponItem;
    const baseDamage = weaponItem ? (weaponItem.damage || 6) : 2;
    const critChance = this.player.critChance + (weaponItem?.critChance || 0);
    const isCrit = Math.random() < critChance;
    // Bare fist: 2 HP normal, 4 HP on crit! Weapons: 1.8x crit multiplier
    const damage = isBareHand ? (isCrit ? 4 : 2) : (isCrit ? Math.round(baseDamage * 1.8) : baseDamage);

    const knockbackDir = this.player.isFacingLeft ? -1 : 1;
    const knockbackX = knockbackDir * (isBareHand ? (isCrit ? 42 : 28) : (isCrit ? 65 : 45));
    const knockbackY = isBareHand ? -110 : (isCrit ? -155 : -135);

    const result = (enemy as any).boss
      ? (enemy as any).takeDamage(damage, knockbackX, knockbackY, isBareHand)
      : enemy.takeDamage(damage, knockbackX, knockbackY, isBareHand);

    this.sparkEmitter.explode(10, enemy.x, enemy.y);

    if (result.finalDamage > 0) {
      if (isCrit) {
        this.sounds.play('hit_crit');
        this.showCombatFloatingText(enemy.x, enemy.y - 18, `KRYTYK! ${result.finalDamage}`, '#facc15', 15);
      } else {
        this.sounds.play('hit_enemy');
        this.showCombatFloatingText(enemy.x, enemy.y - 14, `-${result.finalDamage}`, '#ffffff', 12);
      }
    }

    if (result.isDead) {
      this.handleEnemyDefeated(enemy);
    }
  }

  private handleEnemyContactDamage(enemy: Enemy): void {
    const knockbackDir = enemy.x < this.player.x ? 1 : -1;
    const knockbackX = knockbackDir * 125;

    const result = this.player.takeDamage(enemy.damage, knockbackX, -145);

    // Gently nudge enemy horizontally away, maintaining natural physics (only for regular enemies)
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    if (enemyBody && !(enemy as any).isBurrowing) {
      enemyBody.setVelocityX(-knockbackDir * 28);
    }

    if (result.tookDamage) {
      this.sounds.play('player_hurt');
      this.showCombatFloatingText(this.player.x, this.player.y - 20, `-${result.damageDealt} PŻ`, '#ef4444', 13);

      if (result.isDead) {
        this.sounds.play('player_hurt');
        this.showCombatFloatingText(this.player.x, this.player.y - 35, 'ZGINĄŁEŚ!', '#f43f5e', 14);
        // Ekran zgonu GTA-style w UIScene obsługuje slowmo, shake, sekwencję kolorów i respawn
        const uiScene = this.scene.scene.get('UIScene') as any;
        if (uiScene && uiScene.showDeathScreen) {
          uiScene.showDeathScreen();
        }
      }
    }
  }

  public handleEnemyDefeated(enemy: Enemy): void {
    this.sounds.play('enemy_die');
    this.sparkEmitter.explode(18, enemy.x, enemy.y);

    // 1. Award XP
    const leveledUp = this.player.gainXp(enemy.xpReward);
    this.showCombatFloatingText(enemy.x, enemy.y - 24, `+${enemy.xpReward} PD`, '#38bdf8', 12);

    if (leveledUp) {
      this.sounds.play('level_up');
      this.showCombatFloatingText(
        this.player.x,
        this.player.y - 45,
        `AWANS! Poziom ${this.player.level}`,
        '#facc15',
        16
      );
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

  public showCombatFloatingText(
    worldX: number,
    worldY: number,
    text: string,
    color: string = '#ffffff',
    fontSize: number = 12
  ): void {
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
