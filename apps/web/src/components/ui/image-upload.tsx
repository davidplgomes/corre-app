'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
}

export function ImageUpload({ value, onChange, label = 'Cover Image' }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/places/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (data.error) {
                console.error('Upload error:', data.error);
                return;
            }

            if (data.image_url) {
                onChange(data.image_url);
            }
        } catch (error) {
            console.error('Upload failed:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
    };

    const handleRemove = () => {
        onChange('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-2">
            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">{label}</label>

            {value ? (
                <div className="relative group rounded-lg overflow-hidden border border-white/10">
                    <img
                        src={value}
                        alt="Preview"
                        className="w-full h-48 object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = ''; handleRemove(); }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-9 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-xs font-bold text-white transition-colors flex items-center gap-2"
                        >
                            <Upload className="w-3 h-3" />
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="h-9 w-9 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-colors flex items-center justify-center"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`
                        w-full h-40 border-2 border-dashed rounded-lg cursor-pointer
                        flex flex-col items-center justify-center gap-3 transition-all
                        ${dragOver
                            ? 'border-[#FF5722]/50 bg-[#FF5722]/5'
                            : 'border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.04]'
                        }
                        ${uploading ? 'pointer-events-none' : ''}
                    `}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-8 h-8 text-[#FF5722] animate-spin" />
                            <span className="text-xs text-white/40">Uploading...</span>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                <ImageIcon className="w-5 h-5 text-white/30" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-white/60">
                                    <span className="text-[#FF5722] font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-[10px] text-white/30 mt-1">PNG, JPG or WEBP (max 5MB)</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}
