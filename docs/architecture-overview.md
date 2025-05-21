# DeckPro Architecture Overview

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Component Breakdown](#component-breakdown)
3. [Data Flow](#data-flow)
4. [Event System](#event-system)
5. [State Management](#state-management)
6. [Engine Architecture](#engine-architecture)

## System Architecture

DeckPro is a web-based deck design application built with vanilla JavaScript, following an event-driven architecture with clear separation of concerns. Recent additions include real-time cost optimization and user-editable material pricing.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              User Interface                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Canvas Layer   │  Controls Layer  │  Material UI    │  Export Layer    │
├─────────────────┤                  │                │                  │
│  • Footprint    │  • Deck Config   │  • BOM Table   │  • PNG Export   │
│  • Dimensions   │  • Material Opts │  • Framing Spec│  • CSV Export   │
│  • Joists       │  • Cost Settings │  • Cost Summary│                  │
│  • Beams        │  • Material Costs│                │                  │
│  • Grid         │  • Optimization  │                │                  │
└─────────────────┴──────────────────┴────────────────┴──────────────────┘
                           │                   │
                           ▼                   ▼
                    ┌─────────────┐     ┌─────────────┐
                    │ Event Bus   │     │    Store    │
                    └─────────────┘     └─────────────┘
                           │                   │
                           ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Engineering Engine                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Validation  │  Joist Calc  │  Beam Calc  │  Post Calc  │  Optimizer  │
└──────────────┴──────────────┴─────────────┴─────────────┴─────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │  IRC Tables     │
                           │  (R507.5/R507.6)│
                           └─────────────────┘
```

## Component Breakdown

### 1. Canvas System (UI Layer)
- **DrawingSurface** (`canvas.js`): Main rendering engine
- **Layer System**: Composable rendering layers
  - FootprintLayer: Deck outline drawing
  - DimensionLayer: Measurements visualization
  - JoistLayer: Joist visualization
  - BeamLayer: Beam & rim joist visualization
  - GridLayer: Snap grid overlay

### 2. Control System (UI Layer)
- **UIControls** (`controls.js`): Form management and user input
- **Command Pattern**: Undo/redo functionality
- **Event-driven updates**: Reactive UI updates

### 3. Engine System (Core Logic)
- **Validation** (`validation.js`): Input validation
- **Joist Calculator** (`joist.js`): IRC-compliant joist selection
- **Beam Calculator** (`beam.js`): Beam sizing with splicing support
- **Post Calculator** (`post.js`): Post spacing and placement
- **Cantilever Optimizer** (`cantilever-optimizer.js`): Cost optimization

### 4. Data Management
- **Store** (`store.js`): Centralized state management
- **Event Bus** (`eventBus.js`): Pub/sub event system
- **Command Stack** (`command.js`): Undo/redo implementation
- **Persistence** (`persistence.js`): Save/load functionality

### 5. Material Data
- **Span Tables** (`span-tables.js`): IRC 2021 compliance data
- **Materials** (`materials.js`): Cost and dimension data

## Data Flow

### 1. User Input Flow
```
User Action → UI Event → Event Bus → Command → Store → UI Update
                                        ↓
                                   Engine Calc → Result
```

### 2. Canvas Drawing Flow
```
Mouse Event → FootprintLayer → Preview Event → Dimension Update
                    ↓
              Mouse Up → Change Event → Command → Store Update
```

### 3. Structure Generation Flow
```
Generate Button → Gather State → Engine Input → Calculations
                                       ↓
                              ← Structure Result ← IRC Validation
                                       ↓
                              Store Update → Canvas Update
```

## Event System

### Core Events
- `footprint:change` - Footprint creation/modification
- `footprint:preview` - Real-time preview during drawing
- `canvas:compute` - Trigger structure generation
- `canvas:ready` - Canvas initialization complete

### Event Flow Example
```javascript
// Drawing a footprint
1. MouseDown → footprint.isDrawing = true
2. MouseMove → eventBus.emit('footprint:preview', footprint)
3. MouseUp → eventBus.emit('footprint:change', footprint)
4. Main.js → uiControls.executeCommand('setFootprint', { footprint })
5. Command → store.setState({ footprint, context })
6. Store → triggers subscriptions → UI updates
```

## State Management

### Store Structure
```javascript
{
  footprint: {
    origin: { x, y },
    width_ft: number,
    length_ft: number
  },
  context: {
    width_ft: number,
    length_ft: number,
    height_ft: number,
    attachment: 'ledger' | 'free',
    beam_style_outer: 'drop' | 'inline' | null,
    beam_style_inner: 'drop' | 'inline' | null,
    footing_type: 'concrete' | 'helical' | 'surface',
    species_grade: string,
    forced_joist_spacing_in: number | null,
    decking_type: string,
    optimization_goal: 'cost' | 'strength'
  },
  engineOut: {
    joists: {...},
    beams: [...],
    posts: [...],
    material_takeoff: [...],
    metrics: {...},
    compliance: {...}
  },
  gridCfg: {
    visible: boolean,
    snap: boolean,
    spacing_in: number
  }
}
```

### Command Pattern Implementation
- All state changes go through commands
- Commands provide apply/undo functionality
- Command stack maintains history for undo/redo

## Engine Architecture

### 1. Input Validation
- Validates all user inputs against IRC requirements
- Checks dimensional constraints
- Ensures valid material selections

### 2. Joist Calculation
- Determines joist orientation (always span shorter dimension)
- Selects appropriate joist size from IRC R507.6
- Optimizes cantilever for cost reduction (drop beams only)
- Calculates joist count and spacing

### 3. Beam Calculation
- Determines beam span requirements
- Selects beam size from IRC R507.5 tables
- Implements splicing for spans exceeding single-beam limits
- Calculates post requirements

### 4. Post Calculation
- Determines post spacing based on beam capacity
- Generates post grid with proper alignment
- Calculates post heights based on deck height and footing type

### 5. Material Takeoff
- Calculates all required materials
- Accounts for standard lumber lengths
- Includes hardware (hangers, post bases, splice plates)
- Provides cost estimation

### 6. Compliance Checking
- Validates against IRC 2021 requirements
- Checks cantilever limits (≤1/4 of back-span)
- Ensures proper decking support
- Generates warnings for non-compliant configurations

## Key Design Patterns

1. **Layer Pattern**: Composable rendering layers for canvas
2. **Command Pattern**: Undo/redo functionality
3. **Observer Pattern**: Event bus and store subscriptions
4. **Factory Pattern**: Command creation
5. **Module Pattern**: Encapsulated components
6. **Singleton Pattern**: Store and event bus instances

## Performance Considerations

1. **Canvas Optimization**:
   - Layer-based rendering
   - Dirty rectangle optimization
   - Zoom/pan transformations

2. **State Management**:
   - Immutable state updates
   - Subscription-based updates
   - Debounced calculations

3. **Engine Calculations**:
   - Memoization for repeated calculations
   - Efficient span table lookups
   - Optimized cantilever calculations

## Security Considerations

1. **Input Validation**: All user inputs validated
2. **No Server Communication**: Pure client-side application
3. **Local Storage**: Optional persistence to browser storage
4. **Export Security**: Safe PDF/data export