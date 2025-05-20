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
  const drawingSurface = new DrawingSurface(canvas, {
    pixelsPerFoot: 20
  });
  
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
      console.log('MouseDown: tool=', footprintLayer.currentTool);
      footprintLayer.handleMouseDown(e);
    }
  });
  
  canvas.addEventListener('mousemove', (e) => {
    footprintLayer.handleMouseMove(e);
  });
  
  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      console.log('MouseUp');
      footprintLayer.handleMouseUp(e);
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
  
  // Initial draw
  drawingSurface.draw();
  
  // Expose objects for debugging
  window.store = store;
  window.drawingSurface = drawingSurface;
  window.footprintLayer = footprintLayer;
  window.uiControls = uiControls;
  
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
      html += `<p><strong>Cantilever:</strong> ${engineOut.joists.cantilever_ft}'-0"</p>`;
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
        html += `<p><strong>Post Spacing:</strong> ${beam.post_spacing_ft}'-0"</p>`;
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
      html += `<li>${post.x}'-0" along ${beam}</li>`;
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