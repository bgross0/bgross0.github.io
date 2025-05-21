# Interface-Contracts Specification (v1.0)

*All code samples are in JavaScript ES6+ syntax. They form the interface between the engine library and the Canvas implementation.*

## 1. Primitive & Enum Types

```javascript
/** Imperial length in **feet**; may contain fractions (e.g., 12.5 == 12'-6"). */
const Feet = 'number';

/** Joist spacing in **inches** (12 | 16 | 24). */
const Inches = [12, 16, 24];

/** Structural lumber species × grade keys exactly matching IRC tables. */
const SpeciesGrade = ['SPF #2', 'DF #1', 'HF #2', 'SP #2'];

/** Deck-board categories that drive max joist spacing. */
const DeckingType = ['composite_1in', 'wood_5/4', 'wood_2x'];

/** Beam style flag. */
const BeamStyle = ['drop', 'inline'];

/** Footing installation method. */
const FootingType = ['helical', 'concrete', 'surface'];

/** Global optimiser. */
const OptimizationGoal = ['cost', 'strength'];
```

## 2. Engine Contracts

### 2.1 Canonical Input Payload

```javascript
/**
 * Complete engine input structure
 */
const EngineInput = {
  width_ft: 0,                  // Joist back-span before cantilever
  length_ft: 0,                 // Beam span (parallel to ledger)
  height_ft: 0,                 // Finished deck height
  attachment: 'ledger',         // 'ledger' or 'free'
  beam_style_outer: null,       // null|undefined ⇒ auto (defaults to drop)
  beam_style_inner: null,       // used only when attachment==='free'
  footing_type: 'helical',      // 'helical', 'concrete', or 'surface'
  species_grade: 'SPF #2',      // Species & grade, matching IRC tables
  forced_joist_spacing_in: null, // null ⇒ engine chooses
  decking_type: 'composite_1in', // Drives max joist spacing
  optimization_goal: 'cost'     // 'cost' or 'strength'
};
```

*Validation notes*

* width\_ft > 0, length\_ft > 0, height\_ft ≥ 0.
* surface footings illegal if `height_ft ≥ 2.5` ft **and** `attachment==='ledger'`.

### 2.2 Output Payload

```javascript
/**
 * Complete engine output structure
 */
const EngineOutput = {
  optimization_goal: 'cost',
  joists: {
    size: '2x10',            // e.g. '2x10'
    spacing_in: 16,
    cantilever_ft: 1.5,      // 0 if inline beam
  },
  beams: [
    {
      position: 'outer',     // 'outer' or 'inner'
      style: 'drop',         // 'drop', 'inline', or 'ledger'
      size: '(3)2x10',       // e.g. '(3)2x10'
      post_spacing_ft: 6.5,  // undefined for ledger
      post_count: 4          // undefined for ledger
    }
  ],
  posts: [
    { x: 0, y: 0 }, 
    { x: 6.5, y: 0 }, 
    { x: 13, y: 0 }, 
    { x: 19.5, y: 0 }
  ],
  material_takeoff: [
    { item: '2x10-12\' joist', qty: 21 },
    { item: '2x10-10\' beam', qty: 6 },
    { item: '6x6-10\' post', qty: 4 },
    { item: 'LUS210 hanger', qty: 21 },
    { item: 'PB66 post base', qty: 4 }
  ],
  metrics: {
    total_board_ft: 328,       // present for cost mode
    reserve_capacity_min: 1.17  // present for strength mode
  },
  compliance: {
    joist_table: 'IRC-2021 R507.6(1)',
    beam_table: 'IRC-2021 R507.5(1)',
    assumptions: ['IRC default loads'],
    warnings: []
  }
};
```

### 2.3 Public Engine API

```javascript
/**
 * Deterministically converts user geometry + context into framing & BOM.
 * @param {Object} payload - EngineInput structure
 * @returns {Object} - EngineOutput structure
 * @throws {Error} if payload fails schema or violates mandatory rules.
 */
function computeStructure(payload) {
  // Implementation in engine.js
}
```

### 2.4 Internal Helper Functions

*(Exposed for unit tests but not for UI.)*

```javascript
/**
 * Determines appropriate joist size based on span and constraints
 * @param {number} width - Width in feet
 * @param {string} species - Species-grade key
 * @param {number} spacing - Joist spacing in inches
 * @param {string} decking - Decking material type
 * @returns {Object} - Size, spacing, and cantilever details
 */
function selectJoist(width, species, spacing, decking) {
  // Implementation in engine/joist.js
}

/**
 * Determines beam size, plies, and post spacing
 * @param {number} span - Span in feet
 * @param {number} tributary - Tributary load in feet
 * @param {string} species - Species-grade key
 * @returns {Object} - Size, ply count, post spacing
 */
function selectBeam(span, tributary, species) {
  // Implementation in engine/beam.js
}

/**
 * Generates post positions along a beam
 * @param {number} len - Beam length in feet
 * @param {number} maxSpacing - Maximum post spacing in feet
 * @returns {Array<number>} - Array of x-coordinates for posts
 */
function generatePostGrid(len, maxSpacing) {
  // Implementation in engine/post.js
}

/**
 * Scores a frame configuration based on optimization goal
 * @param {Object} frame - Frame configuration
 * @param {string} goal - 'cost' or 'strength'
 * @returns {number} - Score (lower is better for cost, higher is better for strength)
 */
function scoreFrame(frame, goal) {
  // Implementation in engine/optimize.js
}
```

## 3. Canvas Event Bus

```javascript
/**
 * Event types and payload structures
 */
const CanvasEvents = {
  // Initialization completed
  'canvas:ready': undefined,
  
  // User edit generated new payload
  'canvas:compute': {
    payload: EngineInput
  },
  
  // Engine calculation completed
  'engine:return': {
    result: EngineOutput
  },
  
  // History navigation
  'canvas:undo': undefined,
  'canvas:redo': undefined,
  
  // Canvas cleared
  'canvas:clear': undefined,
  
  // Grid configuration changed
  'canvas:gridChange': {
    visible: true,
    snap: true,
    spacing_in: 6
  },
  
  // Export requested
  'canvas:export': {
    format: 'png' // 'png' or 'csv'
  },
  
  // Warnings updated
  'canvas:warning': {
    warnings: [] // array of warning strings
  }
};
```

Implementation uses a simple publish/subscribe pattern:

```javascript
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

## 4. Global State Store

```javascript
/**
 * Deck footprint geometry
 */
const Footprint = {
  origin: { x: 0, y: 0 },   // always (0,0) in v1
  width_ft: 12,
  length_ft: 16
};

/**
 * Grid configuration
 */
const GridConfig = {
  visible: true,
  snap: true,
  spacing_in: 6 // 0.5-12 inches
};

/**
 * Complete application state
 */
const DeckState = {
  footprint: Footprint,
  context: EngineInput,    // mirrors payload
  engineOut: null,         // last returned overlay (or null)
  gridCfg: GridConfig,
  history: [],             // undo stack
  future: [],              // redo stack
  // State mutation methods implemented in store
};
```

State management uses a simple observable pattern:

```javascript
function createStore(initialState) {
  let state = {...initialState};
  const listeners = [];
  
  return {
    getState() {
      return {...state};
    },
    
    setState(newState) {
      state = {...state, ...newState};
      listeners.forEach(listener => listener(state));
    },
    
    subscribe(listener) {
      listeners.push(listener);
      return function unsubscribe() {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };
    }
  };
}

// Application state store
const store = createStore({
  footprint: {
    origin: { x: 0, y: 0 },
    width_ft: 12,
    length_ft: 16
  },
  context: {
    // Default engine input
    width_ft: 12,
    length_ft: 16,
    height_ft: 3,
    attachment: 'ledger',
    // ... other defaults
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
```

## 5. Command Pattern

```javascript
/**
 * Command interface
 */
const Command = {
  /** human-readable id e.g. 'setWidth' */
  tag: 'string',
  
  /** Apply change and return reverse command */
  apply: function(state) {
    // Modify state
    // Return command that undoes this change
  }
};
```

Command stack keeps up to 20 commands:

```javascript
class CommandStack {
  constructor(store) {
    this.store = store;
    this.maxDepth = 20;
  }
  
  execute(command) {
    const state = this.store.getState();
    
    // Clear future when new command executed
    state.future = [];
    
    // Apply command and get its inverse
    const inverseCommand = command.apply(state);
    
    // Add to history
    state.history.push(inverseCommand);
    
    // Trim history if needed
    if (state.history.length > this.maxDepth) {
      state.history.shift();
    }
    
    this.store.setState(state);
  }
  
  undo() {
    const state = this.store.getState();
    
    if (state.history.length === 0) {
      return;
    }
    
    // Pop most recent command
    const command = state.history.pop();
    
    // Apply it (this undoes the original action)
    const redoCommand = command.apply(state);
    
    // Add to redo stack
    state.future.push(redoCommand);
    
    this.store.setState(state);
  }
  
  redo() {
    const state = this.store.getState();
    
    if (state.future.length === 0) {
      return;
    }
    
    // Pop most recent redo command
    const command = state.future.pop();
    
    // Apply it
    const undoCommand = command.apply(state);
    
    // Add to history
    state.history.push(undoCommand);
    
    this.store.setState(state);
  }
  
  clear() {
    this.store.setState({
      history: [],
      future: []
    });
  }
}
```

## 6. Component Interfaces

```javascript
/**
 * Drawing surface props
 */
const DrawingSurfaceProps = {
  footprint: Footprint,
  overlay: EngineOutput, // or null
  grid: GridConfig,
  onEditFootprint: function(fp) {} // pushes command
};

/**
 * Context sidebar props
 */
const ContextPanelProps = {
  context: EngineInput,
  onChange: function(next) {} // handles partial updates
};

/**
 * BOM table props
 */
const BOMPanelProps = {
  list: null // material_takeoff array or null
};

/**
 * Grid toolbar props
 */
const GridToolbarProps = {
  grid: GridConfig,
  onUpdate: function(next) {} // handles grid changes
};
```

All callbacks **must** push a `Command` so undo/redo remains holistic.

## 7. Export Helpers

```javascript
/**
 * Creates PNG image from canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} - PNG image as Blob
 */
function exportPNG(canvas, options = {}) {
  return new Promise((resolve) => {
    const dataUrl = canvas.toDataURL('image/png');
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    
    resolve(new Blob([ab], {type: mimeString}));
  });
}

/**
 * Creates CSV file from material takeoff
 * @param {Array} mto - Material takeoff array
 * @returns {string} - CSV content
 */
function exportCSV(mto) {
  if (!mto || !mto.length) {
    return 'item,qty\n';
  }
  
  const header = 'item,qty\n';
  const rows = mto.map(row => `"${row.item}",${row.qty}`).join('\n');
  
  return header + rows;
}
```

## 8. Acceptance-Criteria Matrix

| Interface          | Must Pass Tests                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `computeStructure` | Given test payloads, returns output whose `compliance.warnings` is empty and whose `metrics.total_board_ft` matches fixture ±1%. |
| Event bus          | Emit sequence `compute → return` causes overlay refresh ≤ 250 ms.                                                                     |
| Undo/Redo          | After 10 random edits, 10× undo re-establishes initial `footprint` **and** API payload.                                               |
| Grid snap          | With `snap` ON and spacing = 1", dragging footprint corner yields `width_ft` multiple of 1/12 ft.                                     |
| Export             | Invoking each helper downloads a non-empty file (PNG ≥ 50 kB, CSV rows > 0).                                                            |

This interface-contracts specification freezes every boundary—types, functions, events, props, store shapes, commands—so engine, UI, and tests can be built with minimal coupling.
