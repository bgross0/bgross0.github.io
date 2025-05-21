# Deck-Builder App · Stack Specification (v1.0)

## Technology Stack Overview

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Languages** | JavaScript (ES6+) | Native browser support, no transpilation needed |
| **Runtime** | Browser (Chrome 118+) | Widespread compatibility, Canvas API support |
| **Build** | None (direct execution) | Zero build complexity, edit & refresh workflow |
| **UI Framework** | Vanilla JS with Canvas API | No dependencies, direct DOM/Canvas manipulation |
| **State Management** | Custom observable store | Simple pub/sub pattern with immutable updates |
| **Styling** | Plain CSS | No preprocessors or frameworks required |
| **Testing** | Console.assert + manual validation | Simplified testing for single-user application |
| **Validation** | JSON Schema (lightweight) | For payload validation without dependencies |
| **Persistence** | LocalStorage | Client-side data persistence |
| **Export** | Canvas.toDataURL() + Blob API | Native browser APIs for export functionality |

## Complete Directory Structure

```
deck-builder/
├─ index.html               # Main application entry point
├─ css/
│  └─ styles.css            # Plain CSS styles
├─ js/
│  ├─ engine/               # Calculation engine
│  │  ├─ joist.js           # Joist selection logic - implements IRC tables
│  │  ├─ beam.js            # Beam calculation functions - includes ply logic
│  │  ├─ post.js            # Post layout algorithms - spacing and positioning
│  │  ├─ materials.js       # Bill of materials generation
│  │  ├─ validation.js      # Input payload validation
│  │  └─ index.js           # Engine public API - calculateFraming()
│  ├─ ui/                   # UI components
│  │  ├─ canvas.js          # Canvas drawing base functions
│  │  ├─ footprint.js       # Rectangle drawing and manipulation
│  │  ├─ grid.js            # Grid drawing & snap logic
│  │  ├─ joistLayer.js      # Joist visualization
│  │  ├─ beamLayer.js       # Beam and post visualization
│  │  ├─ dimensions.js      # Measurement labels
│  │  ├─ controls.js        # UI control handlers
│  │  └─ export.js          # Export functions (PNG, CSV)
│  ├─ utils/                # Utilities
│  │  ├─ command.js         # Command pattern for undo/redo
│  │  ├─ eventBus.js        # Event communication system
│  │  ├─ store.js           # State management
│  │  └─ persistence.js     # LocalStorage wrapper
│  └─ main.js               # Application initialization
├─ data/
│  ├─ span-tables.js        # Joist & beam span data from IRC
│  └─ materials.js          # Material definitions
├─ tests/
│  ├─ fixtures/             # Test data
│  │  ├─ deck-08x12.json    # Standard deck with ledger
│  │  ├─ deck-12x24-free.json # Freestanding deck
│  │  └─ ... (10 standard test cases)
│  ├─ engine/               # Engine tests
│  │  ├─ joist.test.js      # Tests joist selection algorithm
│  │  ├─ beam.test.js       # Tests beam sizing logic
│  │  ├─ optimise.test.js   # Tests cost vs strength optimization
│  │  └─ golden.test.js     # Compares against expected outputs
│  ├─ ui/                   # UI tests
│  │  ├─ canvas.test.js     # Tests drawing surface
│  │  ├─ grid.test.js       # Tests grid and snapping
│  │  └─ commands.test.js   # Tests undo/redo functionality
│  └─ e2e/                  # Simple end-to-end tests
│     └─ workflow.test.js   # Basic workflow test
└─ package.json             # Minimal dependencies
```

## Development Environment Setup

```bash
# Clone repository (if using version control)
git clone https://github.com/username/deck-builder.git
cd deck-builder

# Install local server for development
npm install

# Start development server
npm start
```

## Core Implementation Features

### State Management

The application uses a simple observable store pattern:

```javascript
// store.js
const createStore = (initialState) => {
  let state = { ...initialState };
  const listeners = [];
  
  return {
    getState: () => ({ ...state }),
    setState: (newState) => {
      state = { ...state, ...newState };
      listeners.forEach(listener => listener(state));
    },
    subscribe: (listener) => {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      };
    }
  };
};
```

### Command Pattern for Undo/Redo

```javascript
// command.js
class CommandStack {
  constructor(maxDepth = 20) {
    this.history = [];
    this.future = [];
    this.maxDepth = maxDepth;
  }
  
  execute(command) {
    const invertedCommand = command.apply();
    this.history.push(invertedCommand);
    this.future = [];
    
    if (this.history.length > this.maxDepth) {
      this.history.shift();
    }
  }
  
  undo() {
    if (this.history.length === 0) return null;
    
    const command = this.history.pop();
    const invertedCommand = command.apply();
    this.future.push(invertedCommand);
    return command;
  }
  
  redo() {
    if (this.future.length === 0) return null;
    
    const command = this.future.pop();
    const invertedCommand = command.apply();
    this.history.push(invertedCommand);
    return command;
  }
  
  clear() {
    this.history = [];
    this.future = [];
  }
}
```

### Event Bus

```javascript
// eventBus.js
const eventBus = {
  listeners: {},
  
  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    return () => this.unsubscribe(event, callback);
  },
  
  unsubscribe(event, callback) {
    if (!this.listeners[event]) return;
    
    const index = this.listeners[event].indexOf(callback);
    if (index !== -1) {
      this.listeners[event].splice(index, 1);
    }
  },
  
  emit(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }
};
```

### Canvas Drawing System

```javascript
// canvas.js
class DrawingSurface {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvas.getContext('2d');
    this.pixelsPerFoot = options.pixelsPerFoot || 20;
    this.pan = { x: 0, y: 0 };
    this.zoom = 1;
    this.layers = [];
    
    this.setupEventListeners();
  }
  
  addLayer(layer) {
    this.layers.push(layer);
    layer.surface = this;
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
        layer.draw(this.ctx);
      }
    });
    
    this.ctx.restore();
    return this;
  }
  
  // Event handling, pan, zoom, etc.
  // ...
}
```

## Dependencies (Minimal)

```json
{
  "name": "deck-builder",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "http-server -c-1",
    "test": "node tests/run-tests.js"
  },
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
```

## Non-Negotiable Requirements

1. **Single-file Load**
   - Application loads completely on page load with no external API calls

2. **Direct Execution**
   - No build step required - edit and refresh development cycle

3. **Canvas Performance**
   - 60 FPS drawing & interaction for decks up to 40×40 ft
   - Memory usage ≤ 50 MB idle

4. **Persistence**
   - Auto-save to localStorage after each major edit
   - Save/load named designs

5. **Export**
   - PNG output at 300 DPI
   - CSV formatted material list

## Browser Compatibility

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 118+ |
| Edge | 118+ |
| Firefox | 120+ |
| Safari | 17+ |

This stack specification provides a complete blueprint for implementing a lightweight, maintainable deck design application suitable for a single user while maintaining all core functionalities from the original specifications.
