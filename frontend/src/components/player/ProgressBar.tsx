import React from 'react';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface ProgressBarProps {
  className?: string;
  showTime?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ className = '', showTime = true }) => {
  const { currentTime, duration, seekTo } = usePlayerStore();

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  return (
    <div className={`flex items-center gap-2 w-full ${className}`}>
      {showTime && (
        <span className="text-[11px] font-mono text-slate-400 w-9 text-right select-none">
          {formatTime(currentTime)}
        </span>
      )}

      <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
        {/* Track background */}
        <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
          <div
            className="h-full bg-gradient-to-r from-aurora-accent to-emerald-400 group-hover:from-emerald-400 group-hover:to-teal-300 transition-all rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Real hidden range input overlay */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.5}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Seek track position"
        />

        {/* Thumb indicator on hover */}
        <div
          className="absolute w-3 h-3 bg-white rounded-full shadow-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity -ml-1.5"
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {showTime && (
        <span className="text-[11px] font-mono text-slate-400 w-9 select-none">
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
};
