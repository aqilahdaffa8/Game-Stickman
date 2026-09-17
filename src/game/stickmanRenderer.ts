import { WeaponData } from '../types/game';

export interface StickmanAnimState {
  runTimer: number;
  aimAngle: number;
  facingRight: boolean;
  isGrounded: boolean;
  isMoving: boolean;
  isAttacking: boolean;
  attackProgress: number; // 0 to 1
  hurtTimer: number;
  isDead: boolean;
  deathTimer: number;
  color: string;
  headBandColor?: string;
  weapon?: WeaponData;
  scale?: number;
}

export function drawStickman(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  anim: StickmanAnimState
) {
  const scale = anim.scale || 1;
  ctx.save();
  ctx.translate(x, y);

  // If dead, draw ragdoll tumbling collapse
  if (anim.isDead) {
    const t = Math.min(1, anim.deathTimer / 0.8);
    ctx.globalAlpha = Math.max(0, 1 - t * 0.9);
    ctx.rotate((anim.facingRight ? 1 : -1) * t * 1.5);
    ctx.translate(0, 20 * t);
  }

  // Hurt flash
  let strokeColor = anim.color;
  if (anim.hurtTimer > 0) {
    strokeColor = '#ffffff';
  }

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = 3.5 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const headRadius = 9 * scale;
  const torsoLength = 26 * scale;
  const legLength = 22 * scale;
  const armLength = 20 * scale;

  // Hip is origin for legs, at y = -legLength
  const hipY = -legLength;
  const shoulderY = hipY - torsoLength;
  const headCenterY = shoulderY - headRadius;

  // Leg animation
  let leftFootX = -8 * scale;
  let leftFootY = 0;
  let rightFootX = 8 * scale;
  let rightFootY = 0;

  if (anim.isDead) {
    leftFootX = -12 * scale;
    leftFootY = -4 * scale;
    rightFootX = 14 * scale;
    rightFootY = -2 * scale;
  } else if (!anim.isGrounded) {
    // Jump pose
    leftFootX = -10 * scale;
    leftFootY = -12 * scale;
    rightFootX = 6 * scale;
    rightFootY = -6 * scale;
  } else if (anim.isMoving) {
    // Running cycle
    const cycle = anim.runTimer * 12;
    const stride = 14 * scale;
    const lift = 9 * scale;

    const leftPhase = Math.sin(cycle);
    const rightPhase = Math.sin(cycle + Math.PI);

    leftFootX = leftPhase * stride;
    leftFootY = -Math.max(0, Math.cos(cycle)) * lift;

    rightFootX = rightPhase * stride;
    rightFootY = -Math.max(0, Math.cos(cycle + Math.PI)) * lift;
  } else {
    // Idle breathing
    const breath = Math.sin(anim.runTimer * 3) * (1.5 * scale);
    leftFootX = -7 * scale;
    rightFootX = 7 * scale;
    leftFootY = 0;
    rightFootY = 0;
  }

  // Draw Legs
  // Left leg
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(leftFootX * 0.5, hipY + legLength * 0.5);
  ctx.lineTo(leftFootX, leftFootY);
  ctx.stroke();

  // Right leg
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(rightFootX * 0.5, hipY + legLength * 0.5);
  ctx.lineTo(rightFootX, rightFootY);
  ctx.stroke();

  // Torso
  ctx.beginPath();
  ctx.moveTo(0, hipY);
  ctx.lineTo(0, shoulderY);
  ctx.stroke();

  // Head
  ctx.beginPath();
  ctx.arc(0, headCenterY, headRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Headband / Visor decoration
  if (anim.headBandColor) {
    ctx.save();
    ctx.strokeStyle = anim.headBandColor;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(0, headCenterY, headRadius, -0.4, 0.4);
    ctx.stroke();

    // Trailing headband tails
    const tailDir = anim.facingRight ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(tailDir * headRadius, headCenterY);
    ctx.lineTo(tailDir * (headRadius + 8 * scale), headCenterY + Math.sin(anim.runTimer * 8) * 3);
    ctx.stroke();
    ctx.restore();
  }

  // Eye
  const eyeDir = anim.facingRight ? 1 : -1;
  ctx.fillStyle = anim.hurtTimer > 0 ? '#ff0000' : '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeDir * 4 * scale, headCenterY - 1 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Back Arm
  ctx.save();
  ctx.translate(0, shoulderY);
  let backArmAngle = (eyeDir * Math.PI) / 4;
  if (anim.isMoving && anim.isGrounded) {
    backArmAngle += Math.sin(anim.runTimer * 12 + Math.PI) * 0.6;
  }
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(backArmAngle) * armLength * 0.7, Math.sin(backArmAngle) * armLength * 0.7);
  ctx.stroke();
  ctx.restore();

  // Front Arm (Aiming toward aimAngle)
  ctx.save();
  ctx.translate(0, shoulderY);

  let aim = anim.aimAngle;
  if (anim.isDead) {
    aim = eyeDir * 1.2;
  }

  // Attack swing animation for melee
  let swingOffset = 0;
  if (anim.isAttacking && anim.weapon?.type === 'melee') {
    // Rapid forward slash arc
    const p = anim.attackProgress;
    swingOffset = (Math.sin(p * Math.PI) * (eyeDir * 1.5));
  }

  const effectiveArmAngle = aim + swingOffset;

  const handX = Math.cos(effectiveArmAngle) * armLength;
  const handY = Math.sin(effectiveArmAngle) * armLength;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(handX * 0.5, handY * 0.5 - 3 * scale);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Draw Weapon in hand
  if (anim.weapon) {
    drawWeapon(ctx, handX, handY, effectiveArmAngle, anim.weapon, anim.facingRight, scale, anim.isAttacking);
  }

  ctx.restore();

  ctx.restore();
}

function drawWeapon(
  ctx: CanvasRenderingContext2D,
  handX: number,
  handY: number,
  angle: number,
  weapon: WeaponData,
  facingRight: boolean,
  scale: number,
  isAttacking: boolean
) {
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(angle);

  // If aiming backwards relative to weapon orientation, flip vertically
  const flipped = Math.cos(angle) < 0;
  if (flipped) {
    ctx.scale(1, -1);
  }

  switch (weapon.iconType) {
    case 'fist':
      // Bare fist with combat wrap
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(6 * scale, 0, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'sword':
      // Katana Blade
      ctx.strokeStyle = '#94a3b8'; // Hilt
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(-5 * scale, 0);
      ctx.lineTo(5 * scale, 0);
      ctx.stroke();

      // Guard
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 4 * scale;
      ctx.beginPath();
      ctx.moveTo(5 * scale, -5 * scale);
      ctx.lineTo(5 * scale, 5 * scale);
      ctx.stroke();

      // Blade with glow
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(6 * scale, 0);
      ctx.lineTo(36 * scale, -1 * scale);
      ctx.stroke();

      // Sharp edge highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1 * scale;
      ctx.beginPath();
      ctx.moveTo(8 * scale, -1 * scale);
      ctx.lineTo(35 * scale, -1 * scale);
      ctx.stroke();

      // Melee slash arc trail when attacking
      if (isAttacking) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.lineWidth = 8 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, 36 * scale, -0.7, 0.7);
        ctx.stroke();
      }
      break;

    case 'bat':
      // Heavy baseball bat
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(-6 * scale, 0);
      ctx.lineTo(4 * scale, 0);
      ctx.stroke();

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 6 * scale;
      ctx.beginPath();
      ctx.moveTo(4 * scale, 0);
      ctx.lineTo(28 * scale, 0);
      ctx.stroke();

      if (isAttacking) {
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
        ctx.lineWidth = 10 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, 30 * scale, -0.6, 0.6);
        ctx.stroke();
      }
      break;

    case 'pistol':
      // Tactical handgun
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, -3 * scale, 14 * scale, 6 * scale);
      // Grip
      ctx.fillRect(-2 * scale, 0, 4 * scale, 7 * scale);
      // Barrel tip
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(12 * scale, -2 * scale, 3 * scale, 4 * scale);
      break;

    case 'shotgun':
      // Pump shotgun
      ctx.fillStyle = '#334155';
      ctx.fillRect(-4 * scale, -4 * scale, 24 * scale, 7 * scale);
      // Stock
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-10 * scale, -2 * scale, 7 * scale, 5 * scale);
      // Pump slide
      ctx.fillStyle = '#b45309';
      ctx.fillRect(8 * scale, 1 * scale, 8 * scale, 4 * scale);
      break;

    case 'rifle':
      // Assault rifle
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6 * scale, -4 * scale, 28 * scale, 7 * scale);
      // Curved magazine
      ctx.fillStyle = '#334155';
      ctx.fillRect(8 * scale, 2 * scale, 5 * scale, 9 * scale);
      // Stock
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-12 * scale, -3 * scale, 8 * scale, 6 * scale);
      // Barrel & flash hider
      ctx.fillStyle = '#64748b';
      ctx.fillRect(22 * scale, -2 * scale, 6 * scale, 3 * scale);
      break;

    case 'grenade':
      // Frag grenade
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(6 * scale, 0, 6 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();

      // Pin
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(3 * scale, -6 * scale);
      ctx.lineTo(3 * scale, -9 * scale);
      ctx.stroke();
      break;
  }

  ctx.restore();
}
