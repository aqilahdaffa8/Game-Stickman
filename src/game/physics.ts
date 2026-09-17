import { BoundingBox, Platform, Vector2D } from '../types/game';

export const GRAVITY = 1100;
export const TERMINAL_VELOCITY = 950;
export const GROUND_FRICTION = 0.84;
export const AIR_FRICTION = 0.96;

export function checkAABB(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function distance(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(v: Vector2D): Vector2D {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Resolves character movement against environment platforms
 */
export function moveAndCollide(
  pos: Vector2D,
  vel: Vector2D,
  size: { w: number; h: number },
  platforms: Platform[],
  dt: number,
  isDroppingDown: boolean = false
): { pos: Vector2D; vel: Vector2D; isGrounded: boolean } {
  let { x, y } = pos;
  let { x: vx, y: vy } = vel;
  let isGrounded = false;

  // Apply gravity
  vy += GRAVITY * dt;
  if (vy > TERMINAL_VELOCITY) vy = TERMINAL_VELOCITY;

  // Horizontal motion
  x += vx * dt;
  const charBoxX: BoundingBox = { x: x - size.w / 2, y: y - size.h, w: size.w, h: size.h };

  for (const plat of platforms) {
    if (plat.isJumpThrough) continue; // Jump-through platforms only collide vertically
    if (checkAABB(charBoxX, plat)) {
      if (vx > 0) {
        x = plat.x - size.w / 2;
      } else if (vx < 0) {
        x = plat.x + plat.w + size.w / 2;
      }
      vx = 0;
      break;
    }
  }

  // Vertical motion
  const prevY = y;
  y += vy * dt;
  const charBoxY: BoundingBox = { x: x - size.w / 2, y: y - size.h, w: size.w, h: size.h };

  for (const plat of platforms) {
    if (plat.isJumpThrough) {
      // Only land if falling downward, feet were previously above the platform, and not actively dropping down
      if (!isDroppingDown && vy > 0) {
        const feetPrevY = prevY;
        const feetCurrY = y;
        const platTopY = plat.y;
        if (
          feetPrevY <= platTopY + 4 &&
          feetCurrY >= platTopY &&
          x + size.w / 2 > plat.x &&
          x - size.w / 2 < plat.x + plat.w
        ) {
          y = platTopY;
          vy = 0;
          isGrounded = true;
          break;
        }
      }
      continue;
    }

    // Solid platform
    if (checkAABB(charBoxY, plat)) {
      if (vy > 0) {
        // Landing on floor
        y = plat.y;
        vy = 0;
        isGrounded = true;
      } else if (vy < 0) {
        // Head hitting ceiling
        y = plat.y + plat.h + size.h;
        vy = 0;
      }
      break;
    }
  }

  // Friction
  if (isGrounded) {
    vx *= Math.pow(GROUND_FRICTION, dt * 60);
  } else {
    vx *= Math.pow(AIR_FRICTION, dt * 60);
  }

  return {
    pos: { x, y },
    vel: { x: vx, y: vy },
    isGrounded,
  };
}
