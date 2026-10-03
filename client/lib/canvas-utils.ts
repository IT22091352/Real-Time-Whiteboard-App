import { Point, StrokeData } from '../types/whiteboard';

const imageCache = new Map<string, HTMLImageElement>();

export function normalizePoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
  pan: { x: number; y: number } = { x: 0, y: 0 },
  zoom: number = 1.0
): Point {
  const rect = canvas.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;

  const worldX = (screenX - pan.x) / zoom;
  const worldY = (screenY - pan.y) / zoom;

  return {
    x: worldX / rect.width,
    y: worldY / rect.height,
  };
}

export function denormalizePoint(canvasWidth: number, canvasHeight: number, point: Point): { x: number; y: number } {
  return {
    x: point.x * canvasWidth,
    y: point.y * canvasHeight,
  };
}

/**
 * Draw a single object or stroke onto the 2D canvas
 */
export function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: StrokeData,
  canvasWidth: number,
  canvasHeight: number,
  isSelected: boolean = false
) {
  if (stroke.isDeleted) return;

  const tool = stroke.tool || 'brush';
  const color = stroke.color || '#000000';
  const fillColor = stroke.fillColor || 'transparent';
  const rotation = stroke.rotation || 0;

  ctx.save();

  // Handle object rotation centered around object bounding box
  const bounds = getObjectBoundingBox(stroke, canvasWidth, canvasHeight);
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  if (rotation !== 0) {
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  ctx.lineCap = tool === 'eraser' ? 'square' : 'round';
  ctx.lineJoin = tool === 'eraser' ? 'miter' : 'round';
  ctx.lineWidth = stroke.size || 4;

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
  } else if (tool === 'highlighter' || stroke.isHighlighter) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = color;
    ctx.fillStyle = fillColor === 'transparent' ? 'transparent' : fillColor;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
    ctx.strokeStyle = color;
    ctx.fillStyle = fillColor === 'transparent' ? 'transparent' : fillColor;
  }

  // Get points
  const pts = (stroke.points || []).map((p) => denormalizePoint(canvasWidth, canvasHeight, p));
  let startX = pts[0]?.x || 0;
  let startY = pts[0]?.y || 0;
  let endX = pts[pts.length - 1]?.x || startX;
  let endY = pts[pts.length - 1]?.y || startY;

  const isFreehand = tool === 'brush' || tool === 'eraser' || tool === 'highlighter';

  if (!isFreehand && stroke.x !== undefined && stroke.y !== undefined) {
    startX = stroke.x * canvasWidth;
    startY = stroke.y * canvasHeight;
    if (stroke.width !== undefined && stroke.height !== undefined) {
      endX = startX + stroke.width * canvasWidth;
      endY = startY + stroke.height * canvasHeight;
    }
  }

  const minX = Math.min(startX, endX);
  const minY = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);

  switch (tool) {
    case 'brush':
    case 'highlighter':
    case 'eraser': {
      if (pts.length === 0) break;
      if (pts.length === 1) {
        ctx.beginPath();
        if (tool === 'eraser') {
          ctx.rect(pts[0].x - stroke.size / 2, pts[0].y - stroke.size / 2, stroke.size, stroke.size);
          ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.arc(pts[0].x, pts[0].y, stroke.size / 2, 0, Math.PI * 2);
          ctx.fillStyle = color;
        }
        ctx.fill();
        break;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const midX = (pts[i].x + pts[i + 1].x) / 2;
        const midY = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      break;
    }

    case 'image':
    case 'pdf_page': {
      if (stroke.assetUrl) {
        const img = imageCache.get(stroke.assetUrl);
        if (img && img.complete && img.naturalWidth !== 0) {
          ctx.drawImage(img, minX, minY, width || 200, height || 150);
        } else {
          if (!img) {
            const newImg = new Image();
            newImg.crossOrigin = 'anonymous';
            newImg.src = stroke.assetUrl;
            newImg.onload = () => {
              imageCache.set(stroke.assetUrl!, newImg);
            };
            imageCache.set(stroke.assetUrl, newImg);
          }
          // Placeholder loading box
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(minX, minY, width || 200, height || 150);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px sans-serif';
          ctx.fillText('Loading Image...', minX + 10, minY + 20);
        }
      }
      break;
    }

    case 'line': {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      break;
    }

    case 'arrow':
    case 'connector': {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const angle = Math.atan2(endY - startY, endX - startX);
      const headLength = Math.max(12, stroke.size * 3);
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(angle - Math.PI / 6),
        endY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        endX - headLength * Math.cos(angle + Math.PI / 6),
        endY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      break;
    }

    case 'rectangle': {
      ctx.beginPath();
      ctx.rect(minX, minY, width, height);
      if (fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'ellipse': {
      ctx.beginPath();
      const radiusX = width / 2;
      const radiusY = height / 2;
      const cX = minX + radiusX;
      const cY = minY + radiusY;
      ctx.ellipse(cX, cY, Math.max(1, radiusX), Math.max(1, radiusY), 0, 0, Math.PI * 2);
      if (fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'triangle': {
      ctx.beginPath();
      ctx.moveTo(minX + width / 2, minY);
      ctx.lineTo(minX + width, minY + height);
      ctx.lineTo(minX, minY + height);
      ctx.closePath();
      if (fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'diamond': {
      ctx.beginPath();
      ctx.moveTo(minX + width / 2, minY);
      ctx.lineTo(minX + width, minY + height / 2);
      ctx.lineTo(minX + width / 2, minY + height);
      ctx.lineTo(minX, minY + height / 2);
      ctx.closePath();
      if (fillColor !== 'transparent') {
        ctx.fill();
      }
      ctx.stroke();
      break;
    }

    case 'polygon': {
      if (pts.length < 3) {
        ctx.beginPath();
        ctx.rect(minX, minY, width, height);
        if (fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        if (fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
      }
      break;
    }

    case 'text': {
      const fontSize = stroke.fontSize || 18;
      const lineHeight = fontSize * 1.25;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      const textVal = stroke.text || 'Text';
      const lines = textVal.split('\n');
      lines.forEach((line, idx) => {
        ctx.fillText(line, startX, startY + idx * lineHeight);
      });
      break;
    }

    case 'sticky': {
      const stickyBg = fillColor !== 'transparent' ? fillColor : '#fef08a';
      ctx.fillStyle = stickyBg;
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1;

      const stickyW = Math.max(120, width);
      const stickyH = Math.max(100, height);

      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;
      ctx.fillRect(startX, startY, stickyW, stickyH);
      ctx.strokeRect(startX, startY, stickyW, stickyH);

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      const fontSize = stroke.fontSize || 14;
      const lineHeight = fontSize * 1.3;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.fillStyle = color === '#ffffff' ? '#1e293b' : color;
      ctx.textBaseline = 'top';

      const textVal = stroke.text || 'Sticky Note';
      const paragraphs = textVal.split('\n');
      let lineY = startY + 12;
      const padding = 12;
      const maxTextW = stickyW - padding * 2;

      paragraphs.forEach((paragraph) => {
        const words = paragraph.split(' ');
        let line = '';
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxTextW && n > 0) {
            ctx.fillText(line, startX + padding, lineY);
            line = words[n] + ' ';
            lineY += lineHeight;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, startX + padding, lineY);
        lineY += lineHeight;
      });
      break;
    }

    case 'group': {
      // Group visual container bounding box
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(minX, minY, width, height);
      break;
    }
  }

  // Single Object Selection Box, Resize Handles, and Rotation Handle
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);

    ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);

    // Rotation stem & handle
    const topCenterX = bounds.x + bounds.width / 2;
    const topY = bounds.y - 4;
    const rotHandleY = topY - 24;

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(topCenterX, topY);
    ctx.lineTo(topCenterX, rotHandleY);
    ctx.stroke();

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(topCenterX, rotHandleY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Corner handle grips
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    const grips = [
      { x: bounds.x - 7, y: bounds.y - 7 },
      { x: bounds.x + bounds.width + 1, y: bounds.y - 7 },
      { x: bounds.x - 7, y: bounds.y + bounds.height + 1 },
      { x: bounds.x + bounds.width + 1, y: bounds.y + bounds.height + 1 },
    ];

    grips.forEach((g) => {
      ctx.fillRect(g.x, g.y, 7, 7);
      ctx.strokeRect(g.x, g.y, 7, 7);
    });

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Get pixel bounding box for hit-testing and selection
 */
export function getObjectBoundingBox(stroke: StrokeData, canvasWidth: number, canvasHeight: number) {
  const pts = (stroke.points || []).map((p) => denormalizePoint(canvasWidth, canvasHeight, p));
  const isFreehand = !stroke.tool || stroke.tool === 'brush' || stroke.tool === 'eraser' || stroke.tool === 'highlighter';

  if (!isFreehand && stroke.x !== undefined && stroke.y !== undefined) {
    const x = stroke.x * canvasWidth;
    const y = stroke.y * canvasHeight;

    if (stroke.tool === 'text') {
      const fontSize = stroke.fontSize || 18;
      const lineHeight = fontSize * 1.25;
      const lines = (stroke.text || 'Text').split('\n');
      const lineCount = lines.length;
      let maxChars = 0;
      lines.forEach((l) => {
        if (l.length > maxChars) maxChars = l.length;
      });

      const measuredW = Math.max(40, stroke.width ? stroke.width * canvasWidth : maxChars * fontSize * 0.6 + 12);
      const measuredH = Math.max(fontSize * 1.25, stroke.height ? stroke.height * canvasHeight : lineCount * lineHeight + 8);

      return {
        x,
        y,
        width: measuredW,
        height: measuredH,
      };
    }

    if (stroke.width !== undefined && stroke.height !== undefined) {
      const w = stroke.width * canvasWidth;
      const h = stroke.height * canvasHeight;
      return {
        x: Math.min(x, x + w),
        y: Math.min(y, y + h),
        width: Math.max(10, Math.abs(w)),
        height: Math.max(10, Math.abs(h)),
      };
    }
  }

  if (pts.length === 0) return { x: 0, y: 0, width: 20, height: 20 };

  let minX = pts[0].x;
  let maxX = pts[0].x;
  let minY = pts[0].y;
  let maxY = pts[0].y;

  pts.forEach((p) => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  return {
    x: minX,
    y: minY,
    width: Math.max(10, maxX - minX),
    height: Math.max(10, maxY - minY),
  };
}

/**
 * Combined Bounding Box for Multi-Selection
 */
export function getMultiObjectBoundingBox(strokes: StrokeData[], canvasWidth: number, canvasHeight: number) {
  if (strokes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  strokes.forEach((s) => {
    if (s.isDeleted) return;
    const bounds = getObjectBoundingBox(s, canvasWidth, canvasHeight);
    if (bounds.x < minX) minX = bounds.x;
    if (bounds.y < minY) minY = bounds.y;
    if (bounds.x + bounds.width > maxX) maxX = bounds.x + bounds.width;
    if (bounds.y + bounds.height > maxY) maxY = bounds.y + bounds.height;
  });

  if (minX === Infinity || minY === Infinity) return null;

  return {
    x: minX,
    y: minY,
    width: Math.max(20, maxX - minX),
    height: Math.max(20, maxY - minY),
  };
}

/**
 * Hit test accounting for 2D matrix object rotation
 */
export function isPointInsideObject(point: Point, stroke: StrokeData, canvasWidth: number, canvasHeight: number): boolean {
  if (stroke.isDeleted) return false;
  const bounds = getObjectBoundingBox(stroke, canvasWidth, canvasHeight);
  let px = point.x * canvasWidth;
  let py = point.y * canvasHeight;

  // Inverse 2D rotation matrix transform if object is rotated
  const rotation = stroke.rotation || 0;
  if (rotation !== 0) {
    const cX = bounds.x + bounds.width / 2;
    const cY = bounds.y + bounds.height / 2;
    const rad = (-rotation * Math.PI) / 180;

    const dx = px - cX;
    const dy = py - cY;

    px = cX + (dx * Math.cos(rad) - dy * Math.sin(rad));
    py = cY + (dx * Math.sin(rad) + dy * Math.cos(rad));
  }

  const padding = 10;
  return (
    px >= bounds.x - padding &&
    px <= bounds.x + bounds.width + padding &&
    py >= bounds.y - padding &&
    py <= bounds.y + bounds.height + padding
  );
}

export function redrawFullCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: StrokeData[],
  width: number,
  height: number,
  selectedIds: string[] = [],
  pan: { x: number; y: number } = { x: 0, y: 0 },
  zoom: number = 1.0
) {
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  ctx.translate(pan.x, pan.y);
  ctx.scale(zoom, zoom);

  const selectedSet = new Set(selectedIds);

  strokes.forEach((stroke) => {
    if (!stroke.isDeleted) {
      drawStroke(ctx, stroke, width, height, selectedSet.size === 1 && selectedSet.has(stroke.id));
    }
  });

  // Render Combined Multi-Selection Bounding Box & Handles if multiple objects are selected
  if (selectedSet.size > 1) {
    const selectedStrokes = strokes.filter((s) => selectedSet.has(s.id) && !s.isDeleted);
    const combinedBounds = getMultiObjectBoundingBox(selectedStrokes, width, height);

    if (combinedBounds) {
      ctx.save();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(combinedBounds.x - 6, combinedBounds.y - 6, combinedBounds.width + 12, combinedBounds.height + 12);

      // Rotation Handle
      const topCenterX = combinedBounds.x + combinedBounds.width / 2;
      const topY = combinedBounds.y - 6;
      const rotHandleY = topY - 26;

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(topCenterX, topY);
      ctx.lineTo(topCenterX, rotHandleY);
      ctx.stroke();

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(topCenterX, rotHandleY, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Corner Grips
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      const grips = [
        { x: combinedBounds.x - 9, y: combinedBounds.y - 9 },
        { x: combinedBounds.x + combinedBounds.width + 2, y: combinedBounds.y - 9 },
        { x: combinedBounds.x - 9, y: combinedBounds.y + combinedBounds.height + 2 },
        { x: combinedBounds.x + combinedBounds.width + 2, y: combinedBounds.y + combinedBounds.height + 2 },
      ];

      grips.forEach((g) => {
        ctx.fillRect(g.x, g.y, 7, 7);
        ctx.strokeRect(g.x, g.y, 7, 7);
      });

      ctx.restore();
    }
  }

  ctx.restore();
}
