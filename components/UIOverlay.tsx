import React, { useRef } from 'react';
import { useAppStore } from '../store';
import { AppState } from '../types';

const UIOverlay: React.FC = () => {
  const { appState, photos, addPhoto, clearPhotos } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      addPhoto(url);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center p-8 z-10 font-sans">
      
      {/* Centered Festive Header */}
      <div className="mt-4 text-center">
        <h1 className="text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 font-festive drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
           Happy Christmas
        </h1>
      </div>

      {/* Bottom Controls Container */}
      <div className="flex flex-col items-center w-full max-w-4xl space-y-4 mb-4">
        
        {/* Instructions Overlay (Moved to Bottom) */}
        <div className="flex flex-col items-center justify-center space-y-2 opacity-90 transition-all duration-500 mb-2">
             {appState === AppState.FORMED && (
                 <div className="text-white bg-black/60 px-6 py-2 rounded-full backdrop-blur-sm border border-yellow-500/20 text-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    ✋ <strong>张开手掌</strong> 炸开圣诞树
                 </div>
             )}
             {appState === AppState.CHAOS && (
                 <div className="text-white bg-black/60 px-6 py-2 rounded-full backdrop-blur-sm border border-yellow-500/20 text-sm shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    ✊ <strong>握拳</strong> 聚合 &nbsp; | &nbsp; 🤏 <strong>捏合</strong> 抓取照片
                 </div>
             )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center gap-4 pointer-events-auto bg-black/60 p-4 rounded-xl border border-emerald-900/50">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-yellow-600 to-yellow-400 hover:from-yellow-500 hover:to-yellow-300 text-black font-bold py-2 px-6 rounded shadow-[0_0_15px_rgba(255,215,0,0.4)] transition-all text-sm"
            >
                添加美好回忆 +
            </button>
            
            {photos.length > 0 && (
                <button 
                    onClick={clearPhotos}
                    className="bg-red-900/50 hover:bg-red-800 text-red-200 border border-red-800 py-2 px-4 rounded transition-all text-sm"
                >
                    清除照片 ({photos.length})
                </button>
            )}

            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
        
        <div className="text-emerald-800/60 text-xs">
            by DLD
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;