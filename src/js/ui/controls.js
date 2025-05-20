// UI control handlers
class UIControls {
  constructor(store, drawingSurface, commandStack) {
    this.store = store;
    this.drawingSurface = drawingSurface;
    this.commandStack = commandStack;
    
    console.log('UIControls initialized');
    
    // Ensure DOM is ready before setting up listeners
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.setupEventListeners();
        this.updateUIFromState();
      });
    } else {
      this.setupEventListeners();
      this.updateUIFromState();
      // Delay material cost listeners to ensure DOM is ready
      setTimeout(() => this.setupMaterialCostListeners(), 100);
    }
  }
  
  setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Verify elements exist
    const elements = {
      'undo-btn': 'Undo',
      'redo-btn': 'Redo',
      'clear-canvas-btn': 'Clear Canvas',
      'rectangle-tool-btn': 'Rectangle Tool',
      'select-tool-btn': 'Select Tool',
      'generate-btn': 'Generate'
    };
    
    for (const [id, name] of Object.entries(elements)) {
      const el = document.getElementById(id);
      if (!el) {
        console.error(`${name} button not found: #${id}`);
      } else {
        console.log(`${name} button found: #${id}`);
      }
    }
    
    // Undo/Redo buttons
    const undoBtn = document.getElementById('undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        console.log('Undo clicked');
        this.commandStack.undo();
        this.updateUIFromState();
      });
    }
    
    const redoBtn = document.getElementById('redo-btn');
    if (redoBtn) {
      redoBtn.addEventListener('click', () => {
        console.log('Redo clicked');
        this.commandStack.redo();
        this.updateUIFromState();
      });
    }
    
    // Clear canvas button
    const clearBtn = document.getElementById('clear-canvas-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        console.log('Clear canvas clicked');
        if (confirm('Clear all deck geometry? This cannot be undone.')) {
          this.clearCanvas();
        }
      });
    }
    
    // Tool buttons
    const rectangleBtn = document.getElementById('rectangle-tool-btn');
    if (rectangleBtn) {
      rectangleBtn.addEventListener('click', () => {
        console.log('Rectangle tool clicked');
        this.setActiveTool('rectangle');
      });
    }
    
    const selectBtn = document.getElementById('select-tool-btn');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        console.log('Select tool clicked');
        this.setActiveTool('select');
      });
    }
    
    // Generate button
    const generateBtn = document.getElementById('generate-btn');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        console.log('Generate button clicked');
        this.generateStructure();
      });
    } else {
      console.error('Generate button not found!');
    }
    
    // Grid controls
    document.getElementById('grid-visible').addEventListener('change', (e) => {
      const gridLayer = this.drawingSurface.layers.find(l => l.id === 'grid');
      if (gridLayer) {
        gridLayer.visible = e.target.checked;
        this.drawingSurface.draw();
        eventBus.emit('canvas:gridChange', {
          visible: gridLayer.visible,
          snap: gridLayer.snap,
          spacing_in: gridLayer.spacing_in
        });
      }
    });
    
    document.getElementById('grid-snap').addEventListener('change', (e) => {
      const gridLayer = this.drawingSurface.layers.find(l => l.id === 'grid');
      if (gridLayer) {
        gridLayer.setSnap(e.target.checked);
        eventBus.emit('canvas:gridChange', {
          visible: gridLayer.visible,
          snap: gridLayer.snap,
          spacing_in: gridLayer.spacing_in
        });
      }
    });
    
    document.getElementById('grid-spacing').addEventListener('change', (e) => {
      const gridLayer = this.drawingSurface.layers.find(l => l.id === 'grid');
      if (gridLayer) {
        gridLayer.setSpacing(parseFloat(e.target.value));
        eventBus.emit('canvas:gridChange', {
          visible: gridLayer.visible,
          snap: gridLayer.snap,
          spacing_in: gridLayer.spacing_in
        });
      }
    });
    
    // Zoom controls
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
      this.drawingSurface.zoom = Math.min(8, this.drawingSurface.zoom * 1.2);
      this.drawingSurface.draw();
    });
    
    document.getElementById('zoom-out-btn').addEventListener('click', () => {
      this.drawingSurface.zoom = Math.max(0.25, this.drawingSurface.zoom / 1.2);
      this.drawingSurface.draw();
    });
    
    // Export menu
    document.getElementById('export-menu').addEventListener('change', (e) => {
      if (e.target.value) {
        eventBus.emit('canvas:export', { format: e.target.value });
        e.target.value = ''; // Reset selection
      }
    });
    
    // Footprint inputs are now read-only
    // They will be updated when the user draws a footprint
    
    // Context inputs
    document.getElementById('height-ft').addEventListener('change', (e) => {
      const height = parseFloat(e.target.value);
      if (height >= 0) {
        this.executeCommand('setContext', { height_ft: height });
      }
    });
    
    document.getElementById('attachment').addEventListener('change', (e) => {
      this.executeCommand('setContext', { attachment: e.target.value });
      this.updateUIVisibility();
    });
    
    // Other context inputs
    const contextInputs = [
      'beam-style-outer', 'beam-style-inner', 'footing-type',
      'species-grade', 'joist-spacing', 'decking-type', 'optimization-goal'
    ];
    
    contextInputs.forEach(id => {
      document.getElementById(id).addEventListener('change', (e) => {
        const key = id.replace(/-/g, '_');
        const value = e.target.value || null;
        this.executeCommand('setContext', { [key]: value });
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          this.commandStack.undo();
          this.updateUIFromState();
        } else if (e.key === 'y') {
          e.preventDefault();
          this.commandStack.redo();
          this.updateUIFromState();
        }
      } else {
        switch(e.key) {
          case 'r':
          case 'R':
            this.setActiveTool('rectangle');
            break;
          case 's':
          case 'S':
            this.setActiveTool('select');
            break;
          case 'Escape':
            // Cancel current drawing
            const footprintLayer = this.drawingSurface.layers.find(l => l.id === 'footprint');
            if (footprintLayer && footprintLayer.isDrawing) {
              footprintLayer.isDrawing = false;
              footprintLayer.drawStart = null;
              footprintLayer.footprint = null;
              eventBus.emit('footprint:change', null);
            }
            break;
        }
      }
    });

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.dataset.tab;
        
        // Update button states
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update panel visibility
        document.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        document.getElementById(`${targetTab}-tab`).classList.add('active');
      });
    });
  }
  
  executeCommand(type, data) {
    console.log('Executing command:', type, data);
    const command = this.createCommand(type, data);
    this.commandStack.execute(command);
    this.updateUIFromState();
  }
  
  createCommand(type, data) {
    const store = this.store;
    
    switch (type) {
      case 'setWidth':
        return {
          tag: 'setWidth',
          apply: () => {
            const oldState = store.getState();
            const oldWidth = oldState.footprint.width_ft;
            
            store.setState({
              footprint: { ...oldState.footprint, width_ft: data.width_ft },
              context: { ...oldState.context, width_ft: data.width_ft }
            });
            
            return {
              tag: 'setWidth',
              apply: () => {
                const state = store.getState();
                store.setState({
                  footprint: { ...state.footprint, width_ft: oldWidth },
                  context: { ...state.context, width_ft: oldWidth }
                });
                return this.createCommand('setWidth', { width_ft: data.width_ft });
              }
            };
          }
        };
        
      case 'setLength':
        return {
          tag: 'setLength',
          apply: () => {
            const oldState = store.getState();
            const oldLength = oldState.footprint.length_ft;
            
            store.setState({
              footprint: { ...oldState.footprint, length_ft: data.length_ft },
              context: { ...oldState.context, length_ft: data.length_ft }
            });
            
            return {
              tag: 'setLength',
              apply: () => {
                const state = store.getState();
                store.setState({
                  footprint: { ...state.footprint, length_ft: oldLength },
                  context: { ...state.context, length_ft: oldLength }
                });
                return this.createCommand('setLength', { length_ft: data.length_ft });
              }
            };
          }
        };
        
      case 'setContext':
        return {
          tag: 'setContext',
          apply: () => {
            const oldState = store.getState();
            const oldContext = { ...oldState.context };
            
            store.setState({
              context: { ...oldState.context, ...data }
            });
            
            return {
              tag: 'setContext',
              apply: () => {
                const state = store.getState();
                store.setState({
                  context: oldContext
                });
                return this.createCommand('setContext', data);
              }
            };
          }
        };
        
      case 'setFootprint':
        const self = this;  // Preserve context
        return {
          tag: 'setFootprint',
          apply: () => {
            const oldState = store.getState();
            const oldFootprint = oldState.footprint;
            const oldWidthContext = oldState.context.width_ft;
            const oldLengthContext = oldState.context.length_ft;
            const { footprint } = data;
            
            store.setState({
              footprint: footprint,
              context: {
                ...oldState.context,
                width_ft: footprint.width_ft,
                length_ft: footprint.length_ft
              },
              engineOut: null // Clear any existing structure
            });
            
            // Update UI
            self.updateUIFromState();
            
            return {
              tag: 'setFootprint',
              apply: () => {
                const state = store.getState();
                store.setState({
                  footprint: oldFootprint,
                  context: {
                    ...state.context,
                    width_ft: oldWidthContext,
                    length_ft: oldLengthContext
                  },
                  engineOut: null
                });
                self.updateUIFromState();
                return self.createCommand('setFootprint', { footprint });
              }
            };
          }
        };
        
      case 'clearFootprint':
        const clearSelf = this;  // Preserve context
        return {
          tag: 'clearFootprint',
          apply: () => {
            const oldState = store.getState();
            const oldFootprint = oldState.footprint;
            const oldWidthContext = oldState.context.width_ft;
            const oldLengthContext = oldState.context.length_ft;
            
            store.setState({
              footprint: null,
              context: {
                ...oldState.context,
                width_ft: null,
                length_ft: null
              },
              engineOut: null
            });
            
            // Update UI
            clearSelf.updateUIFromState();
            
            return {
              tag: 'setFootprint',
              apply: () => {
                const state = store.getState();
                store.setState({
                  footprint: oldFootprint,
                  context: {
                    ...state.context,
                    width_ft: oldWidthContext,
                    length_ft: oldLengthContext
                  },
                  engineOut: null
                });
                clearSelf.updateUIFromState();
                return clearSelf.createCommand('clearFootprint', {});
              }
            };
          }
        };
        
      default:
        throw new Error(`Unknown command type: ${type}`);
    }
  }
  
  updateUIFromState() {
    console.log('Updating UI from state');
    const state = this.store.getState();
    
    // Update footprint inputs
    const widthInput = document.getElementById('width-ft');
    const lengthInput = document.getElementById('length-ft');
    
    if (widthInput && lengthInput) {
      if (state.footprint) {
        widthInput.value = state.footprint.width_ft || '';
        lengthInput.value = state.footprint.length_ft || '';
      } else {
        widthInput.value = '';
        lengthInput.value = '';
      }
    }
    
    // Update context inputs
    const heightInput = document.getElementById('height-ft');
    if (heightInput) {
      heightInput.value = state.context.height_ft;
    }
    document.getElementById('attachment').value = state.context.attachment;
    document.getElementById('beam-style-outer').value = state.context.beam_style_outer || '';
    document.getElementById('beam-style-inner').value = state.context.beam_style_inner || '';
    document.getElementById('footing-type').value = state.context.footing_type;
    document.getElementById('species-grade').value = state.context.species_grade;
    document.getElementById('joist-spacing').value = state.context.forced_joist_spacing_in || '';
    document.getElementById('decking-type').value = state.context.decking_type;
    document.getElementById('optimization-goal').value = state.context.optimization_goal;
    
    // Update grid controls
    document.getElementById('grid-visible').checked = state.gridCfg.visible;
    document.getElementById('grid-snap').checked = state.gridCfg.snap;
    document.getElementById('grid-spacing').value = state.gridCfg.spacing_in;
    
    // Update generate button
    const generateBtn = document.getElementById('generate-btn');
    const generateHelpText = document.querySelector('#generate-btn + .help-text');
    if (generateBtn) {
      if (state.footprint && state.footprint.width_ft > 0 && state.footprint.length_ft > 0) {
        generateBtn.disabled = false;
        if (generateHelpText) {
          generateHelpText.textContent = 'Click to generate code-compliant structure';
        }
      } else {
        generateBtn.disabled = true;
        if (generateHelpText) {
          generateHelpText.textContent = 'Draw a footprint first to enable generation';
        }
      }
    }
    
    this.updateUIVisibility();
  }
  
  updateUIVisibility() {
    const state = this.store.getState();
    
    // Show/hide inner beam style based on attachment
    const innerBeamLabel = document.getElementById('beam-style-inner-label');
    if (state.context.attachment === 'free') {
      innerBeamLabel.style.display = 'block';
    } else {
      innerBeamLabel.style.display = 'none';
    }
  }
  
  setActiveTool(tool) {
    // Update UI
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tool}-tool-btn`).classList.add('active');
    
    // Update canvas cursor
    const canvas = document.getElementById('deck-canvas');
    canvas.classList.remove('rectangle-tool', 'select-tool');
    canvas.classList.add(`${tool}-tool`);
    
    // Update footprint layer
    const footprintLayer = this.drawingSurface.layers.find(l => l.id === 'footprint');
    if (footprintLayer) {
      footprintLayer.setTool(tool);
    }
  }
  
  generateStructure() {
    console.log('Generate Structure clicked');
    const state = this.store.getState();
    console.log('Current state:', state);
    
    if (!state.footprint || state.footprint.width_ft < 1 || state.footprint.length_ft < 1) {
      alert('Please draw a footprint first');
      return;
    }
    
    const payload = {
      ...state.context,
      width_ft: state.footprint.width_ft,
      length_ft: state.footprint.length_ft
    };
    
    console.log('Computing with payload:', payload);
    eventBus.emit('canvas:compute', { payload });
  }
  
  clearCanvas() {
    this.commandStack.clear();
    
    // Reset to initial state
    const initialState = {
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
      engineOut: null, // Clear any generated structure
      gridCfg: {
        visible: true,
        snap: true,
        spacing_in: 6
      }
    };
    
    this.store.setState(initialState);
    this.updateUIFromState();
    
    // Reset generate button
    document.getElementById('generate-btn').disabled = true;
    document.querySelector('#generate-btn + .help-text').textContent = 'Draw a footprint first to enable generation';
    
    // Clear BOM table  
    window.updateBOMTable(null);
    
    eventBus.emit('canvas:clear');
  }

  setupMaterialCostListeners() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupMaterialCostListeners());
      return;
    }

    // Lumber costs
    const lumberCosts = ['2x6', '2x8', '2x10', '2x12', '6x6'];
    lumberCosts.forEach(size => {
      const input = document.getElementById(`cost-${size}`);
      if (input) {
        input.addEventListener('change', (e) => {
          const value = parseFloat(e.target.value) || 0;
          materials.lumber[size].costPerFoot = value;
          this.updateCostSummary();
        });
      }
    });

    // Hardware costs
    const hardwareCosts = {
      'joist-hanger': 'LUS2x8', // Generic joist hanger
      'post-base': 'PB66',
      'post-cap': 'PCZ66',
      'splice-plate': 'PB105'
    };
    
    Object.entries(hardwareCosts).forEach(([id, key]) => {
      const input = document.getElementById(`cost-${id}`);
      if (input) {
        input.addEventListener('change', (e) => {
          const value = parseFloat(e.target.value) || 0;
          materials.hardware[key].cost = value;
          // Update all joist hanger sizes
          if (id === 'joist-hanger') {
            ['LUS26', 'LUS28', 'LUS210', 'LUS212', 'LUS2x6', 'LUS2x8', 'LUS2x10', 'LUS2x12'].forEach(hanger => {
              materials.hardware[hanger].cost = value;
            });
          }
          this.updateCostSummary();
        });
      }
    });

    // Footing costs
    const footingTypes = ['helical', 'concrete', 'surface'];
    footingTypes.forEach(type => {
      const input = document.getElementById(`cost-${type}`);
      if (input) {
        input.addEventListener('change', (e) => {
          const value = parseFloat(e.target.value) || 0;
          materials.footingCosts[type] = value;
          this.updateCostSummary();
        });
      }
    });
  }

  updateCostSummary() {
    try {
      const state = this.store.getState();
      if (!state.engineOut || !state.engineOut.material_takeoff) {
        return;
      }

      // Calculate total cost based on current prices
      let totalCost = 0;
      const breakdown = {};

      state.engineOut.material_takeoff.forEach(item => {
        // Qty is always just a number in our takeoff
        const amount = parseInt(item.qty) || 0;
      
      // Determine cost based on item type
      let itemCost = 0;
      if (item.item.includes('2x') || item.item.includes('6x6')) {
        // Lumber - extract size
        const sizeMatch = item.item.match(/([26])x(\d+)/);
        if (sizeMatch) {
          const size = sizeMatch[0];
          if (materials.lumber[size]) {
            itemCost = amount * materials.lumber[size].costPerFoot;
            breakdown[size] = (breakdown[size] || 0) + itemCost;
          }
        }
      } else if (item.item.includes('hanger')) {
        itemCost = amount * materials.hardware.LUS2x8.cost; // Use generic hanger cost
        breakdown['hangers'] = (breakdown['hangers'] || 0) + itemCost;
      } else if (item.item.includes('post base')) {
        itemCost = amount * materials.hardware.PB66.cost;
        breakdown['post_bases'] = (breakdown['post_bases'] || 0) + itemCost;
      } else if (item.item.includes('pile') || item.item.includes('footing')) {
        const footingType = state.context.footing_type;
        itemCost = amount * materials.footingCosts[footingType];
        breakdown['footings'] = (breakdown['footings'] || 0) + itemCost;
      }
      
      totalCost += itemCost;
    });

    // Update the cost summary display
    const summaryDiv = document.getElementById('cost-summary');
    if (summaryDiv) {
      let html = '<div class="cost-breakdown">';
      html += `<p><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</p>`;
      html += '<p><strong>Breakdown:</strong></p>';
      html += '<ul>';
      Object.entries(breakdown).forEach(([category, cost]) => {
        html += `<li>${category}: $${cost.toFixed(2)}</li>`;
      });
      html += '</ul>';
      html += '</div>';
      summaryDiv.innerHTML = html;
    }
    } catch (error) {
      console.error('Error updating cost summary:', error);
    }
  }
}