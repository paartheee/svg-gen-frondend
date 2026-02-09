import React from 'react';
import { Trash2, Copy } from 'lucide-react';

export default function ManualControls({
    selectedId,
    onColorChange,
    onScaleChange,
    onRotationChange,
    onOpacityChange,
    onStrokeColorChange,
    onStrokeWidthChange,
    onDelete,
    onDuplicate
}) {
    if (!selectedId) return null;

    return (
        <div className="p-4 bg-white/80 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl space-y-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Edit Layer: <span className="text-green-600">#{selectedId}</span>
                </h3>
                <div className="flex gap-1">
                    <button
                        onClick={onDuplicate}
                        className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                        title="Duplicate Element"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Remove Element"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Colors */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500">Fill Color</label>
                <div className="flex gap-2 flex-wrap">
                    {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#0f172a', '#ffffff', 'transparent'].map(color => (
                        <button
                            key={color}
                            onClick={() => onColorChange(color)}
                            className="w-6 h-6 rounded-full border border-slate-200 ring-offset-1 focus:ring-2 ring-slate-300 transition-transform hover:scale-110"
                            style={{ backgroundColor: color === 'transparent' ? 'transparent' : color, backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none', backgroundSize: '8px 8px' }}
                            title={color}
                        />
                    ))}
                    <input
                        type="color"
                        className="w-6 h-6 rounded-full overflow-hidden p-0 border-0"
                        onChange={(e) => onColorChange(e.target.value)}
                    />
                </div>
            </div>

            {/* Size/Scale */}
            <div className="space-y-2">
                <label className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Scale</span>
                    <span className="text-slate-400">1.0x</span>
                </label>
                <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    defaultValue="1.0"
                    onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
            </div>

            {/* Rotation */}
            <div className="space-y-2">
                <label className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Rotation</span>
                    <span className="text-slate-400">Deg</span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    defaultValue="0"
                    onChange={(e) => onRotationChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
            </div>

            {/* Opacity */}
            <div className="space-y-2">
                <label className="flex justify-between text-xs font-semibold text-slate-500">
                    <span>Opacity</span>
                    <span className="text-slate-400">%</span>
                </label>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    defaultValue="1"
                    onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                />
            </div>

            {/* Stroke */}
            <div className="space-y-2 border-t border-slate-100 pt-2">
                <label className="text-xs font-semibold text-slate-500">Stroke</label>
                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        className="w-8 h-8 rounded-full overflow-hidden p-0 border-0 cursor-pointer"
                        onChange={(e) => onStrokeColorChange(e.target.value)}
                        title="Stroke Color"
                    />
                    <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        defaultValue="0"
                        onChange={(e) => onStrokeWidthChange(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                        title="Stroke Width"
                    />
                </div>
            </div>
        </div>
    );
}
