# Development Roadmap

## Overview

This document outlines practical improvements for DeckPro, focusing on user value rather than theoretical code purity.

## Current Status ✅

The application is stable and feature-complete for basic deck design:
- Generates IRC-compliant structures
- Optimizes for cost
- Provides visual design interface
- Exports material lists

## Immediate Priorities (Week 1)

### User-Facing Improvements

#### 1. Save/Load Projects
```javascript
// Add to controls.js
function saveProject() {
  const state = store.getState();
  const json = JSON.stringify(state);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'deck-design.json';
  a.click();
}

function loadProject(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const state = JSON.parse(e.target.result);
    store.setState(state);
  };
  reader.readAsText(file);
}
```

#### 2. Better Error Messages
```javascript
// Replace technical errors with user-friendly ones
try {
  const result = computeStructure(payload);
} catch (error) {
  if (error.code === 'SPAN_EXCEEDED') {
    showMessage('This deck is too large for standard lumber. Try reducing the size or adding more beams.');
  } else {
    showMessage('Unable to generate structure. Please check your inputs.');
  }
}
```

#### 3. Cost Display in BOM
```javascript
// Enhance BOM table with costs
function updateBOMTable(takeoff) {
  let totalCost = 0;
  takeoff.forEach(item => {
    const cost = calculateItemCost(item);
    totalCost += cost;
    // Add cost column to table
    row.insertCell(2).textContent = `$${cost.toFixed(2)}`;
  });
  // Show total
  document.getElementById('total-cost').textContent = `Total: $${totalCost.toFixed(2)}`;
}
```

## Near-Term Enhancements (Week 2-3)

### Professional Output

#### 1. Print-Friendly Plans
```css
@media print {
  .sidebar { display: none; }
  .canvas-container { 
    width: 100%;
    height: auto;
  }
  #deck-canvas {
    border: 1px solid black;
  }
}
```

#### 2. PDF Export
```javascript
// Using jsPDF or similar
function exportPDF() {
  const pdf = new jsPDF();
  pdf.text('Deck Design Report', 10, 10);
  pdf.addImage(canvas.toDataURL(), 'PNG', 10, 20, 180, 120);
  pdf.addPage();
  pdf.text('Bill of Materials', 10, 10);
  // Add BOM table
  pdf.save('deck-plan.pdf');
}
```

#### 3. Detailed Cost Report
- Material costs by category
- Labor estimates (optional)
- Comparison with different material choices
- Cost per square foot

## Future Considerations (Month 2+)

### Enhanced Features (Only if users request)

1. **Multi-Level Decks**
   - Support for different heights
   - Stair calculations
   - Railing requirements

2. **Advanced Materials**
   - Composite decking options
   - Steel framing
   - Cable railings

3. **Code Compliance**
   - Different building codes (IBC, local)
   - Permit-ready drawings
   - Load calculations

4. **Professional Tools**
   - Customer quotes
   - Material ordering integration
   - 3D visualization

## Not Planned (Unless needed)

These items were identified as "technical debt" but aren't actually problems:

- ❌ Refactoring large files (they work fine)
- ❌ Adding more tests (critical paths covered)
- ❌ Performance optimization (no issues reported)
- ❌ Architecture changes (current structure works)

## Development Philosophy

1. **User Value First** - Only build what users need
2. **Pragmatic Solutions** - Simple fixes over complex refactors
3. **Incremental Improvement** - Small, focused changes
4. **Measure Impact** - Track if changes help users

## Success Metrics

- User can save/load projects ✓
- Errors are understandable ✓
- Costs are visible ✓
- Plans can be printed ✓
- Export works reliably ✓

Focus on these practical improvements rather than theoretical code quality metrics.