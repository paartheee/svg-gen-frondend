import React, { useState } from 'react';
import { Play, Square, RotateCw, Move, Activity, Zap, Trash2 } from 'lucide-react';

export default function AnimationPanel({ selectedId, onApplyAnimation, onRemoveAnimation }) {
    const [duration, setDuration] = useState(2);
    const [repeat, setRepeat] = useState('indefinite');

    const animations = [
        { id: 'spin', name: 'Spin', icon: RotateCw, type: 'rotate' },
        { id: 'pulse', name: 'Pulse', icon: Activity, type: 'scale' },
        { id: 'float', name: 'Float', icon: Move, type: 'translate' },
        { id: 'blink', name: 'Blink', icon: Zap, type: 'opacity' }
    ];

    const handleApply = (type) => {
        onApplyAnimation(selectedId, { type, duration, repeat });
    };

    if (!selectedId) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 p-4 text-center">
                <Play className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">Select an element to animate</p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Animation</h3>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">BETA</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {animations.map((anim) => (
                    <button
                        key={anim.id}
                        onClick={() => handleApply(anim.id)}
                        className="flex flex-col items-center justify-center gap-2 p-3 bg-white border border-slate-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
                    >
                        <anim.icon className="w-6 h-6 text-slate-400 group-hover:text-purple-600 transition-colors" />
                        <span className="text-xs font-medium text-slate-600 group-hover:text-purple-700">{anim.name}</span>
                    </button>
                ))}
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>Duration</span>
                        <span>{duration}s</span>
                    </div>
                    <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={duration}
                        onChange={(e) => setDuration(parseFloat(e.target.value))}
                        className="w-full accent-purple-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                        type="checkbox"
                        checked={repeat === 'indefinite'}
                        onChange={(e) => setRepeat(e.target.checked ? 'indefinite' : '1')}
                        className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Loop Forever</span>
                </div>
            </div>

            <button
                onClick={() => onRemoveAnimation(selectedId)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-xs font-medium border border-red-100"
            >
                <Trash2 className="w-3.5 h-3.5" /> Remove Animation
            </button>

            <div className="bg-blue-50 text-blue-700 text-[10px] p-3 rounded-lg border border-blue-100">
                Note: Animations use standard SVG SMIL. They will work in any modern browser but may not loop in some static image viewers.
            </div>
        </div>
    );
}
