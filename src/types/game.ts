export type WeaponType = 'melee' | 'ranged' | 'special';

export interface WeaponData {
  id: string;
  name: string;
  type: WeaponType;
  damage: number;
  fireRate: number; // attacks per second
  range: number;
  magazineSize: number;
  reloadTime: number; // in seconds
  knockback: number;
  projectileSpeed?: number;
  spread?: number; // radians or degree
  pellets?: number; // for shotgun
  color: string;
  description: string;
  iconType: 'fist' | 'sword' | 'bat' | 'pistol' | 'shotgun' | 'rifle' | 'grenade';
}

export interface WeaponState {
  data: WeaponData;
  currentAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  lastFireTime: number;
}

export type EnemyType = 'basic' | 'gunner' | 'heavy';
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'hurt' | 'dead';

export interface Vector2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IDamageable {
  takeDamage(amount: number, sourcePos?: Vector2D, knockbackPower?: number, isCrit?: boolean): void;
  hp: number;
  maxHp: number;
  isDead: boolean;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  knockback: number;
  owner: 'player' | 'enemy';
  color: string;
  lifetime: number; // in seconds
  maxLifetime: number;
  trail: { x: number; y: number }[];
  isGrenade?: boolean;
  bounces?: number;
  fuseTimer?: number;
}

export interface WeaponDrop {
  id: number;
  weapon: WeaponData;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  ammo: number;
  bobTimer: number;
}

export interface MedkitDrop {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  healAmount: number;
  bobTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'spark' | 'smoke' | 'shockwave' | 'casing' | 'slash' | 'flash' | 'dust';
  rotation?: number;
  vRot?: number;
  radius?: number;
}

export interface DamageText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  isCrit: boolean;
  life: number;
  maxLife: number;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isJumpThrough?: boolean;
  color?: string;
  label?: string;
}

export interface LaunchPad {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  power: number;
  cooldownTimer: number;
}

export interface GameStats {
  score: number;
  kills: number;
  wave: number;
  timer: number;
  shotsFired: number;
  shotsHit: number;
  damageDealt: number;
}
