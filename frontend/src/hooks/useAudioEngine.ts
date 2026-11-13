import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../stores/usePlayerStore';
import { useLibraryStore } from '../stores/useLibraryStore';
import { useAuthStore } from '../stores/useAuthStore';
import { useJamStore } from '../stores/useJamStore';
import { api } from '../services/api';

// Web Audio Analyser references
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;

export function getAudioAnalyser(): AnalyserNode | null {
  return analyserNode;
}

export function useAudioEngine() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackTriedRef = useRef<boolean>(false);
  const loadedStreamUrlRef = useRef<string>('');
  const loadedTrackIdRef = useRef<string>('');

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    repeat,
    seekRequest,
    nextTrack,
    sleepTimerEndsAt,
    setCurrentTime,
    setDuration,
    setBuffering,
    setAudioError
  } = usePlayerStore();

  const { recordHistory } = useLibraryStore();
  const { user } = useAuthStore();

  // 1. Initialize Audio and Global MediaSession Action Handlers
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    // Track ended handler (with loop, sleep timer & auto-play)
    const handleEnded = async () => {
      const state = usePlayerStore.getState();

      // 1. Sleep timer: End of Track check
      if (state.sleepTimerMinutes === -1) {
        state.pause();
        state.clearSleepTimer();
        return;
      }

      // 2. Single track loop
      if (state.repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
        return;
      }

      // 3. Auto-Play recommendations if reached the end of queue
      const isQueueEnd = state.queueIndex >= state.queue.length - 1;
      if (isQueueEnd && state.autoPlay && state.currentTrack) {
        try {
          const recs = await api.getRecommendations({
            recent_track_ids: [state.currentTrack.id],
            limit: 8
          });
          const candidateTracks = recs?.personalized_tracks || [];
          if (candidateTracks.length > 0) {
            const existingIds = new Set(state.queue.map(t => t.id));
            const freshTracks = candidateTracks.filter(t => !existingIds.has(t.id));
            if (freshTracks.length > 0) {
              state.addToQueue(freshTracks);
              state.nextTrack();
              return;
            }
          }
        } catch (err) {
          console.warn('AutoPlay recommendation fetch error:', err);
        }
      }

      state.nextTrack();
    };

    // Time update listener
    const handleTimeUpdate = () => {
      if (!isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);

        const state = usePlayerStore.getState();
        const officialDuration = state.currentTrack?.duration;

        // Smart Outro Trimming / Video Promo Cutoff:
        // If the track has a known official studio duration (e.g. from Spotify, Apple Music, or catalog),
        // and the underlying YouTube stream has extra outro promo / channel BGM / silence tacked on at the end,
        // cleanly end the track right when the official song finishes!
        if (
          officialDuration &&
          officialDuration > 30 &&
          audio.duration &&
          audio.duration > officialDuration + 3
        ) {
          if (audio.currentTime >= officialDuration - 0.5) {
            handleEnded();
            return;
          }
        }

        // Update Windows taskbar / MediaSession playback position
        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
          const effectiveDuration = (officialDuration && officialDuration > 30 && audio.duration && audio.duration > officialDuration + 3)
            ? officialDuration
            : (audio.duration || 0);

          if (effectiveDuration > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: effectiveDuration,
                playbackRate: audio.playbackRate || 1.0,
                position: Math.min(audio.currentTime, effectiveDuration)
              });
            } catch {
              // Ignore boundary sync errors
            }
          }
        }
      }
    };

    // Duration change listener
    const handleDurationChange = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        const state = usePlayerStore.getState();
        const officialDuration = state.currentTrack?.duration;

        // If official duration is known and audio stream has extra outro video promo/ad seconds,
        // lock the UI duration to the official song duration so the scrubber doesn't show promo time!
        const effectiveDuration = (officialDuration && officialDuration > 30 && audio.duration > officialDuration + 3)
          ? officialDuration
          : audio.duration;

        setDuration(effectiveDuration);

        if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
          try {
            navigator.mediaSession.setPositionState({
              duration: effectiveDuration,
              playbackRate: audio.playbackRate || 1.0,
              position: Math.min(audio.currentTime, effectiveDuration)
            });
          } catch {}
        }
      }
    };

    // Buffering & Playing states
    const handleWaiting = () => setBuffering(true);
    const handlePlaying = () => {
      setBuffering(false);
      setAudioError(null);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };
    const handlePause = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    // Error handling with proxy fallback (preserves playback position to prevent restarting from 0)
    const handleError = () => {
      setBuffering(false);
      const state = usePlayerStore.getState();
      const track = state.currentTrack;

      if (!fallbackTriedRef.current && track) {
        fallbackTriedRef.current = true;
        const savedTime = audio.currentTime;
        console.warn('Direct stream interrupted, falling back to backend proxy stream at position:', savedTime);
        
        const isExternal = track.stream_url.startsWith('http://') || track.stream_url.startsWith('https://');
        const fallbackSrc = isExternal 
          ? api.getProxyStreamUrl(track.stream_url) 
          : (track.stream_url.includes('?') ? `${track.stream_url}&_r=1` : `${track.stream_url}?_r=1`);

        audio.src = fallbackSrc;
        audio.load();
        
        // Restore timestamp once metadata is loaded
        const onLoaded = () => {
          if (savedTime > 2) {
            audio.currentTime = savedTime;
          }
          audio.removeEventListener('loadedmetadata', onLoaded);
        };
        audio.addEventListener('loadedmetadata', onLoaded);

        audio.play().catch(e => {
          console.error('Proxy stream also failed:', e);
          state.setAudioError('Playback interrupted. Skipping to next track...');
          setTimeout(() => state.nextTrack(), 2000);
        });
      } else {
        state.setAudioError('Audio stream unavailable. Skipping...');
        setTimeout(() => state.nextTrack(), 2000);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    // 2. Register Windows Taskbar & System Media Transport Controls (SMTC)
    if ('mediaSession' in navigator) {
      const actions: [MediaSessionAction, MediaSessionActionHandler][] = [
        ['play', () => usePlayerStore.getState().play()],
        ['pause', () => usePlayerStore.getState().pause()],
        ['previoustrack', () => usePlayerStore.getState().previousTrack()],
        ['nexttrack', () => usePlayerStore.getState().nextTrack()],
        ['stop', () => usePlayerStore.getState().pause()],
        ['seekto', (details) => {
          if (details.seekTime !== undefined) {
            usePlayerStore.getState().seekTo(details.seekTime);
          }
        }],
        ['seekbackward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
            usePlayerStore.getState().seekTo(Math.max(0, audioRef.current.currentTime - skip));
          }
        }],
        ['seekforward', (details) => {
          const skip = details.seekOffset || 10;
          if (audioRef.current) {
            usePlayerStore.getState().seekTo(audioRef.current.currentTime + skip);
          }
        }]
      ];

      for (const [action, handler] of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, handler);
        } catch {
          // Action not supported in this browser version
        }
      }
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // 3. Connect Web Audio Analyser on first user gesture
  const connectAnalyser = () => {
    if (!audioRef.current || analyserNode) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      audioContext = new AudioCtx();
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 128;
      analyserNode.smoothingTimeConstant = 0.8;

      sourceNode = audioContext.createMediaElementSource(audioRef.current);
      sourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination);
    } catch (e) {
      console.warn('Web Audio Analyser not supported or CORS restricted:', e);
    }
  };

  // 4. Handle Track Change (Guaranteed to NOT restart if the track has not actually changed)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    // Strict guard: if track and stream URL are already loaded, do NOT reload or reset position!
    if (
      loadedTrackIdRef.current === currentTrack.id &&
      loadedStreamUrlRef.current === currentTrack.stream_url
    ) {
      return;
    }

    loadedTrackIdRef.current = currentTrack.id;
    loadedStreamUrlRef.current = currentTrack.stream_url;
    fallbackTriedRef.current = false;

    audio.src = currentTrack.stream_url;
    audio.currentTime = 0;
    setBuffering(true);
    setAudioError(null);

    // Record listening history
    recordHistory(currentTrack, user?.id);

    if (isPlaying) {
      connectAnalyser();
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audio.play().catch(err => {
        console.warn('Playback start error:', err);
      });
    }

    // Update Media Session Metadata for Windows Taskbar Thumbnail & Android lockscreen
    if ('mediaSession' in navigator) {
      const artwork = [];
      const artUrl = currentTrack.artwork_url;
      if (artUrl && artUrl.startsWith('http')) {
        artwork.push(
          { src: artUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: artUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: artUrl, sizes: '512x512', type: 'image/jpeg' }
        );
      } else {
        const iconUrl = new URL('/resonix.ico', window.location.origin).href;
        artwork.push(
          { src: iconUrl, sizes: '192x192', type: 'image/png' },
          { src: iconUrl, sizes: '512x512', type: 'image/png' }
        );
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Resonix Music',
        artwork
      });
    }

    // Dynamic Windows title
    document.title = `${currentTrack.title} • ${currentTrack.artist} | Resonix`;

    // Sync track with Jam if connected
    const jam = useJamStore.getState();
    if (jam.isConnected && !jam.isRemoteSync) {
      jam.sendPlayTrack(currentTrack);
    }
  }, [currentTrack]);

  // 5. Handle Play / Pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (isPlaying) {
      connectAnalyser();
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      audio.play().catch(console.warn);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      document.title = `▶ ${currentTrack.title} • ${currentTrack.artist}`;
    } else {
      audio.pause();
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      document.title = `${currentTrack.title} • ${currentTrack.artist} | Resonix`;
    }

    // Sync play/pause state with Jam if connected
    const jam = useJamStore.getState();
    if (jam.isConnected && !jam.isRemoteSync) {
      jam.sendPlayState(isPlaying);
    }
  }, [isPlaying]);

  // 6. Handle Volume / Mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // 7. Handle Explicit Seek Requests (Replaces circular currentTime loop)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !seekRequest) return;
    audio.currentTime = seekRequest.time;
    if (currentTrack && isPlaying) {
      api.updateDiscordPresence({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || undefined,
        artwork_url: currentTrack.artwork_url || undefined,
        duration: currentTrack.duration,
        position: seekRequest.time,
        is_playing: isPlaying
      });
    }

    // Sync seek with Jam if connected
    const jam = useJamStore.getState();
    if (jam.isConnected && !jam.isRemoteSync) {
      jam.sendSeek(seekRequest.time);
    }
  }, [seekRequest]);

  // 8. Sleep Timer Countdown & Gentle 5-Second Fadeout
  useEffect(() => {
    if (!sleepTimerEndsAt) return;

    const interval = setInterval(() => {
      const state = usePlayerStore.getState();
      if (!state.sleepTimerEndsAt) {
        clearInterval(interval);
        return;
      }

      const remainingMs = state.sleepTimerEndsAt - Date.now();
      const audio = audioRef.current;

      if (remainingMs <= 0) {
        clearInterval(interval);
        state.pause();
        state.clearSleepTimer();
        if (audio) {
          audio.volume = state.isMuted ? 0 : state.volume;
        }
      } else if (remainingMs <= 5000 && audio && !state.isMuted) {
        // Gentle 5-second fadeout before stop
        const factor = Math.max(0, remainingMs / 5000);
        audio.volume = state.volume * factor;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [sleepTimerEndsAt]);

  // 9. Discord Rich Presence Syncing
  useEffect(() => {
    if (!currentTrack) {
      api.clearDiscordPresence();
      return;
    }

    const pos = audioRef.current ? audioRef.current.currentTime : 0;
    api.updateDiscordPresence({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || undefined,
      artwork_url: currentTrack.artwork_url || undefined,
      duration: currentTrack.duration,
      position: pos,
      is_playing: isPlaying
    });

    return () => {
      // Clear presence if unmounted
    };
  }, [currentTrack?.id, isPlaying]);
}
