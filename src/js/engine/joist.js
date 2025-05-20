// Joist calculation functions

function selectJoist(width, species, spacing, deckingType, beamStyle = 'drop', deckLength = null, optimizationGoal = 'cost', footingType = 'helical') {
  const joistTable = spanTables.joists[species];
  if (!joistTable) {
    throw new EngineError('SPECIES_UNKNOWN', `Unknown species/grade: ${species}`);
  }
  
  // Get maximum spacing allowed by decking
  const maxSpacing = spanTables.deckingSpacing[deckingType].perpendicular;
  
  // Use forced spacing or find optimal
  const validSpacings = spacing ? [spacing] : [12, 16, 24].filter(s => s <= maxSpacing);
  
  let bestJoist = null;
  let minCost = Infinity;
  
  // Determine cantilever capability based on beam style
  const canCantilever = beamStyle === 'drop';
  
  // If we can cantilever and are optimizing for cost, find optimal cantilever
  if (canCantilever && optimizationGoal === 'cost' && deckLength) {
    const optimalConfig = cantileverOptimizer.findOptimalCantilever(width, species, deckingType, deckLength, footingType);
    
    if (optimalConfig && optimalConfig.totalCost < Infinity) {
      return {
        size: optimalConfig.joist.size,
        spacing_in: optimalConfig.joist.spacing_in,
        count: optimalConfig.joist.count,
        span_ft: optimalConfig.backSpan_ft,
        cantilever_ft: optimalConfig.cantilever_ft,
        total_length_ft: optimalConfig.joist.length_ft
      };
    }
  }
  
  // Fallback to simple logic if optimization fails or not applicable
  for (const testSpacing of validSpacings) {
    // For a given deck width, determine required back-span and cantilever
    for (const size of ['2x6', '2x8', '2x10', '2x12']) {
      const allowableSpan = joistTable[size][testSpacing];
      
      // For drop beams, we can use cantilever
      let backSpan, cantilever;
      
      if (canCantilever) {
        // With cantilever, deck width = back-span + cantilever
        // For basic logic, use a pragmatic 2' cantilever if it helps
        if (allowableSpan >= width - 2) {
          // Try 2' cantilever first
          cantilever = Math.min(2, width / 5); // Limit to 1/5 of width for safety
          backSpan = width - cantilever;
          
          // Verify IRC rule: cantilever ≤ 1/4 of back-span
          if (cantilever > backSpan / 4) {
            cantilever = backSpan / 4;
            backSpan = width - cantilever;
          }
        } else if (allowableSpan >= width) {
          // No cantilever needed
          backSpan = width;
          cantilever = 0;
        } else {
          // Can't span even with cantilever
          continue;
        }
      } else {
        // For inline beams, no cantilever possible
        if (allowableSpan < width) continue;
        backSpan = width;
        cantilever = 0;
      }
      
      // Calculate joist count - based on deck length if provided
      const lengthForCount = deckLength || width;
      const joistCount = Math.ceil(lengthForCount * 12 / testSpacing) + 1;
      
      // Calculate cost for this configuration
      const joistLength = backSpan + cantilever; // Actual joist length
      const joistStockLength = materials.getStockLength(joistLength, size);
      const costPerJoist = materials.lumber[size].costPerFoot * joistStockLength;
      const totalCost = joistCount * costPerJoist;
      
      if (totalCost < minCost) {
        minCost = totalCost;
        bestJoist = {
          size,
          spacing_in: testSpacing,
          count: joistCount,
          span_ft: backSpan,          // Back-span (ledger to beam)
          cantilever_ft: cantilever,  // Cantilever beyond beam
          total_length_ft: joistLength // Total joist length
        };
      }
      break; // Found adequate size for this spacing
    }
  }
  
  if (!bestJoist) {
    throw new EngineError('SPAN_EXCEEDED', `No joist configuration can span ${width} ft`);
  }
  
  return bestJoist;
}

// Calculate joist span for beam selection (IRC Table R507.5)
function getJoistSpanForBeamSelection(deckWidth, cantilever = 0) {
  // For beam selection, use the actual joist span (back-span)
  // This is the distance from ledger to beam
  return deckWidth - cantilever;
}