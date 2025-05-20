# Component Relationships and Data Flow

## Component Interaction Map

```mermaid
graph TB
    subgraph "User Interface"
        UI[User Actions]
        Canvas[Canvas Drawing]
        Forms[Form Controls]
    end
    
    subgraph "Event System"
        EventBus[Event Bus]
        Commands[Command System]
    end
    
    subgraph "State Management"
        Store[Central Store]
        Subscriptions[Subscriptions]
    end
    
    subgraph "Canvas Layers"
        Footprint[FootprintLayer]
        Dimensions[DimensionLayer]
        Joists[JoistLayer]
        Beams[BeamLayer]
        Grid[GridLayer]
    end
    
    subgraph "Engineering Engine"
        Validator[Validation]
        JoistCalc[Joist Calculator]
        BeamCalc[Beam Calculator]
        PostCalc[Post Calculator]
    end
    
    subgraph "Data Sources"
        SpanTables[IRC Span Tables]
        Materials[Material Data]
    end
    
    UI --> Canvas
    UI --> Forms
    Canvas --> Footprint
    Forms --> Commands
    
    Footprint --> EventBus
    Commands --> Store
    EventBus --> Commands
    
    Store --> Subscriptions
    Subscriptions --> Canvas
    Subscriptions --> Forms
    
    Store --> Validator
    Validator --> JoistCalc
    Validator --> BeamCalc
    JoistCalc --> SpanTables
    BeamCalc --> SpanTables
    BeamCalc --> PostCalc
    
    JoistCalc --> Materials
    BeamCalc --> Materials
    PostCalc --> Materials
    
    JoistCalc --> Store
    BeamCalc --> Store
    PostCalc --> Store
```

## Data Flow Sequences

### 1. Drawing a Footprint

```mermaid
sequenceDiagram
    participant User
    participant FootprintLayer
    participant EventBus
    participant UIControls
    participant Store
    participant DimensionLayer
    
    User->>FootprintLayer: MouseDown
    FootprintLayer->>FootprintLayer: isDrawing = true
    
    loop MouseMove
        User->>FootprintLayer: MouseMove
        FootprintLayer->>EventBus: emit('footprint:preview')
        EventBus->>DimensionLayer: Update dimensions
        EventBus->>UIControls: Update input fields
    end
    
    User->>FootprintLayer: MouseUp
    FootprintLayer->>EventBus: emit('footprint:change')
    EventBus->>UIControls: executeCommand('setFootprint')
    UIControls->>Store: setState(footprint)
    Store->>DimensionLayer: Update final dimensions
```

### 2. Generating Structure

```mermaid
sequenceDiagram
    participant User
    participant UIControls
    participant EventBus
    participant Engine
    participant Store
    participant Layers
    
    User->>UIControls: Click Generate
    UIControls->>EventBus: emit('canvas:compute')
    EventBus->>Engine: computeStructure(payload)
    
    Engine->>Engine: Validate input
    Engine->>Engine: Calculate joists
    Engine->>Engine: Calculate beams
    Engine->>Engine: Calculate posts
    Engine->>Engine: Generate takeoff
    
    Engine->>Store: Return structure
    Store->>Layers: Update all layers
    Layers->>Canvas: Redraw
```

### 3. Undo Operation

```mermaid
sequenceDiagram
    participant User
    participant UIControls
    participant CommandStack
    participant Store
    participant UI
    
    User->>UIControls: Click Undo
    UIControls->>CommandStack: undo()
    CommandStack->>CommandStack: Pop from history
    CommandStack->>Command: apply()
    Command->>Store: setState(previous)
    Store->>UI: updateUIFromState()
```

## Component Dependencies

### Direct Dependencies

```
controls.js
├── command.js
├── store.js
├── eventBus.js
└── persistence.js

main.js
├── eventBus.js
├── command.js
├── store.js
├── canvas.js
├── all layer files
├── controls.js
├── engine/index.js
└── persistence.js

engine/index.js
├── validation.js
├── joist.js
├── beam.js
├── post.js
└── materials.js

canvas.js
└── (no direct dependencies)
```

### Event Dependencies

```
EventBus Events:
├── footprint:change
│   ├── Emitted by: FootprintLayer
│   └── Handled by: main.js → UIControls
├── footprint:preview
│   ├── Emitted by: FootprintLayer
│   └── Handled by: main.js → UI updates
├── canvas:compute
│   ├── Emitted by: UIControls
│   └── Handled by: main.js → Engine
└── canvas:ready
    ├── Emitted by: main.js
    └── Handled by: (none currently)
```

### Store Subscriptions

```
Store Subscribers:
├── main.js
│   ├── Updates canvas layers
│   ├── Updates joist visualization
│   └── Updates beam visualization
└── controls.js (indirect via commands)
    ├── Updates form fields
    └── Updates UI state
```

## Critical Paths

### 1. User Input → Visual Feedback
```
Fastest Path (Preview):
User Mouse → FootprintLayer → EventBus → UI Update
Latency: ~5-10ms

Slowest Path (Structure Generation):
User Click → UIControls → EventBus → Engine → Store → All Layers → Canvas
Latency: ~100-200ms
```

### 2. State Change → UI Update
```
Command Path:
User Action → Command → Store → Subscriptions → UI Components
Latency: ~20-30ms

Direct Path:
Event → Store → Subscriptions → UI Components
Latency: ~10-15ms
```

## Coupling Analysis

### Tight Coupling Points

1. **Canvas System**
   - All layers depend on DrawingSurface
   - Layers know about each other's existence
   - Direct state access in some places

2. **Engine Components**
   - Direct span table access
   - Shared material data references
   - Cross-component calculations

3. **UI Controls**
   - Mixed responsibilities
   - Direct DOM manipulation
   - Command creation logic embedded

### Loose Coupling Points

1. **Event System**
   - Publishers don't know subscribers
   - Clean event interface
   - Asynchronous communication

2. **Command Pattern**
   - Encapsulated operations
   - Consistent interface
   - Reversible actions

3. **Store Pattern**
   - Single source of truth
   - Immutable updates
   - Subscription-based updates

## Data Transform Points

### Input Transformations
```
User Input → Validation → Normalized Data
├── Footprint: pixels → feet
├── Dimensions: display → internal
└── Options: UI values → engine format
```

### Output Transformations
```
Engine Output → Display Format
├── Calculations: internal → user-friendly
├── Coordinates: feet → pixels
└── Measurements: decimal → feet-inches
```

### State Transformations
```
Commands ↔ Store State
├── Forward: apply state changes
├── Reverse: undo state changes
└── Merge: combine partial updates
```

## Message Flow Patterns

### 1. Request-Response
- Generate button → Engine calculation → Result

### 2. Publish-Subscribe
- Footprint changes → Multiple UI updates
- Store changes → Layer updates

### 3. Command Pattern
- User actions → Undoable operations

### 4. Observer Pattern
- Store state → Reactive UI updates

## Performance Implications

### Hot Paths
1. Mouse move events during drawing
2. Canvas redraw operations
3. Preview event handling

### Bottlenecks
1. Full canvas redraws
2. Synchronous calculations
3. Unbatched DOM updates

### Optimization Opportunities
1. Dirty rectangle tracking
2. Event debouncing
3. Calculation memoization
4. Virtual DOM or RAF batching