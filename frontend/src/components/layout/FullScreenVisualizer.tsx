import React, { useEffect, useRef } from 'react';
import { X, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';
import { getAudioAnalyser } from '../../hooks/useAudioEngine';

export const FullScreenVisualizer: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    isVisualizerOpen,
    setVisualizerOpen,
    togglePlay,
    nextTrack,
    previousTrack
  } = usePlayerStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisualizerOpen || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const analyser = getAudioAnalyser();
    const bufferLength = analyser ? analyser.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    let phase = 0;

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      // Dark background with slight motion trail
      ctx.fillStyle = 'rgba(10, 10, 15, 0.25)';
      ctx.fillRect(0, 0, width, height);

      if (analyser && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
      } else if (isPlaying) {
        // Fallback simulation when Web Audio analyser CORS is active
        phase += 0.04;
        for (let i = 0; i < bufferLength; i++) {
          const val = Math.sin(phase + i * 0.2) * 50 + Math.cos(phase * 0.7 + i * 0.1) * 30 + 100;
          dataArray[i] = Math.max(10, Math.min(255, val));
        }
      } else {
        // Idle flat bars
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = 10;
        }
      }

      // Draw mirrored circular / linear spectrum
      const barCount = 48;
      const barWidth = (width / barCount) * 0.7;
      const spacing = (width / barCount) * 0.3;

      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * bufferLength);
        const magnitude = dataArray[dataIdx] / 255.0;
        const barHeight = Math.max(4, magnitude * (height * 0.45));

        const x = i * (barWidth + spacing) + spacing / 2;
        const y = height / 2 - barHeight / 2;

        // Gradient coloring
        const grad = ctx.createLinearGradient(x, y, x, y + barHeight);
        grad.addColorStop(0, '#10b981');   // Emerald
        grad.addColorStop(0.5, '#06b6d4'); // Cyan
        grad.addColorStop(1, '#8b5cf6');   // Purple

        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(16, 185, 129, 0.5)';
        ctx.shadowBlur = 12;

        // Rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 6);
        ctx.fill();
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isVisualizerOpen, isPlaying]);

  if (!isVisualizerOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col justify-between overflow-hidden select-none">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-aurora-accent animate-ping" />
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-semibold">
            Spectrum Visualizer • {currentTrack.provider.toUpperCase()}
          </span>
        </div>

        <button
          onClick={() => setVisualizerOpen(false)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          aria-label="Close visualizer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Center Track Showcase */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 my-auto pointer-events-none">
        <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20 mb-6 bg-slate-900 group">
          <img
            src={currentTrack.artwork_url || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md">
          {currentTrack.title}
        </h1>
        <p className="text-base md:text-xl text-slate-300 font-medium mt-2 drop-shadow">
          {currentTrack.artist}
        </p>
      </div>

      {/* Bottom Floating Control Bar */}
      <div className="relative z-10 flex items-center justify-center gap-6 pb-12">
        <button
          onClick={previousTrack}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
        >
          <SkipBack className="w-6 h-6 fill-current" />
        </button>

        <button
          onClick={togglePlay}
          className="w-16 h-16 rounded-full bg-aurora-accent text-black flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 fill-current" />
          ) : (
            <Play className="w-8 h-8 fill-current ml-1" />
          )}
        </button>

        <button
          onClick={nextTrack}
          className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
        >
          <SkipForward className="w-6 h-6 fill-current" />
        </button>
      </div>
    </div>
  );
};
