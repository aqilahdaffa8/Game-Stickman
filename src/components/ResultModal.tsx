import React from 'react';
import { GameStats } from '../types/game';
import { Trophy, Skull, Clock, Target, RotateCcw, Home, Code2 } from 'lucide-react';

interface ResultModalProps {
  isVictory: boolean;
  stats: GameStats;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
  onOpenUnityCode: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  isVictory,
  stats,
  onPlayAgain,
  onBackToMenu,
  onOpenUnityCode,
}) => {
  const accuracy =
    stats.shotsFired > 0 ? Math.min(100, Math.round((stats.shotsHit / stats.shotsFired) * 100)) : 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Glow Header */}
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-xl ${
            isVictory
              ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-amber-500/30 animate-pulse'
              : 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-600/30'
          }`}
        >
          {isVictory ? <Trophy className="w-10 h-10" /> : <Skull className="w-10 h-10" />}
        </div>

        <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-1">
          {isVictory ? 'VICTORY ACHIEVED!' : 'DEFEAT'}
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-medium">
          {isVictory
            ? 'All 5 combat waves cleared! You are the supreme stickman champion.'
            : 'You fell in battle. Dust off your weapons and fight again!'}
        </p>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">FINAL SCORE</span>
            <span className="text-xl font-black text-amber-400">{stats.score}</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">TOTAL KILLS</span>
            <span className="text-xl font-black text-rose-400">{stats.kills}</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">WAVE REACHED</span>
            <span className="text-xl font-black text-cyan-400">WAVE {stats.wave}</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">SURVIVAL TIME</span>
            <span className="text-xl font-mono font-black text-slate-200">{formatTime(stats.timer)}</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">DAMAGE DEALT</span>
            <span className="text-xl font-black text-emerald-400">{Math.round(stats.damageDealt)}</span>
          </div>

          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">ACCURACY</span>
            <span className="text-xl font-black text-sky-300">{accuracy}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            id="result-btn-play-again"
            onClick={onPlayAgain}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-sm uppercase rounded-xl shadow-lg shadow-cyan-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            PLAY AGAIN
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              id="result-btn-menu"
              onClick={onBackToMenu}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              MAIN MENU
            </button>

            <button
              id="result-btn-unity"
              onClick={onOpenUnityCode}
              className="py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-xl border border-cyan-500/40 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Code2 className="w-4 h-4" />
              UNITY C#
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
