// Main application initialization
document.addEventListener('DOMContentLoaded', () => {
  // Initialize store with default state
  const store = createStore({
    footprint: null,
    context: {
      width_ft: null,
      length_ft: null,
      height_ft: 3,
      attachment: 'ledger',
      beam_style_outer: null,
      beam_style_inner: null,
      footing_type: 'helical',
      species_grade: 'SPF #2',
      forced_joist_spacing_in: null,
      decking_type: 'composite_1in',
      optimization_goal: 'cost'
    },
    engineOut: null,
    gridCfg: {
      visible: true,
      snap: true,
      spacing_in: 6
    },
    history: [],
    future: []
  });
  
  // Initialize drawing surface
  const canvas = document.getElementById('deck-canvas');
  
  // Set an explicit size to ensure the canvas renders correctly
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  
  const drawingSurface = new DrawingSurface(canvas, {
    pixelsPerFoot: 20
  });
  
  // Set an initial zoom level that will show the grid
  drawingSurface.zoom = 1.2; // Higher zoom to ensure grid is visible
  
  // Create layers
  const gridLayer = new GridLayer({
    spacing_in: store.getState().gridCfg.spacing_in,
    snap: store.getState().gridCfg.snap,
    visible: store.getState().gridCfg.visible
  });
  
  const footprintLayer = new FootprintLayer();
  const joistLayer = new JoistLayer();
  const beamLayer = new BeamLayer();
  const dimensionLayer = new DimensionLayer();
  
  // Set initial tool on footprint layer
  footprintLayer.setTool('rectangle');
  
  // Add layers to drawing surface
  drawingSurface.addLayer(gridLayer);
  drawingSurface.addLayer(footprintLayer);
  drawingSurface.addLayer(joistLayer);
  drawingSurface.addLayer(beamLayer);
  drawingSurface.addLayer(dimensionLayer);
  
  // Initialize command stack
  const commandStack = new CommandStack(20);
  
  // Initialize UI controls
  console.log('UIControls available:', typeof UIControls !== 'undefined');
  if (typeof UIControls === 'undefined') {
    console.error('UIControls class is not defined! Check that controls.js is loaded properly.');
    alert('Error: UIControls is not defined. The application may not work correctly.');
  }
  const uiControls = new UIControls(store, drawingSurface, commandStack);
  window.uiControls = uiControls; // Make globally accessible
  
  // Initialize export manager
  const exportManager = new ExportManager(drawingSurface, store);
  
  // Set initial tool
  uiControls.setActiveTool('rectangle');
  
  // Setup canvas event handling for drawing
  canvas.addEventListener('mousedown', (e) => {
    // Only handle left click for drawing
    if (e.button === 0) {
      console.log('MouseDown event:', {
        tool: footprintLayer.currentTool,
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
        canvasRect: canvas.getBoundingClientRect()
      });
      
      // Ensure mouse events are properly handled
      e.stopPropagation();
      
      // Force the drawing to start (debug)
      if (footprintLayer.currentTool === 'rectangle') {
        // Make sure the canvas has focus
        canvas.focus();
        
        // Try to handle the mouse down event
        try {
          const handled = footprintLayer.handleMouseDown(e);
          console.log('MouseDown handled:', handled);
        } catch (error) {
          console.error('Error in handleMouseDown:', error);
        }
      }
    }
  });
  
  canvas.addEventListener('mousemove', (e) => {
    try {
      footprintLayer.handleMouseMove(e);
    } catch (error) {
      console.error('Error in handleMouseMove:', error);
    }
  });
  
  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      console.log('MouseUp');
      try {
        footprintLayer.handleMouseUp(e);
      } catch (error) {
        console.error('Error in handleMouseUp:', error);
      }
    }
  });
  
  // Touch events for drawing
  canvas.addEventListener('touchstart', (e) => {
    // We're supporting drawing with one finger
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const simulatedEvent = {
        button: 0, // Simulate left mouse button
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: function() { e.preventDefault(); }
      };
      console.log('TouchStart: simulating mousedown');
      footprintLayer.handleMouseDown(simulatedEvent);
      // Only prevent default on touch events
      if (e.type === 'touchstart') {
        e.preventDefault();
      }
    }
  });
  
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const simulatedEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: function() { e.preventDefault(); }
      };
      footprintLayer.handleMouseMove(simulatedEvent);
      // Only prevent default on touch events
      if (e.type === 'touchmove') {
        e.preventDefault(); // Prevent scrolling while drawing
      }
    }
  });
  
  canvas.addEventListener('touchend', (e) => {
    const simulatedEvent = {
      button: 0, // Simulate left mouse button
      preventDefault: function() { e.preventDefault(); }
    };
    console.log('TouchEnd: simulating mouseup');
    footprintLayer.handleMouseUp(simulatedEvent);
    // Only prevent default on touch events
    if (e.type === 'touchend') {
      e.preventDefault();
    }
  });
  
  // Load saved state if available
  const savedState = persistence.load();
  if (savedState) {
    store.setState(savedState);
  }
  
  // Set up event subscriptions
  store.subscribe((state) => {
    console.log('Store subscription - updating layers with state:', state);
    
    // Update layers with new state
    footprintLayer.setFootprint(state.footprint);
    dimensionLayer.setFootprint(state.footprint);
    
    if (state.engineOut) {
      console.log('Updating structure layers with engine output:', state.engineOut);
      joistLayer.setJoists(state.engineOut.joists);
      joistLayer.setFootprint(state.footprint);
      
      beamLayer.setBeams(state.engineOut.beams);
      beamLayer.setPosts(state.engineOut.posts);
      beamLayer.setFootprint(state.footprint);
      beamLayer.setCantilever(state.engineOut.joists.cantilever_ft);
      beamLayer.setJoistOrientation(state.engineOut.joists.orientation);
      
      // Update BOM table
      updateBOMTable(state.engineOut.material_takeoff);
      
      // Update framing specs
      updateFramingSpecs(state.engineOut, state.context);
      
      // Update cost summary  
      if (window.uiControls) {
        window.uiControls.updateCostSummary();
      }
      
      // Show warnings if any
      if (state.engineOut.compliance.warnings.length > 0) {
        showWarnings(state.engineOut.compliance.warnings);
      } else {
        hideWarnings();
      }
    } else {
      // Clear structure layers if no engine output
      joistLayer.setJoists(null);
      beamLayer.setBeams(null);
      beamLayer.setPosts(null);
      updateBOMTable(null);
      updateFramingSpecs(null, null);
      hideWarnings();
    }
    
    // Save state
    persistence.save(state);
    
    // Redraw
    drawingSurface.draw();
  });
  
  // Handle canvas:compute events
  let computeTimer = null;
  eventBus.subscribe('canvas:compute', ({ payload }) => {
    console.log('canvas:compute event received with payload:', payload);
    clearTimeout(computeTimer);
    computeTimer = setTimeout(() => {
      try {
        console.log('Computing structure...');
        const result = computeStructure(payload);
        console.log('Structure computed:', result);
        const state = store.getState();
        store.setState({
          ...state,
          engineOut: result
        });
      } catch (error) {
        console.error('Computation error:', error);
        if (error.code === 'SPAN_EXCEEDED' || error.code === 'INVALID_INPUT') {
          showWarnings([error.message]);
        } else {
          alert('Error computing structure: ' + error.message);
        }
      }
    }, 250);
  });
  
  // Handle footprint events
  eventBus.subscribe('footprint:change', (footprint) => {
    if (footprint) {
      // Use commands for undoable changes
      uiControls.executeCommand('setFootprint', { footprint });
    } else {
      // Clear footprint
      uiControls.executeCommand('clearFootprint', {});
    }
  });
  
  // Handle footprint preview (no command creation)
  eventBus.subscribe('footprint:preview', (footprint) => {
    if (footprint) {
      // Update dimensions display only
      document.getElementById('width-ft').value = footprint.width_ft.toFixed(2);
      document.getElementById('length-ft').value = footprint.length_ft.toFixed(2);
      
      // Update dimensions layer for visual feedback
      dimensionLayer.setFootprint(footprint);
      
      // Update footprint layer (for visual preview)
      footprintLayer.setFootprint(footprint);
    } else {
      // Clear dimensions when footprint is cleared
      document.getElementById('width-ft').value = '';
      document.getElementById('length-ft').value = '';
      dimensionLayer.setFootprint(null);
      footprintLayer.setFootprint(null);
    }
  });
  
  // Handle canvas:ready event
  eventBus.emit('canvas:ready');
  
  // Update initial UI state
  uiControls.updateUIFromState();
  
  // Ensure the grid is visible by setting default values
  const gridLayerRef = drawingSurface.layers.find(l => l.id === 'grid');
  if (gridLayerRef) {
    gridLayerRef.visible = true;
    gridLayerRef.snap = true;
    
    // Ensure spacing is set to a reasonable value
    gridLayerRef.spacing_in = gridLayerRef.spacing_in || 6;
  }
  
  // Initial draw with extra logging
  console.log('Initial draw with zoom:', drawingSurface.zoom);
  drawingSurface.draw();
  
  // Force a redraw after a short delay to handle any initialization issues
  setTimeout(() => {
    console.log('Forced redraw after initialization');
    // Explicitly show the grid and draw
    const gridLayerAfterInit = drawingSurface.layers.find(l => l.id === 'grid');
    if (gridLayerAfterInit) {
      gridLayerAfterInit.visible = true;
      document.getElementById('grid-visible').checked = true;
    }
    drawingSurface.draw();
    
    // Set another timeout for a second redraw, in case the first one doesn't work
    setTimeout(() => {
      console.log('Second forced redraw');
      drawingSurface.draw();
    }, 1000);
  }, 500);
  
  // Expose objects for debugging
  window.store = store;
  window.drawingSurface = drawingSurface;
  window.footprintLayer = footprintLayer;
  window.uiControls = uiControls;
  
  // Add debug tool function
  window.debugState = function() {
    console.log('=== DEBUG STATE ===');
    console.log('Current tool:', footprintLayer.currentTool);
    console.log('Drawing?', footprintLayer.isDrawing);
    console.log('Current footprint:', footprintLayer.footprint);
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('Canvas rect:', canvas.getBoundingClientRect());
    console.log('Canvas zoom:', drawingSurface.zoom);
    console.log('Pan position:', drawingSurface.pan);
    console.log('Grid visible?', drawingSurface.layers.find(l => l.id === 'grid').visible);
    return 'Debug info logged to console.';
  };
  
  // Add force grid function
  window.showGrid = function() {
    const grid = drawingSurface.layers.find(l => l.id === 'grid');
    if (grid) {
      grid.visible = true;
      grid.spacing_in = 6;
      drawingSurface.zoom = 1.2;
      drawingSurface.draw();
      return 'Grid visibility forced';
    }
    return 'Grid layer not found';
  };
  
  console.log('Deck Builder initialized');
  console.log('Available debug objects: store, drawingSurface, footprintLayer, uiControls');
});

// Helper functions
function updateBOMTable(materialTakeoff) {
  const tbody = document.querySelector('#bom-table tbody');
  tbody.innerHTML = '';
  
  if (!materialTakeoff || materialTakeoff.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell(0);
    cell.colSpan = 2;
    cell.textContent = 'No materials calculated';
    cell.style.textAlign = 'center';
    cell.style.fontStyle = 'italic';
    return;
  }
  
  materialTakeoff.forEach(item => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = item.item;
    row.insertCell(1).textContent = item.qty;
  });
}

// Make updateBOMTable globally accessible
window.updateBOMTable = updateBOMTable;

function showWarnings(warnings) {
  const banner = document.getElementById('warning-banner');
  banner.textContent = warnings.join('; ');
  banner.style.display = 'block';
}

function hideWarnings() {
  const banner = document.getElementById('warning-banner');
  banner.style.display = 'none';
}

/**
 * Converts decimal feet to feet and inches format
 * @param {number} decimalFeet - Measurement in decimal feet
 * @returns {string} - Formatted as X'-Y" where X is feet and Y is inches
 */
window.formatFeetInches = function(decimalFeet) {
  // Handle null or undefined
  if (decimalFeet === null || decimalFeet === undefined) {
    return "0'-0\"";
  }
  
  // Get the whole feet part
  const feet = Math.floor(decimalFeet);
  
  // Calculate inches (rounded to nearest whole inch)
  const inches = Math.round((decimalFeet - feet) * 12);
  
  // Handle case where inches rounds up to 12
  if (inches === 12) {
    return `${feet + 1}'-0"`;
  }
  
  return `${feet}'-${inches}"`;
}

function updateFramingSpecs(engineOut, context) {
  const specsDiv = document.getElementById('framing-specs');
  
  if (!engineOut) {
    specsDiv.innerHTML = '<p class="help-text">Generate structure to see framing specifications</p>';
    return;
  }
  
  // Build the specs HTML
  let html = '<div class="specs-content">';
  
  // Joists
  if (engineOut.joists) {
    html += '<div class="spec-section">';
    html += '<h4>Joists</h4>';
    html += `<p><strong>Size:</strong> ${engineOut.joists.size}</p>`;
    html += `<p><strong>Spacing:</strong> ${engineOut.joists.spacing_in}" O.C.</p>`;
    if (engineOut.joists.cantilever_ft > 0) {
      html += `<p><strong>Cantilever:</strong> ${formatFeetInches(engineOut.joists.cantilever_ft)}</p>`;
    }
    // Material info from joist material table
    html += `<p><strong>Material:</strong> SPF #2</p>`;
    html += '</div>';
  }
  
  // Beams
  if (engineOut.beams) {
    html += '<div class="spec-section">';
    html += '<h4>Beams</h4>';
    engineOut.beams.forEach((beam, index) => {
      html += `<div class="spec-subsection">`;
      html += `<h5>${beam.position === 'outer' ? 'Outer Beam' : 'Inner Beam'}</h5>`;
      html += `<p><strong>Size:</strong> ${beam.size}</p>`;
      html += `<p><strong>Style:</strong> ${beam.style}</p>`;
      if (beam.post_spacing_ft) {
        html += `<p><strong>Post Spacing:</strong> ${formatFeetInches(beam.post_spacing_ft)}</p>`;
      }
      html += `<p><strong>Material:</strong> SPF #2</p>`;
      html += '</div>';
    });
    html += '</div>';
  }
  
  // Posts
  if (engineOut.posts && engineOut.posts.length > 0) {
    html += '<div class="spec-section">';
    html += '<h4>Posts</h4>';
    html += `<p><strong>Size:</strong> 6x6</p>`;
    html += `<p><strong>Material:</strong> SPF #2</p>`;
    html += `<p><strong>Count:</strong> ${engineOut.posts.length}</p>`;
    html += '<p><strong>Locations:</strong></p>';
    html += '<ul>';
    engineOut.posts.forEach(post => {
      const beam = post.y === 0 ? 'inner beam' : 'outer beam';
      html += `<li>${formatFeetInches(post.x)} along ${beam}</li>`;
    });
    html += '</ul>';
    html += '</div>';
  }
  
  // Ledger
  if (context && context.attachment === 'ledger') {
    html += '<div class="spec-section">';
    html += '<h4>Ledger</h4>';
    html += '<p><strong>Type:</strong> 2x10 pressure-treated</p>';
    html += '<p><strong>Attachment:</strong> 1/2" lag bolts @ 16" O.C.</p>';
    html += '</div>';
  }
  
  // Compliance
  if (engineOut.compliance) {
    html += '<div class="spec-section">';
    html += '<h4>Code Compliance</h4>';
    const compliant = engineOut.compliance.warnings.length === 0;
    html += `<p><strong>Status:</strong> ${compliant ? 'Compliant' : 'Non-compliant'}</p>`;
    if (engineOut.compliance.warnings.length > 0) {
      html += '<p><strong>Warnings:</strong></p>';
      html += '<ul>';
      engineOut.compliance.warnings.forEach(warning => {
        html += `<li>${warning}</li>`;
      });
      html += '</ul>';
    }
    html += '</div>';
  }
  
  html += '</div>';
  specsDiv.innerHTML = html;
}