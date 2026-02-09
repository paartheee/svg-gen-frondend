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

export const updateElementRotation = (svgString, elementId, angle) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (element) {
        // Better approach: use style transform-box: fill-box; transform-origin: center;
        element.style.transformBox = "fill-box";
        element.style.transformOrigin = "center";

        let currentTransform = element.getAttribute("transform") || "";

        if (currentTransform.includes("rotate(")) {
            currentTransform = currentTransform.replace(/rotate\([^)]+\)/, `rotate(${angle})`);
        } else {
            currentTransform += ` rotate(${angle})`;
        }
        element.setAttribute("transform", currentTransform.trim());
    }
    return serializeSvg(doc);
};

export const updateElementOpacity = (svgString, elementId, opacity) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);
    if (element) {
        element.setAttribute("opacity", opacity);
        element.style.opacity = opacity;
    }
    return serializeSvg(doc);
};

export const updateElementStroke = (svgString, elementId, strokeColor, strokeWidth) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);
    if (element) {
        if (strokeColor !== undefined) {
            element.setAttribute("stroke", strokeColor);
            element.style.stroke = strokeColor;
        }
        if (strokeWidth !== undefined) {
            element.setAttribute("stroke-width", strokeWidth);
            element.style.strokeWidth = strokeWidth;
        }
    }
    return serializeSvg(doc);
};

export const applyTheme = (svgString, theme) => {
    const doc = parseSvg(svgString);
    const svg = doc.documentElement;


    // 2. Collect all unique colors
    // Filter out the background element so it's not affected by the theme
    const elements = Array.from(svg.querySelectorAll('*')).filter(el => el.id !== 'background');
    const colorMap = new Map();

    const processColor = (colorStr) => {
        if (!colorStr) return;
        const rgb = parseColorToRgb(colorStr);
        if (rgb) {
            const key = colorStr.trim().toLowerCase();
            if (!colorMap.has(key)) colorMap.set(key, rgb);
        }
    };

    elements.forEach(el => {
        processColor(el.getAttribute('fill'));
        processColor(el.style.fill);
        processColor(el.getAttribute('stroke'));
        processColor(el.style.stroke);
        if (el.tagName.toLowerCase() === 'stop') {
            processColor(el.getAttribute('stop-color'));
            processColor(el.style.stopColor);
        }
    });

    // 3. Sort existing colors by luminance
    const distinctColors = Array.from(colorMap.keys()).sort((a, b) => {
        return luminance(colorMap.get(a)) - luminance(colorMap.get(b));
    });

    // 4. Sort theme colors by luminance
    const themeColorsRgb = theme.colors.map(c => ({ original: c, rgb: parseColorToRgb(c) }))
        .filter(c => c.rgb)
        .sort((a, b) => luminance(a.rgb) - luminance(b.rgb));

    if (themeColorsRgb.length === 0) return serializeSvg(doc);

    // 5. Create Mapping
    const mapping = new Map();
    distinctColors.forEach((originalColor, index) => {
        // Quantile mapping
        const pct = index / (Math.max(1, distinctColors.length - 1));
        const themeIndex = Math.floor(pct * (themeColorsRgb.length - 1));
        const clampedIndex = Math.min(Math.max(0, themeIndex), themeColorsRgb.length - 1);

        mapping.set(originalColor, themeColorsRgb[clampedIndex].original);
    });

    // 6. Apply Mapping
    const applyToAttribute = (el, attr) => {
        const val = el.getAttribute(attr);
        if (val) {
            const key = val.trim().toLowerCase();
            if (mapping.has(key)) el.setAttribute(attr, mapping.get(key));
        }
        const styleVal = el.style[attr];
        if (styleVal) {
            const key = styleVal.trim().toLowerCase();
            if (mapping.has(key)) el.style[attr] = mapping.get(key);
        }
    };

    elements.forEach(el => {
        applyToAttribute(el, 'fill');
        applyToAttribute(el, 'stroke');
        if (el.tagName.toLowerCase() === 'stop') {
            applyToAttribute(el, 'stop-color');
            if (el.style.stopColor) {
                const key = el.style.stopColor.trim().toLowerCase();
                if (mapping.has(key)) el.style.stopColor = mapping.get(key);
            }
        }
    });

    return serializeSvg(doc);
};

export const getSvgViewBox = (svgString) => {
    const doc = parseSvg(svgString);
    const svg = doc.documentElement;
    const viewBox = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
    return {
        x: viewBox[0] || 0,
        y: viewBox[1] || 0,
        width: viewBox[2] || 512,
        height: viewBox[3] || 512
    };
};

export const injectSvgString = (svgString, snippet, x, y) => {
    const doc = parseSvg(svgString);
    const svg = doc.documentElement;

    // Parse the snippet
    const snippetDoc = parseSvg(snippet);
    const snippetRoot = snippetDoc.documentElement;

    if (!snippetRoot) return { svg: svgString, newId: null };

    // Create a group
    const newId = `asset_${Date.now()}`;
    const g = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", newId);

    // Position
    // If x and y are not provided, center it
    if (x === undefined || y === undefined) {
        const vb = getSvgViewBox(svgString);
        const targetX = x !== undefined ? x : vb.width / 2;
        const targetY = y !== undefined ? y : vb.height / 2;
        // We might need to center the snippet itself, but we don't know its bbox without rendering.
        // Just place at target for now.
        g.setAttribute("transform", `translate(${targetX}, ${targetY})`);
    } else {
        g.setAttribute("transform", `translate(${x}, ${y})`);
    }

    // Move children
    if (snippetRoot.tagName.toLowerCase() === 'svg') {
        // Copy attributes if needed? usually we just want content
        while (snippetRoot.firstChild) {
            g.appendChild(snippetRoot.firstChild);
        }
    } else {
        g.appendChild(snippetRoot);
    }

    svg.appendChild(g);

    return {
        svg: serializeSvg(doc),
        newId: newId
    };
};

export const extractSvgSnippet = (svgString, elementIds) => {
    const doc = parseSvg(svgString);

    // Create a new SVG document for the snippet
    const newDoc = document.implementation.createDocument("http://www.w3.org/2000/svg", "svg", null);
    const newSvg = newDoc.documentElement;
    newSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    newSvg.setAttribute("viewBox", "0 0 100 100"); // Dummy viewbox, preview will handle scaling

    // Clone elements
    elementIds.forEach(id => {
        const el = doc.getElementById(id);
        if (el) {
            newSvg.appendChild(el.cloneNode(true));
        }
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(newDoc);
};

export const addAnimation = (svgString, elementId, config) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (!element) return svgString;

    // Remove existing animations on this element first to avoid conflicts
    const existingAnims = element.querySelectorAll('animate, animateTransform');
    existingAnims.forEach(anim => anim.remove());

    const { type, duration, repeat } = config;
    let animEl;

    if (type === 'spin') {
        animEl = doc.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
        animEl.setAttribute("attributeName", "transform");
        animEl.setAttribute("attributeType", "XML");
        animEl.setAttribute("type", "rotate");
        // We need to rotate around the center.
        // Getting bbox is hard without rendering.
        // We can try to use 0 0 0 to 360 0 0 if we assume it's centered or if we wrap it?
        // Better strategy for robustness: 
        // 1. If it's a basic shape, we can estimate center? No.
        // 2. We can assume the user has centered the object or we rotate around 'center' which defaults to 0,0.
        // A tricky part of SVG rotation.
        // Workaround: Rotate from 0 to 360. If the object is not at 0,0, it will orbit.
        // FIX: We rely on the user having positioned "groups" or using `transform-origin` style if supported.
        // BUT `animateTransform` overrides.
        // Let's try to find center if possible or just use a generic rotation.

        // Actually, best bet for "Spin" without knowing center is to assume center is calculated or use CSS?
        // Let's stick to simple 0 to 360 for now, but maybe inject `transform-origin: center` style?
        // `transform-box: fill-box; transform-origin: center;` works well in modern SVG!
        element.style.transformBox = 'fill-box';
        element.style.transformOrigin = 'center';

        animEl.setAttribute("from", "0");
        animEl.setAttribute("to", "360");
        animEl.setAttribute("dur", `${duration}s`);
        animEl.setAttribute("repeatCount", repeat);
    }
    else if (type === 'pulse') {
        // Pulse scale
        element.style.transformBox = 'fill-box';
        element.style.transformOrigin = 'center';

        animEl = doc.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
        animEl.setAttribute("attributeName", "transform");
        animEl.setAttribute("type", "scale");
        animEl.setAttribute("values", "1; 1.1; 1");
        animEl.setAttribute("dur", `${duration}s`);
        animEl.setAttribute("repeatCount", repeat);
        animEl.setAttribute("calcMode", "spline");
        animEl.setAttribute("keySplines", "0.4 0 0.2 1; 0.4 0 0.2 1"); // Ease in out
    }
    else if (type === 'blink') {
        animEl = doc.createElementNS("http://www.w3.org/2000/svg", "animate");
        animEl.setAttribute("attributeName", "opacity");
        animEl.setAttribute("values", "1; 0.3; 1");
        animEl.setAttribute("dur", `${duration}s`);
        animEl.setAttribute("repeatCount", repeat);
    }
    else if (type === 'float') {
        animEl = doc.createElementNS("http://www.w3.org/2000/svg", "animateTransform");
        animEl.setAttribute("attributeName", "transform");
        animEl.setAttribute("type", "translate");
        animEl.setAttribute("values", "0,0; 0,-10; 0,0"); // Simple float up down
        animEl.setAttribute("dur", `${duration}s`);
        animEl.setAttribute("repeatCount", repeat);
        animEl.setAttribute("calcMode", "spline");
        animEl.setAttribute("keySplines", "0.4 0 0.2 1; 0.4 0 0.2 1");
        // Note: Translate might overwrite position if not carefully composed.
        // Ideally we wrap in a group <g> and animate the group.
        // But for now replacing the transform is the behavior of animateTransform unless additive="sum".
        animEl.setAttribute("additive", "sum");
    }

    if (animEl) {
        element.appendChild(animEl);
    }

    return serializeSvg(doc);
};

export const removeAnimation = (svgString, elementId) => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);
    if (!element) return svgString;

    const existingAnims = element.querySelectorAll('animate, animateTransform');
    existingAnims.forEach(anim => anim.remove());

    // Also clean up style props we added
    if (element.style.transformBox === 'fill-box') {
        element.style.removeProperty('transform-box');
        element.style.removeProperty('transform-origin');
    }

    return serializeSvg(doc);
};
