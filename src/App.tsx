/**
 * Stickman Battle 2D - Master Application Component
 */

import React, { useState, useEffect, useRef } from 'react';
import { GameEngine } from './game/gameEngine';
import { GameStats } from './types/game';
import { soundManager } from './audio/soundManager';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { ResultModal } from './components/ResultModal';
import { SettingsModal } from './components/SettingsModal';
import { UnityCodeViewer } from './components/UnityCodeViewer';
import { Play, RotateCcw, Home, Settings, Code2 } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'battle' | 'result'>('menu');
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('pistol');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [lastStats, setLastStats] = useState<GameStats>({
    score: 0,
    kills: 0,
    wave: 1,
    timer: 0,
    shotsFired: 0,
    shotsHit: 0,
    damageDealt: 0,
  });

  // Modal views
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showUnityCode, setShowUnityCode] = useState<boolean>(false);

  // Mobile controls state
  const [showMobileControls, setShowMobileControls] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
    return false;
  });

  // Stable GameEngine instance
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new GameEngine();
  }
  const engine = engineRef.current;

  // Setup callbacks
  useEffect(() => {
    engine.onGameOver = (stats) => {
      setLastStats({ ...stats });
      setIsVictory(false);
      setGameState('result');
      soundManager.stopBattleBgm();
    };

    engine.onVictory = (stats) => {
      setLastStats({ ...stats });
      setIsVictory(true);
      setGameState('result');
      soundManager.stopBattleBgm();
    };
  }, [engine]);

  const handleStartBattle = (startingWeaponId?: string) => {
    const weaponToUse = startingWeaponId || selectedWeaponId || 'pistol';
    setSelectedWeaponId(weaponToUse);
    engine.resetGame(weaponToUse);
    setGameState('battle');
    setIsPaused(false);
    soundManager.startBattleBgm();
  };

  const handlePause = () => {
    setIsPaused(true);
    engine.isPaused = true;
  };

  const handleResume = () => {
    setIsPaused(false);
    engine.isPaused = false;
  };

  const handleRestart = () => {
    const activeWeaponId = engine.player?.weapons[0]?.data.id || selectedWeaponId || 'pistol';
    handleStartBattle(activeWeaponId);
  };

  const handleBackToMenu = () => {
    setIsPaused(false);
    engine.isPaused = false;
    setGameState('menu');
    soundManager.stopBattleBgm();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* 1. Main Menu */}
      {gameState === 'menu' && (
        <MainMenu
          selectedWeaponId={selectedWeaponId}
          onSelectWeapon={setSelectedWeaponId}
          onStartGame={handleStartBattle}
          onOpenSettings={() => setShowSettings(true)}
          onOpenUnityCode={() => setShowUnityCode(true)}
        />
      )}

      {/* 2. Battle Screen */}
      {(gameState === 'battle' || gameState === 'result') && (
        <GameCanvas
          engine={engine}
          onPause={handlePause}
          showMobileControls={showMobileControls && gameState === 'battle'}
        />
      )}

      {/* 3. Pause Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <h3 className="text-2xl font-black text-white tracking-wider mb-1">GAME PAUSED</h3>
            <p className="text-xs text-slate-400 mb-6">Take a breather or adjust your battle settings</p>

            <div className="w-full flex flex-col gap-3">
              <button
                id="pause-resume-btn"
                onClick={handleResume}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-sm uppercase rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                RESUME BATTLE
              </button>

              <button
                id="pause-restart-btn"
                onClick={handleRestart}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                RESTART WAVE
              </button>

              <button
                id="pause-settings-btn"
                onClick={() => setShowSettings(true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                AUDIO & CONTROLS SETTINGS
              </button>

              <button
                id="pause-unity-btn"
                onClick={() => setShowUnityCode(true)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Code2 className="w-4 h-4" />
                VIEW UNITY C# SCRIPTS
              </button>

              <button
                id="pause-menu-btn"
                onClick={handleBackToMenu}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                RETURN TO MAIN MENU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Result Modal (Victory / Defeat) */}
      {gameState === 'result' && (
        <ResultModal
          isVictory={isVictory}
          stats={lastStats}
          onPlayAgain={() => handleStartBattle(selectedWeaponId)}
          onBackToMenu={handleBackToMenu}
          onOpenUnityCode={() => setShowUnityCode(true)}
        />
      )}

      {/* 5. Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          showMobileControls={showMobileControls}
          setShowMobileControls={setShowMobileControls}
        />
      )}

      {/* 6. Unity C# Codebase Explorer */}
      {showUnityCode && <UnityCodeViewer onClose={() => setShowUnityCode(false)} />}
    </div>
  );
}
