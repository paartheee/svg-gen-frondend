export const parseSvg = (svgString) => {
    const parser = new DOMParser();
    return parser.parseFromString(svgString, "image/svg+xml");
};

export const serializeSvg = (doc) => {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
};

const clamp = (value, min = 0, max = 255) => Math.min(max, Math.max(min, value));

const parseColorToRgb = (rawColor) => {
    if (!rawColor) return null;
    const color = rawColor.trim().toLowerCase();

    if (color === 'none' || color === 'transparent' || color.startsWith('url(')) {
        return null;
    }

    if (color.startsWith('#')) {
        if (color.length === 4) {
            return {
                r: parseInt(color[1] + color[1], 16),
                g: parseInt(color[2] + color[2], 16),
                b: parseInt(color[3] + color[3], 16),
            };
        }
        if (color.length === 7) {
            return {
                r: parseInt(color.slice(1, 3), 16),
                g: parseInt(color.slice(3, 5), 16),
                b: parseInt(color.slice(5, 7), 16),
            };
        }
    }

    const rgbMatch = color.match(/^rgba?\(([^)]+)\)$/);
    if (rgbMatch) {
        const [r, g, b] = rgbMatch[1]
            .split(',')
            .slice(0, 3)
            .map((part) => parseFloat(part.trim()));
        if ([r, g, b].every((v) => Number.isFinite(v))) {
            return {
                r: clamp(Math.round(r)),
                g: clamp(Math.round(g)),
                b: clamp(Math.round(b)),
            };
        }
    }

    return null;
};

const rgbToHex = ({ r, g, b }) => {
    const toHex = (value) => clamp(Math.round(value)).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const luminance = ({ r, g, b }) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const blendRgb = (from, to, amount) => ({
    r: clamp(from.r + (to.r - from.r) * amount),
    g: clamp(from.g + (to.g - from.g) * amount),
    b: clamp(from.b + (to.b - from.b) * amount),
});

const tintWithLighting = (baseRgb, lightAmount, darkAmount) => {
    const lit = blendRgb(baseRgb, { r: 255, g: 255, b: 255 }, lightAmount);
    return blendRgb(lit, { r: 0, g: 0, b: 0 }, darkAmount);
};

const parseOffsetToUnit = (rawOffset) => {
    if (!rawOffset) return 0;
    const offset = rawOffset.trim();
    if (offset.endsWith('%')) {
        const value = parseFloat(offset.slice(0, -1));
        if (Number.isFinite(value)) return clamp(value, 0, 100) / 100;
        return 0;
    }
    const value = parseFloat(offset);
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
};

const isTransparentFill = (rawFill) => {
    if (!rawFill) return false;
    const value = rawFill.trim().toLowerCase();
    return value === 'none' || value === 'transparent';
};

const getCombinedOpacity = (el) => {
    const opacity = parseFloat(el.getAttribute('opacity') || '1');
    const fillOpacity = parseFloat(el.getAttribute('fill-opacity') || '1');
    const a = Number.isFinite(opacity) ? opacity : 1;
    const b = Number.isFinite(fillOpacity) ? fillOpacity : 1;
    return a * b;
};

const shouldPreserveHighlightFill = (el, rawFill) => {
    const rgb = parseColorToRgb(rawFill);
    if (!rgb) return false;
    const isVeryLight = luminance(rgb) > 0.9;
    const opacity = getCombinedOpacity(el);
    return isVeryLight && opacity < 0.9;
};

const recolorLinkedGradient = (doc, rawFill, baseRgb, touchedGradientIds) => {
    const match = rawFill.match(/^url\(#([^)]+)\)$/i);
    if (!match) return false;

    const gradientId = match[1];
    if (touchedGradientIds.has(gradientId)) return true;
    const gradient = doc.getElementById(gradientId);
    if (!gradient) return false;

    touchedGradientIds.add(gradientId);
    const stops = Array.from(gradient.getElementsByTagName('stop'));
    if (stops.length === 0) return true;

    stops.forEach((stop) => {
        const rawStopColor = stop.getAttribute('stop-color') || stop.style.stopColor || '';
        const stopRgb = parseColorToRgb(rawStopColor);
        const offset = parseOffsetToUnit(stop.getAttribute('offset'));

        // Preserve very bright early stops so existing glare/highlight behavior survives recoloring.
        if (stopRgb && luminance(stopRgb) > 0.92 && offset <= 0.25) {
            return;
        }

        const lightAmount = 0.35 * (1 - offset);
        const darkAmount = 0.35 * offset;
        const nextStopColor = rgbToHex(tintWithLighting(baseRgb, lightAmount, darkAmount));
        stop.setAttribute('stop-color', nextStopColor);
        stop.style.stopColor = nextStopColor;
    });

    return true;
};

export const updateElementColor = (svgString, elementId, color, type = 'fill') => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (!element) return serializeSvg(doc);

    const baseRgb = parseColorToRgb(color);
    const touchedGradientIds = new Set();
    const colorableTags = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline', 'line']);

    const applyColor = (el) => {
        const tagName = (el.tagName || '').toLowerCase();

        // Keep defs/stops untouched except gradients explicitly referenced by selected shapes.
        if (tagName === 'defs' || tagName === 'stop') {
            return;
        }

        if (colorableTags.has(tagName)) {
            const rawValue = (el.getAttribute(type) || el.style[type] || '').trim();

            if (type === 'fill' && rawValue.startsWith('url(#') && baseRgb) {
                recolorLinkedGradient(doc, rawValue, baseRgb, touchedGradientIds);
            } else if (type === 'fill') {
                const shouldRecolor =
                    rawValue === '' ||
                    (!isTransparentFill(rawValue) && !shouldPreserveHighlightFill(el, rawValue));

                if (shouldRecolor) {
                    el.setAttribute('fill', color);
                    el.style.fill = color;
                }
            } else {
                el.setAttribute(type, color);
                el.style[type] = color;
            }
        }

        Array.from(el.children).forEach((child) => applyColor(child));
    };

    applyColor(element);

    return serializeSvg(doc);
};

export const updateElementScale = (svgString, elementId, scaleFactor) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (element) {
        // We strictly follow "transform" based scaling
        // But we need to keep existing transforms if any
        // This is a naive implementation; complex transform parsing would be better
        // but for this prototype, appending/replacing scale is okay.

        // Better approach: use style transform-box: fill-box; transform-origin: center;
        // to scale from center
        element.style.transformBox = "fill-box";
        element.style.transformOrigin = "center";

        // Check existing transform
        let currentTransform = element.getAttribute("transform") || "";

        // If we already added a scale, replace it? Or just append? 
        // Let's assume we control the transform for now or just append.
        // However, repeated edits will make it grow infinitely if we multiply.
        // The "scaleFactor" should probably be absolute or we track state.
        // For a slider, usually it's "set scale to X".

        // Let's simpler approach: Use a specific attribute or regex to replace 'scale(...)'
        if (currentTransform.includes("scale(")) {
            currentTransform = currentTransform.replace(/scale\([^)]+\)/, `scale(${scaleFactor})`);
        } else {
            currentTransform += ` scale(${scaleFactor})`;
        }

        element.setAttribute("transform", currentTransform.trim());
    }

    return serializeSvg(doc);
};

export const removeElement = (svgString, elementId) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);
    if (element) {
        element.remove();
    }
    return serializeSvg(doc);
};

export const removeBackground = (svgString) => {
    const doc = parseSvg(svgString);
    const svg = doc.documentElement;

    const backgroundIds = ["background", "bg", "backdrop", "scene-bg"];
    for (const id of backgroundIds) {
        const el = doc.getElementById(id);
        if (el) {
            el.remove();
            return serializeSvg(doc);
        }
    }

    // Fallback: remove a full-canvas rect if present
    const viewBox = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
    const vbWidth = viewBox.length === 4 ? viewBox[2] : 512;
    const vbHeight = viewBox.length === 4 ? viewBox[3] : 512;

    const rects = Array.from(svg.getElementsByTagName("rect"));
    const fullRect = rects.find((rect) => {
        const x = parseFloat(rect.getAttribute("x") || "0");
        const y = parseFloat(rect.getAttribute("y") || "0");
        const w = parseFloat(rect.getAttribute("width") || "0");
        const h = parseFloat(rect.getAttribute("height") || "0");
        return x === 0 && y === 0 && w === vbWidth && h === vbHeight;
    });

    if (fullRect) {
        fullRect.remove();
    }

    return serializeSvg(doc);
};

export const addBackground = (svgString, color = '#f8fafc') => {
    const doc = parseSvg(svgString);
    const svg = doc.documentElement;

    const backgroundIds = ["background", "bg", "backdrop", "scene-bg"];
    for (const id of backgroundIds) {
        const el = doc.getElementById(id);
        if (el) {
            return serializeSvg(doc);
        }
    }

    const viewBox = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
    const vbWidth = viewBox.length === 4 ? viewBox[2] : 512;
    const vbHeight = viewBox.length === 4 ? viewBox[3] : 512;

    const rects = Array.from(svg.getElementsByTagName("rect"));
    const hasFullRect = rects.some((rect) => {
        const x = parseFloat(rect.getAttribute("x") || "0");
        const y = parseFloat(rect.getAttribute("y") || "0");
        const w = parseFloat(rect.getAttribute("width") || "0");
        const h = parseFloat(rect.getAttribute("height") || "0");
        return x === 0 && y === 0 && w === vbWidth && h === vbHeight;
    });
    if (hasFullRect) {
        return serializeSvg(doc);
    }

    const ns = svg.namespaceURI || "http://www.w3.org/2000/svg";
    const bgRect = doc.createElementNS(ns, "rect");
    bgRect.setAttribute("id", "background");
    bgRect.setAttribute("x", "0");
    bgRect.setAttribute("y", "0");
    bgRect.setAttribute("width", String(vbWidth));
    bgRect.setAttribute("height", String(vbHeight));
    bgRect.setAttribute("fill", color);

    const defs = Array.from(svg.children).find((child) => {
        const tagName = child.tagName?.toLowerCase?.() || "";
        return tagName === "defs" || tagName.endsWith(":defs");
    });

    if (defs && defs.nextSibling) {
        svg.insertBefore(bgRect, defs.nextSibling);
    } else if (defs) {
        svg.appendChild(bgRect);
    } else if (svg.firstChild) {
        svg.insertBefore(bgRect, svg.firstChild);
    } else {
        svg.appendChild(bgRect);
    }

    return serializeSvg(doc);
};

export const updateElementPosition = (svgString, elementId, deltaX, deltaY) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (!element) return svgString;

    // Get current transform attribute
    let transform = element.getAttribute('transform') || '';

    // Parse existing translate values if any
    const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    let currentX = 0;
    let currentY = 0;

    if (translateMatch) {
        currentX = parseFloat(translateMatch[1]) || 0;
        currentY = parseFloat(translateMatch[2]) || 0;
        // Remove existing translate from transform
        transform = transform.replace(/translate\([^)]+\)/, '').trim();
    }

    // Calculate new position
    const newX = currentX + deltaX;
    const newY = currentY + deltaY;

    // Add new translate at the beginning
    const newTranslate = `translate(${newX}, ${newY})`;
    transform = transform ? `${newTranslate} ${transform}` : newTranslate;

    element.setAttribute('transform', transform);

    return serializeSvg(doc);
};

export const duplicateElement = (svgString, elementId, newIdOverride = null) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (!element) return svgString;

    // Clone the element
    const clone = element.cloneNode(true);

    // Generate a new unique ID
    const timestamp = Date.now();
    const newId = newIdOverride || `${elementId}_copy_${timestamp}`;
    clone.setAttribute('id', newId);

    // Offset the duplicate slightly so it's visible
    let transform = clone.getAttribute('transform') || '';
    const translateMatch = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
    let currentX = 0;
    let currentY = 0;

    if (translateMatch) {
        currentX = parseFloat(translateMatch[1]) || 0;
        currentY = parseFloat(translateMatch[2]) || 0;
        transform = transform.replace(/translate\([^)]+\)/, '').trim();
    }

    // Offset by 20px
    const newTranslate = `translate(${currentX + 20}, ${currentY + 20})`;
    transform = transform ? `${newTranslate} ${transform}` : newTranslate;
    clone.setAttribute('transform', transform);

    // Insert the clone after the original element
    element.parentNode.insertBefore(clone, element.nextSibling);

    return serializeSvg(doc);
};


export const moveLayerUp = (svgString, elementId) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (!element) return svgString;

    const previousSibling = element.previousElementSibling;
    if (previousSibling) {
        element.parentNode.insertBefore(element, previousSibling);
    }

    return serializeSvg(doc);
};

export const moveLayerDown = (svgString, elementId) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (!element) return svgString;

    const nextSibling = element.nextElementSibling;
    if (nextSibling) {
        element.parentNode.insertBefore(nextSibling, element);
    }

    return serializeSvg(doc);
};

export const moveLayerBefore = (svgString, elementId, targetId) => {
    if (elementId === targetId) return svgString;
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);
    const target = doc.getElementById(targetId);

    if (!element || !target) return svgString;
    if (!element.parentNode || !target.parentNode) return svgString;
    if (element.parentNode !== target.parentNode) return svgString;

    element.parentNode.insertBefore(element, target);
    return serializeSvg(doc);
};

export const moveLayerAfter = (svgString, elementId, targetId) => {
    if (elementId === targetId) return svgString;
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);
    const target = doc.getElementById(targetId);

    if (!element || !target) return svgString;
    if (!element.parentNode || !target.parentNode) return svgString;
    if (element.parentNode !== target.parentNode) return svgString;

    const nextSibling = target.nextElementSibling;
    if (nextSibling) {
        element.parentNode.insertBefore(element, nextSibling);
    } else {
        element.parentNode.appendChild(element);
    }

    return serializeSvg(doc);
};

export const parseLayerTree = (svgString) => {
    const doc = parseSvg(svgString);
    const svg = doc.documentElement;

    const buildTree = (element, depth = 0) => {
        const children = Array.from(element.children);
        return children
            .filter(child => child.id) // Only include elements with IDs
            .map(child => ({
                id: child.id,
                tag: child.tagName,
                depth,
                hasChildren: child.children.length > 0,
                children: buildTree(child, depth + 1)
            }));
    };

    return buildTree(svg);
};
