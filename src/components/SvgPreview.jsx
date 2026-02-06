import React, { useRef, useEffect, useState } from 'react';

export default function SvgPreview({ svgCode, onElementSelect, selectedIds, onElementDrag, lockedIds, hiddenIds }) {
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [draggedElement, setDraggedElement] = useState(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseDown = (e) => {
            const target = e.target.closest('[id]');
            if (target && target.id && target.id !== 'scene' && target.id !== 'background' && target.id !== 'foreground') {
                if (lockedIds.has(target.id) || hiddenIds.has(target.id)) {
                    return;
                }
                // Check if this is a selected element - enable dragging
                if (selectedIds.length === 1 && target.id === selectedIds[0]) {
                    setIsDragging(true);
                    setDraggedElement(target.id);
                    setDragStart({ x: e.clientX, y: e.clientY });
                    e.preventDefault();
                } else {
                    // Just select the element
                    onElementSelect(target.id);
                }
            }
        };

        const handleMouseMove = (e) => {
            if (isDragging && dragStart && draggedElement) {
                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;

                // Update drag start for next move
                setDragStart({ x: e.clientX, y: e.clientY });

                // Call the drag handler
                if (onElementDrag) {
                    onElementDrag(draggedElement, deltaX, deltaY);
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setDragStart(null);
            setDraggedElement(null);
        };

        container.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            container.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [onElementSelect, selectedIds, isDragging, dragStart, draggedElement, onElementDrag, lockedIds, hiddenIds]);

    // Inject a style tag to highlight the selected element
    const selectedStyle = selectedIds
        .map((id) => `#${id} { outline: 2px dashed #0ea5e9; outline-offset: 4px; cursor: ${isDragging ? 'grabbing' : 'grab'}; }`)
        .join('\n');

    const hiddenStyle = Array.from(hiddenIds)
        .map((id) => `#${id} { display: none; }`)
        .join('\n');

    const lockedStyle = Array.from(lockedIds)
        .map((id) => `#${id} { pointer-events: none; }`)
        .join('\n');

    const highlightStyle = (selectedIds.length > 0 || hiddenIds.size > 0 || lockedIds.size > 0) ? `
    <style>
      ${selectedStyle}
      ${hiddenStyle}
      ${lockedStyle}
      g[id]:hover, path[id]:hover, rect[id]:hover, circle[id]:hover {
        opacity: 0.9;
        cursor: pointer;
      }
    </style>
  ` : '';

    const svgWithHighlight = svgCode
        ? svgCode.replace('</svg>', `${highlightStyle}</svg>`)
        : null;

    if (!svgCode) {
        return (
            <div className="w-[512px] h-[512px] bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                No SVG generated yet
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="bg-white rounded-xl shadow-sm border border-slate-200 svg-preview-container overflow-hidden flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: svgWithHighlight }}
        />
    );
}
