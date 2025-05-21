class BeamLayer extends Layer {
  constructor(options = {}) {
    super('beams', { zIndex: 2, ...options });
    this.beams = null;
    this.posts = null;
    this.footprint = null;
    this.cantilever_ft = 0;
    this.joistOrientation = null;
    this.beamColor = '#654321'; // Darker brown for beams
    this.postColor = '#444444'; // Dark gray for posts
    this.rimJoistColor = '#8B7355'; // Lighter brown for rim joists
  }
  
  setBeams(beams) {
    this.beams = beams;
    if (this.surface) {
      this.surface.draw();
    }
  }
  
  setPosts(posts) {
    this.posts = posts;
    if (this.surface) {
      this.surface.draw();
    }
  }
  
  setFootprint(footprint) {
    this.footprint = footprint;
    if (this.surface) {
      this.surface.draw();
    }
  }
  
  setCantilever(cantilever) {
    this.cantilever_ft = cantilever || 0;
    if (this.surface) {
      this.surface.draw();
    }
  }
  
  setJoistOrientation(orientation) {
    this.joistOrientation = orientation;
    if (this.surface) {
      this.surface.draw();
    }
  }
  
  draw(ctx) {
    // Only draw if we have beams data AND a footprint
    if (!this.beams || !this.footprint) {
      return;
    }
    
    const surface = this.surface;
    const { origin, width_ft, length_ft } = this.footprint;
    
    // Convert to pixels
    const x = surface.feetToPixels(origin.x);
    const y = surface.feetToPixels(origin.y);
    const width = surface.feetToPixels(width_ft);
    const length = surface.feetToPixels(length_ft);
    
    // Draw rim joists first (if drop beam style)
    const hasDropBeam = this.beams.some(beam => beam.style === 'drop');
    if (hasDropBeam) {
      this.drawRimJoists(ctx, x, y, width, length);
    }
    
    // Draw beams
    this.beams.forEach(beam => {
      if (beam.style === 'ledger') {
        this.drawLedger(ctx, x, y, width, length);
      } else {
        this.drawBeam(ctx, beam, x, y, width, length);
      }
    });
    
    // Draw posts
    if (this.posts) {
      this.drawPosts(ctx, x, y);
    }
  }
  
  drawRimJoists(ctx, baseX, baseY, width, length) {
    const surface = this.surface;
    const rimJoistThickness = surface.feetToPixels(0.15); // 2" thick rim joist
    
    ctx.fillStyle = this.rimJoistColor;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 / surface.zoom;
    
    // Draw rim joists on the sides perpendicular to joists
    if (this.joistOrientation === 'width') {
      // Joists run horizontally (span width), so rim joists are vertical (at left and right edges)
      // Left rim joist - inside the deck perimeter
      ctx.fillRect(baseX, baseY, rimJoistThickness, length);
      ctx.strokeRect(baseX, baseY, rimJoistThickness, length);
      
      // Right rim joist - inside the deck perimeter
      ctx.fillRect(baseX + width - rimJoistThickness, baseY, rimJoistThickness, length);
      ctx.strokeRect(baseX + width - rimJoistThickness, baseY, rimJoistThickness, length);
    } else {
      // Joists run vertically (span length), so rim joists are horizontal (at top and bottom edges)
      // Top rim joist - inside the deck perimeter
      ctx.fillRect(baseX, baseY, width, rimJoistThickness);
      ctx.strokeRect(baseX, baseY, width, rimJoistThickness);
      
      // Bottom rim joist - inside the deck perimeter
      ctx.fillRect(baseX, baseY + length - rimJoistThickness, width, rimJoistThickness);
      ctx.strokeRect(baseX, baseY + length - rimJoistThickness, width, rimJoistThickness);
    }
  }
  
  drawBeam(ctx, beam, baseX, baseY, width, length) {
    const surface = this.surface;
    const beamThickness = surface.feetToPixels(0.5); // 6" thick beam
    
    // Get cantilever from instance property
    const cantileverPx = surface.feetToPixels(this.cantilever_ft);
    
    // Position beam correctly based on its position property and joist orientation
    let beamX = baseX;
    let beamY = baseY;
    let beamLength, beamWidth;
    
    if (this.joistOrientation === 'width') {
      // Joists run horizontally (span width), beams run vertically (along length)
      beamWidth = beamThickness;
      beamLength = length;
      
      if (beam.position === 'outer') {
        // Outer beam position depends on cantilever
        beamX = baseX + width - cantileverPx;
      } else if (beam.position === 'inner' && beam.style !== 'ledger') {
        // Inner beam for freestanding deck
        beamX = baseX;
      }
      
      // Draw vertical beam
      ctx.fillStyle = this.beamColor;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / surface.zoom;
      
      ctx.fillRect(beamX - beamThickness / 2, beamY, beamThickness, beamLength);
      ctx.strokeRect(beamX - beamThickness / 2, beamY, beamThickness, beamLength);
      
    } else {
      // Joists run vertically (span length), beams run horizontally (along width)
      beamWidth = width;
      beamLength = beamThickness;
      
      if (beam.position === 'outer') {
        // Outer beam position depends on cantilever
        beamY = baseY + length - cantileverPx;
      } else if (beam.position === 'inner' && beam.style !== 'ledger') {
        // Inner beam for freestanding deck
        beamY = baseY;
      }
      
      // Draw horizontal beam
      ctx.fillStyle = this.beamColor;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2 / surface.zoom;
      
      ctx.fillRect(baseX, beamY - beamThickness / 2, width, beamThickness);
      ctx.strokeRect(baseX, beamY - beamThickness / 2, width, beamThickness);
    }
  }
  
  drawLedger(ctx, x, y, width, length) {
    const surface = this.surface;
    const ledgerThickness = surface.feetToPixels(0.15); // 2" thick ledger
    
    // Draw ledger board based on joist orientation
    ctx.fillStyle = '#8B7355'; // Lighter brown
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1 / surface.zoom;
    
    if (this.joistOrientation === 'width') {
      // Joists run horizontally (span width), ledger is on top (inner position)
      // Ledger should match the width of the deck
      ctx.fillRect(x, y, width, ledgerThickness);
      ctx.strokeRect(x, y, width, ledgerThickness);
      
      // Draw attachment pattern
      ctx.strokeStyle = '#666';
      ctx.setLineDash([5 / surface.zoom, 5 / surface.zoom]);
      
      const spacing = surface.feetToPixels(2); // 2 ft spacing
      for (let i = spacing; i < width; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(x + i, y);
        ctx.lineTo(x + i, y - ledgerThickness);
        ctx.stroke();
      }
    } else {
      // Joists run vertically (span length), ledger is on left (inner position)
      // Ledger should match the length of the deck
      ctx.fillRect(x, y, ledgerThickness, length);
      ctx.strokeRect(x, y, ledgerThickness, length);
      
      // Draw attachment pattern
      ctx.strokeStyle = '#666';
      ctx.setLineDash([5 / surface.zoom, 5 / surface.zoom]);
      
      const spacing = surface.feetToPixels(2); // 2 ft spacing
      for (let i = spacing; i < length; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, y + i);
        ctx.lineTo(x - ledgerThickness, y + i);
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);
  }
  
  drawPosts(ctx, baseX, baseY) {
    if (!this.posts) return;
    
    const surface = this.surface;
    const postSize = surface.feetToPixels(0.5); // 6" posts
    const { width_ft, length_ft } = this.footprint;
    const width = surface.feetToPixels(width_ft);
    const length = surface.feetToPixels(length_ft);
    
    ctx.fillStyle = this.postColor;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2 / surface.zoom;
    
    this.posts.forEach(post => {
      // Posts are positioned based on beam location and orientation
      let postX, postY;
      
      if (this.joistOrientation === 'width') {
        // Beams run along length (vertical), posts positioned along length
        // post.x is the distance along the beam, post.y is the beam position across deck
        postY = baseY + surface.feetToPixels(post.x);
        postX = baseX + surface.feetToPixels(post.y);
      } else {
        // Beams run along width (horizontal), posts positioned along width
        // post.x is the distance along the beam, post.y is the beam position across deck
        postX = baseX + surface.feetToPixels(post.x);
        postY = baseY + surface.feetToPixels(post.y);
      }
      
      // Draw post square centered on the beam
      ctx.fillRect(
        postX - postSize / 2,
        postY - postSize / 2,
        postSize,
        postSize
      );
      ctx.strokeRect(
        postX - postSize / 2,
        postY - postSize / 2,
        postSize,
        postSize
      );
    });
  }
}

// Export for use in main app
window.BeamLayer = BeamLayer;