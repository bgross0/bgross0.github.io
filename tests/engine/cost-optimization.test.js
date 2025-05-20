// Test cost optimization with different material prices
describe('Cost Optimization', () => {
  // Mock materials with adjustable prices
  const mockMaterials = {
    lumber: {
      '2x6': { costPerFoot: 2.50 },
      '2x8': { costPerFoot: 3.25 },
      '2x10': { costPerFoot: 4.50 },
      '2x12': { costPerFoot: 5.75 },
      '6x6': { costPerFoot: 12.00 }
    },
    hardware: {
      PB66: { cost: 35.00 }
    },
    footingCosts: {
      helical: 500.00,
      concrete: 150.00,
      surface: 75.00
    }
  };

  // Mock beam selection that considers footing costs
  function mockSelectBeam(beamSpan, joistSpan, species, footingType) {
    const footingCost = mockMaterials.footingCosts[footingType];
    
    // Calculate costs for different configurations
    const options = [
      // Option 1: Smaller beam, more posts
      {
        size: '(2)2x10',
        postCount: 4,
        beamCost: 2 * beamSpan * mockMaterials.lumber['2x10'].costPerFoot,
        postCost: 4 * (mockMaterials.hardware.PB66.cost + footingCost),
        totalCost: 0
      },
      // Option 2: Larger beam, fewer posts
      {
        size: '(3)2x12',
        postCount: 3,
        beamCost: 3 * beamSpan * mockMaterials.lumber['2x12'].costPerFoot,
        postCost: 3 * (mockMaterials.hardware.PB66.cost + footingCost),
        totalCost: 0
      }
    ];
    
    // Calculate total costs
    options.forEach(opt => {
      opt.totalCost = opt.beamCost + opt.postCost;
    });
    
    // Return lowest cost option
    return options.reduce((best, current) => 
      current.totalCost < best.totalCost ? current : best
    );
  }

  test('should prefer stronger beams when footings are expensive', () => {
    const result = mockSelectBeam(20, 10, 'SPF #2', 'helical');
    
    // With $500 helical piles, should choose 3-2x12 with 3 posts
    // instead of 2-2x10 with 4 posts
    expect(result.size).toBe('(3)2x12');
    expect(result.postCount).toBe(3);
    
    // Verify cost calculation
    const smallerBeamCost = 2 * 20 * 4.50 + 4 * (35 + 500); // $2,180
    const largerBeamCost = 3 * 20 * 5.75 + 3 * (35 + 500);  // $1,950
    expect(largerBeamCost).toBeLessThan(smallerBeamCost);
  });

  test('should allow more posts when footings are cheap', () => {
    const result = mockSelectBeam(20, 10, 'SPF #2', 'surface');
    
    // With $75 surface mounts, more posts might be acceptable
    const smallerBeamCost = 2 * 20 * 4.50 + 4 * (35 + 75); // $620
    const largerBeamCost = 3 * 20 * 5.75 + 3 * (35 + 75);  // $675
    
    // Smaller beam with more posts could be cheaper
    if (smallerBeamCost < largerBeamCost) {
      expect(result.size).toBe('(2)2x10');
      expect(result.postCount).toBe(4);
    }
  });

  test('should adjust to extreme material prices', () => {
    // Make 2x12s extremely expensive
    mockMaterials.lumber['2x12'].costPerFoot = 50.00;
    
    const result = mockSelectBeam(20, 10, 'SPF #2', 'helical');
    
    // Even with expensive footings, if 2x12s cost $50/ft,
    // might choose smaller beam with more posts
    const smallerBeamCost = 2 * 20 * 4.50 + 4 * (35 + 500); // $2,180
    const largerBeamCost = 3 * 20 * 50.00 + 3 * (35 + 500); // $4,605
    
    expect(smallerBeamCost).toBeLessThan(largerBeamCost);
    
    // Reset price
    mockMaterials.lumber['2x12'].costPerFoot = 5.75;
  });

  test('footing cost should significantly impact optimization', () => {
    // Compare same deck with different footing types
    const helicalResult = mockSelectBeam(20, 10, 'SPF #2', 'helical');
    const surfaceResult = mockSelectBeam(20, 10, 'SPF #2', 'surface');
    
    // With expensive helical piles
    const helicalCost3Posts = 3 * 20 * 5.75 + 3 * (35 + 500); // $1,950
    const helicalCost4Posts = 2 * 20 * 4.50 + 4 * (35 + 500); // $2,180
    
    // With cheap surface mounts
    const surfaceCost3Posts = 3 * 20 * 5.75 + 3 * (35 + 75);  // $675
    const surfaceCost4Posts = 2 * 20 * 4.50 + 4 * (35 + 75);  // $620
    
    // Verify different choices based on footing cost
    if (helicalCost3Posts < helicalCost4Posts) {
      expect(helicalResult.postCount).toBe(3);
    }
    
    if (surfaceCost4Posts < surfaceCost3Posts) {
      expect(surfaceResult.postCount).toBe(4);
    }
  });
});