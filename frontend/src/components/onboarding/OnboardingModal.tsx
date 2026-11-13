import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Music2, 
  Globe2, 
  Compass, 
  User, 
  Search, 
  Plus, 
  X 
} from 'lucide-react';
import { usePreferencesStore } from '../../stores/usePreferencesStore';

const POPULAR_LANGUAGES = [
  { id: 'English', label: 'English', sub: 'Global Pop, Hip-Hop & Hits', icon: '🌐' },
  { id: 'Hindi', label: 'Hindi', sub: 'Bollywood, Indie & Ghazals', icon: '🇮🇳' },
  { id: 'Tamil', label: 'Tamil', sub: 'Kollywood, Melodies & Beats', icon: '🌴' },
  { id: 'Telugu', label: 'Telugu', sub: 'Tollywood, Mass & Soul', icon: '🦚' },
  { id: 'Punjabi', label: 'Punjabi', sub: 'Bhangra, Pop & Rap', icon: '🌾' },
  { id: 'Spanish', label: 'Spanish', sub: 'Latin, Reggaeton & Urban', icon: '💃' },
  { id: 'Korean', label: 'Korean', sub: 'K-Pop, K-Drama OST & R&B', icon: '🌸' },
  { id: 'Japanese', label: 'Japanese', sub: 'J-Pop, Anime OST & City Pop', icon: '🗾' },
  { id: 'Malayalam', label: 'Malayalam', sub: 'Mollywood, Indie & Folk', icon: '☕' },
  { id: 'Kannada', label: 'Kannada', sub: 'Chandanavana & Melodies', icon: '🌊' },
  { id: 'French', label: 'French', sub: 'French Pop, Chanson & Afrobeat', icon: '🥐' },
  { id: 'Arabic', label: 'Arabic', sub: 'Arab Pop & Khaleeji Beats', icon: '🌙' },
];

const POPULAR_GENRES = [
  { id: 'Pop', label: 'Pop & Chart', gradient: 'from-pink-600 via-rose-600 to-red-600', icon: '✨' },
  { id: 'Hip-Hop / Rap', label: 'Hip-Hop & Rap', gradient: 'from-amber-600 via-orange-600 to-red-700', icon: '🎤' },
  { id: 'Rock', label: 'Rock & Alternative', gradient: 'from-red-600 via-rose-700 to-purple-800', icon: '🎸' },
  { id: 'Electronic / EDM', label: 'Electronic & EDM', gradient: 'from-cyan-600 via-blue-600 to-indigo-700', icon: '⚡' },
  { id: 'Lo-Fi / Chill', label: 'Lo-Fi & Chill', gradient: 'from-emerald-600 via-teal-700 to-cyan-800', icon: '☕' },
  { id: 'R&B / Soul', label: 'R&B & Soul', gradient: 'from-purple-600 via-indigo-700 to-blue-800', icon: '💜' },
  { id: 'Bollywood', label: 'Bollywood & Hindi Pop', gradient: 'from-yellow-600 via-orange-600 to-amber-700', icon: '🎬' },
  { id: 'South Indian', label: 'South Indian Beats', gradient: 'from-teal-600 via-emerald-600 to-green-700', icon: '🥁' },
  { id: 'Acoustic / Indie', label: 'Acoustic & Indie Folk', gradient: 'from-lime-600 via-emerald-700 to-teal-800', icon: '🌿' },
  { id: 'Classical', label: 'Classical & Piano', gradient: 'from-blue-700 via-indigo-800 to-slate-900', icon: '🎹' },
  { id: 'Metal', label: 'Metal & Heavy Rock', gradient: 'from-zinc-700 via-stone-800 to-neutral-900', icon: '🔥' },
  { id: 'Jazz & Blues', label: 'Jazz & Blues Groove', gradient: 'from-amber-700 via-yellow-700 to-orange-800', icon: '🎷' },
];

const CURATED_ARTISTS = [
  { name: 'Arijit Singh', genre: 'Bollywood / Romantic', color: 'from-emerald-500 to-teal-700' },
  { name: 'The Weeknd', genre: 'R&B / Synthwave', color: 'from-rose-600 to-purple-900' },
  { name: 'Taylor Swift', genre: 'Pop / Country', color: 'from-pink-500 to-rose-700' },
  { name: 'Anirudh Ravichander', genre: 'Kollywood / Mass Beats', color: 'from-cyan-500 to-blue-700' },
  { name: 'Drake', genre: 'Hip-Hop / Rap', color: 'from-amber-600 to-orange-800' },
  { name: 'Sid Sriram', genre: 'Melody / Carnatic Fusion', color: 'from-teal-500 to-emerald-700' },
  { name: 'Billie Eilish', genre: 'Alt-Pop / Dark Pop', color: 'from-green-500 to-emerald-800' },
  { name: 'AR Rahman', genre: 'Global / Indian Classical', color: 'from-indigo-600 to-blue-900' },
  { name: 'BTS', genre: 'K-Pop / Dance', color: 'from-purple-500 to-pink-600' },
  { name: 'Kendrick Lamar', genre: 'Hip-Hop / Conscious', color: 'from-stone-600 to-zinc-900' },
  { name: 'Diljit Dosanjh', genre: 'Punjabi Pop & Folk', color: 'from-yellow-500 to-amber-700' },
  { name: 'Ed Sheeran', genre: 'Acoustic Pop', color: 'from-orange-500 to-red-700' },
  { name: 'Dua Lipa', genre: 'Disco Pop / Dance', color: 'from-fuchsia-500 to-pink-700' },
  { name: 'Bruno Mars', genre: 'Funk / Soul Pop', color: 'from-amber-500 to-rose-600' },
  { name: 'Post Malone', genre: 'Hip-Hop / Alt Rock', color: 'from-blue-600 to-slate-800' },
  { name: 'Justin Bieber', genre: 'Pop / R&B', color: 'from-violet-500 to-indigo-700' },
  { name: 'Eminem', genre: 'Hip-Hop / Rap Legend', color: 'from-zinc-700 to-stone-900' },
  { name: 'Shreya Ghoshal', genre: 'Melody & Classical', color: 'from-pink-400 to-rose-600' },
  { name: 'Yuvan Shankar Raja', genre: 'Kollywood / Lo-Fi Vibes', color: 'from-sky-500 to-blue-800' },
  { name: 'Travis Scott', genre: 'Trap & Psychedelic Rap', color: 'from-orange-700 to-zinc-900' },
];

const REGIONS = [
  { id: 'India', label: 'India', flag: '🇮🇳', desc: 'Bollywood, Kollywood & Indian Indie Top 50' },
  { id: 'United States', label: 'United States', flag: '🇺🇸', desc: 'Billboard Hot 100 & American Hip-Hop / Pop' },
  { id: 'United Kingdom', label: 'United Kingdom', flag: '🇬🇧', desc: 'UK Official Top 40, Drill & Indie' },
  { id: 'Canada', label: 'Canada', flag: '🇨🇦', desc: 'Canadian Top Hits & North American Waves' },
  { id: 'Global', label: 'Global / Worldwide', flag: '🌐', desc: 'Most Streamed Hits Worldwide across all charts' },
  { id: 'Europe', label: 'Europe', flag: '🇪🇺', desc: 'Euro Top Hits, Dance, House & Electronic' },
  { id: 'Latin America', label: 'Latin America', flag: '🇲🇽', desc: 'Reggaeton, Bachata & Latin Pop Chart-Toppers' },
  { id: 'East Asia', label: 'East Asia', flag: '🇯🇵', desc: 'K-Pop, J-Pop, Mandopop & Anime Hits' },
  { id: 'Australia', label: 'Australia & NZ', flag: '🇦🇺', desc: 'ARIA Charts, Aussie Indie & Electronic' },
  { id: 'Middle East', label: 'Middle East', flag: '🇦🇪', desc: 'Arabian Top Hits & Khaleeji Chartbusters' },
];

interface OnboardingModalProps {
  onCompleteCallback?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onCompleteCallback }) => {
  const { 
    isOnboardingOpen, 
    languages: savedLanguages, 
    genres: savedGenres, 
    artists: savedArtists, 
    region: savedRegion,
    completeOnboarding, 
    closeOnboarding 
  } = usePreferencesStore();

  const [step, setStep] = useState<number>(1);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    savedLanguages.length > 0 ? savedLanguages : ['English']
  );
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    savedGenres.length > 0 ? savedGenres : ['Pop', 'Hip-Hop / Rap']
  );
  const [selectedArtists, setSelectedArtists] = useState<string[]>(
    savedArtists.length > 0 ? savedArtists : []
  );
  const [selectedRegion, setSelectedRegion] = useState<string>(
    savedRegion || 'Global'
  );
  const [artistSearch, setArtistSearch] = useState<string>('');

  if (!isOnboardingOpen) return null;

  const toggleLanguage = (langId: string) => {
    if (selectedLanguages.includes(langId)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter(l => l !== langId));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, langId]);
    }
  };

  const toggleGenre = (genreId: string) => {
    if (selectedGenres.includes(genreId)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter(g => g !== genreId));
      }
    } else {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  };

  const toggleArtist = (artistName: string) => {
    if (selectedArtists.includes(artistName)) {
      setSelectedArtists(selectedArtists.filter(a => a !== artistName));
    } else {
      setSelectedArtists([...selectedArtists, artistName]);
    }
  };

  const addCustomArtist = () => {
    const trimmed = artistSearch.trim();
    if (trimmed && !selectedArtists.includes(trimmed)) {
      setSelectedArtists([...selectedArtists, trimmed]);
      setArtistSearch('');
    }
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Finalize onboarding
      completeOnboarding({
        languages: selectedLanguages,
        genres: selectedGenres,
        artists: selectedArtists,
        region: selectedRegion,
      });
      if (onCompleteCallback) onCompleteCallback();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = () => {
    completeOnboarding();
    if (onCompleteCallback) onCompleteCallback();
  };

  const filteredArtists = CURATED_ARTISTS.filter(a => 
    a.name.toLowerCase().includes(artistSearch.toLowerCase()) ||
    a.genre.toLowerCase().includes(artistSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-white/10 shadow-2xl text-white overflow-hidden">
        
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500" />

        {/* Top Progress & Header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                  Step {step} of 4 • Personalize Resonix
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {step === 1 && 'What languages do you listen to?'}
                  {step === 2 && 'What genres get you moving?'}
                  {step === 3 && 'Pick your favorite artists'}
                  {step === 4 && 'Where are you listening from?'}
                </h2>
              </div>
            </div>

            <button
              onClick={handleSkip}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors"
            >
              Skip
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* STEP 1: LANGUAGES */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-300">
                Select one or more languages. We'll curate trending songs, new drops, and regional karaoke lyrics in these languages.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {POPULAR_LANGUAGES.map((lang) => {
                  const isSelected = selectedLanguages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      onClick={() => toggleLanguage(lang.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-sm shadow-emerald-500/20 scale-[1.01]' 
                          : 'bg-white/5 border-white/5 hover:border-white/15 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{lang.label}</p>
                          <p className="text-[11px] text-slate-400">{lang.sub}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: GENRES */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-slate-300">
                  Pick the musical styles and sonic atmospheres you love.
                </p>
                <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {selectedGenres.length} selected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {POPULAR_GENRES.map((genre) => {
                  const isSelected = selectedGenres.includes(genre.id);
                  return (
                    <button
                      key={genre.id}
                      onClick={() => toggleGenre(genre.id)}
                      className={`relative overflow-hidden p-4 rounded-2xl text-left border transition-all flex flex-col justify-between min-h-[90px] ${
                        isSelected 
                          ? 'border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg scale-[1.02]' 
                          : 'border-white/5 hover:border-white/20 hover:scale-[1.01]'
                      } bg-gradient-to-br ${genre.gradient}`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xl">{genre.icon}</span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          isSelected ? 'bg-white text-black border-white' : 'border-white/30 bg-black/20'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>

                      <span className="text-xs sm:text-sm font-bold text-white tracking-tight drop-shadow-md mt-3">
                        {genre.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: ARTISTS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-slate-300">
                  Select your go-to artists or type any artist name below.
                </p>
                <span className="text-xs font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  {selectedArtists.length} selected
                </span>
              </div>

              {/* Artist Search / Write-In Input */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={artistSearch}
                    onChange={(e) => setArtistSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomArtist();
                      }
                    }}
                    placeholder="Search or type any artist (e.g. A.R. Rahman, Anirudh, Drake)..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {artistSearch.trim() && (
                  <button
                    onClick={addCustomArtist}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>

              {/* Selected Artists Chips */}
              {selectedArtists.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedArtists.map((artist) => (
                    <span 
                      key={artist}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                    >
                      <span>{artist}</span>
                      <button 
                        onClick={() => toggleArtist(artist)}
                        className="p-0.5 rounded-full hover:bg-emerald-500/30 text-emerald-300 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Curated Artist Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {filteredArtists.map((artist) => {
                  const isSelected = selectedArtists.includes(artist.name);
                  return (
                    <button
                      key={artist.name}
                      onClick={() => toggleArtist(artist.name)}
                      className={`flex flex-col items-center text-center p-3 rounded-2xl border transition-all ${
                        isSelected 
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.02]' 
                          : 'bg-white/5 border-white/5 hover:border-white/15 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="relative mb-2">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${artist.color} flex items-center justify-center font-bold text-white text-sm shadow-md`}>
                          {artist.name.slice(0, 2).toUpperCase()}
                        </div>
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <span className="text-xs font-bold text-white truncate max-w-full">
                        {artist.name}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate max-w-full mt-0.5">
                        {artist.genre}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: REGION */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-300">
                Choose your region to prioritize local chartbusters, top trending songs, and cultural hits.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {REGIONS.map((reg) => {
                  const isSelected = selectedRegion === reg.id;
                  return (
                    <button
                      key={reg.id}
                      onClick={() => setSelectedRegion(reg.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                        isSelected 
                          ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-[1.01]' 
                          : 'bg-white/5 border-white/5 hover:border-white/15 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{reg.flag}</span>
                        <div>
                          <p className="text-sm font-semibold text-white">{reg.label}</p>
                          <p className="text-[11px] text-slate-400">{reg.desc}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                        isSelected ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-white/20'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-white/5 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <span className="text-xs text-slate-500 font-mono">
                Resonix Personalization
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 active:scale-95"
            >
              <span>{step === 4 ? 'Finish & Personalize Feed' : 'Continue'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
