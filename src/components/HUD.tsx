import React from 'react';
import { PlayerEntity } from '../game/gameEngine';
import { GameStats } from '../types/game';
import { Shield, Skull, Crosshair, RefreshCw, Trophy, Clock, Pause } from 'lucide-react';

interface HUDProps {
  player: PlayerEntity;
  stats: GameStats;
  remainingEnemies: number;
  onPause: () => void;
  onSwitchWeapon: (index: number) => void;
  onReload: () => void;
  onPickup: () => void;
  canPickup: boolean;
  nearbyWeaponName?: string;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  stats,
  remainingEnemies,
  onPause,
  onSwitchWeapon,
  onReload,
  onPickup,
  canPickup,
  nearbyWeaponName,
}) => {
  const activeWeapon = player.weapons[player.currentWeaponIndex];
  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 select-none font-sans text-white">
      {/* Top Row: HP, Wave info, Score & Timer */}
      <div className="flex items-start justify-between gap-4">
        {/* Player HP Bar */}
        <div className="flex flex-col gap-1.5 w-64 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-700/60 shadow-lg">
          <div className="flex items-center justify-between text-xs font-bold tracking-wider">
            <span className="flex items-center gap-1.5 text-cyan-400 uppercase">
              <Shield className="w-4 h-4 text-cyan-400" />
              PLAYER HP
            </span>
            <span className="text-slate-200">
              {Math.ceil(player.hp)} / {player.maxHp}
            </span>
          </div>
          <div className="relative w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-150 rounded-full ${
                hpPercent > 50
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : hpPercent > 25
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-rose-600 to-red-500 animate-pulse'
              }`}
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* Center: Wave & Remaining Enemies */}
        <div className="flex items-center gap-3 bg-slate-900/85 backdrop-blur-md px-5 py-2.5 rounded-xl border border-slate-700/60 shadow-lg">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">CURRENT WAVE</span>
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-200">
              WAVE {stats.wave}
            </span>
          </div>

          <div className="h-7 w-[1px] bg-slate-700" />

          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-rose-400" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase">ENEMIES LEFT</span>
              <span className="text-base font-bold text-rose-400">{remainingEnemies}</span>
            </div>
          </div>
        </div>

        {/* Top Right: Score, Time & Pause */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-4 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700/60 shadow-lg">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">SCORE</span>
                <span className="text-sm font-bold text-amber-400">{stats.score}</span>
              </div>
            </div>

            <div className="h-6 w-[1px] bg-slate-700" />

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-300" />
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 uppercase">TIME</span>
                <span className="text-sm font-mono font-bold text-slate-200">{formatTime(stats.timer)}</span>
              </div>
            </div>
          </div>

          <button
            id="pause-button"
            onClick={onPause}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md rounded-xl border border-slate-600 transition-colors cursor-pointer text-slate-200 hover:text-white"
            title="Pause Game [ESC]"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Middle Floating Pickup Prompt */}
      {canPickup && (
        <div className="self-center pointer-events-auto flex items-center gap-3 bg-slate-950/90 border border-cyan-400/80 px-5 py-2.5 rounded-2xl shadow-[0_0_20px_rgba(56,189,248,0.3)] animate-bounce">
          <span className="text-xs font-bold text-slate-300">Found:</span>
          <span className="text-sm font-extrabold text-cyan-300">{nearbyWeaponName}</span>
          <button
            id="pickup-prompt-btn"
            onClick={onPickup}
            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black rounded-lg cursor-pointer transition-colors"
          >
            PICKUP [E]
          </button>
        </div>
      )}

      {/* Bottom Row: Weapons inventory & Ammo status */}
      <div className="flex items-end justify-between gap-4">
        {/* Weapon Slots */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {player.weapons.map((w, idx) => {
            const isActive = idx === player.currentWeaponIndex;
            return (
              <button
                key={idx}
                id={`weapon-slot-${idx}`}
                onClick={() => onSwitchWeapon(idx)}
                className={`relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900/95 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.3)] scale-105'
                    : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/80 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs mb-1">
                  <span className="font-bold text-slate-200">{w.data.name}</span>
                  <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-mono">
                    [{idx + 1}]
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">{w.data.type}</span>
                  <span className="font-mono font-bold" style={{ color: w.data.color }}>
                    {w.data.type === 'melee' ? '∞' : `${w.currentAmmo} / ${w.data.magazineSize}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Weapon Ammo Counter & Reload Button */}
        <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 shadow-xl">
          <div className="flex flex-col items-end">
            <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
              {activeWeapon.data.name}
            </span>
            <div className="flex items-baseline gap-1">
              {activeWeapon.isReloading ? (
                <div className="flex items-center gap-1.5 text-amber-400 text-sm font-bold animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  RELOADING ({Math.round(activeWeapon.reloadProgress * 100)}%)
                </div>
              ) : activeWeapon.data.type === 'melee' ? (
                <span className="text-2xl font-black text-cyan-400">MELEE READY</span>
              ) : (
                <>
                  <span className="text-3xl font-black font-mono text-white tracking-tight">
                    {activeWeapon.currentAmmo}
                  </span>
                  <span className="text-sm font-mono text-slate-400">
                    / {activeWeapon.data.magazineSize}
                  </span>
                </>
              )}
            </div>
          </div>

          {activeWeapon.data.type !== 'melee' && (
            <button
              id="reload-button"
              onClick={onReload}
              disabled={activeWeapon.isReloading || activeWeapon.currentAmmo >= activeWeapon.data.magazineSize}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                activeWeapon.isReloading
                  ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-cyan-300 hover:text-white'
              }`}
              title="Reload Weapon [R]"
            >
              <RefreshCw className={`w-5 h-5 ${activeWeapon.isReloading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
