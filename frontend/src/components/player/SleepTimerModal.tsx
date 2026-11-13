import React, { useState, useEffect } from 'react';
import { Moon, X, Clock, Check, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '../../stores/usePlayerStore';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const { sleepTimerMinutes, sleepTimerEndsAt, setSleepTimer, clearSleepTimer } = usePlayerStore();
  const [customMins, setCustomMins] = useState<string>('');
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  // Live countdown ticker
  useEffect(() => {
    if (!sleepTimerEndsAt) {
      setTimeLeftStr('');
      return;
    }

    const updateTicker = () => {
      const remainingSecs = Math.max(0, Math.floor((sleepTimerEndsAt - Date.now()) / 1000));
      if (remainingSecs <= 0) {
        setTimeLeftStr('Stopping playback now...');
        return;
      }
      const m = Math.floor(remainingSecs / 60);
      const s = remainingSecs % 60;
      setTimeLeftStr(`${m}:${s.toString().padStart(2, '0')} remaining`);
    };

    updateTicker();
    const interval = setInterval(updateTicker, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);

  if (!isOpen) return null;

  const presets = [
    { label: '5 minutes', value: 5 },
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '45 minutes', value: 45 },
    { label: '1 hour', value: 60 },
    { label: 'End of current track', value: -1 }
  ];

  const handleSelect = (mins: number) => {
    setSleepTimer(mins);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(customMins, 10);
    if (!isNaN(num) && num > 0) {
      setSleepTimer(num);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in select-none">
      <div className="relative w-full max-w-sm rounded-3xl bg-aurora-card border border-white/10 shadow-2xl p-6 text-white space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sleep Timer</h3>
              <p className="text-[11px] text-slate-400">Fade out & pause automatically</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Countdown Banner */}
        {sleepTimerMinutes !== null && (
          <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-semibold text-indigo-300">
                {sleepTimerMinutes === -1 ? 'Stops at end of track' : timeLeftStr}
              </span>
            </div>
            <button
              onClick={() => {
                clearSleepTimer();
                onClose();
              }}
              className="text-[11px] font-bold text-rose-400 hover:text-rose-300 underline"
            >
              Turn Off
            </button>
          </div>
        )}

        {/* Preset Options */}
        <div className="space-y-1.5">
          {presets.map((preset) => {
            const isSelected = sleepTimerMinutes === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => handleSelect(preset.value)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && <Check className="w-4 h-4 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Custom Input */}
        <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-white/10 flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="360"
            placeholder="Custom minutes..."
            value={customMins}
            onChange={(e) => setCustomMins(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl bg-aurora-surface border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
          >
            Set
          </button>
        </form>
      </div>
    </div>
  );
};
