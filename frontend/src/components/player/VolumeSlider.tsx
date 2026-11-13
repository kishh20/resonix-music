import React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';

export const VolumeSlider: React.FC = () => {
  const { volume, isMuted, setVolume, toggleMute } = usePlayerStore();

  const currentVolume = isMuted ? 0 : volume;

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const renderIcon = () => {
    if (currentVolume === 0) return <VolumeX className="w-4 h-4 text-slate-400" />;
    if (currentVolume < 0.5) return <Volume1 className="w-4 h-4 text-slate-300" />;
    return <Volume2 className="w-4 h-4 text-slate-200" />;
  };

  return (
    <div className="flex items-center gap-2 group">
      <button
        onClick={toggleMute}
        className="p-1 text-slate-400 hover:text-white transition-colors"
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {renderIcon()}
      </button>

      <div className="relative w-24 flex items-center h-4 cursor-pointer">
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden group-hover:h-1.5 transition-all">
          <div
            className="h-full bg-white group-hover:bg-aurora-accent transition-colors rounded-full"
            style={{ width: `${currentVolume * 100}%` }}
          />
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={currentVolume}
          onChange={handleVolumeChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label="Adjust volume"
        />
      </div>
    </div>
  );
};
