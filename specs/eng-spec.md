# Deck-Structure Generation Engine – Technical Specification (v2.0)

This document specifies a complete structure generation engine for rectangular residential decks in compliance with IRC 2021 §R507 (40 psf live + 10 psf dead load).

## 1. System Purpose

Turn minimal geometric and contextual data into a code-compliant framing plan and material take-off, selecting members either for lowest cost or greatest reserve strength. The engine performs all necessary calculations to determine joist sizes, beam configurations, and post placement.

## 2. Canonical Input Payload

| Key | Type | Required | Default | Notes |
|-----|------|----------|---------|-------|
| `width_ft` | number | ✓ | — | Joist back-span (ledger → outer beam) before cantilever |
| `length_ft` | number | ✓ | — | Beam span (parallel to ledger) |
| `height_ft` | number | ✓ | — | Finished deck height above grade |
| `attachment` | "ledger" \| "free" | ✓ | — | "ledger" = attached to house |
| `beam_style_outer` | "drop" \| "inline" \| null | — | null | null means engine decides (defaults to drop) |
| `beam_style_inner` | "drop" \| "inline" \| null | — | null | Only used when attachment="free" |
| `footing_type` | "helical" \| "concrete" \| "surface" | ✓ | — | Drives clearance/frost checks |
| `species_grade` | "SPF #2" \| "DF #1" \| "HF #2" \| "SP #2" | ✓ | — | Key to span-table rows |
| `forced_joist_spacing_in` | 12 \| 16 \| 24 \| null | — | null | null lets engine choose |
| `decking_type` | "composite_1in" \| "wood_5/4" \| "wood_2x" | ✓ | — | Sets max joist spacing |
| `optimization_goal` | "cost" \| "strength" | — | "cost" | Global framing optimiser |

```javascript
// Example input payload
const input = {
  width_ft: 12,
  length_ft: 16,
  height_ft: 4,
  attachment: "ledger",
  beam_style_outer: "drop",
  beam_style_inner: null,
  footing_type: "helical",
  species_grade: "SPF #2",
  forced_joist_spacing_in: null,
  decking_type: "composite_1in",
  optimization_goal: "cost"
};
```

## 3. Derived Parameters

| Parameter | Calculation Rule |
|-----------|------------------|
| `cantilever_max_ft` | ≤ ¼ × back-span (per IRC Table R507.6) |
| `frost_required` | true if height_ft ≥ 2.5 ft OR attachment="ledger" |
| `house_clearance_ft` | If footing_type="helical" at house wall → ≥ 2 ft |
| `joist_spacing_in` | forced value OR best of 12/16/24 within decking limit |

## 4. Beam-Style Auto-Selection

When beam styles are not explicitly specified, the engine selects the appropriate styles:

```javascript
// Outer beam
if (beam_style_outer === null) {
  beam_style_outer = "drop";  // default
}

// Inner support for freestanding decks
if (attachment === "free" && beam_style_inner === null) {
  beam_style_inner = (
    footing_type === "helical" && house_clearance_ft > 0 
      ? "inline" 
      : "drop"
  );
}
```

Inline beams may also be forced when vertical clearance or user aesthetic requirements demand it.

## 5. Global Optimization Strategy

When multiple code-compliant options exist, the engine optimizes based on the selected goal:

### Cost Optimization
- Minimize: `total_board_feet × species_factor + hardware_units`
- Tie-break: Fewer unique lumber lengths

### Strength Optimization
- Maximize: `reserve_capacity_ratio` (minimum across all members)
- Tie-break: Lower board-feet

## 6. Algorithm Workflow

1. **Generate Candidate Joist Sets**
   - For each valid spacing (forced or 12/16/24″), pick smallest depth meeting span in Table R507.6
   - Apply decking-spacing limit and cantilever (drop-beam only)

2. **Generate Candidate Beam Sets**
   - From joist reactions (tributary width), query Table R507.5 for size, plies, post spacing

3. **Compose Structure Variants**
   - Combine joist, beam, cantilever, post-grid possibilities into full frames
   - Score & select with global optimizer (cost or strength)

4. **Edge-Case Validation**
   - Helical clearance, frost requirement, forced-spacing vs. decking, height rules

5. **Emit Output Payload**
   - Format results according to output specification (§8)

All table lookups are cached; locale amendments can swap tables without code changes.

## 7. Core Pure Functions

```javascript
/**
 * Main entry point - converts user geometry + context into framing & BOM
 * @param {Object} payload - Complete input as specified in §2
 * @returns {Object} - Complete output as specified in §8
 * @throws {Error} if payload fails validation or violates mandatory rules
 */
function computeStructure(payload) {
  // Implementation details...
}

/**
 * Determines appropriate joist size based on span and constraints
 * @param {number} width - Span in feet
 * @param {string} species - Species/grade key
 * @param {number} spacing - Joist spacing in inches
 * @param {string} decking - Decking material type
 * @returns {Object} - Size, spacing, and cantilever details
 */
function selectJoist(width, species, spacing, decking) {
  // Implementation details...
}

/**
 * Determines beam size and post spacing
 * @param {number} span - Beam span in feet
 * @param {number} tributary - Tributary load width in feet
 * @param {string} species - Species/grade key
 * @returns {Object} - Size, plies, and post spacing details
 */
function selectBeam(span, tributary, species) {
  // Implementation details...
}

/**
 * Creates evenly-spaced post positions
 * @param {number} length - Beam length in feet
 * @param {number} maxSpacing - Maximum post spacing
 * @returns {Array<number>} - X coordinates for posts
 */
function generatePostGrid(length, maxSpacing) {
  // Implementation details...
}

/**
 * Scores frame options based on optimization goal
 * @param {Object} frame - Frame configuration
 * @param {string} goal - "cost" or "strength"
 * @returns {number} - Score (lower is better for cost, higher for strength)
 */
function scoreFrame(frame, goal) {
  // Implementation details...
}
```

## 8. Output Payload (Engine → Canvas & BOM)

```javascript
{
  "optimization_goal": "cost",
  "joists": { 
    "size": "2x10", 
    "spacing_in": 16, 
    "cantilever_ft": 1 
  },
  "beams": [
    { 
      "position": "outer", 
      "style": "drop",  
      "size": "(3)2x10",
      "post_spacing_ft": 6.5, 
      "post_count": 4 
    },
    { 
      "position": "inner", 
      "style": "ledger"
    }  // if attached
  ],
  "posts": [
    { "x": 0, "y": 0 }, 
    { "x": 6.5, "y": 0 }, 
    { "x": 13, "y": 0 }, 
    { "x": 19.5, "y": 0 }
  ],
  "material_takeoff": [
    { "item": "2x10-12' joist", "qty": 21 },
    { "item": "2x10-10' beam", "qty": 6 },
    { "item": "6x6-10' post", "qty": 4 },
    { "item": "LUS210 hanger", "qty": 21 },
    { "item": "PB66 post base", "qty": 4 }
  ],
  "metrics": {
    "total_board_ft": 328,          // cost mode
    "reserve_capacity_min": 1.17    // strength mode only
  },
  "compliance": {
    "joist_table": "IRC-2021 R507.6(1)",
    "beam_table": "IRC-2021 R507.5(1)",
    "assumptions": ["IRC default loads"],
    "warnings": []
  }
}
```

The canvas uses joists, beams, posts for overlay; BOM exporter writes material_takeoff.

## 9. Implementation Notes

### Span Tables

The engine includes the following IRC 2021 span tables:

- Table R507.5 - Deck Beam Span Lengths (LΔ)
- Table R507.6 - Deck Joist Spans for Common Lumber Species (ft. - in.)
- Table R507.7 - Maximum Joist Spacing for Decking

These are implemented as lookup tables in the code.

### Validation

The engine validates all inputs before calculations:

- width_ft, length_ft > 0
- height_ft ≥ 0
- Surface footings illegal if height_ft ≥ 2.5 ft AND attachment="ledger"
- Species grade must match known values

### Error Handling

The engine throws structured errors with codes:

```javascript
throw new EngineError('FROST_REQUIRED', 'Surface footings require frost protection at this height');
```

Common error codes:
- `INVALID_INPUT` - Malformed payload
- `FROST_REQUIRED` - Surface footing restrictions
- `SPAN_EXCEEDED` - No compliant solution exists
- `SPECIES_UNKNOWN` - Unknown wood species/grade

### Performance

- Computations complete in < 10ms for standard decks
- Caching of intermediate results for rapid recalculation
- All functions are pure and deterministic for testability

## 10. Usage Examples

```javascript
// Basic usage
try {
  const result = computeStructure({
    width_ft: 12,
    length_ft: 16,
    height_ft: 3,
    attachment: "ledger",
    footing_type: "helical",
    species_grade: "SPF #2",
    decking_type: "composite_1in"
  });
  
  console.log(result);
} catch (error) {
  console.error(`Error: ${error.code} - ${error.message}`);
}
```

This specification defines a complete, deterministic engine for generating code-compliant deck framing plans with predictable optimization strategies and well-defined inputs and outputs.
