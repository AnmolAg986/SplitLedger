import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { apiClient } from '../api/axios';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
  type: 'group' | 'friend';
  title: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose, targetId, type, title }) => {
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && targetId) {
      const endpoint = type === 'group' ? `/groups/${targetId}/invite` : `/friends/invite`;
      const fetchToken = async () => {
        setLoading(true);
        try {
          const res = await apiClient.get(endpoint);
          setToken(res.data.invite_token);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      fetchToken();
    }
  }, [isOpen, targetId, type]);

  if (!isOpen) return null;

  const inviteLink = `${window.location.origin}/join/${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${title} on SplitLedger`,
          text: `Hey, join my ${type} on SplitLedger to track expenses together!`,
          url: inviteLink,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-[#0c0c0e] border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden group">
        {/* Animated Background Blur */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000" />
        
        <button onClick={onClose} className="absolute right-6 top-6 text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-6">
            <Share2 className="w-7 h-7 text-indigo-400" />
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">Invite to {title}</h3>
          <p className="text-zinc-500 text-sm mb-8">Share this QR code or link to add members instantly.</p>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
               <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl mb-8 shadow-[0_0_40px_rgba(255,255,255,0.05)] border-4 border-white/5">
                <QRCodeCanvas 
                  value={inviteLink} 
                  size={160}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "/logo.png", // Assuming logo exists
                    x: undefined,
                    y: undefined,
                    height: 24,
                    width: 24,
                    excavate: true,
                  }}
                />
              </div>

              {/* Link Input Area */}
              <div className="w-full space-y-4">
                <div className="relative group/input">
                  <input 
                    readOnly
                    type="text" 
                    value={inviteLink}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-[13px] text-indigo-300 font-medium focus:outline-none truncate"
                  />
                  <button 
                    onClick={handleCopy}
                    className="absolute right-2 top-1.5 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex gap-3">
                   <button 
                    onClick={handleShare}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Share via App
                  </button>
                </div>
              </div>
            </>
          )}

          <p className="mt-8 text-[11px] text-zinc-600 font-medium uppercase tracking-widest">
            Tokens expire in 24 hours
          </p>
        </div>
      </div>
    </div>
  );
};
