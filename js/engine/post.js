// Post calculation functions

function generatePostGrid(length, maxSpacing) {
  const postCount = Math.ceil(length / maxSpacing) + 1;
  const actualSpacing = length / (postCount - 1);
  
  const posts = [];
  for (let i = 0; i < postCount; i++) {
    posts.push({
      x: i * actualSpacing,
      y: 0 // Single beam line in v1
    });
  }
  
  return posts;
}

function calculatePostHeight(deckHeight, footingType) {
  // Base post height
  let height = deckHeight;
  
  // Add depth for footing embedment
  if (footingType === 'concrete') {
    height += 3; // 3 ft below grade for concrete footings
  } else if (footingType === 'helical') {
    height += 1; // 1 ft clearance for helical piers
  }
  
  // Round up to standard lengths
  const standardLengths = materials.standardLengths['6x6'];
  for (const length of standardLengths) {
    if (length >= height) {
      return length;
    }
  }
  
  return standardLengths[standardLengths.length - 1];
}

function generatePostList(beams, deckHeight, footingType, deckWidth, cantilever = 0) {
  const posts = [];
  
  beams.forEach((beam, index) => {
    if (beam.style === 'ledger') return; // No posts for ledger attachment
    
    const beamPosts = generatePostGrid(beam.span_ft, beam.post_spacing_ft);
    const postHeight = calculatePostHeight(deckHeight, footingType);
    
    // Determine y position based on beam position
    let yPosition = 0;
    if (beam.position === 'outer') {
      // Outer beam position depends on cantilever
      // For drop beams with cantilever, beam is inside the deck edge
      // For no cantilever, beam is at the deck edge
      yPosition = deckWidth - cantilever;
    } else if (beam.position === 'inner' && beam.style !== 'ledger') {
      // Inner beam for freestanding deck is at y=0
      yPosition = 0;
    }
    
    beamPosts.forEach(post => {
      posts.push({
        x: post.x,
        y: yPosition,
        height_ft: postHeight,
        size: '6x6'
      });
    });
  });
  
  return posts;
}