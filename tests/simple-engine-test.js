// Simple manual test for engine calculations
// Run with: node tests/simple-engine-test.js

console.log('Testing deck calculations...\n');

// Test 1: Basic 10x12 deck
const test1 = {
  width_ft: 10,
  length_ft: 12,
  height_ft: 6,
  attachment: 'ledger',
  footing_type: 'concrete',
  species_grade: 'SPF #2',
  decking_type: '5_4_decking'
};

console.log('Test 1: Basic 10x12 ledger-attached deck');
console.log('Input:', JSON.stringify(test1, null, 2));

// Expected output:
// - Joists should span width (10 ft) since it's shorter
// - Should select 2x8 joists at 16" o.c.
// - Should have outer drop beam
// - Should have ledger attachment

// Test 2: Check cantilever optimization
const test2 = {
  ...test1,
  width_ft: 12,
  length_ft: 16
};

console.log('\nTest 2: 12x16 deck for cantilever check');
console.log('Input:', JSON.stringify(test2, null, 2));

// Expected:
// - Joists span 12 ft
// - Possible cantilever optimization
// - Verify 1/4 rule compliance

console.log('\nTo run actual engine test:');
console.log('1. Open index.html in browser');
console.log('2. Open developer console');
console.log('3. Run: computeStructure(' + JSON.stringify(test1) + ')');
console.log('4. Verify output matches expectations');