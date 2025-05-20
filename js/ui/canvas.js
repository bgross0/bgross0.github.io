class DrawingSurface {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.pixelsPerFoot = options.pixelsPerFoot || 20;
    this.pan = { x: 0, y: 0 };
    this.zoom = 1;
    this.layers = [];
    
    this.setupCanvas();
    this.setupEventListeners();
  }
  
  setupCanvas() {
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    // Set canvas size in CSS
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    
    // Center the view
    this.pan.x = rect.width / 2;
    this.pan.y = rect.height / 2;
  }
  
  addLayer(layer) {
    this.layers.push(layer);
    layer.surface = this;
    this.layers.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    return this;
  }
  
  removeLayer(layer) {
    const index = this.layers.indexOf(layer);
    if (index > -1) {
      this.layers.splice(index, 1);
    }
    return this;
  }
  
  clear() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);
    return this;
  }
  
  draw() {
    this.clear();
    
    this.ctx.save();
    this.ctx.translate(this.pan.x, this.pan.y);
    this.ctx.scale(this.zoom, this.zoom);
    
    this.layers.forEach(layer => {
      if (layer.visible) {
        this.ctx.save();
        layer.draw(this.ctx);
        this.ctx.restore();
      }
    });
    
    this.ctx.restore();
    return this;
  }
  
  setupEventListeners() {
    let isPanning = false;
    let lastX = 0;
    let lastY = 0;
    
    this.canvas.addEventListener('mousedown', (e) => {
      // Only pan with middle mouse button or right-click + shift
      if (e.button === 1 || (e.button === 2 && e.shiftKey)) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        e.preventDefault();
      }
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      if (isPanning) {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        
        this.pan.x += dx;
        this.pan.y += dy;
        
        lastX = e.clientX;
        lastY = e.clientY;
        
        this.draw();
      }
    });
    
    this.canvas.addEventListener('mouseup', () => {
      isPanning = false;
    });
    
    // Prevent context menu on right-click
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const zoomSpeed = 0.1;
      const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
      
      const newZoom = Math.max(0.25, Math.min(8, this.zoom + delta));
      
      // Zoom towards mouse position
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const worldX = (mouseX - this.pan.x) / this.zoom;
      const worldY = (mouseY - this.pan.y) / this.zoom;
      
      this.zoom = newZoom;
      
      this.pan.x = mouseX - worldX * this.zoom;
      this.pan.y = mouseY - worldY * this.zoom;
      
      this.draw();
    });
    
    // Handle window resize
    window.addEventListener('resize', () => {
      this.setupCanvas();
      this.draw();
    });
  }
  
  toWorldCoords(screenX, screenY) {
    return {
      x: (screenX - this.pan.x) / this.zoom,
      y: (screenY - this.pan.y) / this.zoom
    };
  }
  
  toScreenCoords(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.pan.x,
      y: worldY * this.zoom + this.pan.y
    };
  }
  
  feetToPixels(feet) {
    return feet * this.pixelsPerFoot;
  }
  
  pixelsToFeet(pixels) {
    return pixels / this.pixelsPerFoot;
  }
}

// Base Layer class
class Layer {
  constructor(id, options = {}) {
    this.id = id;
    this.visible = options.visible !== false;
    this.zIndex = options.zIndex || 0;
  }
  
  draw(ctx) {
    // Override in subclasses
  }
}