import React, { useState } from 'react';
import { UNITY_PROJECT_FILES, UnityFile } from '../unity/unityScripts';
import JSZip from 'jszip';
import { Download, Copy, Check, X, FileCode, Folder, BookOpen, Layers, Shield } from 'lucide-react';

interface UnityCodeViewerProps {
  onClose: () => void;
}

export const UnityCodeViewer: React.FC<UnityCodeViewerProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<UnityFile>(UNITY_PROJECT_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add each file to its corresponding relative path
      UNITY_PROJECT_FILES.forEach((file) => {
        zip.file(file.path, file.code);
      });

      // Generate package zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'StickmanBattle2D_Unity_Source.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate zip', err);
    } finally {
      setIsZipping(false);
    }
  };

  const categories = Array.from(new Set(UNITY_PROJECT_FILES.map((f) => f.category)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-md select-none text-slate-100">
      <div className="relative w-full max-w-6xl h-[90vh] bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">UNITY + C# ARCHITECTURE EXPORT</h2>
              <p className="text-xs text-slate-400">
                Modular 2D Physics Combat Scripts ready to drop into your Unity Project
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="download-unity-zip-btn"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? 'PACKING ZIP...' : 'DOWNLOAD UNITY PACKAGE (.ZIP)'}</span>
            </button>

            <button
              id="close-unity-viewer-btn"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar File Explorer */}
          <div className="w-full md:w-72 border-r border-slate-800 bg-slate-950/40 p-4 overflow-y-auto flex flex-col gap-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              <span>ASSETS / SCRIPTS</span>
            </div>

            {categories.map((category) => (
              <div key={category} className="flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 px-2 py-1 bg-slate-800/40 rounded-lg">
                  {category}
                </span>
                {UNITY_PROJECT_FILES.filter((f) => f.category === category).map((file) => {
                  const isSelected = file.path === selectedFile.path;
                  return (
                    <button
                      key={file.path}
                      onClick={() => setSelectedFile(file)}
                      className={`px-3 py-2 rounded-xl text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/80 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{file.name}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* File Path & Description Bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/60">
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold text-cyan-400">{selectedFile.path}</span>
                <span className="text-[11px] text-slate-400">{selectedFile.description}</span>
              </div>

              <button
                id="copy-code-btn"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
              </button>
            </div>

            {/* Code Body */}
            <div className="flex-1 p-6 overflow-auto font-mono text-xs text-slate-300 leading-relaxed">
              <pre className="whitespace-pre">{selectedFile.code}</pre>
            </div>
          </div>
        </div>

        {/* Footer Inspector Help */}
        <div className="px-6 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Import these scripts directly into your Unity Assets folder. Compatible with Unity 2022.3 LTS & Unity 6.</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">{UNITY_PROJECT_FILES.length} Files Total</span>
        </div>
      </div>
    </div>
  );
};
