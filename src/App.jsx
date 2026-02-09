import React, { useEffect, useState } from 'react';
import {
  editSvg,
  generateSvg,
  cleanupSvg,
  semanticLabelSvg,
} from './api';
import SvgPreview from './components/SvgPreview';
import PromptInput from './components/PromptInput';
import ManualControls from './components/ManualControls';
import LayerTree from './components/LayerTree';
import ThemeSelector from './components/ThemeSelector';
import AssetsPanel from './components/AssetsPanel';
import AnimationPanel from './components/AnimationPanel';
import ConfirmationModal from './components/ConfirmationModal';
import { addBackground, removeBackground, updateElementColor, updateElementScale, removeElement, updateElementPosition, duplicateElement, moveLayerUp, moveLayerDown, moveLayerBefore, moveLayerAfter, updateElementRotation, updateElementOpacity, updateElementStroke, applyTheme, injectSvgString, extractSvgSnippet, addAnimation, removeAnimation } from './utils/svgUtils';
import { downloadSVG, downloadImage, downloadPDF } from './utils/exportUtils';
import { Code2, Layers, X, Sparkles, FileJson, FileImage, FileType, Undo, Plus, Eraser, Wand2, FolderTree, Palette, Library, LayoutGrid, Clapperboard, Clipboard } from 'lucide-react';

const conversationStarters = [
  {
    emoji: '🍬',
    label: 'Pop Art Candy',
    prompt: 'Construct a gummy bear using geometric primitives. 1) Define a <linearGradient> from hot pink (#ff0080) to purple (#8000ff). 2) Head: A large rounded rectangle (rx=40). 3) Ears: Two perfect circles behind the head. 4) Body: A larger rounded rectangle below the head. 5) Arms/Legs: Four smaller rounded rectangles attached to the body. 6) Material: Apply the gradient to all shapes. Overlay a semi-transparent white ellipse on the belly and forehead to create a "gummy" gloss effect.'
  },
  {
    emoji: '🪐',
    label: 'Retro Saturn',
    prompt: 'Construct a flat Saturn icon with high contrast. 1) Define <defs>: Create three solid colors: Deep Cream, Teal, and Magenta. 2) Layer 1 (Back): Draw the top half of three concentric ellipses (the rings) appearing *behind* the planet. 3) Layer 2 (Planet): Draw a perfect circle in the center (Deep Cream color). 4) Layer 3 (Front): Draw the bottom half of the three concentric ellipses (the rings) appearing *in front* of the planet. 5) Detail: The rings must have a 20-degree rotation. No gradients, just clean solid shapes.'
  },
  {
    emoji: '🍦',
    label: 'Pastel Swirl',
    prompt: 'Construct a soft-serve ice cream. 1) Cone: A strictly triangular path pointing down, filled with a sandy beige color. Overlay a pattern of thin diagonal lines (stroke-width="2") in darker brown. 2) Cream: Create three stacked shapes. The bottom is wide and bulbous, the middle is smaller, and the top is a teardrop point. 3) Color: Use a stepped gradient strategy—fill the bottom blob with Dark Lavender, the middle with Medium Purple, and the top with Light Lilac. 4) Finish: Add a white highlight curve on the left side of each blob.'
  },
  {
    emoji: '🎈',
    label: 'Float Away',
    prompt: 'Construct a realistic balloon using a radial gradient. 1) Defs: Create a <radialGradient> named "sphere-shine". Center it at 30% 30%. Colors: White (offset 0%) -> Bright Red (offset 40%) -> Dark Red (offset 100%). 2) Main Shape: A vertical ellipse (rx=150, ry=180). Fill it with the "sphere-shine" gradient. 3) Knot: A small triangle at the bottom center. 4) String: A single bezier curve path (stroke-width="4", stroke="#555") flowing down in an S-shape.'
  },
  {
    emoji: '💎',
    label: 'Prism Shard',
    prompt: 'Construct a diamond using distinct polygonal facets. 1) Shape: A "kite" shape or teardrop shape. 2) Composition: Divide the shape into 6 triangular distinct polygons that fit together like a puzzle. 3) Coloring: Do not use gradients. Fill each triangle with a different shade of Cyan, Blue, and Violet to simulate light refraction. 4) Sparkle: Add two "star" shapes (four-pointed polygons) in pure white at the top corners.'
  },
  {
    emoji: '🧬',
    label: 'Glass Helix',
    prompt: 'Construct a DNA strand using transparency. 1) Defs: Create a linear gradient from Teal to Blue. 2) Strands: Draw two thick sine-wave paths that cross each other twice. 3) Rungs: Draw horizontal rounded rectangles connecting the waves. 4) Visual Trick: Set `fill-opacity="0.6"` on the strands. Where they overlap, the colors will combine to create a darker shade, simulating a 3D glass structure.'
  }
];

function App() {
  const [svgCode, setSvgCode] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modelUsed, setModelUsed] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [history, setHistory] = useState([]);
  const [lockedIds, setLockedIds] = useState(new Set());
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const [showThemes, setShowThemes] = useState(false);
  const [view, setView] = useState('landing');
  const [loadingFact, setLoadingFact] = useState('');
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [previewBaseSvg, setPreviewBaseSvg] = useState(null);
  const [previewSvg, setPreviewSvg] = useState(null);
  const [showPreviewBefore, setShowPreviewBefore] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('generator'); // 'generator' | 'assets'
  const [assets, setAssets] = useState([]);
  const [showStartOverModal, setShowStartOverModal] = useState(false);

  // Persistence
  useEffect(() => {
    const savedSvg = localStorage.getItem('svgMint_svgCode');
    const savedHistory = localStorage.getItem('svgMint_history');
    if (savedSvg) {
      setSvgCode(savedSvg);
      setView('editor');
    }
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    const savedAssets = localStorage.getItem('svgMint_assets');
    if (savedAssets) {
      try {
        setAssets(JSON.parse(savedAssets));
      } catch (e) {
        console.error("Failed to parse assets", e);
      }
    }
  }, []);

  useEffect(() => {
    if (svgCode) {
      localStorage.setItem('svgMint_svgCode', svgCode);
    } else {
      localStorage.removeItem('svgMint_svgCode');
    }
  }, [svgCode]);

  useEffect(() => {
    localStorage.setItem('svgMint_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('svgMint_assets', JSON.stringify(assets));
  }, [assets]);

  const primarySelectedId = selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;
  const isPreviewActive = Boolean(previewBaseSvg && previewSvg);
  const displaySvg = isPreviewActive ? (showPreviewBefore ? previewBaseSvg : previewSvg) : svgCode;

  const clearPreviewState = () => {
    setPreviewBaseSvg(null);
    setPreviewSvg(null);
    setShowPreviewBefore(false);
  };

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
      setSvgCode(addBackground(result.svg_code));
      setModelUsed(result.model_used);
      setLockedIds(new Set());
      setHiddenIds(new Set());
      setShowCode(false);
      clearPreviewState();
      setView('editor');
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to generate SVG");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (instruction, imageFile = null) => {
    if (!svgCode || isPreviewActive) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await editSvg(svgCode, instruction, primarySelectedId, imageFile);
      setPreviewBaseSvg(svgCode);
      setPreviewSvg(result.svg_code);
      setShowPreviewBefore(false);
      setModelUsed(result.model_used);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to edit SVG");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPreview = () => {
    if (!isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    setSvgCode(previewSvg);
    clearPreviewState();
  };

  const handleDiscardPreview = () => {
    clearPreviewState();
  };

  const handleCleanup = async () => {
    if (!svgCode || isPreviewActive) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await cleanupSvg(svgCode);
      setHistory(prev => [...prev, svgCode]);
      setSvgCode(result.svg_code);
      setModelUsed(result.model_used);
    } catch (err) {
      setError(err.response?.data?.detail || "Cleanup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSemanticLabel = async () => {
    if (!svgCode || isPreviewActive) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await semanticLabelSvg(svgCode);
      setHistory(prev => [...prev, svgCode]);
      setSvgCode(result.svg_code);
      setModelUsed(result.model_used);
    } catch (err) {
      setError(err.response?.data?.detail || "Auto-grouping failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTheme = (theme) => {
    if (!svgCode || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = applyTheme(svgCode, theme);
    setSvgCode(newSvg);
    setShowThemes(false);
  };

  // Manual Edit Handlers
  const handleManualColor = (color) => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementColor(svgCode, primarySelectedId, color);
    setSvgCode(newSvg);
  };

  const handleManualScale = (factor) => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementScale(svgCode, primarySelectedId, factor);
    setSvgCode(newSvg);
  };

  const handleManualRotation = (angle) => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementRotation(svgCode, primarySelectedId, angle);
    setSvgCode(newSvg);
  };

  const handleManualOpacity = (opacity) => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementOpacity(svgCode, primarySelectedId, opacity);
    setSvgCode(newSvg);
  };

  const handleManualStrokeColor = (color) => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementStroke(svgCode, primarySelectedId, color, undefined);
    setSvgCode(newSvg);
  };

  const handleManualStrokeWidth = (width) => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementStroke(svgCode, primarySelectedId, undefined, width);
    setSvgCode(newSvg);
  };

  const handleManualDelete = () => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = removeElement(svgCode, primarySelectedId);
    setSvgCode(newSvg);
    setSelectedIds([]);
  };

  const handleManualDuplicate = () => {
    if (!svgCode || !primarySelectedId || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newId = `${primarySelectedId}_copy_${Date.now()}`;
    const newSvg = duplicateElement(svgCode, primarySelectedId, newId);
    setSvgCode(newSvg);
    setSelectedIds([newId]);
  };

  const handleAddBackground = () => {
    if (!svgCode || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    setSvgCode(addBackground(svgCode));
  };

  const handleRemoveBackground = () => {
    if (!svgCode || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    setSvgCode(removeBackground(svgCode));
  };

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
    if (!svgCode || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = updateElementPosition(svgCode, elementId, deltaX, deltaY);
    setSvgCode(newSvg);
  };

  const handleUndo = () => {
    if (history.length === 0 || isPreviewActive) return;
    const previousState = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    setSvgCode(previousState);
  };

  const handleMoveLayerUp = (elementId) => {
    if (!svgCode || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = moveLayerUp(svgCode, elementId);
    setSvgCode(newSvg);
  };

  const handleMoveLayerDown = (elementId) => {
    if (!svgCode || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = moveLayerDown(svgCode, elementId);
    setSvgCode(newSvg);
  };

  const handleMoveLayerBefore = (elementId, targetId) => {
    if (!svgCode || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = moveLayerBefore(svgCode, elementId, targetId);
    setSvgCode(newSvg);
  };

  const handleMoveLayerAfter = (elementId, targetId) => {
    if (!svgCode || isPreviewActive) return;
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
    if (!svgCode || selectedIds.length === 0 || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    let newSvg = svgCode;
    selectedIds.forEach((id) => {
      newSvg = removeElement(newSvg, id);
    });
    setSvgCode(newSvg);
    setSelectedIds([]);
  };

  const handleGroupDuplicate = () => {
    if (!svgCode || selectedIds.length === 0 || isPreviewActive) return;
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
    if (!svgCode || selectedIds.length === 0 || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    let newSvg = svgCode;
    selectedIds.forEach((id) => {
      newSvg = moveLayerUp(newSvg, id);
    });
    setSvgCode(newSvg);
  };

  const handleGroupMoveDown = () => {
    if (!svgCode || selectedIds.length === 0 || isPreviewActive) return;
    setHistory(prev => [...prev, svgCode]);
    let newSvg = svgCode;
    [...selectedIds].reverse().forEach((id) => {
      newSvg = moveLayerDown(newSvg, id);
    });
    setSvgCode(newSvg);
  };

  const handleSaveAsset = () => {
    if (!svgCode || selectedIds.length === 0) return;
    const snippet = extractSvgSnippet(svgCode, selectedIds);
    const newAsset = {
      id: `asset-${Date.now()}`,
      name: `Asset ${assets.length + 1}`,
      preview: snippet // Storing full snippet string as preview for now
    };
    setAssets(prev => [...prev, newAsset]);
    // Optional: notification of success
  };

  const handleUseAsset = (asset) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const result = injectSvgString(svgCode, asset.preview);
    setSvgCode(result.svg);
    setSelectedIds([result.newId]);
  };

  const handleDeleteAsset = (id) => {
    setAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleApplyAnimation = (id, config) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = addAnimation(svgCode, id, config);
    setSvgCode(newSvg);
  };

  const handleRemoveAnimation = (id) => {
    if (!svgCode) return;
    setHistory(prev => [...prev, svgCode]);
    const newSvg = removeAnimation(svgCode, id);
    setSvgCode(newSvg);
  };

  const handleStartOverConfirm = () => {
    setSvgCode(null);
    setSelectedIds([]);
    setHistory([]);
    setLockedIds(new Set());
    setHiddenIds(new Set());
    setShowCode(false);
    setError(null);
    setPreviewBaseSvg(null);
    setPreviewSvg(null);
    setShowPreviewBefore(false);
    setView('landing');
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
        "emoji": '🍬',
        "label": 'Pop Art Candy',
        "prompt": 'Construct a gummy bear using geometric primitives. 1) Define a <linearGradient> from hot pink (#ff0080) to purple (#8000ff). 2) Head: A large rounded rectangle (rx=40). 3) Ears: Two perfect circles behind the head. 4) Body: A larger rounded rectangle below the head. 5) Arms/Legs: Four smaller rounded rectangles attached to the body. 6) Material: Apply the gradient to all shapes. Overlay a semi-transparent white ellipse on the belly and forehead to create a "gummy" gloss effect.'
      },
      {
        "emoji": '🪐',
        "label": 'Retro Saturn',
        "prompt": 'Construct a flat Saturn icon with high contrast. 1) Define <defs>: Create three solid colors: Deep Cream, Teal, and Magenta. 2) Layer 1 (Back): Draw the top half of three concentric ellipses (the rings) appearing *behind* the planet. 3) Layer 2 (Planet): Draw a perfect circle in the center (Deep Cream color). 4) Layer 3 (Front): Draw the bottom half of the three concentric ellipses (the rings) appearing *in front* of the planet. 5) Detail: The rings must have a 20-degree rotation. No gradients, just clean solid shapes.'
      },
      {
        "emoji": '🍦',
        "label": 'Pastel Swirl',
        "prompt": 'Construct a soft-serve ice cream. 1) Cone: A strictly triangular path pointing down, filled with a sandy beige color. Overlay a pattern of thin diagonal lines (stroke-width="2") in darker brown. 2) Cream: Create three stacked shapes. The bottom is wide and bulbous, the middle is smaller, and the top is a teardrop point. 3) Color: Use a stepped gradient strategy—fill the bottom blob with Dark Lavender, the middle with Medium Purple, and the top with Light Lilac. 4) Finish: Add a white highlight curve on the left side of each blob.'
      },
      {
        "emoji": '🎈',
        "label": 'Float Away',
        "prompt": 'Construct a realistic balloon using a radial gradient. 1) Defs: Create a <radialGradient> named "sphere-shine". Center it at 30% 30%. Colors: White (offset 0%) -> Bright Red (offset 40%) -> Dark Red (offset 100%). 2) Main Shape: A vertical ellipse (rx=150, ry=180). Fill it with the "sphere-shine" gradient. 3) Knot: A small triangle at the bottom center. 4) String: A single bezier curve path (stroke-width="4", stroke="#555") flowing down in an S-shape.'
      },
      {
        "emoji": '💎',
        "label": 'Prism Shard',
        "prompt": 'Construct a diamond using distinct polygonal facets. 1) Shape: A "kite" shape or teardrop shape. 2) Composition: Divide the shape into 6 triangular distinct polygons that fit together like a puzzle. 3) Coloring: Do not use gradients. Fill each triangle with a different shade of Cyan, Blue, and Violet to simulate light refraction. 4) Sparkle: Add two "star" shapes (four-pointed polygons) in pure white at the top corners.'
      },
      {
        "emoji": '🧬',
        "label": 'Glass Helix',
        "prompt": 'Construct a DNA strand using transparency. 1) Defs: Create a linear gradient from Teal to Blue. 2) Strands: Draw two thick sine-wave paths that cross each other twice. 3) Rungs: Draw horizontal rounded rectangles connecting the waves. 4) Visual Trick: Set `fill-opacity="0.6"` on the strands. Where they overlap, the colors will combine to create a darker shade, simulating a 3D glass structure.'
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
                <div className="relative w-30 h-30 flex items-center justify-center landing-float">
                  <img src="/logo.png" alt="SVG Mint logo" className="w-full h-full object-contain drop-shadow-2xl" />
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
              <div className="mt-3 text-xs text-slate-500">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {conversationStarters.map((starter, index) => (
                  <button
                    key={index}
                    onClick={() => handleGenerate(starter.prompt)}
                    disabled={isLoading}
                    className="group relative overflow-hidden bg-white/80 border border-slate-200 hover:border-slate-300 hover:bg-white rounded-xl p-3 transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-center gap-2">
                      <span className="text-xl flex-shrink-0 transform group-hover:scale-110 transition-transform duration-300">{starter.emoji}</span>
                      <p className="text-sm font-medium text-slate-700">{starter.label}</p>
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
      <aside className="w-full md:w-[400px] flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-dvh z-20 shadow-2xl">
        <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/logo.png" alt="SVG Mint Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-700 to-emerald-600">SVG Mint</h1>
              <p className="text-xs text-slate-400 font-medium">AI-Powered Semantic Editor</p>
            </div>
          </div>

          {/* Sidebar Tabs */}
          <div className="flex pt-6 gap-6">
            <button
              onClick={() => setSidebarTab('generator')}
              className={`text-xs font-bold uppercase tracking-wider pb-2 border-b-2 transition-colors ${sidebarTab === 'generator' ? 'text-green-600 border-green-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              Generator
            </button>
            <button
              onClick={() => setSidebarTab('assets')}
              className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors ${sidebarTab === 'assets' ? 'text-green-600 border-green-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              <Library className="w-3.5 h-3.5" /> My Assets
            </button>
            <button
              onClick={() => setSidebarTab('animation')}
              className={`flex items-center gap-2 pb-3 text-xs font-semibold border-b-2 transition-colors ${sidebarTab === 'animation' ? 'text-green-600 border-green-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
            >
              <Clapperboard className="w-3.5 h-3.5" /> Animate
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20 md:pb-14 scrollbar-thin scrollbar-thumb-slate-200">
          {sidebarTab === 'assets' ? (
            <AssetsPanel
              assets={assets}
              onUseAsset={handleUseAsset}
              onDeleteAsset={handleDeleteAsset}
              onSaveSelection={handleSaveAsset}
              hasSelection={selectedIds.length > 0}
            />
          ) : sidebarTab === 'animation' ? (
            <AnimationPanel
              selectedId={primarySelectedId}
              onApplyAnimation={handleApplyAnimation}
              onRemoveAnimation={handleRemoveAnimation}
            />
          ) : (
            <div className="p-6 space-y-8">

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

                  {/* Shortcuts */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {conversationStarters.map((starter) => (
                      <button
                        key={starter.label}
                        onClick={() => handleGenerate(starter.prompt)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-left font-medium text-slate-600 bg-white shadow-sm border border-slate-200 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 rounded-xl transition-all group"
                      >
                        <span className="text-xl group-hover:scale-110 transition-transform">{starter.emoji}</span>
                        <span className="line-clamp-1">{starter.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-left-8 duration-500">
                  {/* Quick Actions */}
                  <div className="space-y-3 pb-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleAddBackground}
                        disabled={isPreviewActive}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add BG
                      </button>
                      <button
                        onClick={handleRemoveBackground}
                        disabled={isPreviewActive}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Eraser className="w-3.5 h-3.5" /> Remove BG
                      </button>
                      <button
                        onClick={handleUndo}
                        disabled={history.length === 0 || isPreviewActive}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Undo className="w-3.5 h-3.5" /> Undo
                      </button>
                      <button
                        onClick={() => setShowStartOverModal(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                      >
                        <X className="w-3.5 h-3.5" /> Start Over
                      </button>
                      <button
                        onClick={handleCleanup}
                        disabled={isPreviewActive}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                        title="AI Clean Code"
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Optimize SVG
                      </button>
                      <button
                        onClick={() => setShowThemes(!showThemes)}
                        disabled={isPreviewActive}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors col-span-2 ${showThemes ? 'bg-pink-100 text-pink-700' : 'bg-pink-50 hover:bg-pink-100 text-pink-700'}`}
                        title="Apply Theme"
                      >
                        <Palette className="w-3.5 h-3.5" /> Themes
                      </button>
                    </div>
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
                      allowImage={Boolean(primarySelectedId)}
                    />

                    {isPreviewActive && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 space-y-3 animate-in fade-in duration-300">
                        <div className="text-xs font-semibold text-emerald-800">
                          AI preview ready ({primarySelectedId ? `layer-scoped: #${primarySelectedId}` : 'global edit'})
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowPreviewBefore(true)}
                            className={`px-2.5 py-1.5 text-[11px] rounded-md border ${showPreviewBefore ? 'border-emerald-500 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
                          >
                            Before
                          </button>
                          <button
                            onClick={() => setShowPreviewBefore(false)}
                            className={`px-2.5 py-1.5 text-[11px] rounded-md border ${!showPreviewBefore ? 'border-emerald-500 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}
                          >
                            After
                          </button>
                          <div className="ml-auto flex items-center gap-2">
                            <button
                              onClick={handleDiscardPreview}
                              className="px-2.5 py-1.5 text-[11px] rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                            >
                              Discard
                            </button>
                            <button
                              onClick={handleApplyPreview}
                              className="px-2.5 py-1.5 text-[11px] rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Apply changes
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual Controls - Context Aware */}
                  {!isPreviewActive && primarySelectedId && selectedIds.length === 1 && (
                    <div className="pt-2">
                      <ManualControls
                        selectedId={primarySelectedId}
                        onColorChange={handleManualColor}
                        onScaleChange={handleManualScale}
                        onRotationChange={handleManualRotation}
                        onOpacityChange={handleManualOpacity}
                        onStrokeColorChange={handleManualStrokeColor}
                        onStrokeWidthChange={handleManualStrokeWidth}
                        onDelete={handleManualDelete}
                        onDuplicate={handleManualDuplicate}
                      />
                    </div>
                  )}

                  {/* Theme Selector */}
                  {showThemes && !isPreviewActive && (
                    <div className="pt-2 animate-in slide-in-from-left-4 duration-300">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Themes</h3>
                        <button onClick={() => setShowThemes(false)} className="text-slate-400 hover:text-slate-600"><X className="w-3 h-3" /></button>
                      </div>
                      <ThemeSelector onApplyTheme={handleApplyTheme} />
                    </div>
                  )}

                  {/* Layer Tree */}
                  <div className="pt-4 border-t border-slate-200">
                    <LayerTree
                      svgCode={displaySvg}
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
                      onAutoGroup={handleSemanticLabel}
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
            </div>
          )}
        </div>
      </aside>

      <ConfirmationModal
        isOpen={showStartOverModal}
        onClose={() => setShowStartOverModal(false)}
        onConfirm={handleStartOverConfirm}
        title="Start Over?"
        message="Are you sure you want to discard your current work and start over? This action cannot be undone."
        confirmText="Yes, Start Over"
        cancelText="Cancel"
        isDestructive
      />

      {/* Main Preview Area */}
      < main className="flex-1 relative bg-slate-100/50 flex flex-col items-center justify-center p-8 overflow-hidden" >
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
        )
        }

        {/* Background Decoration */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-32 left-20 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

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
              {displaySvg}
            </pre>
          </div>

          {/* SVG Preview Container */}
          <div
            className={`z-10 w-full max-w-2xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${showCode ? 'opacity-0 scale-90 blur-md' : 'opacity-100 scale-100 blur-0'
              }`}
          >
            <SvgPreview
              svgCode={displaySvg}
              onElementSelect={(id) => setSelectedIds([id])}
              selectedIds={selectedIds}
              onElementDrag={handleElementDrag}
              lockedIds={lockedIds}
              hiddenIds={hiddenIds}
            />
          </div>
        </div>

        {
          svgCode && !showCode && (
            <div className="mt-8 text-slate-400 text-sm font-medium z-10 animate-in fade-in slide-in-from-bottom-4 delay-500">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                {isPreviewActive
                  ? `Previewing ${showPreviewBefore ? 'before' : 'after'} state`
                  : 'Click component to select layer'}
              </span>
            </div>
          )
        }

        {/* Right Export Panel */}
        {
          svgCode && !showCode && (
            <div className="absolute top-6 right-6 z-30 w-28 bg-white/90 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl p-2 space-y-1.5">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Export</div>
              <div className="space-y-1.5">
                <button
                  onClick={() => handleExport('svg')}
                  disabled={isPreviewActive}
                  className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                    <Code2 className="w-3 h-3 text-green-600" /> SVG
                  </div>
                </button>
                <button
                  onClick={() => handleExport('png')}
                  disabled={isPreviewActive}
                  className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                    <FileImage className="w-3 h-3 text-green-600" /> PNG
                  </div>
                </button>
                <button
                  onClick={() => handleExport('jpg')}
                  disabled={isPreviewActive}
                  className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                    <FileJson className="w-3 h-3 text-green-600" /> JPG
                  </div>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  disabled={isPreviewActive}
                  className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                    <FileType className="w-3 h-3 text-green-600" /> PDF
                  </div>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(svgCode);
                    // Could add a toast here
                  }}
                  disabled={isPreviewActive}
                  className="w-full px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-1 text-[12px] font-semibold text-slate-700">
                    <Clipboard className="w-3 h-3 text-green-600" /> Copy
                  </div>
                </button>
              </div>
            </div>
          )
        }
      </main >

      {isLoading && <LoadingOverlay />}
    </div >
  );
}

export default App;
