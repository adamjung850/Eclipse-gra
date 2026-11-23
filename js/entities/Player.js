import { CraftingStation, EquipSlotType, GAME_CONSTANTS, ItemCategory } from '../types/index.js';
import { ITEM_REGISTRY } from '../world/ItemTypes.js';
import { BLOCK_DEFINITIONS } from '../world/BlockTypes.js';

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player_idle');

    this.baseHp = 100;
    this.baseMana = 50;
    this.hp = 100;
    this.maxHp = 100;
    this.mana = 50;
    this.maxMana = 50;
    this.defense = 0;
    this.speedBonus = 0;
    this.critChance = 0.05;
    this.level = 1;
    this.xp = 0;
    this.maxXp = 100;

    this.inventory = [];
    this.selectedSlot = 0;

    this.equipment = {
      [EquipSlotType.HELMET]: { item: null, count: 0 },
      [EquipSlotType.CHEST]: { item: null, count: 0 },
      [EquipSlotType.LEGS]: { item: null, count: 0 },
      [EquipSlotType.BOOTS]: { item: null, count: 0 },
      [EquipSlotType.RING_1]: { item: null, count: 0 },
      [EquipSlotType.RING_2]: { item: null, count: 0 },
      [EquipSlotType.AMULET]: { item: null, count: 0 },
      [EquipSlotType.CAPE]: { item: null, count: 0 }
    };

    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    this.isFacingLeft = false;

    this.isSwinging = false;
    this.swingProgress = 0;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDepth(20);
    this.initPhysics();
    this.initInventory();
    this.initToolVisual();
    this.initAnimations();
    this.recalculateStats();
  }

  initPhysics() {
    if (this.body) {
      this.body.setSize(16, 36);
      this.body.setOffset(4, 4);
      this.body.setGravityY(GAME_CONSTANTS.GRAVITY);
      this.setCollideWorldBounds(true);
    }
  }

  initInventory() {
    for (let i = 0; i < GAME_CONSTANTS.TOTAL_INVENTORY_SLOTS; i++) {
      this.inventory.push({ item: null, count: 0 });
    }

    this.inventory[0] = { item: ITEM_REGISTRY['copper_pickaxe'], count: 1 };
    this.inventory[1] = { item: ITEM_REGISTRY['copper_sword'], count: 1 };
    this.inventory[2] = { item: ITEM_REGISTRY['torch'], count: 30 };
    this.inventory[3] = { item: ITEM_REGISTRY['plank'], count: 64 };
    this.inventory[4] = { item: ITEM_REGISTRY['brick'], count: 40 };

    this.inventory[9] = { item: ITEM_REGISTRY['wood'], count: 35 };
    this.inventory[10] = { item: ITEM_REGISTRY['stone'], count: 40 };
    this.inventory[11] = { item: ITEM_REGISTRY['coal'], count: 12 };
    this.inventory[12] = { item: ITEM_REGISTRY['copper_ore'], count: 18 };
    this.inventory[13] = { item: ITEM_REGISTRY['minor_healing_potion'], count: 5 };
  }

  initToolVisual() {
    this.toolSprite = this.scene.add.sprite(this.x, this.y, 'icon_pickaxe');
    this.toolSprite.setOrigin(0.2, 0.8);
    this.toolSprite.setDepth(22);
    this.toolSprite.setVisible(false);
  }

  initAnimations() {
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

  recalculateStats() {
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

  getSelectedItem() {
    const slot = this.inventory[this.selectedSlot];
    return slot ? slot.item : null;
  }

  getSelectedItemCount() {
    const slot = this.inventory[this.selectedSlot];
    return slot ? slot.count : 0;
  }

  consumeSelectedItem(amount = 1) {
    const slot = this.inventory[this.selectedSlot];
    if (!slot || !slot.item || slot.count < amount) return false;

    slot.count -= amount;
    if (slot.count <= 0) {
      slot.item = null;
      slot.count = 0;
    }
    return true;
  }

  hasItem(itemId, amount = 1) {
    let total = 0;
    for (const slot of this.inventory) {
      if (slot.item && slot.item.id === itemId) {
        total += slot.count;
        if (total >= amount) return true;
      }
    }
    return false;
  }

  consumeItem(itemId, amount = 1) {
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

  addItem(itemId, amount = 1) {
    const itemData = ITEM_REGISTRY[itemId];
    if (!itemData) return false;

    for (const slot of this.inventory) {
      if (slot.item && slot.item.id === itemId && slot.count < slot.item.maxStack) {
        const canAdd = Math.min(amount, slot.item.maxStack - slot.count);
        slot.count += canAdd;
        amount -= canAdd;
        if (amount <= 0) return true;
      }
    }

    for (const slot of this.inventory) {
      if (!slot.item) {
        slot.item = itemData;
        slot.count = amount;
        return true;
      }
    }

    return false;
  }

  equipItem(fromInventoryIndex) {
    const slot = this.inventory[fromInventoryIndex];
    if (!slot || !slot.item || !slot.item.equipSlot) return false;

    const equipTarget = slot.item.equipSlot;
    const currentEquip = this.equipment[equipTarget];

    const itemToEquip = slot.item;
    slot.item = currentEquip.item;
    slot.count = currentEquip.item ? 1 : 0;

    currentEquip.item = itemToEquip;
    currentEquip.count = 1;

    this.recalculateStats();
    return true;
  }

  unequipItem(equipSlot) {
    const equip = this.equipment[equipSlot];
    if (!equip || !equip.item) return false;

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

    return false;
  }

  useConsumable(slotIndex) {
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

  getNearbyStations(worldManager) {
    const stations = new Set();
    stations.add(CraftingStation.HAND);

    const T = GAME_CONSTANTS.TILE_SIZE;
    const playerTileX = Math.floor(this.x / T);
    const playerTileY = Math.floor(this.y / T);
    const radius = 5;

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

  triggerToolSwing(targetWorldX, targetWorldY) {
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

  updatePlayer(delta, moveLeft, moveRight, jumpPressed, jumpHeld) {
    const body = this.body;
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

    this.updateToolVisual(delta);
  }

  updateToolVisual(delta) {
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

  destroy(fromScene) {
    if (this.toolSprite) {
      this.toolSprite.destroy();
    }
    super.destroy(fromScene);
  }
}
