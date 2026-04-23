import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone', err);
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 w-full bg-white/5 border border-rose-500/30 rounded-full px-4 py-2">
      {!isRecording && !audioBlob ? (
        <button type="button" onClick={startRecording} className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors w-full">
          <Mic className="w-5 h-5 animate-pulse" />
          <span className="text-sm font-medium">Click to start recording</span>
        </button>
      ) : isRecording ? (
        <>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-sm font-medium text-rose-400">{formatTime(duration)} / 1:00</span>
          </div>
          <button type="button" onClick={stopRecording} className="p-1.5 bg-rose-500/20 text-rose-400 rounded-full hover:bg-rose-500/30 transition-colors">
            <Square className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-white">Voice Note ({formatTime(duration)})</span>
            <audio src={URL.createObjectURL(audioBlob!)} controls className="h-6 w-32" />
          </div>
          <button type="button" onClick={onCancel} className="p-1.5 text-zinc-400 hover:text-white transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={handleSend} className="p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors">
            <Send className="w-4 h-4 ml-[2px]" />
          </button>
        </>
      )}
    </div>
  );
};
