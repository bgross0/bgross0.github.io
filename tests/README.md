# DeckPro Test Suite

Simple, focused tests for the deck engineering calculations.

## Test Files

- `engine/beam-simple.test.js` - Basic beam selection logic tests
- `engine/joist-simple.test.js` - Basic joist selection logic tests  
- `engine/span-tables.test.js` - Tests for feet-inches conversion
- `engine/validation-simple.test.js` - Input validation tests

## Running Tests

```bash
cd src
npm test           # Run all tests
npm test -- beam   # Run specific test file
```

## Manual Testing

1. Open `tests/run-basic-test.html` in browser
2. Check console for results
3. Or use `node tests/simple-engine-test.js` for basic checks

## Key Issues Fixed

- Span tables use feet-inches notation (e.g., 11.10 = 11'-10" = 11.833 ft)
- Tests use simple mocks instead of complex browser module loading
- Focus on testing logic, not implementation details