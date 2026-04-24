import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Share2, Download, QrCode, Link2, RefreshCw } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'qr' | 'link'>('qr');
  const [downloading, setDownloading] = useState(false);

  const fetchToken = async () => {
    const endpoint = type === 'group' ? `/groups/${targetId}/invite` : `/friends/invite`;
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isOpen && targetId) fetchToken();
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

  /** Download the server-rendered PNG (high-quality, 400px) */
  const handleDownloadPng = async () => {
    if (type !== 'group') return;
    setDownloading(true);
    try {
      const res = await apiClient.get(`/groups/${targetId}/invite-qr`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/\s+/g, '_')}_invite_qr.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: export from canvas
      const canvas = document.querySelector<HTMLCanvasElement>('#invite-qr-canvas');
      if (canvas) {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `${title.replace(/\s+/g, '_')}_invite_qr.png`;
        a.click();
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-[#0c0c0e] border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative overflow-hidden group">
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] group-hover:scale-125 transition-transform duration-1000 pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-violet-500/10 rounded-full blur-[60px] pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center relative z-10">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4">
            <Share2 className="w-6 h-6 text-indigo-400" />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">Invite to {title}</h3>
          <p className="text-zinc-500 text-[13px] mb-6">Share the QR or copy the link to add members instantly.</p>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/5 mb-6 w-full">
            {[
              { key: 'qr', icon: QrCode, label: 'QR Code' },
              { key: 'link', icon: Link2, label: 'Link' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'qr' | 'link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* QR Tab */}
              {activeTab === 'qr' && (
                <div className="flex flex-col items-center gap-4 w-full">
                  {/* QR frame */}
                  <div className="relative">
                    <div className="p-4 bg-white rounded-2xl shadow-[0_0_60px_rgba(99,102,241,0.15)] border-4 border-indigo-500/10">
                      <QRCodeCanvas
                        id="invite-qr-canvas"
                        value={inviteLink}
                        size={168}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: '/logo.png',
                          x: undefined,
                          y: undefined,
                          height: 28,
                          width: 28,
                          excavate: true,
                        }}
                      />
                    </div>
                    {/* Corner accents */}
                    <div className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-2 border-l-2 border-indigo-400 rounded-tl-md" />
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-2 border-r-2 border-indigo-400 rounded-tr-md" />
                    <div className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-2 border-l-2 border-indigo-400 rounded-bl-md" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-2 border-r-2 border-indigo-400 rounded-br-md" />
                  </div>

                  <p className="text-[11px] text-zinc-600 font-medium">Scan to join · Camera app or QR scanner</p>

                  {/* Actions */}
                  <div className="flex gap-2 w-full">
                    {type === 'group' && (
                      <button
                        onClick={handleDownloadPng}
                        disabled={downloading}
                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[12px] font-bold text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {downloading
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                        Save PNG
                      </button>
                    )}
                    <button
                      onClick={handleShare}
                      className="flex-1 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-[12px] font-bold text-indigo-300 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>
                  </div>
                </div>
              )}

              {/* Link Tab */}
              {activeTab === 'link' && (
                <div className="w-full space-y-3">
                  <div className="relative">
                    <input
                      readOnly
                      type="text"
                      value={inviteLink}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-[12px] text-indigo-300 font-medium focus:outline-none truncate"
                    />
                    <button
                      onClick={handleCopy}
                      className="absolute right-2 top-1.5 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {copied && (
                    <p className="text-[11px] text-emerald-400 font-medium animate-in fade-in duration-200">
                      ✓ Link copied to clipboard
                    </p>
                  )}

                  <button
                    onClick={handleShare}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-4 h-4" /> Share via App
                  </button>

                  <button
                    onClick={fetchToken}
                    className="w-full py-2.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-400 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate invite link
                  </button>
                </div>
              )}

              <p className="mt-6 text-[11px] text-zinc-600 font-medium uppercase tracking-widest">
                Invite tokens expire in 24 hours
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
