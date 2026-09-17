import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/gameEngine';
import { HUD } from './HUD';
import { distance } from '../game/physics';
import { ArrowLeft, ArrowRight, ArrowUp, Crosshair, RefreshCw, Zap } from 'lucide-react';

interface GameCanvasProps {
  engine: GameEngine;
  onPause: () => void;
  showMobileControls: boolean;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  engine,
  onPause,
  showMobileControls,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Input states
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef<boolean>(false);

  // Mobile virtual inputs
  const mobileInputRef = useRef({
    left: false,
    right: false,
    jump: false,
    down: false,
    attack: false,
  });

  // HUD sync state
  const [, setTick] = useState(0);

  // Keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      keysRef.current[e.code] = true;

      // Single triggers
      if (e.code === 'KeyE') {
        engine.pickupWeapon();
      } else if (e.code === 'Digit1') {
        engine.switchWeapon(0);
      } else if (e.code === 'Digit2') {
        engine.switchWeapon(1);
      } else if (e.code === 'KeyR') {
        engine.reloadWeapon();
      } else if (e.code === 'Escape') {
        onPause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine, onPause]);

  // Mouse aim & shoot
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    []
  );

  const handleMouseDown = useCallback(() => {
    isMouseDownRef.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
  }, []);

  // Canvas Resize Observer & Immediate Initial Sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = (width: number, height: number) => {
      if (width > 0 && height > 0 && canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        engine.width = width;
        engine.height = height;
        engine.snapCameraToPlayer();
      }
    };

    // Immediate initial measurement so there is zero initial frame delay
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      updateSize(rect.width, rect.height);
    }

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        updateSize(width, height);
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [engine]);

  // Main Animation / Game Loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let hudUpdateCounter = 0;

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05); // cap delta time to 50ms to prevent spiral
      lastTime = time;

      // Calculate aim angle from player world pos to mouse world pos
      const playerScreenX = engine.player.pos.x - engine.camera.x + engine.camera.shakeX;
      const playerScreenY = engine.player.pos.y - 40 - engine.camera.y + engine.camera.shakeY;

      let aimAngle = engine.player.facingRight ? 0 : Math.PI;
      if (mousePosRef.current.x !== 0 || mousePosRef.current.y !== 0) {
        const dx = mousePosRef.current.x - playerScreenX;
        const dy = mousePosRef.current.y - playerScreenY;
        aimAngle = Math.atan2(dy, dx);
      }

      // Collect inputs
      const keys = keysRef.current;
      const mobile = mobileInputRef.current;

      const left = !!(keys['KeyA'] || keys['ArrowLeft'] || mobile.left);
      const right = !!(keys['KeyD'] || keys['ArrowRight'] || mobile.right);
      const jump = !!(keys['KeyW'] || keys['Space'] || keys['ArrowUp'] || mobile.jump);
      const down = !!(keys['KeyS'] || keys['ArrowDown'] || mobile.down);
      const attack = !!(isMouseDownRef.current || mobile.attack);
      const reload = !!keys['KeyR'];

      // Update simulation
      engine.update(dt, {
        left,
        right,
        jump,
        down,
        attack,
        reload,
        aimAngle,
      });

      // Render
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          engine.render(ctx);
        }
      }

      // Sync HUD at 30fps
      hudUpdateCounter++;
      if (hudUpdateCounter % 2 === 0) {
        setTick((t) => (t + 1) % 10000);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Nearby weapon check
  const pickupRange = 75;
  let nearbyWeaponName: string | undefined;
  let canPickup = false;

  for (const drop of engine.weaponDrops) {
    if (distance(engine.player.pos, { x: drop.x, y: drop.y }) < pickupRange) {
      canPickup = true;
      nearbyWeaponName = drop.weapon.name;
      break;
    }
  }

  const aliveEnemies = engine.enemies.filter((e) => !e.isDead).length;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none cursor-crosshair"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchMove={(e) => {
          if (!canvasRef.current || e.touches.length === 0) return;
          const rect = canvasRef.current.getBoundingClientRect();
          mousePosRef.current = {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
          };
        }}
        onTouchStart={(e) => {
          if (!canvasRef.current || e.touches.length === 0) return;
          const rect = canvasRef.current.getBoundingClientRect();
          mousePosRef.current = {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top,
          };
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="w-full h-full block"
      />

      {/* HUD Layer */}
      <HUD
        player={engine.player}
        stats={engine.stats}
        remainingEnemies={aliveEnemies}
        onPause={onPause}
        onSwitchWeapon={(idx) => engine.switchWeapon(idx)}
        onReload={() => engine.reloadWeapon()}
        onPickup={() => engine.pickupWeapon()}
        canPickup={canPickup}
        nearbyWeaponName={nearbyWeaponName}
      />

      {/* Virtual Touch Controls for Mobile/Tablet */}
      {showMobileControls && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 px-6 flex justify-between items-end z-20">
          {/* Left D-Pad */}
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              id="mobile-btn-left"
              onTouchStart={() => (mobileInputRef.current.left = true)}
              onTouchEnd={() => (mobileInputRef.current.left = false)}
              onMouseDown={() => (mobileInputRef.current.left = true)}
              onMouseUp={() => (mobileInputRef.current.left = false)}
              className="w-14 h-14 bg-slate-900/80 active:bg-cyan-600/80 backdrop-blur-md rounded-2xl border border-slate-700 flex items-center justify-center text-white active:scale-95 transition-all shadow-xl"
            >
              <ArrowLeft className="w-7 h-7" />
            </button>
            <button
              id="mobile-btn-right"
              onTouchStart={() => (mobileInputRef.current.right = true)}
              onTouchEnd={() => (mobileInputRef.current.right = false)}
              onMouseDown={() => (mobileInputRef.current.right = true)}
              onMouseUp={() => (mobileInputRef.current.right = false)}
              className="w-14 h-14 bg-slate-900/80 active:bg-cyan-600/80 backdrop-blur-md rounded-2xl border border-slate-700 flex items-center justify-center text-white active:scale-95 transition-all shadow-xl"
            >
              <ArrowRight className="w-7 h-7" />
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="pointer-events-auto flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <button
                id="mobile-btn-pickup"
                onClick={() => engine.pickupWeapon()}
                className="w-12 h-12 bg-slate-900/80 active:bg-amber-600 backdrop-blur-md rounded-xl border border-slate-700 flex items-center justify-center text-amber-300 font-black text-xs active:scale-95 transition-all"
              >
                PICK
              </button>
              <button
                id="mobile-btn-reload"
                onClick={() => engine.reloadWeapon()}
                className="w-12 h-12 bg-slate-900/80 active:bg-cyan-600 backdrop-blur-md rounded-xl border border-slate-700 flex items-center justify-center text-cyan-300 active:scale-95 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="mobile-btn-jump"
                onTouchStart={() => (mobileInputRef.current.jump = true)}
                onTouchEnd={() => (mobileInputRef.current.jump = false)}
                onMouseDown={() => (mobileInputRef.current.jump = true)}
                onMouseUp={() => (mobileInputRef.current.jump = false)}
                className="w-16 h-16 bg-slate-900/80 active:bg-emerald-600/80 backdrop-blur-md rounded-2xl border border-slate-700 flex items-center justify-center text-white active:scale-95 transition-all shadow-xl"
              >
                <ArrowUp className="w-8 h-8" />
              </button>

              <button
                id="mobile-btn-attack"
                onTouchStart={() => (mobileInputRef.current.attack = true)}
                onTouchEnd={() => (mobileInputRef.current.attack = false)}
                onMouseDown={() => (mobileInputRef.current.attack = true)}
                onMouseUp={() => (mobileInputRef.current.attack = false)}
                className="w-18 h-18 bg-rose-600/90 active:bg-rose-500 backdrop-blur-md rounded-3xl border border-rose-400 flex items-center justify-center text-white active:scale-95 transition-all shadow-2xl shadow-rose-900/50"
              >
                <Crosshair className="w-9 h-9" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
