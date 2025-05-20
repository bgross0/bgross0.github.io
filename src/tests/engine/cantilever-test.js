// Test cases for cantilever optimization

const { optimizeCantilever, calculateJoistCost, calculateBeamCost } = require('../../js/engine/cantilever-optimizer.js');
const { selectJoist } = require('../../js/engine/joist.js');

// Mock span tables and materials if not available globally
if (typeof spanTables === 'undefined') {
  global.spanTables = require('../../data/span-tables.js');
}
if (typeof materials === 'undefined') {
  global.materials = require('../../data/materials.js');
}

describe('Cantilever Optimization', () => {
  test('Should calculate optimal cantilever for small deck', () => {
    const result = optimizeCantilever(
      12,  // width (ft)
      16,  // length (ft)
      'SPF #2',
      null,  // let optimizer choose spacing
      'composite_1in'
    );
    
    expect(result).toBeDefined();
    expect(result.cantilever).toBeGreaterThanOrEqual(0);
    expect(result.cantilever).toBeLessThanOrEqual(12/5); // IRC max
    expect(result.cantilever).toBeLessThanOrEqual(result.backSpan / 4); // IRC rule
  });

  test('Should calculate optimal cantilever for large deck', () => {
    const result = optimizeCantilever(
      20,  // width (ft)
      24,  // length (ft)
      'SPF #2',
      null,
      'composite_1in'
    );
    
    expect(result).toBeDefined();
    expect(result.cantilever).toBeGreaterThanOrEqual(0);
    expect(result.cantilever).toBeLessThanOrEqual(20/5); // IRC max
  });

  test('Should respect forced spacing', () => {
    const result = optimizeCantilever(
      12,  // width (ft)
      16,  // length (ft)
      'SPF #2',
      16,  // forced 16" spacing
      'composite_1in'
    );
    
    expect(result).toBeDefined();
    expect(result.joistConfig.spacing_in).toBe(16);
  });

  test('Should produce lower cost than no cantilever', () => {
    // Test with cantilever optimization
    const withCantilever = optimizeCantilever(
      12,  // width (ft)
      16,  // length (ft)
      'SPF #2',
      null,
      'composite_1in'
    );
    
    // Test without cantilever (inline beam scenario)
    const withoutCantilever = selectJoist(
      12,  // width (ft)
      'SPF #2',
      null,
      'composite_1in',
      'inline',  // inline beam = no cantilever
      16  // length (ft)
    );
    
    // With cantilever should be cheaper or equal
    expect(withCantilever.totalCost).toBeLessThanOrEqual(
      withoutCantilever.count * materials.lumber[withoutCantilever.size].costPerFoot * withoutCantilever.total_length_ft
    );
  });

  test('Should handle edge cases', () => {
    // Very narrow deck
    const narrow = optimizeCantilever(
      6,   // width (ft)
      12,  // length (ft)
      'SPF #2',
      null,
      'composite_1in'
    );
    expect(narrow).toBeDefined();
    
    // Very wide deck
    const wide = optimizeCantilever(
      30,  // width (ft)
      20,  // length (ft)
      'SPF #2',
      null,
      'composite_1in'
    );
    expect(wide).toBeDefined();
  });

  test('Should work with different species', () => {
    const species = ['SPF #2', 'DF #1', 'HF #2', 'SP #2'];
    
    species.forEach(sp => {
      const result = optimizeCantilever(
        12,  // width (ft)
        16,  // length (ft)
        sp,
        null,
        'composite_1in'
      );
      
      expect(result).toBeDefined();
      expect(result.joistConfig.size).toBeDefined();
    });
  });
});

describe('Joist Cost Calculation', () => {
  test('Should calculate correct joist cost', () => {
    const result = calculateJoistCost(
      10,   // back span
      2,    // cantilever
      16,   // deck length
      'SPF #2',
      16,   // spacing
      'composite_1in'
    );
    
    expect(result).toBeDefined();
    expect(result.cost).toBeGreaterThan(0);
    expect(result.span_ft).toBe(10);
    expect(result.cantilever_ft).toBe(2);
    expect(result.total_length_ft).toBe(12);
  });

  test('Should fail when span exceeds capacity', () => {
    expect(() => {
      calculateJoistCost(
        50,   // back span - too large
        10,   // cantilever
        16,   // deck length
        'SPF #2',
        16,   // spacing
        'composite_1in'
      );
    }).toThrow();
  });
});

describe('Beam Cost Calculation', () => {
  test('Should calculate correct beam cost', () => {
    const result = calculateBeamCost(
      16,   // beam span
      12,   // tributary width
      'SPF #2'
    );
    
    expect(result).toBeDefined();
    expect(result.cost).toBeGreaterThan(0);
    expect(result.post_count).toBeGreaterThan(0);
    expect(result.span_ft).toBe(16);
  });

  test('Should select appropriate beam size for tributary width', () => {
    const small = calculateBeamCost(16, 8, 'SPF #2');
    const large = calculateBeamCost(16, 18, 'SPF #2');
    
    // Larger tributary width should require stronger beam
    const smallPly = parseInt(small.size.match(/\((\d+)\)/)[1]);
    const largePly = parseInt(large.size.match(/\((\d+)\)/)[1]);
    
    expect(largePly).toBeGreaterThanOrEqual(smallPly);
  });
});

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('Running cantilever optimization tests...');
  // Simple test runner
  const tests = {
    'Cantilever Optimization': {
      'Should calculate optimal cantilever for small deck': () => {
        const result = optimizeCantilever(12, 16, 'SPF #2', null, 'composite_1in');
        console.log('Small deck cantilever:', result.cantilever, 'ft');
        console.log('Total cost:', result.totalCost);
      },
      'Should calculate optimal cantilever for large deck': () => {
        const result = optimizeCantilever(20, 24, 'SPF #2', null, 'composite_1in');
        console.log('Large deck cantilever:', result.cantilever, 'ft');
        console.log('Total cost:', result.totalCost);
      }
    }
  };
  
  Object.entries(tests).forEach(([suite, suiteTests]) => {
    console.log(`\n${suite}:`);
    Object.entries(suiteTests).forEach(([name, test]) => {
      try {
        test();
        console.log(`  ✓ ${name}`);
      } catch (error) {
        console.log(`  ✗ ${name}`);
        console.error(`    ${error.message}`);
      }
    });
  });
}

module.exports = {
  // Export for Jest or other test runners
};