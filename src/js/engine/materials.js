// Materials calculation functions

function generateMaterialTakeoff(frame, speciesGrade, footingType = 'helical') {
  const items = [];
  const boardFeet = {};
  let totalBoardFeet = 0;
  
  // Calculate joist materials - use ACTUAL joist length (including cantilever)
  const joistLength = frame.joists.total_length_ft || (frame.joists.span_ft + frame.joists.cantilever_ft);
  const joistStockLength = materials.getStockLength(joistLength, frame.joists.size);
  const joistCount = frame.joists.count;
  
  // Add joists to takeoff
  items.push({
    item: `${frame.joists.size}-${joistStockLength}' joist`,
    qty: joistCount
  });
  
  // Track board feet
  const joistBF = materials.calculateBoardFeet(frame.joists.size, joistStockLength) * joistCount;
  boardFeet[frame.joists.size] = (boardFeet[frame.joists.size] || 0) + joistBF;
  totalBoardFeet += joistBF;
  
  // Calculate beam materials
  frame.beams.forEach(beam => {
    if (beam.style === 'ledger') {
      // Add ledger board (2x10 typically)
      const ledgerLength = materials.getStockLength(beam.span_ft || frame.length_ft, '2x10');
      items.push({
        item: `2x10-${ledgerLength}' ledger`,
        qty: 1
      });
      
      const ledgerBF = materials.calculateBoardFeet('2x10', ledgerLength);
      boardFeet['2x10'] = (boardFeet['2x10'] || 0) + ledgerBF;
      totalBoardFeet += ledgerBF;
    } else {
      // Regular beam - account for plies
      const beamLength = materials.getStockLength(beam.span_ft, beam.dimension);
      const totalBeamQty = beam.plyCount;
      
      items.push({
        item: `${beam.dimension}-${beamLength}' beam`,
        qty: totalBeamQty
      });
      
      const beamBF = materials.calculateBoardFeet(beam.dimension, beamLength) * totalBeamQty;
      boardFeet[beam.dimension] = (boardFeet[beam.dimension] || 0) + beamBF;
      totalBoardFeet += beamBF;
    }
  });
  
  // Calculate post materials
  const uniquePostHeights = new Map();
  frame.posts.forEach(post => {
    const height = post.height_ft;
    uniquePostHeights.set(height, (uniquePostHeights.get(height) || 0) + 1);
  });
  
  uniquePostHeights.forEach((count, height) => {
    items.push({
      item: `6x6-${height}' post`,
      qty: count
    });
    
    const postBF = materials.calculateBoardFeet('6x6', height) * count;
    boardFeet['6x6'] = (boardFeet['6x6'] || 0) + postBF;
    totalBoardFeet += postBF;
  });
  
  // Add hardware - joist hangers
  if (frame.beams.some(b => b.style === 'ledger')) {
    items.push({
      item: `LUS${frame.joists.size.replace('2x', '')} hanger`,
      qty: joistCount
    });
  }
  
  // Add hardware - post bases
  const totalPosts = frame.posts.length;
  if (totalPosts > 0) {
    items.push({
      item: 'PB66 post base',
      qty: totalPosts
    });
    
    // Add footings based on type
    let footingItem = '';
    switch(footingType) {
      case 'helical':
        footingItem = 'Helical pile';
        break;
      case 'concrete':
        footingItem = 'Concrete footing';
        break;
      case 'surface':
        footingItem = 'Surface mount pad';
        break;
    }
    
    if (footingItem) {
      items.push({
        item: footingItem,
        qty: totalPosts
      });
    }
  }
  
  // Add rim joists only if drop beam style
  const hasDropBeam = frame.beams.some(b => b.style === 'drop');
  if (hasDropBeam) {
    const rimJoistCount = 2; // One at each end perpendicular to joists
    // Rim joists run along the beam span (perpendicular to joists)
    const rimLength = materials.getStockLength(frame.beams[0].span_ft, frame.joists.size);
    items.push({
      item: `${frame.joists.size}-${rimLength}' rim joist`,
      qty: rimJoistCount
    });
    
    const rimBF = materials.calculateBoardFeet(frame.joists.size, rimLength) * rimJoistCount;
    boardFeet[frame.joists.size] = (boardFeet[frame.joists.size] || 0) + rimBF;
    totalBoardFeet += rimBF;
  }
  
  return {
    items,
    boardFeet,
    totalBoardFeet
  };
}