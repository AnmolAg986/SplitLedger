import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessageProps {
  url: string;
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({ url }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Generate a random stable "waveform" for this message based on the url length/hash
  // We'll just use 30 bars
  const bars = Array.from({ length: 30 }).map((_, i) => {
    // deterministic pseudo-random height between 20% and 100%
    const height = 20 + ((url.length * (i + 1)) % 80);
    return height;
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-3 bg-black/20 p-2 rounded-xl mt-1 w-64 border border-white/10">
      <audio ref={audioRef} src={url} preload="metadata" />
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 shrink-0 bg-rose-500 rounded-full flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-lg"
      >
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
      </button>

      <div className="flex-1 flex items-center gap-0.5 h-8 relative cursor-pointer" onClick={(e) => {
        if (!audioRef.current || !audioRef.current.duration) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioRef.current.currentTime = percent * audioRef.current.duration;
        setProgress(percent * 100);
      }}>
        {bars.map((height, i) => {
          const isPassed = (i / bars.length) * 100 <= progress;
          return (
            <div 
              key={i} 
              className={`flex-1 rounded-full transition-all duration-75 ${isPassed ? 'bg-rose-400' : 'bg-white/20'}`}
              style={{ height: `${height}%` }}
            />
          );
        })}
      </div>
    </div>
  );
};
