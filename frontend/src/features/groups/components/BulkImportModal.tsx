import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '../../../shared/api/axios';
import { toast } from '../../../shared/store/useToastStore';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, groupId, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', groupId);

    try {
      const response = await apiClient.post('/expenses/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setResult(response.data);
      if (response.data.imported > 0) {
        toast.success(`Imported ${response.data.imported} expenses successfully!`);
        onSuccess(); // Refresh the group data
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to import expenses');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121214] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/[0.02]">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" /> Bulk Import Expenses
          </h2>
          <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {result ? (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className={`p-4 rounded-xl border ${result.failed > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="flex items-center gap-3">
                  {result.failed > 0 ? (
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  )}
                  <div>
                    <h3 className="font-bold text-white text-lg">Import Complete</h3>
                    <p className="text-sm text-zinc-400">
                      <span className="text-emerald-400 font-medium">{result.imported} imported</span> • <span className="text-rose-400 font-medium">{result.failed} failed</span>
                    </p>
                  </div>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-semibold text-zinc-300 mb-2 uppercase tracking-wider">Errors:</h4>
                  <ul className="space-y-2 bg-black/40 p-4 rounded-xl border border-white/5 max-h-48 overflow-y-auto custom-scrollbar">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-xs text-rose-400 font-medium flex gap-2">
                        <span className="text-zinc-600 mt-0.5">•</span> {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button 
                onClick={resetState}
                className="mt-4 w-full py-2.5 rounded-lg font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Upload Another File
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="text-sm text-zinc-400">
                Upload a CSV file to add multiple expenses at once. The CSV must have the following header row:
                <div className="mt-2 p-3 bg-black/40 border border-white/10 rounded-lg font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-nowrap">
                  description,amount,paid_by_email,participants,category,date
                </div>
              </div>

              {/* Upload Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
                  isDragging 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : file 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".csv" 
                  className="hidden" 
                />
                
                {file ? (
                  <>
                    <FileText className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="text-sm font-bold text-white truncate max-w-[200px]">{file.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                  </>
                ) : (
                  <>
                    <UploadCloud className={`w-10 h-10 mb-3 ${isDragging ? 'text-indigo-400' : 'text-zinc-500'}`} />
                    <p className="text-sm font-medium text-white mb-1">Click or drag CSV file here</p>
                    <p className="text-xs text-zinc-500">Supports .csv files</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
            <button 
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
              ) : (
                'Import Expenses'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
