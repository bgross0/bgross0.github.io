class FootprintLayer extends Layer {
  constructor(options = {}) {
    super('footprint', { zIndex: 0, ...options });
    this.footprint = null;
    this.fillColor = 'rgba(200, 200, 200, 0.3)';
    this.strokeColor = '#333';
    this.selectedColor = '#0066cc';
    this.isSelected = false;
    this.isDragging = false;
    this.dragStart = null;
    this.isDrawing = false;
    this.drawStart = null;
    this.currentTool = 'rectangle';
  }
  
  setFootprint(footprint) {
    this.footprint = footprint;
    if (this.surface) {
      this.surface.draw();
    }
  }
  
  draw(ctx) {
    if (!this.footprint) return;
    
    const surface = this.surface;
    const { origin, width_ft, length_ft } = this.footprint;
    
    // Convert to pixels
    const x = surface.feetToPixels(origin.x);
    const y = surface.feetToPixels(origin.y);
    const width = surface.feetToPixels(width_ft);
    const height = surface.feetToPixels(length_ft);
    
    // Draw rectangle
    if (this.isDrawing) {
      // Preview style while drawing
      ctx.fillStyle = 'rgba(100, 100, 200, 0.2)';
      ctx.strokeStyle = '#0066cc';
      ctx.lineWidth = 2 / surface.zoom;
      ctx.setLineDash([5 / surface.zoom, 5 / surface.zoom]);
    } else {
      // Final style
      ctx.fillStyle = this.fillColor;
      ctx.strokeStyle = this.isSelected ? this.selectedColor : this.strokeColor;
      ctx.lineWidth = 2 / surface.zoom;
      ctx.setLineDash([]);
    }
    
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // Reset line dash
    ctx.setLineDash([]);
    
    // Draw resize handles when selected
    if (this.isSelected && !this.isDrawing) {
      this.drawHandles(ctx, x, y, width, height);
    }
  }
  
  drawHandles(ctx, x, y, width, height) {
    const handleSize = 8 / this.surface.zoom;
    
    ctx.fillStyle = this.selectedColor;
    
    // Corner handles
    const handles = [
      { x: x, y: y },                          // Top-left
      { x: x + width, y: y },                  // Top-right
      { x: x + width, y: y + height },         // Bottom-right
      { x: x, y: y + height }                  // Bottom-left
    ];
    
    handles.forEach(handle => {
      ctx.fillRect(
        handle.x - handleSize / 2,
        handle.y - handleSize / 2,
        handleSize,
        handleSize
      );
    });
  }
  
  handleMouseDown(e) {
    const rect = this.surface.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldPos = this.surface.toWorldCoords(mouseX, mouseY);
    
    console.log('FootprintLayer.handleMouseDown:', {
      tool: this.currentTool,
      mouseX, mouseY,
      worldPos,
      currentFootprint: this.footprint
    });
    
    if (this.currentTool === 'rectangle') {
      // Start drawing new rectangle
      this.isDrawing = true;
      this.drawStart = worldPos;
      
      // Apply grid snap if enabled
      const gridLayer = this.surface.layers.find(l => l.id === 'grid');
      if (gridLayer && gridLayer.snap) {
        this.drawStart = gridLayer.snapToGrid(this.drawStart.x, this.drawStart.y);
      }
      
      // Create initial footprint
      this.footprint = {
        origin: { 
          x: this.surface.pixelsToFeet(this.drawStart.x), 
          y: this.surface.pixelsToFeet(this.drawStart.y) 
        },
        width_ft: 0.1,
        length_ft: 0.1
      };
      
      // Trigger a redraw
      this.surface.draw();
      
      return true;
    } else if (this.currentTool === 'select' && this.footprint) {
      // Check if click is inside footprint
      const { origin, width_ft, length_ft } = this.footprint;
      const x = this.surface.feetToPixels(origin.x);
      const y = this.surface.feetToPixels(origin.y);
      const width = this.surface.feetToPixels(width_ft);
      const height = this.surface.feetToPixels(length_ft);
      
      if (worldPos.x >= x && worldPos.x <= x + width &&
          worldPos.y >= y && worldPos.y <= y + height) {
        this.isSelected = true;
        this.isDragging = true;
        this.dragStart = worldPos;
        return true;
      }
    }
    
    this.isSelected = false;
    return false;
  }
  
  handleMouseMove(e) {
    const rect = this.surface.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const worldPos = this.surface.toWorldCoords(mouseX, mouseY);
    
    // Debug log for drawing
    if (this.isDrawing) {
      console.log('Drawing:', { 
        isDrawing: this.isDrawing, 
        drawStart: this.drawStart, 
        footprint: this.footprint 
      });
    }
    
    if (this.isDrawing && this.drawStart && this.footprint) {
      // Drawing new rectangle
      let endPos = worldPos;
      
      // Apply grid snap if enabled
      const gridLayer = this.surface.layers.find(l => l.id === 'grid');
      if (gridLayer && gridLayer.snap) {
        endPos = gridLayer.snapToGrid(endPos.x, endPos.y);
      }
      
      // Calculate dimensions
      const width = Math.abs(endPos.x - this.drawStart.x);
      const height = Math.abs(endPos.y - this.drawStart.y);
      
      // Ensure positive dimensions and proper origin
      this.footprint.origin.x = this.surface.pixelsToFeet(Math.min(this.drawStart.x, endPos.x));
      this.footprint.origin.y = this.surface.pixelsToFeet(Math.min(this.drawStart.y, endPos.y));
      this.footprint.width_ft = this.surface.pixelsToFeet(width);
      this.footprint.length_ft = this.surface.pixelsToFeet(height);
      
      // Update dimensions display without creating command
      console.log('Emitting footprint:preview with:', this.footprint);
      eventBus.emit('footprint:preview', this.footprint);
      this.surface.draw();
    } else if (this.isDragging && this.dragStart && this.footprint) {
      // Moving existing rectangle
      const dx = worldPos.x - this.dragStart.x;
      const dy = worldPos.y - this.dragStart.y;
      
      // Apply grid snap if enabled
      const gridLayer = this.surface.layers.find(l => l.id === 'grid');
      if (gridLayer && gridLayer.snap) {
        const newOrigin = gridLayer.snapToGrid(
          this.surface.feetToPixels(this.footprint.origin.x) + dx,
          this.surface.feetToPixels(this.footprint.origin.y) + dy
        );
        
        this.footprint.origin.x = this.surface.pixelsToFeet(newOrigin.x);
        this.footprint.origin.y = this.surface.pixelsToFeet(newOrigin.y);
      } else {
        this.footprint.origin.x += this.surface.pixelsToFeet(dx);
        this.footprint.origin.y += this.surface.pixelsToFeet(dy);
      }
      
      this.dragStart = worldPos;
      
      // Update display without creating command
      eventBus.emit('footprint:preview', this.footprint);
      this.surface.draw();
    }
  }
  
  handleMouseUp(e) {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.drawStart = null;
      
      // Validate minimum size
      if (this.footprint.width_ft < 1 || this.footprint.length_ft < 1) {
        this.footprint = null;
        eventBus.emit('footprint:change', null);
        eventBus.emit('footprint:preview', null);
      } else {
        // Just emit the footprint change, don't generate structure
        eventBus.emit('footprint:change', this.footprint);
      }
    }
    
    if (this.isDragging && this.footprint) {
      // Emit final position after dragging
      eventBus.emit('footprint:change', this.footprint);
    }
    
    this.isDragging = false;
    this.dragStart = null;
  }
  
  setTool(tool) {
    this.currentTool = tool;
    this.isSelected = false;
    
    // Clear any drawing state when switching tools
    this.isDrawing = false;
    this.drawStart = null;
  }
}