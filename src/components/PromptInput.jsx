import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Loader2, Paperclip } from 'lucide-react';

export default function PromptInput({ onSubmit, isLoading, placeholder = "Describe your SVG...", allowImage = false }) {
    const [prompt, setPrompt] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const fileInputRef = useRef(null);
    const previewUrl = useMemo(() => {
        if (!imageFile) return null;
        return URL.createObjectURL(imageFile);
    }, [imageFile]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (prompt.trim() && !isLoading) {
            if (allowImage) {
                onSubmit(prompt, imageFile);
                setImageFile(null);
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            } else {
                onSubmit(prompt);
            }
            setPrompt("");
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
    };

    const handleClearImage = () => {
        setImageFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    return (
        <form onSubmit={handleSubmit} className="relative w-full">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden focus-within:ring-2 focus-within:ring-green-500/50 transition-all">
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={placeholder}
                    disabled={isLoading}
                    className="w-full px-6 py-4 bg-transparent focus:outline-none text-slate-800 placeholder-slate-400 text-lg"
                />
                {allowImage && (
                    <label
                        title="Attach reference image (optional)"
                        className="mr-2 inline-flex items-center justify-center w-9 h-9 text-slate-500 hover:text-slate-700 cursor-pointer rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <Paperclip className="w-4 h-4" />
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleFileChange}
                            disabled={isLoading}
                            className="hidden"
                        />
                    </label>
                )}
                <div className="pr-2">
                    <button
                        type="submit"
                        disabled={!prompt.trim() || isLoading}
                        className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:hover:bg-green-600 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-green-500/30"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            {allowImage && imageFile && (
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                    {previewUrl && (
                        <img
                            src={previewUrl}
                            alt="Reference preview"
                            className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                        />
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-[200px]">{imageFile.name}</span>
                        <button
                            type="button"
                            onClick={handleClearImage}
                            className="ml-1 text-slate-400 hover:text-slate-600"
                            aria-label="Remove reference image"
                        >
                            ×
                        </button>
                    </span>
                    <span className="text-slate-400">Reference image (optional)</span>
                </div>
            )}
        </form>
    );
}
