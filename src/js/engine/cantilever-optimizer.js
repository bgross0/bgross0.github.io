// Cantilever optimization functions

/**
 * Finds the optimal cantilever length that minimizes total material cost
 * @param {number} deckWidth - Total deck width in feet
 * @param {string} species - Species/grade key
 * @param {string} deckingType - Decking material type
 * @param {number} deckLength - Deck length for beam calculations
 * @param {string} footingType - Type of footing (helical, concrete, surface)
 * @returns {Object} - Optimal configuration with cantilever
 */
function findOptimalCantilever(deckWidth, species, deckingType, deckLength, footingType = 'helical') {
  let bestConfig = null;
  let minCost = Infinity;
  
  // Test different cantilever lengths from 0 to max allowed
  // Increment by 0.5 ft for practical construction
  for (let cantilever = 0; cantilever <= 3; cantilever += 0.5) {
    // Calculate required back-span
    const backSpan = deckWidth - cantilever;
    
    // Check IRC rule: cantilever ≤ 1/4 of back-span
    if (cantilever > backSpan / 4) continue;
    
    // Get joist configuration for this cantilever
    const config = evaluateCantileverConfig(backSpan, cantilever, species, deckingType, deckLength, deckWidth, footingType);
    
    if (config && config.totalCost < minCost) {
      minCost = config.totalCost;
      bestConfig = config;
    }
  }
  
  return bestConfig || {
    cantilever_ft: 0,
    backSpan_ft: deckWidth,
    totalCost: Infinity
  };
}

/**
 * Evaluates the cost of a specific cantilever configuration
 */
function evaluateCantileverConfig(backSpan, cantilever, species, deckingType, deckLength, deckWidth, footingType = 'helical') {
  const joistTable = spanTables.joists[species];
  if (!joistTable) return null;
  
  // Get maximum spacing allowed by decking
  const maxSpacing = spanTables.deckingSpacing[deckingType].perpendicular;
  const validSpacings = [12, 16, 24].filter(s => s <= maxSpacing);
  
  let bestConfig = null;
  let minCost = Infinity;
  
  for (const spacing of validSpacings) {
    // Find smallest joist size that can span the back-span
    for (const size of ['2x6', '2x8', '2x10', '2x12']) {
      const allowableSpan = joistTable[size][spacing];
      
      if (allowableSpan >= backSpan) {
        // Calculate joist costs
        const joistCount = Math.ceil(deckLength * 12 / spacing) + 1;
        const joistLength = backSpan + cantilever;
        const joistStockLength = materials.getStockLength(joistLength, size);
        const joistCost = materials.lumber[size].costPerFoot * joistStockLength * joistCount;
        
        // Calculate beam costs - use full deck width as joist span for IRC lookup
        const beamConfig = selectBeam(deckLength, deckWidth, species, footingType);
        const beamCost = calculateBeamCost(beamConfig);
        
        // Calculate post costs (now included in beam cost calculation)
        const postCost = 0; // Already included in beamConfig cost
        
        // Total cost
        const totalCost = joistCost + beamCost + postCost;
        
        if (totalCost < minCost) {
          minCost = totalCost;
          bestConfig = {
            cantilever_ft: cantilever,
            backSpan_ft: backSpan,
            joist: {
              size,
              spacing_in: spacing,
              count: joistCount,
              length_ft: joistLength,
              stock_length_ft: joistStockLength
            },
            beam: beamConfig,
            totalCost,
            breakdown: {
              joistCost,
              beamCost,
              postCost
            }
          };
        }
        break; // Found adequate size for this spacing
      }
    }
  }
  
  return bestConfig;
}

/**
 * Calculates the cost of a beam configuration
 */
function calculateBeamCost(beamConfig) {
  const beamLength = beamConfig.span_ft;
  const stockLength = materials.getStockLength(beamLength, beamConfig.dimension);
  const costPerFoot = materials.lumber[beamConfig.dimension].costPerFoot;
  return beamConfig.plyCount * stockLength * costPerFoot;
}

// Export for use in engine
window.cantileverOptimizer = {
  findOptimalCantilever,
  evaluateCantileverConfig
};