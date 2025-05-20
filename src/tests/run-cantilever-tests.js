// Command-line test runner for cantilever optimization
// Run with: node run-cantilever-tests.js

// Mock browser environment for testing
global.window = {
  spanTables: require('../data/span-tables.js'),
  materials: require('../data/materials.js'),
  EngineError: class EngineError extends Error {
    constructor(code, message) {
      super(message);
      this.code = code;
    }
  }
};

// Load engine modules
const fs = require('fs');

// Load files as text and evaluate
function loadModule(path) {
  const content = fs.readFileSync(path, 'utf8');
  return eval(`(function() { ${content}; return { cantileverOptimizer, selectJoist, selectBeam, computeStructure }; })()`);
}

// Load modules
const { cantileverOptimizer } = loadModule('../js/engine/cantilever-optimizer.js');
const { selectJoist } = loadModule('../js/engine/joist.js');
const { selectBeam } = loadModule('../js/engine/beam.js');
const { computeStructure } = loadModule('../js/engine/index.js');

// Test cases
const testCases = [
  {
    name: "10x10 small deck",
    input: {
      width_ft: 10,
      length_ft: 10,
      species_grade: 'SPF #2',
      decking_type: 'composite_1in',
      optimization_goal: 'cost'
    },
    expected: {
      cantilever_ft: 0,
      joist_size: '2x8'
    }
  },
  {
    name: "14x16 medium deck",
    input: {
      width_ft: 14,
      length_ft: 16,
      species_grade: 'SPF #2',
      decking_type: 'composite_1in',
      optimization_goal: 'cost'
    },
    expected: {
      cantilever_range: [0.5, 2.8],
      joist_sizes: ['2x8', '2x10']
    }
  },
  {
    name: "20x24 large deck",
    input: {
      width_ft: 20,
      length_ft: 24,
      species_grade: 'SPF #2',
      decking_type: 'composite_1in',
      optimization_goal: 'cost'
    },
    expected: {
      cantilever_range: [2, 4],
      joist_sizes: ['2x10', '2x12']
    }
  }
];

// Run tests
console.log('Running Cantilever Optimization Tests...\n');

let passCount = 0;
let failCount = 0;

testCases.forEach(test => {
  console.log(`Test: ${test.name}`);
  
  try {
    // Run optimization
    const result = cantileverOptimizer.findOptimalCantilever(
      test.input.width_ft,
      test.input.species_grade,
      test.input.decking_type,
      test.input.length_ft
    );
    
    let passed = true;
    const issues = [];
    
    // Check cantilever
    if (test.expected.cantilever_ft !== undefined) {
      if (result.cantilever_ft !== test.expected.cantilever_ft) {
        passed = false;
        issues.push(`Expected cantilever: ${test.expected.cantilever_ft}', got: ${result.cantilever_ft}'`);
      }
    }
    
    if (test.expected.cantilever_range) {
      const [min, max] = test.expected.cantilever_range;
      if (result.cantilever_ft < min || result.cantilever_ft > max) {
        passed = false;
        issues.push(`Expected cantilever in range [${min}, ${max}], got: ${result.cantilever_ft}'`);
      }
    }
    
    // Check joist size
    if (test.expected.joist_size) {
      if (result.joist.size !== test.expected.joist_size) {
        passed = false;
        issues.push(`Expected joist: ${test.expected.joist_size}, got: ${result.joist.size}`);
      }
    }
    
    if (test.expected.joist_sizes) {
      if (!test.expected.joist_sizes.includes(result.joist.size)) {
        passed = false;
        issues.push(`Expected joist in [${test.expected.joist_sizes.join(', ')}], got: ${result.joist.size}`);
      }
    }
    
    // Print results
    console.log(`  Deck: ${test.input.width_ft}' x ${test.input.length_ft}'`);
    console.log(`  Cantilever: ${result.cantilever_ft}'`);
    console.log(`  Back-span: ${result.backSpan_ft}'`);
    console.log(`  Joist: ${result.joist.size} @ ${result.joist.spacing_in}" O.C.`);
    console.log(`  Total Cost: $${result.totalCost.toFixed(2)}`);
    console.log(`  Status: ${passed ? 'PASS' : 'FAIL'}`);
    
    if (!passed) {
      console.log('  Issues:');
      issues.forEach(issue => console.log(`    - ${issue}`));
    }
    
    console.log('');
    
    if (passed) passCount++;
    else failCount++;
    
  } catch (error) {
    console.log(`  Error: ${error.message}`);
    console.log(`  Status: FAIL\n`);
    failCount++;
  }
});

// Summary
console.log('\nTest Summary:');
console.log(`${passCount} passed, ${failCount} failed`);
console.log(`Total: ${testCases.length} tests`);

// Exit with error code if any tests failed
process.exit(failCount > 0 ? 1 : 0);