import React, { useEffect, useState } from 'react';
import { generateSvg, editSvg } from './api';
import SvgPreview from './components/SvgPreview';
import PromptInput from './components/PromptInput';
import ManualControls from './components/ManualControls';
import LayerTree from './components/LayerTree';
import { updateElementColor, updateElementScale, removeElement, removeBackground, updateElementPosition, duplicateElement, moveLayerUp, moveLayerDown, moveLayerBefore, moveLayerAfter } from './utils/svgUtils';
import { downloadSVG, downloadImage, downloadPDF } from './utils/exportUtils';
import { Wand2, Code2, Layers, X, Sparkles, Eraser, Download, FileJson, FileImage, FileType, Undo } from 'lucide-react';

function App() {
  const [svgCode, setSvgCode] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelUsed, setModelUsed] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [history, setHistory] = useState([]);
  const [keepBackground, setKeepBackground] = useState(true);
  const [lockedIds, setLockedIds] = useState(new Set());
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [view, setView] = useState('landing');
  const [loadingFact, setLoadingFact] = useState('');
  const [loadingPercent, setLoadingPercent] = useState(0);

  const primarySelectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;

  const handleGenerate = async (prompt, imageFile = null) => {
    setIsLoading(true);
    setError(null);
    setSelectedIds([]);
    try {
      const result = await generateSvg(prompt, imageFile);
      // Save current state to history before updating
      if (svgCode) {
        setHistory(prev => [...prev, svgCode]);
      }
      const generatedSvg = keepBackground ? result.svg_code : removeBackground(result.svg_code);
      setSvgCode(generatedSvg);
      setModelUsed(result.model_used);
      setLockedIds(new Set());
      setHiddenIds(new Set());
      setShowCode(false);
      setView('editor');
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate SVG");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (instruction) => {
    if (!svgCode) return;
    setIsLoading(true);
    setError(null);
    try {
      // Save to history before editing
      setHistory(prev => [...prev, svgCode]);
      const result = await editSvg(svgCode, instruction, primarySelectedId);
      setSvgCode(result.svg_code);
      setModelUsed(result.model_used);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to edit SVG");
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Edit Handlers
  const handleManualColor = (color) => {
    if (!svgCode || !primarySelectedId) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementColor(svgCode, primarySelectedId, color);
    setSvgCode(newSvg);
  };

  const handleManualScale = (factor) => {
    if (!svgCode || !primarySelectedId) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementScale(svgCode, primarySelectedId, factor);
    setSvgCode(newSvg);
  };

  const handleManualDelete = () => {
    if (!svgCode || !primarySelectedId) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = removeElement(svgCode, primarySelectedId);
    setSvgCode(newSvg);
    setSelectedIds([]);
  };

  const handleManualDuplicate = () => {
    if (!svgCode || !primarySelectedId) return;
    setHistory(prev => [...prev, svgCode]);
    const newId = `${primarySelectedId}_copy_${Date.now()}`;
    const newSvg = duplicateElement(svgCode, primarySelectedId, newId);
    setSvgCode(newSvg);
    setSelectedIds([newId]);
  };

  const handleRemoveBackground = () => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = removeBackground(svgCode);
    setSvgCode(newSvg);
  }

  const handleExport = (format) => {
    if (!svgCode) return;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `svgmint-${timestamp}.${format}`;

    if (format === 'svg') {
      downloadSVG(svgCode, filename);
    } else if (format === 'pdf') {
      downloadPDF(svgCode, filename);
    } else {
      downloadImage(svgCode, filename, format);
    }
  };

  const handleElementDrag = (elementId, deltaX, deltaY) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementPosition(svgCode, elementId, deltaX, deltaY);
    setSvgCode(newSvg);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setSvgCode(previousState);
  };

  const handleMoveLayerUp = (elementId) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = moveLayerUp(svgCode, elementId);
    setSvgCode(newSvg);
  };

  const handleMoveLayerDown = (elementId) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = moveLayerDown(svgCode, elementId);
    setSvgCode(newSvg);
  };

  const handleMoveLayerBefore = (elementId, targetId) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = moveLayerBefore(svgCode, elementId, targetId);
    setSvgCode(newSvg);
  };

  const handleMoveLayerAfter = (elementId, targetId) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = moveLayerAfter(svgCode, elementId, targetId);
    setSvgCode(newSvg);
  };

  const handleSelectionChange = (ids) => {
    setSelectedIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleToggleLock = (id) => {
    setLockedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleHide = (id) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGroupDelete = () => {
    if (!svgCode || selectedIds.length === 0) return;
    setHistory(prev => [...prev, svgCode]);
    let newSvg = svgCode;
    selectedIds.forEach((id) => {
      newSvg = removeElement(newSvg, id);
    });
    setSvgCode(newSvg);
    setSelectedIds([]);
  };

  const handleGroupDuplicate = () => {
    if (!svgCode || selectedIds.length === 0) return;
    setHistory(prev => [...prev, svgCode]);
    let newSvg = svgCode;
    const newIds = [];
    selectedIds.forEach((id) => {
      const newId = `${id}_copy_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      newSvg = duplicateElement(newSvg, id, newId);
      newIds.push(newId);
    });
    setSvgCode(newSvg);
    setSelectedIds(newIds);
  };

  const handleGroupMoveUp = () => {
    if (!svgCode || selectedIds.length === 0) return;
    setHistory(prev => [...prev, svgCode]);
    let newSvg = svgCode;
    selectedIds.forEach((id) => {
      newSvg = moveLayerUp(newSvg, id);
    });
    setSvgCode(newSvg);
  };

  const handleGroupMoveDown = () => {
    if (!svgCode || selectedIds.length === 0) return;
    setHistory(prev => [...prev, svgCode]);
    let newSvg = svgCode;
    [...selectedIds].reverse().forEach((id) => {
      newSvg = moveLayerDown(newSvg, id);
    });
    setSvgCode(newSvg);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedIds([]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const geminiFacts = [
    ];
    const randomFact = geminiFacts[Math.floor(Math.random() * geminiFacts.length)];
    setLoadingFact(randomFact);
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingPercent(0);
      return;
    }
    setLoadingPercent(8);
    const interval = setInterval(() => {
      setLoadingPercent((prev) => {
        if (prev >= 92) return prev;
        const bump = Math.floor(Math.random() * 6) + 2;
        return Math.min(92, prev + bump);
      });
    }, 450);
    return () => clearInterval(interval);
  }, [isLoading]);

  const LoadingOverlay = () => (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-gradient-to-br from-emerald-50/60 via-white/30 to-pink-50/60 backdrop-blur-[2px]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -left-10 w-72 h-72 bg-green-200/70 rounded-full blur-3xl animate-blob" />
        <div className="absolute top-10 right-0 w-64 h-64 bg-pink-200/70 rounded-full blur-3xl animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-amber-200/70 rounded-full blur-3xl animate-blob animation-delay-4000" />
      </div>
      <div className="relative z-10 p-[1px] rounded-2xl bg-gradient-to-r from-green-400 via-yellow-300 to-pink-400 shadow-2xl">
        <div className="flex flex-col items-center gap-3 bg-white/90 rounded-2xl px-6 py-5 max-w-xs text-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-green-300 via-yellow-200 to-pink-300 blur-2xl animate-pulse" />
            <div className="relative w-12 h-12 rounded-full border-4 border-transparent bg-gradient-to-r from-green-400 via-yellow-300 to-pink-400 p-[2px] animate-spin">
              <div className="w-full h-full rounded-full bg-white" />
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-700">Generating SVG… {loadingPercent}%</div>
          <div className="text-xs text-slate-400">Please wait a moment</div>
          {loadingFact && (
            <div className="text-[11px] text-slate-600 bg-gradient-to-r from-green-50 via-yellow-50 to-pink-50 rounded-lg px-3 py-2">
              {loadingFact}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (view === 'landing') {
    const conversationStarters = [
  {
    emoji: '🍬',
    label: 'Pop Art Candy',
    // Fix: Explicitly asks for gradients and rounded rects to fix the "blocky" look
    prompt: 'A modern, glossy gummy bear icon. 1) Shape: Use a rounded rectangle base with smaller rounded circles for ears and limbs to create a soft, gummy silhouette. 2) Color: Use a vertical linear gradient from deep magenta (#db2777) at the bottom to hot pink (#f472b6) at the top. 3) Detail: Add a semi-transparent white oval on the belly (opacity 0.3) and a sharp white curve on the head to simulate a plastic/jelly texture. No outlines, just vibrant color fields.',
    gradient: 'from-pink-500 to-fuchsia-500',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    hover: 'hover:bg-pink-100'
  },
  {
    emoji: '🪐',
    label: 'Retro Saturn',
    // Fix: Solves the "rings cutting through planet" issue by ordering layers
    prompt: 'A vibrant, flat-vector illustration of Saturn. 1) Layering Order: First draw the "Back Rings" (the part behind the planet), then draw the "Planet Sphere", then draw the "Front Rings". 2) Planet: A perfect circle with a subtle diagonal gradient (Cream to soft yellow). 3) Rings: Use thick bands of Teal, Tangerine, and Magenta. The rings should be elliptical and tilted 15 degrees. 4) Style: Clean vector lines, no blur, high contrast.',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-100'
  },
  {
    emoji: '🍦',
    label: 'Pastel Swirl',
    // Fix: Forces the "stacked" look to avoid the messy single stroke
    prompt: 'A soft-serve ice cream cone. 1) Ice Cream: Composed of three distinct, stacked "blob" shapes that get smaller towards the top. Use a different shade of purple for each stack (Dark Purple base -> Medium Lavender -> Light Lilac tip) to create depth without lines. 2) Cone: A sharp triangle in golden-brown with a cross-hatch pattern made of darker brown lines. 3) Lighting: Add a soft white highlight on the left side of each ice cream blob.',
    gradient: 'from-purple-500 to-violet-500',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-100'
  },
  {
    emoji: '🎈',
    label: 'Float Away',
    // Fix: Adds specific instructions for the "3D" look using gradients
    prompt: 'A high-fidelity red balloon. 1) Body: A perfect egg-shape (ellipse) tilted slightly. Fill with a radial gradient (Center: Bright Red #ef4444, Edge: Dark Cherry #991b1b) to give it a spherical 3D look. 2) Reflection: A hard-edged white oval in the top-right corner (opacity 0.8) to show surface gloss. 3) String: A thin, dark grey bezier curve hanging loosely from the bottom knot.',
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-50',
    border: 'border-red-200',
    hover: 'hover:bg-red-100'
  },
  {
    emoji: '💎',
    label: 'Prism Shard',
    // Fix: Reinforces the "Faceted" look which works well with flat colors
    prompt: 'A crystal diamond icon. 1) Geometry: A polygon with sharp, angular edges. 2) Facets: Divide the shape into 6-8 triangular facets. Fill each facet with a distinct color from a cool-spectrum palette (Cyan, Electric Blue, Violet, Indigo) to simulate light refraction. Do not use gradients here—use solid blocks of varying lightness to show the angles. 3) Sparkle: Add two small white "star" shapes at the corners.',
    gradient: 'from-indigo-500 to-fuchsia-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-100'
  },
  {
    emoji: '🧬',
    label: 'Glass Helix',
    // Fix: Simplifies the complex "blur" request into something SVGs handle well (opacity)
    prompt: 'A stylized DNA helix. 1) Structure: Two thick, sinusoidal wave paths that intertwine. 2) Color: One path is Cyan, the other is Teal. 3) Transparency: Where the paths overlap, use `fill-opacity="0.5"` or a blend mode color to simulate glass transparency. 4) Rungs: Connect the waves with simple horizontal lines with rounded caps. Keep the design minimal and abstract.',
    gradient: 'from-teal-500 to-cyan-500',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-100'
  }
];

    return (
      <div className="min-h-screen w-full relative overflow-hidden bg-slate-50 text-slate-900">
        <div className="absolute inset-0 z-0 opacity-60 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] bg-green-200 rounded-full mix-blend-multiply filter blur-3xl landing-glow" />
          <div className="absolute -bottom-32 -left-20 w-[460px] h-[460px] bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl landing-glow" />
          <div className="absolute top-24 left-1/2 w-[300px] h-[300px] bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl landing-glow" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-4xl">
            <div className="flex flex-col items-center text-center mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="relative mb-6">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-green-200 to-emerald-200 blur-2xl opacity-60 landing-glow" />
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-2xl landing-float bg-white flex items-center justify-center">
                  <img src="/logo.png" alt="SVG Mint logo" className="w-12 h-12 object-contain" />
                </div>
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-600">SVG Mint</h1>
              <p className="mt-3 text-base sm:text-lg text-slate-500 font-medium">Intent-Preserving Vector Editing with Gemini 3</p>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-white/40 rounded-3xl shadow-2xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150">
              <PromptInput
                onSubmit={handleGenerate}
                isLoading={isLoading}
                placeholder="Describe the SVG you want to generate..."
                allowImage
              />
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={keepBackground}
                    onChange={(e) => setKeepBackground(e.target.checked)}
                    className="h-4 w-4 accent-green-600"
                  />
                  Keep background
                </label>
                <span>Press Enter to generate</span>
              </div>
              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
                  {error}
                </div>
              )}
            </div>

            {/* Conversation Starters */}
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
              <h2 className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Try these prompts</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {conversationStarters.map((starter, index) => (
                  <button
                    key={index}
                    onClick={() => handleGenerate(starter.prompt)}
                    disabled={isLoading}
                    className={`group relative overflow-hidden ${starter.bg} ${starter.border} border ${starter.hover} rounded-2xl p-4 text-left transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${starter.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    <div className="relative flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-300">{starter.emoji}</span>
                      <p className="text-sm font-medium text-slate-700 leading-snug">{starter.label}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {isLoading && <LoadingOverlay />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden font-sans text-slate-900">

      {/* Sidebar / Left Panel */}
      <aside className="w-full md:w-[400px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-[100vh] z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="SVG Mint Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-600">SVG Mint</h1>
              <p className="text-xs text-slate-400 font-medium">AI-Powered Semantic Vector Editor Powered by Gemini 3</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">

          {/* Generator Section */}
          {!svgCode ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-left-8 duration-500">
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-800">Start Creating</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Describe your vector graphic. We'll generate a semantically structured SVG optimized for editing.
                </p>
              </div>
              <PromptInput
                onSubmit={handleGenerate}
                isLoading={isLoading}
                placeholder="a minimalist drone icon..."
                allowImage
              />
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={keepBackground}
                  onChange={(e) => setKeepBackground(e.target.checked)}
                  className="h-4 w-4 accent-green-600"
                />
                Keep background
              </label>

              {/* Shortcuts */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {['Red Rocket Icon', 'Blue Ocean Scene', 'Geometric Lion', 'Abstract Logo'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => handleGenerate(preset)}
                    className="px-4 py-3 text-sm text-left font-medium text-slate-600 bg-slate-50 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors border border-slate-100"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-8 duration-500">
              {/* Quick Actions */}
              <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
                <button onClick={handleRemoveBackground} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors whitespace-nowrap">
                  <Eraser className="w-3.5 h-3.5" /> Remove BG
                </button>
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Undo className="w-3.5 h-3.5" /> Undo
                </button>
                <button onClick={() => { setSvgCode(null); setSelectedIds([]); setHistory([]); setLockedIds(new Set()); setHiddenIds(new Set()); setShowCode(false); setError(null); setView('landing'); }} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors whitespace-nowrap">
                  <X className="w-3.5 h-3.5" /> Start Over
                </button>
              </div>

              {/* Active Selection / Chat */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-green-500" />
                    {primarySelectedId ? "Edit Selection" : "Global Edit"}
                  </h2>
                  {primarySelectedId && (
                    <span className="text-[10px] font-mono px-2 py-1 bg-green-100 text-green-700 rounded-md">
                      #{primarySelectedId}
                    </span>
                  )}
                </div>

                <PromptInput
                  onSubmit={handleEdit}
                  isLoading={isLoading}
                  placeholder={primarySelectedId ? `Instruct AI to edit #${primarySelectedId}...` : "Describe global changes..."}
                />
              </div>

              {/* Manual Controls - Context Aware */}
              {primarySelectedId && selectedIds.length === 1 && (
                <div className="pt-2">
                  <ManualControls
                    selectedId={primarySelectedId}
                    onColorChange={handleManualColor}
                    onScaleChange={handleManualScale}
                    onDelete={handleManualDelete}
                    onDuplicate={handleManualDuplicate}
                  />
                </div>
              )}

              {/* Layer Tree */}
              <div className="pt-4 border-t border-slate-200">
                <LayerTree
                  svgCode={svgCode}
                  selectedIds={selectedIds}
                  onSelectionChange={handleSelectionChange}
                  onMoveUp={handleMoveLayerUp}
                  onMoveDown={handleMoveLayerDown}
                  onMoveBefore={handleMoveLayerBefore}
                  onMoveAfter={handleMoveLayerAfter}
                  onClearSelection={handleClearSelection}
                  onGroupDelete={handleGroupDelete}
                  onGroupDuplicate={handleGroupDuplicate}
                  onGroupMoveUp={handleGroupMoveUp}
                  onGroupMoveDown={handleGroupMoveDown}
                  lockedIds={lockedIds}
                  hiddenIds={hiddenIds}
                  onToggleLock={handleToggleLock}
                  onToggleHide={handleToggleHide}
                />
              </div>


              {modelUsed && (
                <div className="pt-8 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-medium uppercase tracking-wider rounded-full">
                    Generated by {modelUsed}
                  </span>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 animate-in shake">
              {error}
            </div>
          )}
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 relative bg-slate-100/50 flex flex-col items-center justify-center p-8 overflow-hidden">
        {svgCode && (
          <div className="absolute top-8 left-4 z-30">
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex items-center gap-2 px-2.5 py-2 bg-white border border-slate-200 rounded-r-xl shadow-md hover:bg-slate-50 text-slate-700 transition-all text-[11px] font-semibold"
            >
              {showCode ? <Sparkles className="w-3 h-3" /> : <Code2 className="w-3 h-3" />}
              {showCode ? "Show Preview" : "View Code"}
            </button>
          </div>
        )}
        {/* Background Decoration */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        {/* Top Right Controls removed */}

        {/* Content Area with Transition */}
        <div className="w-full h-full flex items-center justify-center relative p-8">
          {/* VS Code Style Editor - Centered Floating Window */}
          <div
            className={`absolute z-20 w-[95%] max-w-4xl h-[85%] bg-[#1e1e1e] text-[#d4d4d4] rounded-xl shadow-2xl border border-[#3e3e3e] overflow-hidden flex flex-col transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${showCode
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
              }`}
          >
            <div className="flex-none h-10 bg-[#252526] flex items-center justify-between px-4 text-xs text-[#969696] font-sans border-b border-[#3e3e3e]">
              <span className="flex items-center gap-2">
                <Code2 className="w-3.5 h-3.5" />
                preview.svg
              </span>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#414141]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#414141]"></div>
              </div>
            </div>
            <pre className="flex-1 p-6 overflow-auto font-mono text-sm leading-relaxed custom-scrollbar selection:bg-[#264f78]">
              {svgCode}
            </pre>
          </div>

          {/* SVG Preview Container */}
          <div
            className={`z-10 w-full max-w-2xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${showCode ? 'opacity-0 scale-90 blur-md' : 'opacity-100 scale-100 blur-0'
              }`}
          >
            <SvgPreview
              svgCode={svgCode}
              onElementSelect={(id) => setSelectedIds([id])}
              selectedIds={selectedIds}
              onElementDrag={handleElementDrag}
              lockedIds={lockedIds}
              hiddenIds={hiddenIds}
            />
          </div>
        </div>

        {svgCode && !showCode && (
          <div className="mt-8 text-slate-400 text-sm font-medium z-10 animate-in fade-in slide-in-from-bottom-4 delay-500">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4" /> Click component to select layer
            </span>
          </div>
        )}

        {/* Right Export Panel */}
        {svgCode && !showCode && (
          <div className="absolute top-6 right-6 z-30 w-28 bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl p-2 space-y-1.5">
            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Export</div>
            <div className="space-y-1.5">
              <button
                onClick={() => handleExport('svg')}
                className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left"
              >
                <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                  <Code2 className="w-3 h-3 text-green-600" /> SVG
                </div>
              </button>
              <button
                onClick={() => handleExport('png')}
                className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left"
              >
                <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                  <FileImage className="w-3 h-3 text-green-600" /> PNG
                </div>
              </button>
              <button
                onClick={() => handleExport('jpg')}
                className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left"
              >
                <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                  <FileJson className="w-3 h-3 text-green-600" /> JPG
                </div>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left"
              >
                <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                  <FileType className="w-3 h-3 text-green-600" /> PDF
                </div>
              </button>
            </div>
          </div>
        )}
      </main>
      {isLoading && <LoadingOverlay />}
    </div>
  );
}

export default App;
