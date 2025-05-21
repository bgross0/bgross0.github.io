class GridLayer extends Layer {
  constructor(options = {}) {
    super('grid', { zIndex: -10, ...options });
    this.spacing_in = options.spacing_in || 6;
    this.snap = options.snap !== false;
    this.lightColor = '#e0e0e0';
    this.heavyColor = '#cccccc';
  }
  
  draw(ctx) {
    const { width, height } = ctx.canvas;
    const surface = this.surface;
    
    // Make sure we actually draw the grid on first render
    console.log('Drawing grid with spacing:', this.spacing_in, 'zoom:', surface.zoom, 'visible:', this.visible);
    
    // If grid is not visible, don't draw it
    if (!this.visible) {
      console.log('Grid not visible, skipping draw');
      return;
    }
    
    // Convert grid spacing from inches to pixels
    const spacingFt = this.spacing_in / 12;
    const spacingPx = surface.feetToPixels(spacingFt);
    
    // Ensure minimum spacing at any zoom level, but allow initial draw
    const minPixelSpacing = 5;
    if (spacingPx * surface.zoom < minPixelSpacing) {
      console.log('Grid spacing too small, skipping:', spacingPx * surface.zoom, 'pixels');
      return; // Skip drawing grid if too dense
    }
    
    // Calculate grid bounds in world coordinates
    const topLeft = surface.toWorldCoords(0, 0);
    const bottomRight = surface.toWorldCoords(width, height);
    
    // Calculate grid range
    const startX = Math.floor(topLeft.x / spacingPx) * spacingPx;
    const endX = Math.ceil(bottomRight.x / spacingPx) * spacingPx;
    const startY = Math.floor(topLeft.y / spacingPx) * spacingPx;
    const endY = Math.ceil(bottomRight.y / spacingPx) * spacingPx;
    
    // Ensure minimum line width of 0.5px regardless of zoom
    ctx.lineWidth = Math.max(0.5, 1 / surface.zoom);
    
    // Draw vertical lines
    for (let x = startX; x <= endX; x += spacingPx) {
      const screenX = x;
      const isHeavy = Math.abs(x % (spacingPx * 2)) < 0.01;
      
      ctx.strokeStyle = isHeavy ? this.heavyColor : this.lightColor;
      ctx.beginPath();
      ctx.moveTo(screenX, startY);
      ctx.lineTo(screenX, endY);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let y = startY; y <= endY; y += spacingPx) {
      const screenY = y;
      const isHeavy = Math.abs(y % (spacingPx * 2)) < 0.01;
      
      ctx.strokeStyle = isHeavy ? this.heavyColor : this.lightColor;
      ctx.beginPath();
      ctx.moveTo(startX, screenY);
      ctx.lineTo(endX, screenY);
      ctx.stroke();
    }
  }
  
  snapToGrid(x, y) {
    if (!this.snap) return { x, y };
    
    const spacingFt = this.spacing_in / 12;
    const spacingPx = this.surface.feetToPixels(spacingFt);
    
    return {
      x: Math.round(x / spacingPx) * spacingPx,
      y: Math.round(y / spacingPx) * spacingPx
    };
  }
  
  setSpacing(inches) {
    this.spacing_in = inches;
    if (this.surface) {
      this.surface.draw();
    }
  }
  
  setSnap(enabled) {
    this.snap = enabled;
  }
}