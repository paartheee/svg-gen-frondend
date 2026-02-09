import React, { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, MoveUp, MoveDown, GripVertical, Trash2, Copy, Eye, EyeOff, Lock, Unlock, X, FolderTree } from 'lucide-react';
import { parseLayerTree } from '../utils/svgUtils';

export default function LayerTree({
    svgCode,
    selectedIds,
    onSelectionChange,
    onMoveUp,
    onMoveDown,
    onMoveBefore,
    onMoveAfter,
    onClearSelection,
    onGroupDelete,
    onGroupDuplicate,
    onGroupMoveUp,
    onGroupMoveDown,
    lockedIds,
    hiddenIds,
    onToggleLock,
    onToggleHide,
    onAutoGroup,
}) {
    const tree = useMemo(() => {
        if (!svgCode) return [];
        return parseLayerTree(svgCode);
    }, [svgCode]);

    const [expanded, setExpanded] = useState(new Set());
    const [dragOverId, setDragOverId] = useState(null);

    const formatLabel = (id) => {
        return id
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    const toggleExpand = (id) => {
        const newExpanded = new Set(expanded);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpanded(newExpanded);
    };

    const renderNode = (node) => {
        const isExpanded = expanded.has(node.id);
        const isSelected = selectedIds.includes(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isLocked = lockedIds.has(node.id);
        const isHidden = hiddenIds.has(node.id);

        return (
            <div key={node.id}>
                <div
                    className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${isSelected
                        ? 'bg-green-100 text-green-700'
                        : 'hover:bg-slate-100 text-slate-700'
                        } ${dragOverId === node.id ? 'ring-1 ring-green-300 bg-green-50' : ''} ${isHidden ? 'opacity-50 text-slate-400' : ''}`}
                    style={{ paddingLeft: `${node.depth * 16 + 8}px` }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(node.id);
                    }}
                    onDragLeave={() => {
                        setDragOverId(null);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('text/plain');
                        const rect = e.currentTarget.getBoundingClientRect();
                        const isBelow = e.clientY > rect.top + rect.height / 2;
                        setDragOverId(null);
                        if (draggedId && draggedId !== node.id) {
                            if (isBelow) {
                                onMoveAfter(draggedId, node.id);
                            } else {
                                onMoveBefore(draggedId, node.id);
                            }
                        }
                    }}
                >
                    <button
                        className={`mr-1 p-0.5 rounded text-slate-400 hover:text-slate-600 ${isLocked ? 'opacity-30 cursor-not-allowed' : ''} ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        onDragStart={(e) => {
                            if (isLocked) return;
                            e.dataTransfer.setData('text/plain', node.id);
                            e.dataTransfer.effectAllowed = 'move';
                        }}
                        draggable={!isLocked}
                        title="Drag to reorder"
                    >
                        <GripVertical className="w-3.5 h-3.5" />
                    </button>

                    {hasChildren ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(node.id);
                            }}
                            className="p-0.5 hover:bg-slate-200 rounded"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-3 h-3" />
                            ) : (
                                <ChevronRight className="w-3 h-3" />
                            )}
                        </button>
                    ) : (
                        <div className="w-4" />
                    )}

                    <div
                        onClick={(e) => {
                            if (e.metaKey || e.ctrlKey) {
                                const next = selectedIds.includes(node.id)
                                    ? selectedIds.filter((id) => id !== node.id)
                                    : [...selectedIds, node.id];
                                onSelectionChange(next);
                            } else {
                                onSelectionChange([node.id]);
                            }
                        }}
                        className={`flex-1 text-xs font-medium truncate ${dragOverId === node.id ? 'text-green-700' : ''}`}
                    >
                        <span className={`font-semibold ${isHidden ? 'text-slate-400' : ''}`}>{formatLabel(node.id)}</span>
                    </div>

                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleHide(node.id);
                            }}
                            className="p-1 hover:bg-green-200 rounded text-green-600"
                            title={isHidden ? "Show" : "Hide"}
                        >
                            {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleLock(node.id);
                            }}
                            className="p-1 hover:bg-green-200 rounded text-green-600"
                            title={isLocked ? "Unlock" : "Lock"}
                        >
                            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                    </div>

                    {isSelected && (
                        <div className="flex gap-0.5 ml-1">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveUp(node.id);
                                }}
                                className="p-1 hover:bg-green-200 rounded text-green-600"
                                title="Move Up"
                            >
                                <MoveUp className="w-3 h-3" />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMoveDown(node.id);
                                }}
                                className="p-1 hover:bg-green-200 rounded text-green-600"
                                title="Move Down"
                            >
                                <MoveDown className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                {hasChildren && isExpanded && (
                    <div>
                        {node.children.map(child => renderNode(child))}
                    </div>
                )}
            </div>
        );
    };

    if (!svgCode || tree.length === 0) {
        return (
            <div className="p-4 text-center text-xs text-slate-400">
                No layers yet
            </div>
        );
    }

    return (
        <div className="space-y-0.5">
            <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Layers</span>
                {selectedIds.length === 0 && (
                    <button
                        onClick={onAutoGroup}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-green-50 hover:bg-green-100 text-green-700 rounded text-[9px] font-medium transition-colors"
                        title="AI Semantic Grouping"
                    >
                        <FolderTree className="w-3 h-3" /> Auto-Group
                    </button>
                )}
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">{selectedIds.length} selected</span>
                        <button onClick={onGroupMoveUp} className="p-1 hover:bg-slate-100 rounded" title="Move Up">
                            <MoveUp className="w-3 h-3 text-slate-500" />
                        </button>
                        <button onClick={onGroupMoveDown} className="p-1 hover:bg-slate-100 rounded" title="Move Down">
                            <MoveDown className="w-3 h-3 text-slate-500" />
                        </button>
                        <button onClick={onGroupDuplicate} className="p-1 hover:bg-slate-100 rounded" title="Duplicate">
                            <Copy className="w-3 h-3 text-slate-500" />
                        </button>
                        <button onClick={onGroupDelete} className="p-1 hover:bg-slate-100 rounded" title="Delete">
                            <Trash2 className="w-3 h-3 text-slate-500" />
                        </button>
                        <button onClick={onClearSelection} className="p-1 hover:bg-slate-100 rounded" title="Clear selection">
                            <X className="w-3 h-3 text-slate-500" />
                        </button>
                    </div>
                )}
            </div>
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {tree.map(node => renderNode(node))}
            </div>
        </div>
    );
}
