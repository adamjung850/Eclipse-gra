import { CraftingStation, EquipSlotType, GAME_CONSTANTS, InventorySlot, ItemCategory, ItemData } from '../types/index.js';
import { ITEM_REGISTRY } from '../world/ItemTypes.js';
import { WorldManager } from '../world/WorldManager.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Base Stats
  public baseHp: number = 100;
  public baseMana: number = 50;
  public hp: number = 100;
  public maxHp: number = 100;
  public mana: number = 50;
  public maxMana: number = 50;
  public defense: number = 0;
  public speedBonus: number = 0;
  public critChance: number = 0.05;
  public level: number = 1;
  public xp: number = 0;
  public maxXp: number = 100;

  // Inventory: 45 slots (0..8 = Hotbar, 9..44 = Backpack)
  public inventory: InventorySlot[] = [];
  public selectedSlot: number = 0;

  // Equipment slots
  public equipment: Record<string, InventorySlot> = {
    [EquipSlotType.HELMET]: { item: null, count: 0 },
    [EquipSlotType.CHEST]: { item: null, count: 0 },
    [EquipSlotType.LEGS]: { item: null, count: 0 },
    [EquipSlotType.BOOTS]: { item: null, count: 0 },
    [EquipSlotType.RING_1]: { item: null, count: 0 },
    [EquipSlotType.RING_2]: { item: null, count: 0 },
    [EquipSlotType.AMULET]: { item: null, count: 0 },
    [EquipSlotType.CAPE]: { item: null, count: 0 }
  };

  // Movement & Jump State
  public isGrounded: boolean = false;
  private coyoteTimer: number = 0;
  private jumpBufferTimer: number = 0;
  public isFacingLeft: boolean = false;

  // Combat State
  public invulnerabilityTimer: number = 0;
  public spawnX: number = 0;
  public spawnY: number = 0;

  // Arm & Tool Visual
  public toolSprite!: Phaser.GameObjects.Sprite;
  public isSwinging: boolean = false;
  private swingProgress: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player_idle');
    this.spawnX = x;
    this.spawnY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(20);
    this.initPhysics();
    this.initInventory();
    this.initToolVisual();
    this.initAnimations();
    this.recalculateStats();
  }

  private initPhysics(): void {
    if (this.body) {
      this.body.setSize(16, 36);
      this.body.setOffset(4, 4);
      (this.body as Phaser.Physics.Arcade.Body).setGravityY(GAME_CONSTANTS.GRAVITY);
      this.setCollideWorldBounds(true);
    }
  }

  private initInventory(): void {
    // 45 slots total: 9 hotbar + 36 backpack (all empty on spawn - pure survival progression)
    for (let i = 0; i < GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS; i++) {
      this.inventory.push({ item: null, count: 0 });
    }
  }

  private initToolVisual(): void {
    this.toolSprite = this.scene.add.sprite(this.x, this.y, 'icon_pickaxe');
    this.toolSprite.setOrigin(0.2, 0.8);
    this.toolSprite.setDepth(22);
    this.toolSprite.setVisible(false);
  }

  private initAnimations(): void {
    if (!this.scene.anims.exists('player_walk')) {
      this.scene.anims.create({
        key: 'player_walk',
        frames: [
          { key: 'player_walk_0' },
          { key: 'player_walk_1' },
          { key: 'player_walk_2' },
          { key: 'player_walk_3' }
        ],
        frameRate: 8,
        repeat: -1
      });
    }
  }

  public recalculateStats(): void {
    let bonusDefense = 0;
    let bonusHp = 0;
    let bonusMana = 0;
    let bonusSpeed = 0;
    let bonusCrit = 0.05;

    for (const slotKey of Object.keys(this.equipment)) {
      const slot = this.equipment[slotKey];
      if (slot && slot.item) {
        if (slot.item.defense) bonusDefense += slot.item.defense;
        if (slot.item.hpBonus) bonusHp += slot.item.hpBonus;
        if (slot.item.manaBonus) bonusMana += slot.item.manaBonus;
        if (slot.item.speedBonus) bonusSpeed += slot.item.speedBonus;
        if (slot.item.critChance) bonusCrit += slot.item.critChance;
      }
    }

    this.defense = bonusDefense;
    this.speedBonus = bonusSpeed;
    this.critChance = bonusCrit;

    this.maxHp = this.baseHp + bonusHp;
    this.maxMana = this.baseMana + bonusMana;
    this.hp = Math.min(this.hp, this.maxHp);
    this.mana = Math.min(this.mana, this.maxMana);
  }

  public getSelectedItem(): ItemData | null {
    const slot = this.inventory[this.selectedSlot];
    return slot ? slot.item : null;
  }

  public getSelectedItemCount(): number {
    const slot = this.inventory[this.selectedSlot];
    return slot ? slot.count : 0;
  }

  public consumeSelectedItem(amount: number = 1): boolean {
    const slot = this.inventory[this.selectedSlot];
    if (!slot || !slot.item || slot.count < amount) return false;

    slot.count -= amount;
    if (slot.count <= 0) {
      slot.item = null;
      slot.count = 0;
    }
    return true;
  }

  public hasItem(itemId: string, amount: number = 1): boolean {
    let total = 0;
    for (const slot of this.inventory) {
      if (slot.item && slot.item.id === itemId) {
        total += slot.count;
        if (total >= amount) return true;
      }
    }
    return false;
  }

  public consumeItem(itemId: string, amount: number = 1): boolean {
    if (!this.hasItem(itemId, amount)) return false;

    let remaining = amount;
    for (const slot of this.inventory) {
      if (slot.item && slot.item.id === itemId) {
        const take = Math.min(remaining, slot.count);
        slot.count -= take;
        remaining -= take;
        if (slot.count <= 0) {
          slot.item = null;
          slot.count = 0;
        }
        if (remaining <= 0) break;
      }
    }
    return true;
  }

  public addItem(itemId: string, amount: number = 1): boolean {
    const itemData = ITEM_REGISTRY[itemId];
    if (!itemData) return false;

    // 1. Stack into existing slots
    for (const slot of this.inventory) {
      if (slot.item && slot.item.id === itemId && slot.count < slot.item.maxStack) {
        const canAdd = Math.min(amount, slot.item.maxStack - slot.count);
        slot.count += canAdd;
        amount -= canAdd;
        if (amount <= 0) return true;
      }
    }

    // 2. Insert into first empty slot
    for (const slot of this.inventory) {
      if (!slot.item) {
        slot.item = itemData;
        slot.count = amount;
        return true;
      }
    }

    return false; // Inventory full
  }

  public equipItem(fromInventoryIndex: number): boolean {
    const slot = this.inventory[fromInventoryIndex];
    if (!slot || !slot.item || !slot.item.equipSlot) return false;

    const equipTarget = slot.item.equipSlot;
    const currentEquip = this.equipment[equipTarget];

    // Swap items
    const itemToEquip = slot.item;
    slot.item = currentEquip.item;
    slot.count = currentEquip.item ? 1 : 0;

    currentEquip.item = itemToEquip;
    currentEquip.count = 1;

    this.recalculateStats();
    return true;
  }

  public unequipItem(equipSlot: string): boolean {
    const equip = this.equipment[equipSlot];
    if (!equip || !equip.item) return false;

    // Find free inventory slot
    for (const slot of this.inventory) {
      if (!slot.item) {
        slot.item = equip.item;
        slot.count = 1;
        equip.item = null;
        equip.count = 0;
        this.recalculateStats();
        return true;
      }
    }

    return false; // Inventory full
  }

  public useConsumable(slotIndex: number): boolean {
    const slot = this.inventory[slotIndex];
    if (!slot || !slot.item || slot.item.category !== ItemCategory.CONSUMABLE) return false;

    let used = false;
    if (slot.item.healAmount && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + slot.item.healAmount);
      used = true;
    }

    if (slot.item.manaHealAmount && this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + slot.item.manaHealAmount);
      used = true;
    }

    if (slot.item.speedBonus) {
      this.speedBonus += slot.item.speedBonus;
      this.scene.time.delayedCall(60000, () => {
        this.speedBonus = Math.max(0, this.speedBonus - (slot.item?.speedBonus || 0));
      });
      used = true;
    }

    if (used) {
      slot.count -= 1;
      if (slot.count <= 0) {
        slot.item = null;
        slot.count = 0;
      }
    }
    return used;
  }

  public getNearbyStations(worldManager: WorldManager): Set<CraftingStation> {
    const stations = new Set<CraftingStation>();
    stations.add(CraftingStation.HAND);

    const T = GAME_CONSTANTS.TILE_SIZE;
    const playerTileX = Math.floor(this.x / T);
    const playerTileY = Math.floor(this.y / T);
    const radius = 5; // 5 tiles radius

    for (let x = playerTileX - radius; x <= playerTileX + radius; x++) {
      for (let y = playerTileY - radius; y <= playerTileY + radius; y++) {
        const blockId = worldManager.getBlock(x, y);
        const def = BLOCK_DEFINITIONS[blockId];
        if (def && def.isStation) {
          stations.add(def.isStation);
        }
      }
    }

    return stations;
  }

  public triggerToolSwing(targetWorldX: number, targetWorldY: number): void {
    this.isSwinging = true;
    this.swingProgress = 0;

    const item = this.getSelectedItem();
    if (item) {
      this.toolSprite.setTexture(item.iconTexture);
      this.toolSprite.setVisible(true);
    } else {
      this.toolSprite.setVisible(false);
    }
  }

  public updatePlayer(delta: number, moveLeft: boolean, moveRight: boolean, jumpPressed: boolean, jumpHeld: boolean): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    this.isGrounded = body.blocked.down || body.touching.down;

    if (this.isGrounded) {
      this.coyoteTimer = 120;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer -= delta;
    }

    if (jumpPressed) {
      this.jumpBufferTimer = 120;
    } else if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= delta;
    }

    const currentSpeed = GAME_CONSTANTS.PLAYER_SPEED * (1 + this.speedBonus);

    if (moveLeft) {
      body.setVelocityX(-currentSpeed);
      this.isFacingLeft = true;
      this.setFlipX(true);
    } else if (moveRight) {
      body.setVelocityX(currentSpeed);
      this.isFacingLeft = false;
      this.setFlipX(false);
    } else {
      body.setVelocityX(0);
    }

    // Auto-step 1 bloku (24px) bez skakania i bez zwalniania — płynne wejście po pojedynczym stopniu
    const wm = (this.scene as any).worldManager;
    if (wm && this.isGrounded && body.velocity.y >= 0 && (moveLeft || moveRight)) {
      const T = GAME_CONSTANTS.TILE_SIZE;
      const dir = moveLeft ? -1 : 1;
      const probeX = dir < 0 ? body.left - 3 : body.right + 3;
      const stepTileX = Math.floor(probeX / T);
      const curTileX = Math.floor((body.left + body.right) * 0.5 / T);

      if (stepTileX !== curTileX || (moveLeft && body.blocked.left) || (moveRight && body.blocked.right)) {
        const feetTileY = Math.floor((body.bottom - 2) / T);
        const curLeftTileX = Math.floor((body.left + 2) / T);
        const curRightTileX = Math.floor((body.right - 2) / T);
        const headTileY = Math.floor((body.top + 2) / T);

        const stepSolid = wm.isSolid(stepTileX, feetTileY);
        const above1Free = !wm.isSolid(stepTileX, feetTileY - 1);
        const above2Free = !wm.isSolid(stepTileX, feetTileY - 2);
        let headClear = true;
        for (let tx = curLeftTileX; tx <= curRightTileX; tx++) {
          if (wm.isSolid(tx, headTileY - 1)) headClear = false;
        }

        if (stepSolid && above1Free && above2Free && headClear) {
          const targetBottomY = feetTileY * T - 0.1;
          const bottomOffset = body.bottom - this.y;
          this.y = targetBottomY - bottomOffset;
          this.x += dir * 2;
          body.position.y = targetBottomY - body.height;
          body.position.x += dir * 2;
          body.prev.y = body.position.y;
          body.prev.x = body.position.x;
          body.setVelocityX(dir * currentSpeed);
          body.setVelocityY(0);
          body.blocked.down = true;
          this.isGrounded = true;
        }
      }
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      body.setVelocityY(GAME_CONSTANTS.PLAYER_JUMP_VELOCITY);
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
    }

    if (!jumpHeld && body.velocity.y < -100) {
      body.setVelocityY(body.velocity.y * 0.75);
    }

    if (!this.isGrounded) {
      this.setTexture('player_jump');
    } else if (moveLeft || moveRight) {
      if (this.anims.currentAnim?.key !== 'player_walk' || !this.anims.isPlaying) {
        this.play('player_walk');
      }
    } else {
      this.stop();
      this.setTexture('player_idle');
    }

    // Invulnerability visual flashing
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= delta;
      const flicker = Math.floor(this.invulnerabilityTimer / 70) % 2 === 0;
      this.setAlpha(flicker ? 0.35 : 0.85);
      this.setTint(0xff6666);
    } else {
      this.setAlpha(1);
      this.clearTint();
    }

    this.updateToolVisual(delta);
  }

  public takeDamage(
    amount: number,
    knockbackX: number = 0,
    knockbackY: number = -180
  ): { tookDamage: boolean; damageDealt: number; isDead: boolean } {
    if (this.invulnerabilityTimer > 0) {
      return { tookDamage: false, damageDealt: 0, isDead: false };
    }

    const defenseReduction = Math.floor(this.defense * 0.5);
    const finalDamage = Math.max(1, amount - defenseReduction);

    this.hp = Math.max(0, this.hp - finalDamage);
    this.invulnerabilityTimer = 650; // 650ms invulnerability frames

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocityX(knockbackX);
      body.setVelocityY(knockbackY);
    }

    const isDead = this.hp <= 0;
    return { tookDamage: true, damageDealt: finalDamage, isDead };
  }

  public respawn(): void {
    this.hp = this.maxHp;
    this.mana = this.maxMana;
    this.setPosition(this.spawnX, this.spawnY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setVelocity(0, 0);
    }
    this.invulnerabilityTimer = 1600; // grace period after respawn
  }

  public gainXp(amount: number): boolean {
    this.xp += amount;
    let leveledUp = false;
    while (this.xp >= this.maxXp) {
      this.xp -= this.maxXp;
      this.level += 1;
      this.maxXp = Math.floor(this.maxXp * 1.4);
      this.baseHp += 15;
      this.baseMana += 10;
      this.hp = this.maxHp;
      this.mana = this.maxMana;
      this.recalculateStats();
      leveledUp = true;
    }
    return leveledUp;
  }

  private updateToolVisual(delta: number): void {
    if (!this.toolSprite.visible) return;

    const handOffsetX = this.isFacingLeft ? -6 : 6;
    const handOffsetY = 2;
    this.toolSprite.setPosition(this.x + handOffsetX, this.y + handOffsetY);
    this.toolSprite.setFlipX(this.isFacingLeft);

    if (this.isSwinging) {
      this.swingProgress += delta * 0.008;
      const baseAngle = this.isFacingLeft ? -135 : 45;
      const swingArc = Math.sin(this.swingProgress * Math.PI) * 70;
      this.toolSprite.setAngle(baseAngle + (this.isFacingLeft ? -swingArc : swingArc));

      if (this.swingProgress >= 1) {
        this.isSwinging = false;
        this.toolSprite.setVisible(false);
      }
    } else {
      this.toolSprite.setVisible(false);
    }
  }

  public destroy(fromScene?: boolean): void {
    if (this.toolSprite) {
      this.toolSprite.destroy();
    }
    super.destroy(fromScene);
  }
}
