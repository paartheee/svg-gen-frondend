import React from 'react';
import { themes } from '../utils/themes';

export default function ThemeSelector({ onApplyTheme }) {
    return (
        <div className="grid grid-cols-2 gap-2 p-1">
            {themes.map((theme) => (
                <button
                    key={theme.id}
                    onClick={() => onApplyTheme(theme)}
                    className="relative group overflow-hidden rounded-lg border border-slate-200 hover:border-green-400 transition-all hover:shadow-sm"
                >
                    <div className="flex h-8 w-full">
                        {theme.colors.map((color, i) => (
                            <div
                                key={i}
                                className="flex-1 h-full"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    <div className="bg-white/90 px-2 py-1 text-[10px] font-medium text-slate-600 truncate text-left group-hover:bg-white group-hover:text-green-700 transition-colors">
                        {theme.name}
                    </div>
                </button>
            ))}
        </div>
    );
}
