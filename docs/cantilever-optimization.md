# Cantilever Optimization Theory and Implementation

## Overview

The cantilever optimization system intelligently determines the optimal cantilever length for deck joists to minimize total material costs while complying with IRC 2021 building codes.

## Mathematical Foundation

### IRC Constraints

Per IRC R507.6, the maximum cantilever is limited to 1/4 of the back-span:

```
cantilever ≤ backSpan / 4
```

Given a deck width `W`:
```
W = backSpan + cantilever
W = backSpan + backSpan/4
W = 1.25 × backSpan
```

Therefore:
```
backSpan = W / 1.25
maxCantilever = W / 5
```

### Cost Function

The total deck cost is the sum of:

1. **Joist Cost**: `joistCount × joistLength × costPerFoot`
2. **Beam Cost**: `plyCount × beamLength × costPerFoot`  
3. **Post Cost**: `postCount × postBaseCost`

### Optimization Variables

The key insight is that cantilever length affects:

1. **Joist span** - Shorter back-spans allow smaller joist sizes
2. **Beam loading** - The tributary width for beam selection is the back-span, not total deck width
3. **Material efficiency** - Standard lumber lengths create waste considerations

## Implementation Strategy

### 1. Iterative Testing

The optimizer tests cantilever lengths from 0 to maximum allowed in 0.5 ft increments:

```javascript
for (let cantilever = 0; cantilever <= maxCantilever; cantilever += 0.5) {
  const backSpan = width - cantilever;
  
  // Check IRC compliance
  if (cantilever > backSpan / 4) continue;
  
  // Calculate costs
  const joistCost = calculateJoistCost(backSpan, cantilever, ...);
  const beamCost = calculateBeamCost(length, backSpan, ...);
  
  // Track minimum cost configuration
}
```

### 2. Joist Sizing

For each cantilever configuration:

1. Determine minimum joist size that can span the back-span
2. Consider multiple spacing options (12", 16", 24")
3. Account for standard lumber lengths and waste
4. Calculate total joist cost including all joists needed

### 3. Beam Sizing

The critical insight: beams are sized based on tributary load width, which equals the joist back-span (not including cantilever):

```javascript
// IRC R507.5 uses joist span for beam selection
const tributaryWidth = backSpan; // Not the full deck width!
const beam = selectBeam(beamLength, tributaryWidth, species);
```

### 4. Standard Length Optimization

The system accounts for standard lumber lengths (8', 10', 12', 14', 16', 20') and includes waste factors:

```javascript
const practicalLength = theoreticalLength * 1.05; // 5% waste
const standardLength = getStandardLength(size, practicalLength);
```

## Benefits

1. **Cost Reduction**: Optimal cantilevers can reduce costs by 10-20% through:
   - Smaller joist sizes due to reduced spans
   - More efficient beam sizing
   - Better material utilization

2. **Structural Efficiency**: Cantilevers naturally provide:
   - Better load distribution
   - Reduced deflection at deck edge
   - Improved deck stability

3. **Code Compliance**: All configurations automatically comply with IRC requirements

## Example Optimization

For a 12' × 16' deck with SPF #2 lumber:

Without optimization (no cantilever):
- Joists: 2×10 @ 16" o.c. spanning 12'
- Beam: (3)2×10 for 12' tributary width
- Total cost: ~$850

With optimized 2' cantilever:
- Joists: 2×8 @ 16" o.c. spanning 10' + 2' cantilever
- Beam: (2)2×10 for 10' tributary width  
- Total cost: ~$720
- Savings: ~15%

## Configuration Options

The optimizer respects user preferences:

- **Forced spacing**: Use specific joist spacing if required
- **Beam style**: Only optimize cantilevers for drop beams
- **Species**: Works with all standard lumber species
- **Optimization goal**: Cost vs. strength optimization

## Future Enhancements

1. **Multi-beam optimization**: Consider intermediate beams for very wide decks
2. **Deflection analysis**: Include deflection limits in optimization
3. **Regional pricing**: Adjust for local material costs
4. **Environmental factors**: Consider wind/snow loads in calculations