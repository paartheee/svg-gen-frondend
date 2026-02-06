export const parseSvg = (svgString) => {
    const parser = new DOMParser();
    return parser.parseFromString(svgString, "image/svg+xml");
};

export const serializeSvg = (doc) => {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
};

export const updateElementColor = (svgString, elementId, color, type = 'fill') => {
    const doc = parseSvg(svgString);
    const element = doc.getElementById(elementId);

    if (element) {
        const applyColor = (el) => {
            // Apply to the element itself
            el.setAttribute(type, color);
            el.style[type] = color;

            // If it has children, recursively apply
            // We specifically want to target shapes, but applying to G is also fine for inheritance
            // However, to ensure visual update, we must override children who might have their own fill
            Array.from(el.children).forEach(child => applyColor(child));
        };

        applyColor(element);
    }

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
