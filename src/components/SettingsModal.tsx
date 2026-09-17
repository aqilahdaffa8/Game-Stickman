import React, { useState } from 'react';
import { soundManager } from '../audio/soundManager';
import { Volume2, VolumeX, Smartphone, Vibrate, X } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
  showMobileControls: boolean;
  setShowMobileControls: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  showMobileControls,
  setShowMobileControls,
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(soundManager.getMuted());
  const [sfxVol, setSfxVol] = useState<number>(0.8);
  const [bgmVol, setBgmVol] = useState<number>(0.4);
  const [screenShake, setScreenShake] = useState<boolean>(true);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setSfxVol(v);
    soundManager.setSfxVolume(v);
  };

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setBgmVol(v);
    soundManager.setBgmVolume(v);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl flex flex-col text-white">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <h3 className="text-lg font-black tracking-wide text-white">GAME SETTINGS</h3>
          <button
            id="settings-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {/* Mute Master */}
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
              <div className="flex flex-col">
                <span className="text-sm font-bold">Audio Mute</span>
                <span className="text-[11px] text-slate-400">Turn off all SFX and music</span>
              </div>
            </div>
            <button
              id="settings-mute-toggle"
              onClick={handleToggleMute}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              {isMuted ? 'MUTED' : 'ACTIVE'}
            </button>
          </div>

          {/* SFX Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Sound Effects Volume</span>
              <span className="text-cyan-400 font-mono">{Math.round(sfxVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={sfxVol}
              disabled={isMuted}
              onChange={handleSfxChange}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* BGM Volume */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Synth Battle BGM Volume</span>
              <span className="text-cyan-400 font-mono">{Math.round(bgmVol * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={bgmVol}
              disabled={isMuted}
              onChange={handleBgmChange}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Screen Shake */}
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <Vibrate className="w-5 h-5 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Dynamic Camera Shake</span>
                <span className="text-[11px] text-slate-400">Impact recoil and explosions</span>
              </div>
            </div>
            <button
              id="settings-shake-toggle"
              onClick={() => setScreenShake(!screenShake)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                screenShake
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {screenShake ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Mobile Touch Controls */}
          <div className="flex items-center justify-between p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-2.5">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">Touch Screen Controls</span>
                <span className="text-[11px] text-slate-400">On-screen directional buttons</span>
              </div>
            </div>
            <button
              id="settings-touch-toggle"
              onClick={() => setShowMobileControls(!showMobileControls)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                showMobileControls
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {showMobileControls ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>

        <button
          id="settings-done-btn"
          onClick={onClose}
          className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          SAVE & CLOSE
        </button>
      </div>
    </div>
  );
};
