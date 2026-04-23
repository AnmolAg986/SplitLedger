import React from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name?: string;
}

interface LinkPreviewProps {
  preview: LinkPreviewData;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ preview }) => {
  if (!preview || !preview.url) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 bg-black/20 hover:bg-black/30 border border-white/10 rounded-xl overflow-hidden transition-colors w-full max-w-[300px] text-left group"
    >
      {preview.image_url && (
        <div className="w-full h-32 overflow-hidden bg-zinc-900 border-b border-white/5 relative">
          <img
            src={preview.image_url}
            alt={preview.title || 'Link preview'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-1 mb-1 text-xs text-zinc-400">
          <ExternalLink className="w-3 h-3" />
          <span className="truncate">{preview.site_name || new URL(preview.url).hostname}</span>
        </div>
        <h4 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-2">
          {preview.title || preview.url}
        </h4>
        {preview.description && (
          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
            {preview.description}
          </p>
        )}
      </div>
    </a>
  );
};
