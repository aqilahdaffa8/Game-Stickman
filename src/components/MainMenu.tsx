import React, { useState } from 'react';
import { WEAPONS_DATABASE } from '../game/weapons';
import { WeaponData } from '../types/game';
import { Play, Shield, Crosshair, Sparkles, Code2, Settings, HelpCircle, Swords } from 'lucide-react';

interface MainMenuProps {
  selectedWeaponId: string;
  onSelectWeapon: (weaponId: string) => void;
  onStartGame: (startingWeaponId: string) => void;
  onOpenSettings: () => void;
  onOpenUnityCode: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  selectedWeaponId,
  onSelectWeapon,
  onStartGame,
  onOpenSettings,
  onOpenUnityCode,
}) => {
  const [activeTab, setActiveTab] = useState<'play' | 'armory' | 'controls'>('play');

  const selectedWeapon: WeaponData = WEAPONS_DATABASE[selectedWeaponId] || WEAPONS_DATABASE.pistol;

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-6 bg-radial from-slate-900 via-slate-950 to-[#050811] text-white overflow-y-auto select-none">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500 to-sky-400 rounded-xl shadow-lg shadow-cyan-500/20">
            <Swords className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-white">STICKMAN BATTLE 2D</h1>
            <p className="text-xs text-slate-400 font-medium">Physics Combat & Unity Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="menu-btn-unity"
            onClick={onOpenUnityCode}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-cyan-500/40 hover:border-cyan-400 rounded-xl text-xs font-bold text-cyan-300 transition-all cursor-pointer shadow-md shadow-cyan-950/40"
          >
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span>Unity C# Codebase</span>
          </button>

          <button
            id="menu-btn-settings"
            onClick={onOpenSettings}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-4xl flex flex-col items-center my-auto py-8 z-10">
        {/* Title Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-950/60 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-400 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            FAST-PACED 2D STICKMAN COMBAT
          </div>
          <h2 className="text-5xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
            ARENA COMBAT
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mt-2">
            Survive ruthless enemy waves, master weapon recoil, and conquer dynamic multi-tier platforms with physics-based movement.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <button
            id="tab-btn-play"
            onClick={() => setActiveTab('play')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'play'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            BATTLE ARENA
          </button>
          <button
            id="tab-btn-armory"
            onClick={() => setActiveTab('armory')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'armory'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            WEAPON ARMORY
          </button>
          <button
            id="tab-btn-controls"
            onClick={() => setActiveTab('controls')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'controls'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            CONTROLS
          </button>
        </div>

        {/* Tab 1: Play / Loadout Preview */}
        {activeTab === 'play' && (
          <div className="w-full max-w-md flex flex-col items-center gap-5">
            {/* Selected Weapon Card */}
            <div className="w-full bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between shadow-xl">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Starting Weapon</span>
                <h4 className="text-lg font-black text-cyan-300">{selectedWeapon.name}</h4>
                <p className="text-xs text-slate-400">{selectedWeapon.description}</p>
              </div>
              <button
                onClick={() => setActiveTab('armory')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-semibold text-slate-200 cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* Launch Game Button */}
            <button
              id="start-battle-button"
              onClick={() => onStartGame(selectedWeaponId)}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 text-base font-black tracking-wider uppercase rounded-2xl shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-6 h-6 fill-slate-950" />
              START BATTLE
            </button>
          </div>
        )}

        {/* Tab 2: Armory */}
        {activeTab === 'armory' && (
          <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                SELECT STARTING PRIMARY WEAPON
              </h3>
              <span className="text-xs font-semibold text-cyan-400">
                Current: {selectedWeapon.name}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.values(WEAPONS_DATABASE).map((w) => {
                const isSelected = w.id === selectedWeaponId;
                return (
                  <button
                    key={w.id}
                    id={`armory-weapon-${w.id}`}
                    onClick={() => onSelectWeapon(w.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.25)] ring-1 ring-cyan-400/50'
                        : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-white">{w.name}</span>
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${w.color}20`, color: w.color }}
                      >
                        {w.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">{w.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                      <span>DMG: {w.damage}</span>
                      <span>FIRE: {w.fireRate}/s</span>
                      <span>{w.type === 'melee' ? 'MELEE' : `${w.magazineSize} AMMO`}</span>
                    </div>
                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-cyan-500/30 flex items-center justify-between text-[10px] font-bold text-cyan-300">
                        <span>EQUIPPED LOADOUT</span>
                        <span>✓ ACTIVE</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Armory Action Bar */}
            <div className="mt-5 pt-4 border-t border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Selected:</span>
                <span className="text-xs font-bold text-cyan-300">{selectedWeapon.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  id="armory-back-btn"
                  onClick={() => setActiveTab('play')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-slate-200 cursor-pointer transition-colors"
                >
                  BACK TO ARENA
                </button>
                <button
                  id="armory-start-battle-button"
                  onClick={() => onStartGame(selectedWeaponId)}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 text-xs font-black tracking-wider uppercase rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  EQUIP & START BATTLE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Controls */}
        {activeTab === 'controls' && (
          <div className="w-full max-w-xl bg-slate-900/80 border border-slate-700/80 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              KEYBOARD & MOUSE CONTROLS
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Move Left / Right</span>
                <span className="font-mono font-bold text-cyan-300">[A] / [D] or [←] [→]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Jump / Double Jump</span>
                <span className="font-mono font-bold text-cyan-300">[Space] or [W]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Aim Weapon</span>
                <span className="font-mono font-bold text-cyan-300">[Mouse Cursor]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Attack / Shoot</span>
                <span className="font-mono font-bold text-cyan-300">[Left Click]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Reload Ranged</span>
                <span className="font-mono font-bold text-cyan-300">[R]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Pickup Weapon</span>
                <span className="font-mono font-bold text-cyan-300">[E]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Switch Weapon Slot</span>
                <span className="font-mono font-bold text-cyan-300">[1] / [2]</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60">
                <span className="text-slate-400">Drop Down Platform</span>
                <span className="font-mono font-bold text-cyan-300">[S] or [↓]</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-4 text-center">
              Mobile and touch devices can also use on-screen virtual buttons configured in Settings.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-5xl flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/80 pt-4 z-10">
        <span>Unity 2D + C# Modular Architecture</span>
        <span>Version 1.0.0 &bull; Ready for Export</span>
      </div>
    </div>
  );
};
