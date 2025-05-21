# Deck-Design Canvas – Technical Specification (v1.2)

This specification defines a lightweight, precise drawing interface for deck design, paired with the Structure-Generation Engine spec v2.0. All geometry is plan-view (2-D).

## 1. Purpose

Provide a lightweight, precise drawing surface that lets a deck builder:

- Sketch or numerically enter the deck footprint (rectangular in v1)
- Edit contextual flags (attachment, footing type, optimization goal, etc.)
- Transmit a single JSON payload to the Structure Engine
- Render the returned framing overlay (joists, beams, posts) in real-time
- Export the final drawing + material take-off in PNG/CSV

## 2. Core View Model

| Concept | Rule |
|---------|------|
| Coordinate space | Cartesian, origin (0,0) at left-rear ledger corner. Units = feet (floating-point). |
| Grid | Configurable: 6" light grid default, 1' heavy grid; snap increment matches grid spacing. |
| Elements | Footprint, JoistLayer, BeamLayer, PostLayer, DimensionLabel. Each is a separate Canvas layer. |
| Camera | Pan (mouse-drag) & zoom (wheel) 0.25×-8×, preserves 1-pixel stroke width. |

### 2.1. Grid & Snapping Options

| Option | UI | Default | Detail |
|--------|-----|---------|--------|
| Grid Visible | Toggle in top-bar | ON | Shows light grid lines & heavy lines (2× spacing). |
| Grid Spacing | Dropdown (½", 1", 3", 6", 12") | 6" | Re-renders grid instantly on change. |
| Snap to Grid | Toggle next to Grid Visible | ON | All footprint vertices snap to nearest grid node; dimensions update accordingly. |

Snap resolution dynamically follows selected grid spacing; when OFF, numeric inputs still round to ⅛" on engine payload.

## 3. Functional Requirements

### 3.1. Footprint Authoring

| Action | UX Behavior |
|--------|------------|
| Draw Rectangle | Click-drag or enter W×L in sidebar form. |
| Numeric Edit | Double-click dimension label to type exact feet/inches (12'-6¾" accepted). |
| Move | Drag entire footprint; coordinates auto-round to ½". |
| Rotate | Disabled in v1 (all rectangles axis-aligned). |

### 3.2. Mandatory Editing Controls

| Control | Location | Behavior |
|---------|----------|----------|
| Undo | Top-bar icon ⌘ / Ctrl + Z | Reverts the last command affecting the canvas (draw, move, numeric edit, context change that altered geometry). |
| Redo | Top-bar icon ⌘ / Ctrl + Y | Re-applies the most recently undone command. |
| Clear Canvas | Danger-zone button (trash icon) | Removes all deck geometry and overlay layers, resets undo stack. Requires confirmation modal. |

Implementation — maintain an immutable command stack (maxDepth = 20 frames). Each entry stores:
```javascript
{
  footprint,        // width_ft, length_ft, origin
  contextPayload,   // attachment, options...
  viewportState     // pan, zoom
}
```

### 3.3. Context Panel

Radio / dropdown inputs bound 1-to-1 with Structure Engine payload keys:

- attachment (Ledger / Freestanding)
- beam_style_outer (Auto / Drop / Inline)
- beam_style_inner (Auto / Drop / Inline) – visible only when Freestanding
- footing_type (Helical / Concrete / Surface)
- species_grade (SPF #2 default)
- forced_joist_spacing (Auto / 12 / 16 / 24 in)
- decking_type (Composite 1" / Wood 5/4 / Wood 2x)
- optimization_goal (Cost / Strength)
- height_ft (numeric box)

### 3.4. Engine Interaction

| Event | Trigger | Payload |
|-------|---------|---------|
| canvas:compute | Footprint edit or context change | {width_ft,length_ft,height_ft,…} per §2.0 Engine spec |
| engine:return | Engine responds | Overlay layers updated, sidebar BOM table updated |

Canvas throttles calls: 250 ms debounce to avoid chatty updates while dragging.

### 3.5. Overlay Rendering

| Layer | Draw Rules |
|-------|------------|
| Joists | Parallel lines, spacing_in from engine, arrow showing cantilever. |
| Beams | Thick lines; drop beams offset 1½" under joists, inline beams centered. |
| Posts | 6"×6" squares; gray when suppressed by surface footings. |
| Dimensions | Live labels on width & length; update after snaps. |
| Warnings | Red banner top-right when compliance.warnings.length>0. |

## 4. Data Contracts

### 4.1. Canvas → Engine (canvas:compute)
Exactly the Canonical Input Payload defined in Structure Engine spec v2.0.

### 4.2. Engine → Canvas (engine:return)
Uses Output Payload spec §8. Canvas consumes only:

- joists, beams, posts → overlay.
- material_takeoff → BOM table.
- compliance.warnings → banner.

## 5. UI Components

| Component | Tech | Notes |
|-----------|------|-------|
| Drawing Surface | Canvas API (standard HTML5) | Main drawing area |
| Context Sidebar | HTML form, auto-updates JSON view (dev mode) | Input controls |
| BOM Table | HTML table with CSV export | Materials list |
| Top Bar | See 5.1 for detailed layout | Controls toolbar |

### 5.1. Top-Bar Layout
```
[ Undo ] [ Redo ] | [ Clear Canvas ] | [ Grid ☑ ] [ Snap ☑ ] [ Spacing ▾ ] | [ Zoom – ] [ Zoom + ] | [ Export ▾ ]
```
- Spacing dropdown values: 0.5", 1", 3", 6", 12"
- Export dropdown: PNG, CSV options

## 6. Export Specs

| Format | Contents |
|--------|----------|
| PNG | Viewport snapshot: Canvas.toDataURL('image/png'), optional transparent bg. |
| CSV | Direct dump of material_takeoff array. |

## 7. Edge-Case Behavior

- Negative or zero dimension → block draw, show toast "Dimension must be > 0".
- Footprint > 40 ft any side → soft warning; still allowed.
- User sets spacing against decking limit → engine returns warning; label flashes red.
- Rapid drag → real-time overlay ghost until debounce fires.

## 8. Performance Benchmarks

- Initial load ≤ 150 ms.
- Frame overlay render ≤ 16 ms (60 fps) for decks ≤ 40 × 40 ft.
- Memory ≤ 50 MB idle, ≤ 120 MB peak while zooming.
- Undo/redo operations ≤ 10ms regardless of deck complexity.

## 9. API Events (for host application)

| Event | Args | Fired By |
|-------|------|----------|
| canvas:ready | — | after init |
| canvas:compute | payload | when user edits input |
| engine:return | result | host → canvas |
| canvas:export | {type:"png"/"csv"} | when export triggered |
| canvas:warning | [warnings] | whenever compliance warnings change |
| canvas:undo / canvas:redo | — | after stack pop/push; host may ignore |
| canvas:clear | — | after confirmation modal accepted |
| canvas:gridChange | {visible:bool,snap:bool,spacing_in:number} | for persistence in host settings |

## 10. Implementation Details

### Canvas Setup

```javascript
// Canvas initialization
function initCanvas() {
  const canvas = document.getElementById('deckCanvas');
  const ctx = canvas.getContext('2d');
  
  // Set up canvas dimensions with device pixel ratio handling
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  
  // Initial transformations
  ctx.translate(canvas.clientWidth / 2, canvas.clientHeight / 2);
  
  return { canvas, ctx };
}
```

### Layer System

```javascript
// Abstract layer class
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

// Grid layer
class GridLayer extends Layer {
  constructor(options = {}) {
    super('grid', options);
    this.spacing_in = options.spacing_in || 6;
    this.snap = options.snap !== false;
  }
  
  draw(ctx) {
    // Draw grid lines based on spacing
    const feet_per_inch = 1/12;
    const spacing_ft = this.spacing_in * feet_per_inch;
    
    // Implementation details...
  }
}

// FootprintLayer, JoistLayer, BeamLayer, PostLayer implementations...
```

### Command Implementation

```javascript
// Example command objects
const SetWidthCommand = (store, newWidth) => ({
  tag: 'setWidth',
  apply: () => {
    const oldWidth = store.getState().footprint.width_ft;
    store.setState({
      footprint: {
        ...store.getState().footprint,
        width_ft: newWidth
      }
    });
    
    return {
      tag: 'setWidth',
      apply: () => {
        store.setState({
          footprint: {
            ...store.getState().footprint,
            width_ft: oldWidth
          }
        });
        return SetWidthCommand(store, newWidth);
      }
    };
  }
});
```

### Event System

```javascript
// Event subscription examples
eventBus.subscribe('canvas:compute', (payload) => {
  // Debounce computation request
  clearTimeout(computeTimer);
  computeTimer = setTimeout(() => {
    const result = computeStructure(payload);
    eventBus.emit('engine:return', { result });
  }, 250);
});

eventBus.subscribe('engine:return', ({ result }) => {
  // Update layers with new data
  joistLayer.update(result.joists);
  beamLayer.update(result.beams);
  postLayer.update(result.posts);
  drawingManager.draw();
  
  // Update BOM table
  updateBOMTable(result.material_takeoff);
  
  // Show warnings if any
  if (result.compliance.warnings.length > 0) {
    eventBus.emit('canvas:warning', { warnings: result.compliance.warnings });
  }
});
```

## 11. Testing Plan

| Test Type | Cases |
|-----------|-------|
| Unit | geometry snapping, undo/redo stack integrity, grid rendering |
| Integration | full round-trip with engine for typical decks |
| Manual | draw, modify, export in supported browsers |

This specification defines a complete canvas-based drawing system that integrates with the structure engine to provide a lightweight, responsive deck design interface.
