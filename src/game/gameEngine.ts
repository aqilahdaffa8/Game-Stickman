import { soundManager } from '../audio/soundManager';
import {
  DamageText,
  EnemyState,
  EnemyType,
  GameStats,
  IDamageable,
  MedkitDrop,
  Particle,
  Platform,
  Projectile,
  Vector2D,
  WeaponData,
  WeaponDrop,
  WeaponState,
} from '../types/game';
import { checkAABB, distance, moveAndCollide, normalize } from './physics';
import { drawStickman, StickmanAnimState } from './stickmanRenderer';
import { getWeaponData, WEAPONS_DATABASE } from './weapons';

export interface PlayerEntity extends IDamageable {
  pos: Vector2D;
  vel: Vector2D;
  facingRight: boolean;
  aimAngle: number;
  isGrounded: boolean;
  canDoubleJump: boolean;
  isDroppingDown: boolean;
  weapons: WeaponState[];
  currentWeaponIndex: number;
  runTimer: number;
  hurtTimer: number;
  invulnerableTimer: number;
  deathTimer: number;
  isAttacking: boolean;
  attackTimer: number;
  attackDuration: number;
  score: number;
  kills: number;
}

export interface EnemyEntity extends IDamageable {
  id: number;
  type: EnemyType;
  pos: Vector2D;
  vel: Vector2D;
  facingRight: boolean;
  aimAngle: number;
  isGrounded: boolean;
  state: EnemyState;
  stateTimer: number;
  patrolDir: number;
  weapon: WeaponState;
  runTimer: number;
  hurtTimer: number;
  deathTimer: number;
  isAttacking: boolean;
  attackTimer: number;
  attackDuration: number;
  color: string;
  headBandColor: string;
  scale: number;
  moveSpeed: number;
}

export class GameEngine {
  public width: number = 1200;
  public height: number = 700;

  public player!: PlayerEntity;
  public enemies: EnemyEntity[] = [];
  public projectiles: Projectile[] = [];
  public weaponDrops: WeaponDrop[] = [];
  public medkitDrops: MedkitDrop[] = [];
  public particles: Particle[] = [];
  public damageTexts: DamageText[] = [];
  public platforms: Platform[] = [];

  // Arena bounds
  public arenaBounds = {
    minX: 0,
    maxX: 2400,
    minY: -300,
    maxY: 1050,
  };

  // Camera
  public camera = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    zoom: 1,
    shakeTrauma: 0,
    shakeX: 0,
    shakeY: 0,
  };

  // Wave & Game State
  public stats: GameStats = {
    score: 0,
    kills: 0,
    wave: 1,
    timer: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
  };

  public isPaused: boolean = false;
  public isGameOver: boolean = false;
  public isVictory: boolean = false;
  public waveAnnounceTimer: number = 3;
  public waveAnnounceText: string = 'WAVE 1 - READY!';
  public nextWaveCountdown: number = 0;

  private nextId: number = 1;
  private spawnTimeoutIds: number[] = [];
  public onGameOver?: (stats: GameStats) => void;
  public onVictory?: (stats: GameStats) => void;

  constructor() {
    this.initArena();
    this.resetGame();
  }

  public initArena() {
    this.platforms = [
      // Main Floor
      { x: 50, y: 800, w: 2300, h: 80, isJumpThrough: false, color: '#334155' },

      // Left Base Platform
      { x: 180, y: 640, w: 340, h: 24, isJumpThrough: true, color: '#475569' },
      { x: 120, y: 480, w: 320, h: 24, isJumpThrough: true, color: '#475569' },

      // Center Sky Bridge (Double Deck)
      { x: 700, y: 640, w: 1000, h: 26, isJumpThrough: true, color: '#475569' },
      { x: 850, y: 480, w: 700, h: 26, isJumpThrough: true, color: '#475569' },
      { x: 1050, y: 320, w: 300, h: 24, isJumpThrough: true, color: '#64748b' },

      // Right Base Platform
      { x: 1880, y: 640, w: 340, h: 24, isJumpThrough: true, color: '#475569' },
      { x: 1960, y: 480, w: 320, h: 24, isJumpThrough: true, color: '#475569' },

      // Solid Pillars/Barricades
      { x: 580, y: 720, w: 40, h: 80, isJumpThrough: false, color: '#1e293b' },
      { x: 1780, y: 720, w: 40, h: 80, isJumpThrough: false, color: '#1e293b' },

      // Boundaries (Walls)
      { x: 20, y: 0, w: 30, h: 900, isJumpThrough: false, color: '#1e293b' },
      { x: 2350, y: 0, w: 30, h: 900, isJumpThrough: false, color: '#1e293b' },
    ];
  }

  public clearAllSpawnTimeouts() {
    this.spawnTimeoutIds.forEach((id) => clearTimeout(id));
    this.spawnTimeoutIds = [];
  }

  public snapCameraToPlayer() {
    if (!this.player) return;
    const targetX = this.player.pos.x - this.width / 2;
    const targetY = this.player.pos.y - this.height / 2 - 40;

    const maxCamX = Math.max(this.arenaBounds.minX, this.arenaBounds.maxX - this.width);
    const maxCamY = Math.max(this.arenaBounds.minY, this.arenaBounds.maxY - this.height);

    this.camera.x = Math.max(this.arenaBounds.minX, Math.min(maxCamX, targetX));
    this.camera.y = Math.max(this.arenaBounds.minY, Math.min(maxCamY, targetY));
    this.camera.targetX = targetX;
    this.camera.targetY = targetY;
    this.camera.shakeTrauma = 0;
    this.camera.shakeX = 0;
    this.camera.shakeY = 0;
  }

  public resetGame(initialWeaponId: string = 'pistol') {
    this.clearAllSpawnTimeouts();

    this.stats = {
      score: 0,
      kills: 0,
      wave: 1,
      timer: 0,
      shotsFired: 0,
      shotsHit: 0,
      damageDealt: 0,
    };

    this.isGameOver = false;
    this.isVictory = false;
    this.isPaused = false;
    this.nextWaveCountdown = 0;
    this.waveAnnounceTimer = 3.5;
    this.waveAnnounceText = 'WAVE 1 - BATTLE COMMENCE!';

    this.enemies = [];
    this.projectiles = [];
    this.weaponDrops = [];
    this.medkitDrops = [];
    this.particles = [];
    this.damageTexts = [];

    // Initialize Player
    this.player = {
      pos: { x: 350, y: 780 },
      vel: { x: 0, y: 0 },
      hp: 150,
      maxHp: 150,
      isDead: false,
      facingRight: true,
      aimAngle: 0,
      isGrounded: true,
      canDoubleJump: true,
      isDroppingDown: false,
      weapons: [
        {
          data: getWeaponData(initialWeaponId),
          currentAmmo: getWeaponData(initialWeaponId).magazineSize,
          isReloading: false,
          reloadProgress: 0,
          lastFireTime: 0,
        },
        {
          data: getWeaponData('fist'),
          currentAmmo: Infinity,
          isReloading: false,
          reloadProgress: 0,
          lastFireTime: 0,
        },
      ],
      currentWeaponIndex: 0,
      runTimer: 0,
      hurtTimer: 0,
      invulnerableTimer: 0,
      deathTimer: 0,
      isAttacking: false,
      attackTimer: 0,
      attackDuration: 0.25,
      score: 0,
      kills: 0,
      takeDamage: (amount, sourcePos, knockbackPower = 200, isCrit = false) => {
        if (this.player.isDead || this.player.invulnerableTimer > 0) return;
        this.player.hp -= amount;
        this.player.hurtTimer = 0.25;
        this.player.invulnerableTimer = 0.5;
        this.addCameraShake(0.4);
        soundManager.playHit();

        this.addDamageText(this.player.pos.x, this.player.pos.y - 50, `-${Math.round(amount)}`, '#ef4444', isCrit);

        if (sourcePos) {
          const dir = normalize({
            x: this.player.pos.x - sourcePos.x,
            y: this.player.pos.y - sourcePos.y - 40,
          });
          this.player.vel.x += dir.x * knockbackPower;
          this.player.vel.y += dir.y * (knockbackPower * 0.7);
        }

        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.player.isDead = true;
          this.player.deathTimer = 0;
          this.isGameOver = true;
          soundManager.playGameOver();
          this.createExplosionParticles(this.player.pos.x, this.player.pos.y - 30, '#ef4444', 35);
          const tId = window.setTimeout(() => {
            if (this.isGameOver && this.onGameOver) {
              this.onGameOver(this.stats);
            }
          }, 650);
          this.spawnTimeoutIds.push(tId);
        }
      },
    };

    // Immediately snap camera to player start position
    this.snapCameraToPlayer();

    // Spawn initial weapon drops around arena
    this.spawnWeaponDrop('shotgun', 1200, 310);
    this.spawnWeaponDrop('sword', 250, 630);
    this.spawnWeaponDrop('rifle', 2050, 470);
    this.spawnWeaponDrop('grenade', 1200, 630);
    this.spawnMedkitDrop(1050, 310, 40);

    this.startWave(1);
  }

  public startWave(waveNum: number) {
    this.stats.wave = waveNum;
    this.waveAnnounceTimer = 3.0;
    this.waveAnnounceText = `WAVE ${waveNum} - FIGHT!`;

    // Spawn composition based on wave
    const spawnList: EnemyType[] = [];
    if (waveNum === 1) {
      spawnList.push('basic', 'basic', 'basic');
    } else if (waveNum === 2) {
      spawnList.push('basic', 'basic', 'gunner', 'gunner');
    } else if (waveNum === 3) {
      spawnList.push('basic', 'basic', 'gunner', 'gunner', 'heavy');
    } else if (waveNum === 4) {
      spawnList.push('basic', 'basic', 'basic', 'gunner', 'gunner', 'gunner', 'heavy');
    } else {
      // Wave 5 Boss wave
      spawnList.push('basic', 'basic', 'gunner', 'gunner', 'heavy', 'heavy');
    }

    const allSpawnPositions = [
      { x: 2150, y: 790 },
      { x: 1750, y: 790 },
      { x: 1450, y: 630 },
      { x: 950, y: 630 },
      { x: 2000, y: 470 },
      { x: 600, y: 470 },
      { x: 1200, y: 310 },
      { x: 160, y: 790 },
    ];

    // Guarantee enemies do not spawn right on top of the player
    const validPositions = allSpawnPositions.filter((pos) => {
      const dx = Math.abs(pos.x - this.player.pos.x);
      const dy = Math.abs(pos.y - this.player.pos.y);
      return dx > 480 || dy > 160;
    });

    const spawnPositions = validPositions.length >= 2 ? validPositions : allSpawnPositions;

    spawnList.forEach((type, idx) => {
      const pos = spawnPositions[idx % spawnPositions.length];
      const offsetX = ((idx % 3) - 1) * 50;
      // Stagger spawn delay slightly
      const tId = window.setTimeout(() => {
        if (!this.isGameOver && !this.isVictory) {
          this.spawnEnemy(type, pos.x + offsetX, pos.y);
        }
      }, idx * 650);
      this.spawnTimeoutIds.push(tId);
    });
  }

  public spawnEnemy(type: EnemyType, x: number, y: number) {
    const id = this.nextId++;
    let hp = 70;
    let color = '#ef4444';
    let headBandColor = '#b91c1c';
    let scale = 1;
    let moveSpeed = 220;
    let weaponId = 'fist';

    // Adjust spawn x if overlapping another enemy
    let spawnX = x;
    const spawnY = y;
    for (const other of this.enemies) {
      if (!other.isDead && Math.abs(other.pos.x - spawnX) < 40 && Math.abs(other.pos.y - spawnY) < 40) {
        spawnX += spawnX > 1200 ? -60 : 60;
      }
    }
    spawnX = Math.max(120, Math.min(2280, spawnX));

    if (type === 'basic') {
      hp = 65;
      color = '#f87171';
      headBandColor = '#dc2626';
      weaponId = Math.random() > 0.5 ? 'bat' : 'sword';
      moveSpeed = 240;
    } else if (type === 'gunner') {
      hp = 85;
      color = '#fbbf24';
      headBandColor = '#f59e0b';
      weaponId = Math.random() > 0.5 ? 'pistol' : 'rifle';
      moveSpeed = 190;
    } else if (type === 'heavy') {
      hp = 240;
      color = '#a855f7';
      headBandColor = '#7e22ce';
      scale = 1.35;
      weaponId = Math.random() > 0.5 ? 'shotgun' : 'bat';
      moveSpeed = 140;
    }

    const weaponData = getWeaponData(weaponId);

    const enemy: EnemyEntity = {
      id,
      type,
      pos: { x: spawnX, y: spawnY },
      vel: { x: 0, y: 0 },
      hp,
      maxHp: hp,
      isDead: false,
      facingRight: Math.random() > 0.5,
      aimAngle: 0,
      isGrounded: true,
      state: 'idle',
      stateTimer: 1 + Math.random() * 2,
      patrolDir: Math.random() > 0.5 ? 1 : -1,
      weapon: {
        data: weaponData,
        currentAmmo: weaponData.magazineSize,
        isReloading: false,
        reloadProgress: 0,
        lastFireTime: 0,
      },
      runTimer: Math.random() * 10,
      hurtTimer: 0,
      deathTimer: 0,
      isAttacking: false,
      attackTimer: 0,
      attackDuration: 0.28,
      color,
      headBandColor,
      scale,
      moveSpeed,
      takeDamage: (amount, sourcePos, knockbackPower = 200, isCrit = false) => {
        if (enemy.isDead) return;
        enemy.hp -= amount;
        enemy.hurtTimer = 0.22;
        enemy.state = 'hurt';
        enemy.stateTimer = 0.22;
        this.stats.damageDealt += amount;
        soundManager.playHit();

        this.addDamageText(enemy.pos.x, enemy.pos.y - 50 * enemy.scale, `-${Math.round(amount)}`, '#fbbf24', isCrit);

        // Apply knockback (heavy takes less knockback)
        const resistance = enemy.type === 'heavy' ? 0.45 : 1.0;
        if (sourcePos) {
          const dir = normalize({
            x: enemy.pos.x - sourcePos.x,
            y: enemy.pos.y - sourcePos.y - 35,
          });
          enemy.vel.x += dir.x * (knockbackPower * resistance);
          enemy.vel.y += dir.y * (knockbackPower * 0.6 * resistance);
        }

        // Bloodless impact spark VFX
        this.createHitSparks(enemy.pos.x, enemy.pos.y - 25 * enemy.scale, '#fef08a', 8);

        if (enemy.hp <= 0) {
          enemy.hp = 0;
          enemy.isDead = true;
          enemy.state = 'dead';
          enemy.deathTimer = 0;
          this.stats.kills++;
          this.player.kills++;
          this.stats.score += enemy.type === 'heavy' ? 300 : enemy.type === 'gunner' ? 150 : 100;
          this.player.score = this.stats.score;

          soundManager.playEnemyDeath();
          this.addCameraShake(0.25);
          this.createExplosionParticles(enemy.pos.x, enemy.pos.y - 30, enemy.color, 25);

          // Drop medkit every time an enemy is killed!
          const healAmount = enemy.type === 'heavy' ? 50 : 35;
          this.spawnMedkitDrop(enemy.pos.x, enemy.pos.y - 25, healAmount);

          // Chance to drop weapon on death
          if (Math.random() < 0.6 && enemy.weapon.data.id !== 'fist') {
            this.spawnWeaponDrop(enemy.weapon.data.id, enemy.pos.x, enemy.pos.y - 20);
          }

          // Check wave clearance
          this.checkWaveStatus();
        }
      },
    };

    this.enemies.push(enemy);

    // Spawn puff
    this.createSmokePuff(x, y - 20, 10);
  }

  public checkWaveStatus() {
    const aliveEnemies = this.enemies.filter((e) => !e.isDead);
    if (aliveEnemies.length === 0) {
      if (this.stats.wave >= 5) {
        // Victory!
        this.isVictory = true;
        soundManager.playVictory();
        if (this.onVictory) this.onVictory(this.stats);
      } else {
        // Prepare next wave
        this.nextWaveCountdown = 4.0;
        this.addDamageText(this.player.pos.x, this.player.pos.y - 80, 'WAVE CLEARED!', '#22c55e', true);
        soundManager.playVictory();

        // Spawn bonus supply drop
        const drops = ['rifle', 'shotgun', 'grenade', 'sword'];
        const randomDrop = drops[Math.floor(Math.random() * drops.length)];
        this.spawnWeaponDrop(randomDrop, 1200 + (Math.random() * 400 - 200), 280);
      }
    }
  }

  public spawnWeaponDrop(weaponId: string, x: number, y: number) {
    const data = getWeaponData(weaponId);
    this.weaponDrops.push({
      id: this.nextId++,
      weapon: data,
      x,
      y,
      vx: (Math.random() - 0.5) * 120,
      vy: -200,
      grounded: false,
      ammo: data.magazineSize,
      bobTimer: Math.random() * 10,
    });
  }

  public spawnMedkitDrop(x: number, y: number, healAmount: number = 35) {
    this.medkitDrops.push({
      id: this.nextId++,
      x,
      y,
      vx: (Math.random() - 0.5) * 110,
      vy: -180 - Math.random() * 60,
      grounded: false,
      healAmount,
      bobTimer: Math.random() * 10,
    });
    this.createHitSparks(x, y, '#22c55e', 5);
  }

  public pickupWeapon() {
    if (this.player.isDead) return;

    // Check nearest weapon drop
    const pickupRange = 65;
    let closestDropIndex = -1;
    let closestDist = Infinity;

    this.weaponDrops.forEach((drop, idx) => {
      const d = distance(this.player.pos, { x: drop.x, y: drop.y });
      if (d < pickupRange && d < closestDist) {
        closestDist = d;
        closestDropIndex = idx;
      }
    });

    if (closestDropIndex !== -1) {
      const drop = this.weaponDrops[closestDropIndex];
      // Replace current active weapon slot
      const currentActive = this.player.weapons[this.player.currentWeaponIndex];

      // Drop old weapon if not fist
      if (currentActive.data.id !== 'fist') {
        this.spawnWeaponDrop(currentActive.data.id, this.player.pos.x, this.player.pos.y - 30);
      }

      this.player.weapons[this.player.currentWeaponIndex] = {
        data: drop.weapon,
        currentAmmo: drop.ammo,
        isReloading: false,
        reloadProgress: 0,
        lastFireTime: 0,
      };

      this.weaponDrops.splice(closestDropIndex, 1);
      soundManager.playPickup();
      this.addDamageText(this.player.pos.x, this.player.pos.y - 60, `+ ${drop.weapon.name}`, drop.weapon.color, false);
    }
  }

  public switchWeapon(index: number) {
    if (index >= 0 && index < this.player.weapons.length && index !== this.player.currentWeaponIndex) {
      this.player.currentWeaponIndex = index;
      soundManager.playPickup();
    }
  }

  public reloadWeapon() {
    const current = this.player.weapons[this.player.currentWeaponIndex];
    if (current.data.type === 'melee' || current.isReloading) return;
    if (current.currentAmmo >= current.data.magazineSize) return;

    current.isReloading = true;
    current.reloadProgress = 0;
    soundManager.playReload();
  }

  public triggerAttack(isPlayer: boolean, entity: PlayerEntity | EnemyEntity) {
    const weaponState = isPlayer ? (entity as PlayerEntity).weapons[(entity as PlayerEntity).currentWeaponIndex] : (entity as EnemyEntity).weapon;
    const data = weaponState.data;
    const now = performance.now() / 1000;

    // Check cooldown
    const fireInterval = 1 / data.fireRate;
    if (now - weaponState.lastFireTime < fireInterval) return;

    // If reloading, cannot attack
    if (weaponState.isReloading) return;

    // Check ammo
    if (data.type !== 'melee') {
      if (weaponState.currentAmmo <= 0) {
        if (isPlayer) this.reloadWeapon();
        return;
      }
      weaponState.currentAmmo--;
      if (isPlayer) this.stats.shotsFired++;
    }

    weaponState.lastFireTime = now;
    entity.isAttacking = true;
    entity.attackTimer = 0;
    entity.attackDuration = Math.min(0.35, fireInterval * 0.8);

    // Apply attack based on weapon type
    if (data.type === 'melee') {
      soundManager.playMelee(data.iconType);
      this.executeMeleeAttack(isPlayer, entity, data);
    } else if (data.iconType === 'grenade' || data.id === 'grenade' || data.type === 'special') {
      soundManager.playMelee('bat'); // Throw swoosh
      soundManager.playGrenadeBeep();
      this.throwGrenade(isPlayer, entity, data);
      if (isPlayer) this.addCameraShake(0.2);
    } else {
      // Ranged weapon (Pistol, Shotgun, Rifle)
      soundManager.playShoot(data.iconType);
      this.executeRangedAttack(isPlayer, entity, data);
      if (isPlayer) {
        this.addCameraShake(data.iconType === 'shotgun' ? 0.35 : data.iconType === 'rifle' ? 0.15 : 0.12);
      }
    }
  }

  private executeMeleeAttack(isPlayer: boolean, entity: PlayerEntity | EnemyEntity, data: WeaponData) {
    const scale = (entity as EnemyEntity).scale || 1;
    const armOrigin = {
      x: entity.pos.x,
      y: entity.pos.y - 44 * scale,
    };

    // Melee attack range with scale
    const hitRadius = data.range * scale;

    if (isPlayer) {
      this.enemies.forEach((enemy) => {
        if (enemy.isDead) return;
        const enemyCenter = { x: enemy.pos.x, y: enemy.pos.y - 28 * enemy.scale };
        const d = distance(armOrigin, enemyCenter);
        const dx = enemy.pos.x - entity.pos.x;
        const dy = Math.abs(enemy.pos.y - entity.pos.y);

        // Check if facing target or within close combat proximity
        const isFacing = entity.facingRight ? dx >= -25 : dx <= 25;
        const inHitbox = (d <= hitRadius && isFacing) || (d <= 50);

        if (inHitbox && dy < 65) {
          const isCrit = Math.random() < 0.25;
          const finalDamage = data.damage * (isCrit ? 1.6 : 1.0);
          enemy.takeDamage(finalDamage, entity.pos, data.knockback, isCrit);
          this.stats.shotsHit++;
          this.createHitSparks(enemy.pos.x, enemy.pos.y - 30, data.color, 7);
        }
      });
    } else {
      // Enemy attacking Player
      if (!this.player.isDead) {
        const playerCenter = { x: this.player.pos.x, y: this.player.pos.y - 28 };
        const d = distance(armOrigin, playerCenter);
        const dx = this.player.pos.x - entity.pos.x;
        const dy = Math.abs(this.player.pos.y - entity.pos.y);

        const isFacing = entity.facingRight ? dx >= -25 : dx <= 25;
        const inHitbox = (d <= hitRadius && isFacing) || (d <= 45);

        if (inHitbox && dy < 65) {
          this.player.takeDamage(data.damage, entity.pos, data.knockback);
          this.createHitSparks(this.player.pos.x, this.player.pos.y - 30, '#ef4444', 5);
        }
      }
    }

    // Weapon recoil impulse
    const recoilDir = entity.facingRight ? -1 : 1;
    entity.vel.x += recoilDir * (data.knockback * 0.12);
  }

  private executeRangedAttack(isPlayer: boolean, entity: PlayerEntity | EnemyEntity, data: WeaponData) {
    const scale = (entity as EnemyEntity).scale || 1;
    // Spawn projectile closer to the shoulder/arm to ensure point-blank enemies are hit
    const spawnPos = {
      x: entity.pos.x + Math.cos(entity.aimAngle) * 10 * scale,
      y: entity.pos.y - 44 * scale + Math.sin(entity.aimAngle) * 10 * scale,
    };
    const flashPos = {
      x: entity.pos.x + Math.cos(entity.aimAngle) * 26 * scale,
      y: entity.pos.y - 44 * scale + Math.sin(entity.aimAngle) * 26 * scale,
    };

    // Muzzle flash particle at weapon tip
    this.createMuzzleFlash(flashPos.x, flashPos.y, entity.aimAngle, data.color);

    // Recoil
    entity.vel.x -= Math.cos(entity.aimAngle) * (data.knockback * 0.35);

    const pelletCount = data.pellets || 1;
    for (let i = 0; i < pelletCount; i++) {
      const spreadAngle = (Math.random() - 0.5) * (data.spread || 0.05);
      const angle = entity.aimAngle + spreadAngle;
      const speed = (data.projectileSpeed || 900) * (0.95 + Math.random() * 0.1);

      this.projectiles.push({
        id: this.nextId++,
        x: spawnPos.x,
        y: spawnPos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: data.iconType === 'shotgun' ? 3.5 : 4.5,
        damage: data.damage,
        knockback: data.knockback,
        owner: isPlayer ? 'player' : 'enemy',
        color: isPlayer ? '#38bdf8' : '#ef4444',
        lifetime: 0,
        maxLifetime: 1.8,
        trail: [],
      });
    }
  }

  private throwGrenade(isPlayer: boolean, entity: PlayerEntity | EnemyEntity, data: WeaponData) {
    const scale = (entity as EnemyEntity).scale || 1;
    const handPos = {
      x: entity.pos.x + Math.cos(entity.aimAngle) * 24 * scale,
      y: entity.pos.y - 46 * scale + Math.sin(entity.aimAngle) * 24 * scale,
    };

    const speed = data.projectileSpeed || 500;
    this.projectiles.push({
      id: this.nextId++,
      x: handPos.x,
      y: handPos.y,
      vx: Math.cos(entity.aimAngle) * speed,
      vy: Math.sin(entity.aimAngle) * speed - 120,
      radius: 6,
      damage: data.damage,
      knockback: data.knockback,
      owner: isPlayer ? 'player' : 'enemy',
      color: '#f97316',
      lifetime: 0,
      maxLifetime: 2.2,
      trail: [],
      isGrenade: true,
      bounces: 0,
      fuseTimer: 2.2,
    });
  }

  public explodeGrenade(x: number, y: number, damage: number, knockback: number, owner: 'player' | 'enemy') {
    soundManager.playExplosion();
    this.addCameraShake(0.75);
    this.createExplosionParticles(x, y, '#f97316', 50);

    const blastRadius = 160;

    // Damage enemies
    this.enemies.forEach((enemy) => {
      if (enemy.isDead) return;
      const d = distance({ x, y }, { x: enemy.pos.x, y: enemy.pos.y - 25 * enemy.scale });
      if (d < blastRadius) {
        const falloff = 1 - d / blastRadius;
        const dealt = damage * (0.5 + falloff * 0.5);
        enemy.takeDamage(dealt, { x, y }, knockback * falloff, true);
        if (owner === 'player') this.stats.shotsHit++;
      }
    });

    // Damage player if in blast radius
    if (!this.player.isDead) {
      const d = distance({ x, y }, { x: this.player.pos.x, y: this.player.pos.y - 25 });
      if (d < blastRadius) {
        const falloff = 1 - d / blastRadius;
        const dealt = damage * (0.4 + falloff * 0.6) * 0.75; // Slight resistance for player
        this.player.takeDamage(dealt, { x, y }, knockback * falloff);
      }
    }
  }

  // --- CAMERA UPDATE ---
  public addCameraShake(amount: number) {
    this.camera.shakeTrauma = Math.min(1.0, this.camera.shakeTrauma + amount);
  }

  public updateCamera(dt: number) {
    if (!this.player) return;

    // Follow player smoothly
    const targetX = this.player.pos.x - this.width / 2;
    const targetY = this.player.pos.y - this.height / 2 - 40;

    const smoothFactor = 1 - Math.exp(-dt * 9);
    this.camera.x += (targetX - this.camera.x) * smoothFactor;
    this.camera.y += (targetY - this.camera.y) * smoothFactor;

    // Clamp camera within arena safely
    const maxCamX = Math.max(this.arenaBounds.minX, this.arenaBounds.maxX - this.width);
    const maxCamY = Math.max(this.arenaBounds.minY, this.arenaBounds.maxY - this.height);
    this.camera.x = Math.max(this.arenaBounds.minX, Math.min(maxCamX, this.camera.x));
    this.camera.y = Math.max(this.arenaBounds.minY, Math.min(maxCamY, this.camera.y));

    // Trauma shake decay
    if (this.camera.shakeTrauma > 0) {
      const shakePower = Math.pow(this.camera.shakeTrauma, 2) * 22;
      this.camera.shakeX = (Math.random() * 2 - 1) * shakePower;
      this.camera.shakeY = (Math.random() * 2 - 1) * shakePower;
      this.camera.shakeTrauma = Math.max(0, this.camera.shakeTrauma - dt * 2.2);
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }
  }

  // --- MAIN SIMULATION LOOP ---
  public update(
    dt: number,
    input: {
      left: boolean;
      right: boolean;
      jump: boolean;
      down: boolean;
      attack: boolean;
      reload: boolean;
      aimAngle: number;
    }
  ) {
    if (this.isPaused) return;

    // Stats timer
    if (!this.isGameOver && !this.isVictory) {
      this.stats.timer += dt;
    }

    // Wave announce timer
    if (this.waveAnnounceTimer > 0) {
      this.waveAnnounceTimer -= dt;
    }

    // Next wave countdown
    if (this.nextWaveCountdown > 0) {
      this.nextWaveCountdown -= dt;
      if (this.nextWaveCountdown <= 0) {
        this.startWave(this.stats.wave + 1);
      }
    }

    // 1. Update Player
    this.updatePlayer(dt, input);

    // 2. Update Enemies
    this.updateEnemies(dt);

    // 3. Update Projectiles
    this.updateProjectiles(dt);

    // 4. Update Weapon Drops & Medkit Drops
    this.updateWeaponDrops(dt);
    this.updateMedkitDrops(dt);

    // 5. Update Particles & Floaters
    this.updateParticles(dt);
    this.updateDamageTexts(dt);

    // 6. Update Camera
    this.updateCamera(dt);
  }

  private updatePlayer(
    dt: number,
    input: {
      left: boolean;
      right: boolean;
      jump: boolean;
      down: boolean;
      attack: boolean;
      reload: boolean;
      aimAngle: number;
    }
  ) {
    const p = this.player;

    if (p.isDead) {
      p.deathTimer += dt;
      p.vel.x *= 0.85;
      const res = moveAndCollide(p.pos, p.vel, { w: 20, h: 54 }, this.platforms, dt, false);
      p.pos = res.pos;
      p.vel = res.vel;
      return;
    }

    if (p.hurtTimer > 0) p.hurtTimer -= dt;
    if (p.invulnerableTimer > 0) p.invulnerableTimer -= dt;

    // Movement horizontal
    const speed = 360;
    let moveDir = 0;
    if (input.left) moveDir -= 1;
    if (input.right) moveDir += 1;

    if (moveDir !== 0) {
      p.vel.x = moveDir * speed;
      p.runTimer += dt;
    } else {
      p.vel.x *= 0.82;
    }

    // Drop down through jump-through platforms
    p.isDroppingDown = input.down;

    // Jump
    if (input.jump) {
      if (p.isGrounded) {
        p.vel.y = -560;
        p.isGrounded = false;
        p.canDoubleJump = true;
        soundManager.playJump();
        this.createSmokePuff(p.pos.x, p.pos.y, 6);
      } else if (p.canDoubleJump) {
        p.vel.y = -520;
        p.canDoubleJump = false;
        soundManager.playJump();
        this.createSmokePuff(p.pos.x, p.pos.y - 15, 8);
      }
    }

    // Aiming & Facing
    p.aimAngle = input.aimAngle;
    p.facingRight = Math.cos(input.aimAngle) >= 0;

    // Reload check
    if (input.reload) {
      this.reloadWeapon();
    }

    // Update active weapon reload state
    const currentWeapon = p.weapons[p.currentWeaponIndex];
    if (currentWeapon.isReloading) {
      currentWeapon.reloadProgress += dt / currentWeapon.data.reloadTime;
      if (currentWeapon.reloadProgress >= 1) {
        currentWeapon.isReloading = false;
        currentWeapon.reloadProgress = 0;
        currentWeapon.currentAmmo = currentWeapon.data.magazineSize;
      }
    }

    // Attack trigger
    if (input.attack) {
      this.triggerAttack(true, p);
    }

    // Attack animation progress
    if (p.isAttacking) {
      p.attackTimer += dt;
      if (p.attackTimer >= p.attackDuration) {
        p.isAttacking = false;
      }
    }

    // Physics
    const res = moveAndCollide(p.pos, p.vel, { w: 20, h: 54 }, this.platforms, dt, p.isDroppingDown);
    p.pos = res.pos;
    p.vel = res.vel;
    p.isGrounded = res.isGrounded;
  }

  private updateEnemies(dt: number) {
    this.enemies.forEach((e) => {
      if (e.isDead) {
        e.deathTimer += dt;
        e.vel.x *= 0.85;
        const res = moveAndCollide(e.pos, e.vel, { w: 22 * e.scale, h: 54 * e.scale }, this.platforms, dt, false);
        e.pos = res.pos;
        e.vel = res.vel;
        return;
      }

      if (e.hurtTimer > 0) e.hurtTimer -= dt;

      // Update reload
      if (e.weapon.isReloading) {
        e.weapon.reloadProgress += dt / e.weapon.data.reloadTime;
        if (e.weapon.reloadProgress >= 1) {
          e.weapon.isReloading = false;
          e.weapon.reloadProgress = 0;
          e.weapon.currentAmmo = e.weapon.data.magazineSize;
        }
      }

      // Attack anim progress
      if (e.isAttacking) {
        e.attackTimer += dt;
        if (e.attackTimer >= e.attackDuration) {
          e.isAttacking = false;
        }
      }

      // --- STATE MACHINE ---
      const distToPlayer = distance(e.pos, this.player.pos);
      const isPlayerAlive = !this.player.isDead;
      e.stateTimer -= dt;

      // Line of sight and aim angle towards player
      const dx = this.player.pos.x - e.pos.x;
      const dy = this.player.pos.y - e.pos.y;
      e.aimAngle = Math.atan2(dy, dx);
      e.facingRight = dx >= 0;

      const idealRange = e.weapon.data.type === 'melee' ? 55 * e.scale : e.weapon.data.range * 0.65;

      switch (e.state) {
        case 'idle':
          e.vel.x *= 0.8;
          if (isPlayerAlive && distToPlayer < 900) {
            e.state = 'chase';
          } else if (e.stateTimer <= 0) {
            e.state = 'patrol';
            e.stateTimer = 2 + Math.random() * 3;
            e.patrolDir = Math.random() > 0.5 ? 1 : -1;
          }
          break;

        case 'patrol':
          e.vel.x = e.patrolDir * (e.moveSpeed * 0.6);
          e.runTimer += dt;
          e.facingRight = e.patrolDir > 0;
          if (isPlayerAlive && distToPlayer < 800) {
            e.state = 'chase';
          } else if (e.stateTimer <= 0) {
            e.state = 'idle';
            e.stateTimer = 1 + Math.random() * 2;
          }
          break;

        case 'chase':
          if (!isPlayerAlive || distToPlayer > 1100) {
            e.state = 'idle';
            e.stateTimer = 2;
            break;
          }

          // Move towards player
          const dirX = Math.sign(dx);
          e.vel.x = dirX * e.moveSpeed;
          e.runTimer += dt;

          // Jump if player is higher up and close
          if (this.player.pos.y < e.pos.y - 70 && e.isGrounded && Math.abs(dx) < 260) {
            e.vel.y = -550;
            e.isGrounded = false;
            soundManager.playJump();
          }

          // In weapon range: switch to attack
          if (distToPlayer <= idealRange) {
            e.state = 'attack';
            e.stateTimer = 0.5 + Math.random() * 0.8;
          }
          break;

        case 'attack':
          if (!isPlayerAlive) {
            e.state = 'idle';
            break;
          }

          // Melee closes in, Ranged steps back slightly to maintain distance
          if (e.weapon.data.type === 'melee') {
            e.vel.x = Math.sign(dx) * (e.moveSpeed * 0.8);
          } else {
            if (distToPlayer < 180) {
              e.vel.x = -Math.sign(dx) * (e.moveSpeed * 0.7); // Back off
            } else {
              e.vel.x *= 0.8;
            }
          }

          // Trigger attack
          this.triggerAttack(false, e);

          // Check if player fled out of range
          if (distToPlayer > idealRange * 1.35) {
            e.state = 'chase';
          }
          break;

        case 'hurt':
          e.vel.x *= 0.88;
          if (e.stateTimer <= 0) {
            e.state = 'chase';
          }
          break;
      }

      // Physics
      const res = moveAndCollide(e.pos, e.vel, { w: 20 * e.scale, h: 54 * e.scale }, this.platforms, dt, false);
      e.pos = res.pos;
      e.vel = res.vel;
      e.isGrounded = res.isGrounded;
    });

    // Enemy soft-body separation & anti-clipping ("nempel" bug fix)
    for (let i = 0; i < this.enemies.length; i++) {
      const e1 = this.enemies[i];
      if (e1.isDead) continue;

      // Spacing relative to Player: prevent enemies from clipping inside player's body
      if (!this.player.isDead && Math.abs(e1.pos.y - this.player.pos.y) < 45) {
        const pDx = e1.pos.x - this.player.pos.x;
        const minPlayerDist = 28;
        if (Math.abs(pDx) < minPlayerDist) {
          const pushSign = pDx === 0 ? (e1.facingRight ? 1 : -1) : Math.sign(pDx);
          const pushAmount = minPlayerDist - Math.abs(pDx);
          e1.pos.x += pushSign * pushAmount;
          e1.vel.x += pushSign * 25;
        }
      }

      // Spacing between enemies: prevent enemies from stacking or sticking together
      for (let j = i + 1; j < this.enemies.length; j++) {
        const e2 = this.enemies[j];
        if (e2.isDead) continue;

        const dy = Math.abs(e1.pos.y - e2.pos.y);
        if (dy < 40) {
          const dx = e2.pos.x - e1.pos.x;
          const minDist = 22 * e1.scale + 22 * e2.scale;
          if (Math.abs(dx) < minDist) {
            const overlap = minDist - Math.abs(dx);
            const dir = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
            e1.pos.x -= dir * overlap * 0.5;
            e2.pos.x += dir * overlap * 0.5;
            e1.vel.x -= dir * 30;
            e2.vel.x += dir * 30;
          }
        }
      }
    }

    // Remove old dead enemies after dissolve
    this.enemies = this.enemies.filter((e) => !e.isDead || e.deathTimer < 1.5);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.lifetime += dt;

      // Record trail
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 5) p.trail.pop();

      // Grenade physics
      if (p.isGrenade) {
        p.vy += 980 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Bounce on platforms
        for (const plat of this.platforms) {
          if (checkAABB({ x: p.x - p.radius, y: p.y - p.radius, w: p.radius * 2, h: p.radius * 2 }, plat)) {
            p.vy = -p.vy * 0.6;
            p.vx *= 0.75;
            p.y = plat.y - p.radius;
            p.bounces = (p.bounces || 0) + 1;
            soundManager.playGrenadeBeep();
            break;
          }
        }

        // Direct impact on enemy explodes immediately
        if (p.lifetime > 0.06 && p.owner === 'player') {
          let hitEnemy = false;
          for (const enemy of this.enemies) {
            if (enemy.isDead) continue;
            const targetBox = {
              x: enemy.pos.x - 18 * enemy.scale,
              y: enemy.pos.y - 56 * enemy.scale,
              w: 36 * enemy.scale,
              h: 56 * enemy.scale,
            };
            if (checkAABB({ x: p.x - p.radius, y: p.y - p.radius, w: p.radius * 2, h: p.radius * 2 }, targetBox)) {
              hitEnemy = true;
              break;
            }
          }
          if (hitEnemy) {
            this.explodeGrenade(p.x, p.y, p.damage, p.knockback, p.owner);
            this.projectiles.splice(i, 1);
            continue;
          }
        }

        // Fuse countdown
        if (p.lifetime >= p.maxLifetime) {
          this.explodeGrenade(p.x, p.y, p.damage, p.knockback, p.owner);
          this.projectiles.splice(i, 1);
          continue;
        }
        continue;
      }

      // Standard bullet physics with continuous swept bounding box
      const prevX = p.x;
      const prevY = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Platform collision
      let hitPlatform = false;
      for (const plat of this.platforms) {
        if (!plat.isJumpThrough && checkAABB({ x: p.x - 2, y: p.y - 2, w: 4, h: 4 }, plat)) {
          hitPlatform = true;
          this.createHitSparks(p.x, p.y, '#f8fafc', 4);
          break;
        }
      }
      if (hitPlatform || p.lifetime >= p.maxLifetime) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Continuous swept hit volume to prevent high-speed bullet tunneling
      const minX = Math.min(prevX, p.x) - p.radius;
      const maxX = Math.max(prevX, p.x) + p.radius;
      const minY = Math.min(prevY, p.y) - p.radius;
      const maxY = Math.max(prevY, p.y) + p.radius;
      const bulletBox = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };

      // Character collisions
      if (p.owner === 'player') {
        // Check hits against enemies
        let hitEnemy = false;
        for (const enemy of this.enemies) {
          if (enemy.isDead) continue;
          const targetBox = {
            x: enemy.pos.x - 18 * enemy.scale,
            y: enemy.pos.y - 56 * enemy.scale,
            w: 36 * enemy.scale,
            h: 56 * enemy.scale,
          };
          if (checkAABB(bulletBox, targetBox)) {
            const isCrit = Math.random() < 0.25;
            const finalDamage = p.damage * (isCrit ? 1.5 : 1.0);
            enemy.takeDamage(finalDamage, { x: p.x, y: p.y }, p.knockback, isCrit);
            this.stats.shotsHit++;
            this.createHitSparks(p.x, p.y, enemy.color, 4);
            hitEnemy = true;
            break;
          }
        }
        if (hitEnemy) {
          this.projectiles.splice(i, 1);
          continue;
        }
      } else {
        // Enemy bullet against Player
        if (!this.player.isDead) {
          const playerBox = {
            x: this.player.pos.x - 16,
            y: this.player.pos.y - 56,
            w: 32,
            h: 56,
          };
          if (checkAABB(bulletBox, playerBox)) {
            this.player.takeDamage(p.damage, { x: p.x, y: p.y }, p.knockback);
            this.createHitSparks(p.x, p.y, '#ef4444', 5);
            this.projectiles.splice(i, 1);
            continue;
          }
        }
      }
    }
  }

  private updateWeaponDrops(dt: number) {
    for (const drop of this.weaponDrops) {
      drop.bobTimer += dt;
      if (!drop.grounded) {
        drop.vy += 900 * dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.vx *= 0.98;

        for (const plat of this.platforms) {
          if (checkAABB({ x: drop.x - 16, y: drop.y - 12, w: 32, h: 24 }, plat)) {
            drop.y = plat.y;
            drop.vy = 0;
            drop.grounded = true;
            break;
          }
        }
      }
    }
  }

  private updateMedkitDrops(dt: number) {
    for (let i = this.medkitDrops.length - 1; i >= 0; i--) {
      const drop = this.medkitDrops[i];
      drop.bobTimer += dt;
      if (!drop.grounded) {
        drop.vy += 900 * dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.vx *= 0.98;

        for (const plat of this.platforms) {
          if (checkAABB({ x: drop.x - 14, y: drop.y - 12, w: 28, h: 24 }, plat)) {
            drop.y = plat.y;
            drop.vy = 0;
            drop.grounded = true;
            break;
          }
        }
      }

      // Check proximity pickup by player (auto pickup on walk-over)
      if (this.player && !this.player.isDead) {
        const pDist = distance(
          { x: this.player.pos.x, y: this.player.pos.y - 28 },
          { x: drop.x, y: drop.y - 10 }
        );

        if (pDist < 46) {
          // Player collected medkit!
          const missingHp = this.player.maxHp - this.player.hp;
          if (missingHp > 0) {
            const actualHealed = Math.min(missingHp, drop.healAmount);
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + drop.healAmount);
            this.addDamageText(this.player.pos.x, this.player.pos.y - 65, `+${actualHealed} HP`, '#22c55e', true);
          } else {
            // Already full HP -> gives score reward
            this.player.score += 75;
            this.stats.score += 75;
            this.addDamageText(this.player.pos.x, this.player.pos.y - 65, `+75 PTS (MAX HP)`, '#4ade80', false);
          }

          soundManager.playHeal();

          // Green healing sparkles bursting around player
          for (let s = 0; s < 14; s++) {
            const angle = (s / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const speed = 50 + Math.random() * 80;
            this.particles.push({
              x: this.player.pos.x,
              y: this.player.pos.y - 28,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 35,
              size: 2.5 + Math.random() * 2,
              color: s % 2 === 0 ? '#22c55e' : '#86efac',
              life: 0,
              maxLife: 0.35 + Math.random() * 0.2,
              type: 'spark',
            });
          }

          this.medkitDrops.splice(i, 1);
        }
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.vRot) {
        p.rotation = (p.rotation || 0) + p.vRot * dt;
      }

      if (p.type === 'spark') {
        p.vy += 600 * dt; // gravity
        p.vx *= 0.95;
      } else if (p.type === 'smoke') {
        p.size += dt * 14;
        p.vy -= 10 * dt;
      } else if (p.type === 'shockwave') {
        p.radius = (p.radius || 10) + dt * 260;
      }
    }
  }

  private updateDamageTexts(dt: number) {
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const dtObj = this.damageTexts[i];
      dtObj.life += dt;
      dtObj.y -= dt * 45;
      if (dtObj.life >= dtObj.maxLife) {
        this.damageTexts.splice(i, 1);
      }
    }
  }

  // --- VFX GENERATORS ---
  public createHitSparks(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2,
        color,
        life: 0,
        maxLife: 0.2 + Math.random() * 0.25,
        type: 'spark',
      });
    }
  }

  public createMuzzleFlash(x: number, y: number, angle: number, color: string) {
    this.particles.push({
      x: x + Math.cos(angle) * 8,
      y: y + Math.sin(angle) * 8,
      vx: Math.cos(angle) * 30,
      vy: Math.sin(angle) * 30,
      size: 14,
      color: '#fef08a',
      life: 0,
      maxLife: 0.07,
      type: 'flash',
    });

    // Casing
    this.particles.push({
      x,
      y,
      vx: -Math.cos(angle) * 60 + (Math.random() - 0.5) * 40,
      vy: -120 - Math.random() * 60,
      size: 3,
      color: '#fbbf24',
      life: 0,
      maxLife: 0.5,
      type: 'casing',
      rotation: Math.random() * 6,
      vRot: 15,
    });
  }

  public createSmokePuff(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 40,
        vy: -20 - Math.random() * 30,
        size: 5 + Math.random() * 6,
        color: 'rgba(203, 213, 225, 0.4)',
        life: 0,
        maxLife: 0.35 + Math.random() * 0.2,
        type: 'smoke',
      });
    }
  }

  public createExplosionParticles(x: number, y: number, baseColor: string, count: number) {
    // Shockwave ring
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: 0,
      radius: 12,
      color: '#f97316',
      life: 0,
      maxLife: 0.4,
      type: 'shockwave',
    });

    // Fire sparks & debris
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 450;
      const colors = ['#f97316', '#ef4444', '#fbbf24', '#fef08a'];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.4,
        type: 'spark',
      });
    }

    // Smoke burst
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 14 + Math.random() * 12,
        color: 'rgba(71, 85, 105, 0.6)',
        life: 0,
        maxLife: 0.6 + Math.random() * 0.4,
        type: 'smoke',
      });
    }
  }

  public addDamageText(x: number, y: number, text: string, color: string, isCrit: boolean) {
    this.damageTexts.push({
      id: this.nextId++,
      x: x + (Math.random() - 0.5) * 20,
      y,
      text,
      color,
      isCrit,
      life: 0,
      maxLife: 0.85,
    });
  }

  // --- RENDERING PIPELINE ---
  public render(ctx: CanvasRenderingContext2D) {
    // Clear canvas
    ctx.save();
    ctx.fillStyle = '#090d16'; // Deep arena backdrop
    ctx.fillRect(0, 0, this.width, this.height);

    // Apply camera transform with shake
    ctx.translate(-this.camera.x + this.camera.shakeX, -this.camera.y + this.camera.shakeY);

    // Draw Arena Background Grid & Glows
    this.renderArenaBackdrop(ctx);

    // Draw Platforms
    this.renderPlatforms(ctx);

    // Draw Weapon Drops & Medkit Drops
    this.renderWeaponDrops(ctx);
    this.renderMedkitDrops(ctx);

    // Draw Enemies
    this.enemies.forEach((enemy) => {
      const animState: StickmanAnimState = {
        runTimer: enemy.runTimer,
        aimAngle: enemy.aimAngle,
        facingRight: enemy.facingRight,
        isGrounded: enemy.isGrounded,
        isMoving: Math.abs(enemy.vel.x) > 10,
        isAttacking: enemy.isAttacking,
        attackProgress: enemy.attackTimer / Math.max(0.01, enemy.attackDuration),
        hurtTimer: enemy.hurtTimer,
        isDead: enemy.isDead,
        deathTimer: enemy.deathTimer,
        color: enemy.color,
        headBandColor: enemy.headBandColor,
        weapon: enemy.weapon.data,
        scale: enemy.scale,
      };
      drawStickman(ctx, enemy.pos.x, enemy.pos.y, animState);

      // Enemy HP Bar
      if (!enemy.isDead && enemy.hp < enemy.maxHp) {
        this.renderEntityHpBar(ctx, enemy.pos.x, enemy.pos.y - 70 * enemy.scale, enemy.hp, enemy.maxHp, 36 * enemy.scale);
      }
    });

    // Draw Player
    if (this.player) {
      const activeWeapon = this.player.weapons[this.player.currentWeaponIndex] || this.player.weapons[0];
      const weaponData = activeWeapon ? activeWeapon.data : getWeaponData('fist');
      const animState: StickmanAnimState = {
        runTimer: this.player.runTimer,
        aimAngle: this.player.aimAngle,
        facingRight: this.player.facingRight,
        isGrounded: this.player.isGrounded,
        isMoving: Math.abs(this.player.vel.x) > 10,
        isAttacking: this.player.isAttacking,
        attackProgress: this.player.attackTimer / Math.max(0.01, this.player.attackDuration),
        hurtTimer: this.player.hurtTimer,
        isDead: this.player.isDead,
        deathTimer: this.player.deathTimer,
        color: '#38bdf8', // Neon cyan player
        headBandColor: '#ffffff',
        weapon: weaponData,
        scale: 1,
      };
      drawStickman(ctx, this.player.pos.x, this.player.pos.y, animState);
    }

    // Draw Projectiles
    this.renderProjectiles(ctx);

    // Draw Particles
    this.renderParticles(ctx);

    // Draw Floating Damage Texts
    this.renderDamageTexts(ctx);

    // Restore Camera
    ctx.restore();

    // Render Overlay Announcer
    if (this.waveAnnounceTimer > 0) {
      this.renderWaveAnnounce(ctx);
    }
  }

  private renderArenaBackdrop(ctx: CanvasRenderingContext2D) {
    // Subtle sci-fi arena grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 80;

    for (let x = this.arenaBounds.minX; x <= this.arenaBounds.maxX; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, this.arenaBounds.minY);
      ctx.lineTo(x, this.arenaBounds.maxY);
      ctx.stroke();
    }
    for (let y = this.arenaBounds.minY; y <= this.arenaBounds.maxY; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(this.arenaBounds.minX, y);
      ctx.lineTo(this.arenaBounds.maxX, y);
      ctx.stroke();
    }

    // Atmospheric lighting gradients
    const grad = ctx.createRadialGradient(1200, 500, 100, 1200, 500, 1000);
    grad.addColorStop(0, 'rgba(30, 58, 138, 0.15)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(this.arenaBounds.minX, this.arenaBounds.minY, this.arenaBounds.maxX, this.arenaBounds.maxY);
  }

  private renderPlatforms(ctx: CanvasRenderingContext2D) {
    for (const plat of this.platforms) {
      if (plat.isJumpThrough) {
        // Sci-Fi jump-through energy ledge
        ctx.fillStyle = plat.color || '#475569';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Neon glowing top edge
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(plat.x, plat.y);
        ctx.lineTo(plat.x + plat.w, plat.y);
        ctx.stroke();
      } else {
        // Solid structure
        ctx.fillStyle = plat.color || '#1e293b';
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);

        // Highlight border
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
      }
    }
  }

  private renderWeaponDrops(ctx: CanvasRenderingContext2D) {
    for (const drop of this.weaponDrops) {
      const bobY = drop.y - 14 + Math.sin(drop.bobTimer * 4) * 5;

      // Glow circle
      ctx.save();
      const glowGrad = ctx.createRadialGradient(drop.x, bobY, 4, drop.x, bobY, 32);
      glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(drop.x, bobY, 32, 0, Math.PI * 2);
      ctx.fill();

      // Pedestal light
      ctx.strokeStyle = drop.weapon.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y - 2, 18, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Draw weapon silhouette
      ctx.save();
      ctx.translate(drop.x, bobY);
      ctx.fillStyle = drop.weapon.color;
      ctx.strokeStyle = drop.weapon.color;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(drop.weapon.name, 0, -18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText(`[E] PICKUP`, 0, -6);
      ctx.restore();

      ctx.restore();
    }
  }

  private renderMedkitDrops(ctx: CanvasRenderingContext2D) {
    for (const drop of this.medkitDrops) {
      const bobY = drop.y - 14 + Math.sin(drop.bobTimer * 4.5) * 4;

      ctx.save();

      // Ambient emerald radial glow
      const glowGrad = ctx.createRadialGradient(drop.x, bobY, 3, drop.x, bobY, 28);
      glowGrad.addColorStop(0, 'rgba(34, 197, 94, 0.5)');
      glowGrad.addColorStop(0.6, 'rgba(34, 197, 94, 0.15)');
      glowGrad.addColorStop(1, 'rgba(34, 197, 94, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(drop.x, bobY, 28, 0, Math.PI * 2);
      ctx.fill();

      // Pedestal glowing ring on ground
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(drop.x, drop.y - 2, 16, 4.5, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Medkit Body
      ctx.translate(drop.x, bobY);

      // White briefcase with green rim
      const boxW = 20;
      const boxH = 15;
      const boxR = 3;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, boxR);
      ctx.fill();
      ctx.stroke();

      // Dark top handle
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -boxH / 2);
      ctx.lineTo(-4, -boxH / 2 - 3);
      ctx.lineTo(4, -boxH / 2 - 3);
      ctx.lineTo(4, -boxH / 2);
      ctx.stroke();

      // Iconic Red Medical Cross in center
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-2, -5, 4, 10);
      ctx.fillRect(-5, -2, 10, 4);

      // Overhead floating text "+35 HP" or "+50 HP"
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(`+${drop.healAmount} HP`, 0, -13);

      ctx.restore();
    }
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    for (const p of this.projectiles) {
      ctx.save();
      if (p.isGrenade) {
        // Glowing grenade with blinking fuse
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Blinking fuse indicator
        const isBlinking = Math.sin(p.lifetime * 20) > 0;
        ctx.fillStyle = isBlinking ? '#ef4444' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(p.x, p.y - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Bullet Trail
        if (p.trail.length > 1) {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.radius;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.trail[0].x, p.trail[0].y);
          for (let i = 1; i < p.trail.length; i++) {
            ctx.lineTo(p.trail[i].x, p.trail[i].y);
          }
          ctx.stroke();
        }

        // Bullet core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.type === 'shockwave') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius || 10, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'flash') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'casing') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size, -p.size / 2, p.size * 2, p.size);
      } else {
        // Sparks
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderDamageTexts(ctx: CanvasRenderingContext2D) {
    for (const dt of this.damageTexts) {
      ctx.save();
      const alpha = Math.max(0, 1 - dt.life / dt.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = dt.isCrit ? 'bold 18px system-ui, sans-serif' : 'bold 14px system-ui, sans-serif';
      ctx.fillStyle = dt.color;
      ctx.textAlign = 'center';
      ctx.fillText(dt.text, dt.x, dt.y);
      ctx.restore();
    }
  }

  private renderEntityHpBar(ctx: CanvasRenderingContext2D, x: number, y: number, hp: number, maxHp: number, w: number) {
    const h = 5;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(x - w / 2, y, w, h);

    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    ctx.fillStyle = ratio > 0.5 ? '#22c55e' : ratio > 0.25 ? '#eab308' : '#ef4444';
    ctx.fillRect(x - w / 2, y, w * ratio, h);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y, w, h);
    ctx.restore();
  }

  private renderWaveAnnounce(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const progress = this.waveAnnounceTimer / 3.0;
    const alpha = Math.sin(progress * Math.PI);
    ctx.globalAlpha = alpha;

    ctx.textAlign = 'center';
    ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 18;
    ctx.fillText(this.waveAnnounceText, this.width / 2, 140);
    ctx.restore();
  }
}
