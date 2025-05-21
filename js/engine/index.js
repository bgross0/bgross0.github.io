// Main engine API

function computeStructure(payload) {
  // Validate input
  const errors = validatePayload(payload);
  if (errors.length > 0) {
    throw new EngineError('INVALID_INPUT', errors.join('; '));
  }
  
  // Set defaults
  const input = {
    ...payload,
    optimization_goal: payload.optimization_goal || 'cost'
  };
  
  // Determine beam styles
  input.beam_style_outer = determineBeamStyle('outer', input.beam_style_outer, input.attachment, input.footing_type, input.height_ft);
  if (input.attachment === 'free') {
    input.beam_style_inner = determineBeamStyle('inner', input.beam_style_inner, input.attachment, input.footing_type, input.height_ft);
  }
  
  // Determine joist span direction - joists ALWAYS span the shorter dimension
  const shortDimension = Math.min(input.width_ft, input.length_ft);
  const longDimension = Math.max(input.width_ft, input.length_ft);
  
  // If width is shorter, joists span width (normal orientation)
  // If length is shorter, joists span length (rotated orientation)
  const joistsSpanWidth = input.width_ft <= input.length_ft;
  
  // Calculate joists based on the shorter dimension
  const joists = selectJoist(
    shortDimension,  // Joists always span the shorter dimension
    input.species_grade,
    input.forced_joist_spacing_in,
    input.decking_type,
    input.beam_style_outer,
    longDimension,  // Pass the long dimension for joist count calculation
    input.optimization_goal,
    input.footing_type
  );
  
  // Store orientation info in joists object
  joists.orientation = joistsSpanWidth ? 'width' : 'length';
  
  // Calculate beams based on correct dimensions
  const beams = [];
  
  // Beams run along the long dimension and support joists spanning the short dimension
  const beamSpan = longDimension;  // Beams span the long dimension
  const joistSpan = shortDimension;  // For IRC R507.5 table lookup
  
  // Outer beam - uses actual joist span for IRC R507.5 table lookup
  const outerBeam = selectBeam(beamSpan, joistSpan, input.species_grade, input.footing_type);
  beams.push({
    position: 'outer',
    style: input.beam_style_outer,
    size: outerBeam.size,
    post_spacing_ft: outerBeam.post_spacing_ft,
    post_count: outerBeam.post_count,
    span_ft: beamSpan,
    dimension: outerBeam.dimension,
    plyCount: outerBeam.plyCount,
    segments: outerBeam.segments,
    spliced: outerBeam.spliced || false
  });
  
  // Inner beam/ledger
  console.log('Determining inner beam/ledger. Attachment:', input.attachment);
  
  if (input.attachment === 'ledger') {
    beams.push({
      position: 'inner',
      style: 'ledger'
    });
  } else {
    // For freestanding (or any non-ledger), add inner beam
    console.log('Creating inner beam for freestanding deck');
    const innerBeam = selectBeam(beamSpan, joistSpan, input.species_grade, input.footing_type);
    const innerBeamData = {
      position: 'inner',
      style: input.beam_style_inner || 'drop',
      size: innerBeam.size,
      post_spacing_ft: innerBeam.post_spacing_ft,
      post_count: innerBeam.post_count,
      span_ft: beamSpan,
      dimension: innerBeam.dimension,
      plyCount: innerBeam.plyCount,
      segments: innerBeam.segments,
      spliced: innerBeam.spliced || false
    };
    console.log('Inner beam data:', innerBeamData);
    beams.push(innerBeamData);
  }
  
  console.log('Total beams:', beams.length);
  console.log('Beams:', beams);
  
  // Generate posts with correct positions based on orientation
  // When joists span width (horizontal), beams run vertically along length, posts positioned across width
  // When joists span length (vertical), beams run horizontally along width, posts positioned across length
  const deckDimensionForPosts = joistsSpanWidth ? input.width_ft : input.length_ft;
  const posts = generatePostList(beams, input.height_ft, input.footing_type, deckDimensionForPosts, joists.cantilever_ft);
  
  // Create frame configuration
  const frame = {
    joists,
    beams,
    posts
  };
  
  // Generate material takeoff with correct joist lengths
  const takeoff = generateMaterialTakeoff(frame, input.species_grade, input.footing_type);
  
  // Calculate metrics
  const metrics = {};
  if (input.optimization_goal === 'cost') {
    metrics.total_board_ft = takeoff.totalBoardFeet;
  } else {
    // Calculate minimum reserve capacity
    const joistCapacity = calculateReserveCapacity(joists, input);
    const beamCapacity = beams.map(b => calculateReserveCapacity(b, input)).filter(c => c > 0);
    metrics.reserve_capacity_min = Math.min(joistCapacity, ...beamCapacity);
  }
  
  // Check compliance
  const warnings = checkCompliance(input, frame);
  
  // Format output
  return {
    optimization_goal: input.optimization_goal,
    joists: {
      size: joists.size,
      spacing_in: joists.spacing_in,
      span_ft: joists.span_ft,
      cantilever_ft: joists.cantilever_ft,
      orientation: joists.orientation,
      count: joists.count,
      total_length_ft: joists.total_length_ft
    },
    beams: beams.map(beam => ({
      position: beam.position,
      style: beam.style,
      size: beam.size,
      post_spacing_ft: beam.post_spacing_ft,
      post_count: beam.post_count,
      dimension: beam.dimension,
      plyCount: beam.plyCount,
      segments: beam.segments,
      spliced: beam.spliced
    })),
    posts: posts.map(post => ({ x: post.x, y: post.y })),
    material_takeoff: takeoff.items,
    metrics,
    compliance: {
      joist_table: 'IRC-2021 R507.6(1)',
      beam_table: 'IRC-2021 R507.5(1)',
      assumptions: ['IRC default loads'],
      warnings
    }
  };
}

function calculateReserveCapacity(member, input) {
  // Simplified reserve capacity calculation
  // Actual/Allowable stress ratio
  return 1.5; // Placeholder - would need full stress calculations
}

function checkCompliance(input, frame) {
  const warnings = [];
  
  // Check surface footing restriction
  if (input.footing_type === 'surface' && input.height_ft >= 2.5 && input.attachment === 'ledger') {
    warnings.push('Surface footings require height < 2.5 ft for ledger attachment');
  }
  
  // Check decking vs joist spacing
  const maxDeckingSpacing = spanTables.deckingSpacing[input.decking_type].perpendicular;
  if (frame.joists.spacing_in > maxDeckingSpacing) {
    warnings.push(`${input.decking_type} requires max ${maxDeckingSpacing}" joist spacing`);
  }
  
  // Check cantilever limit (only if cantilever exists)
  if (frame.joists.cantilever_ft > 0 && frame.joists.cantilever_ft > frame.joists.span_ft / 4) {
    warnings.push('Cantilever exceeds 1/4 of back-span');
  }
  
  return warnings;
}