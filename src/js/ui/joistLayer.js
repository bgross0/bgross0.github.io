// Joist layer for deck visualization

class JoistLayer extends Layer {
  constructor() {
    super('joists');
    this.joists = null;
    this.footprint = null;
  }
  
  setJoists(joists) {
    this.joists = joists;
  }
  
  setFootprint(footprint) {
    this.footprint = footprint;
  }
  
  draw(ctx) {
    if (!this.joists || !this.footprint) return;
    
    const { size, spacing_in, span_ft, cantilever_ft, orientation } = this.joists;
    const { origin, width_ft, length_ft } = this.footprint;
    
    ctx.save();
    
    // Convert to pixels including origin offset
    const surface = this.surface;
    const pixelsPerFoot = surface.pixelsPerFoot;
    const spacing = (spacing_in / 12) * pixelsPerFoot;
    const baseX = surface.feetToPixels(origin.x);
    const baseY = surface.feetToPixels(origin.y);
    
    // Draw joists
    ctx.strokeStyle = '#8B4513'; // Saddle brown
    ctx.lineWidth = 3;
    ctx.lineCap = 'square';
    
    // Determine actual dimensions based on orientation
    const joistLength = (span_ft + cantilever_ft) * pixelsPerFoot;
    let deckWidthPx = width_ft * pixelsPerFoot;
    let deckLengthPx = length_ft * pixelsPerFoot;
    
    // Joists span the shorter dimension
    if (orientation === 'width') {
      // Joists run horizontally (span width)
      // They are spaced vertically along the length
      const startX = baseX;
      const endX = baseX + Math.min(joistLength, deckWidthPx);
      
      // Draw first joist at y=0
      ctx.beginPath();
      ctx.moveTo(startX, baseY);
      ctx.lineTo(endX, baseY);
      ctx.stroke();
      
      // Draw intermediate joists
      for (let y = spacing; y < deckLengthPx - spacing/2; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(startX, baseY + y);
        ctx.lineTo(endX, baseY + y);
        ctx.stroke();
      }
      
      // Draw last joist at deck length
      ctx.beginPath();
      ctx.moveTo(startX, baseY + deckLengthPx);
      ctx.lineTo(endX, baseY + deckLengthPx);
      ctx.stroke();
      
      // Draw cantilever indicator if present
      if (cantilever_ft > 0) {
        this.drawCantileverIndicator(ctx, baseX, baseY, deckWidthPx, deckLengthPx, span_ft * pixelsPerFoot, cantilever_ft, pixelsPerFoot, 'horizontal');
      }
      
    } else {
      // Joists run vertically (span length)
      // They are spaced horizontally along the width
      const startY = baseY;
      const endY = baseY + Math.min(joistLength, deckLengthPx);
      
      // Draw first joist at x=0
      ctx.beginPath();
      ctx.moveTo(baseX, startY);
      ctx.lineTo(baseX, endY);
      ctx.stroke();
      
      // Draw intermediate joists
      for (let x = spacing; x < deckWidthPx - spacing/2; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(baseX + x, startY);
        ctx.lineTo(baseX + x, endY);
        ctx.stroke();
      }
      
      // Draw last joist at deck width
      ctx.beginPath();
      ctx.moveTo(baseX + deckWidthPx, startY);
      ctx.lineTo(baseX + deckWidthPx, endY);
      ctx.stroke();
      
      // Draw cantilever indicator if present
      if (cantilever_ft > 0) {
        this.drawCantileverIndicator(ctx, baseX, baseY, deckWidthPx, deckLengthPx, span_ft * pixelsPerFoot, cantilever_ft, pixelsPerFoot, 'vertical');
      }
    }
    
    // Removed joist size label from canvas to improve readability
    // This information is still shown in the sidebar
    
    ctx.restore();
  }
  
  drawCantileverIndicator(ctx, baseX, baseY, deckWidthPx, deckLengthPx, beamPosition, cantilever_ft, pixelsPerFoot, direction) {
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    if (direction === 'horizontal') {
      // Draw dashed line where beam would be (vertical line for horizontal joists)
      ctx.beginPath();
      ctx.moveTo(baseX + deckWidthPx - beamPosition, baseY);
      ctx.lineTo(baseX + deckWidthPx - beamPosition, baseY + deckLengthPx);
      ctx.stroke();
      
      ctx.setLineDash([]);
      
      // Removed cantilever label text to improve canvas readability
      
    } else {
      // Draw dashed line where beam would be (horizontal line for vertical joists)
      ctx.beginPath();
      ctx.moveTo(baseX, baseY + deckLengthPx - beamPosition);
      ctx.lineTo(baseX + deckWidthPx, baseY + deckLengthPx - beamPosition);
      ctx.stroke();
      
      ctx.setLineDash([]); 
      // No cantilever label - removed for better canvas readability
    }
  }
}

// Export for use in main app
window.JoistLayer = JoistLayer;