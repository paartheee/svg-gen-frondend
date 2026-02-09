import React, { useState } from 'react';
import { Plus, Trash2, Box, Search } from 'lucide-react';

export default function AssetsPanel({ assets, onUseAsset, onDeleteAsset, onSaveSelection, hasSelection }) {
    const [search, setSearch] = useState('');

    const filteredAssets = assets.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="p-4 border-b border-slate-100 bg-white space-y-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex-1">My Assets</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">{assets.length} items</span>
                </div>

                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <button
                    onClick={onSaveSelection}
                    disabled={!hasSelection}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg transition-colors text-xs font-semibold shadow-sm hover:shadow active:scale-95"
                    title={hasSelection ? "Save selected elements as new asset" : "Select elements to save"}
                >
                    <Plus className="w-3.5 h-3.5" />
                    Save Selection
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredAssets.length === 0 ? (
                    <div className="text-center py-10 opacity-50">
                        <Box className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs text-slate-400 font-medium">No assets found</p>
                        {search && <p className="text-[10px] text-slate-400">Try a different search term</p>}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredAssets.map((asset) => (
                            <div
                                key={asset.id}
                                className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md hover:border-green-200 transition-all cursor-pointer aspect-square flex flex-col"
                            >
                                <div
                                    className="flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMCAwSDhWOFg0WiIgZmlsbD0iI2Y4ZmFmYyIvPjwvc3ZnPg==')] overflow-hidden"
                                    onClick={() => onUseAsset(asset)}
                                >
                                    {/* Simplified preview - just render SVG string inside a specialized viewBox or fit? 
                        For safely rendering user content, we might use an img tag with data URI or dangerouslySetInnerHTML. 
                        Let's use a scaled-down inline SVG. */}
                                    <div
                                        className="w-full h-full flex items-center justify-center p-2"
                                        dangerouslySetInnerHTML={{ __html: asset.preview }}
                                    />

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-green-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Plus className="w-6 h-6 text-green-600 drop-shadow-sm bg-white rounded-full p-1" />
                                    </div>
                                </div>

                                <div className="p-2 border-t border-slate-50 flex items-center justify-between bg-white z-10">
                                    <span className="text-[10px] font-medium text-slate-600 truncate max-w-[80%]">{asset.name}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteAsset(asset.id);
                                        }}
                                        className="text-slate-300 hover:text-red-500 transition-colors"
                                        title="Delete asset"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
