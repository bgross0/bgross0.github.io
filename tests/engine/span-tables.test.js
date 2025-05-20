// Test for span table interpretation
describe('Span Table Interpretation', () => {
  // Mock function to convert feet-inches to decimal
  function feetInchesToDecimal(value) {
    if (typeof value === 'number') {
      // Already decimal
      return value;
    }
    
    // Parse feet.inches format
    const str = value.toString();
    const [feet, inches] = str.split('.');
    return parseInt(feet) + (parseInt(inches || 0) / 12);
  }
  
  test('should convert 11.10 to 11.833 feet', () => {
    const result = feetInchesToDecimal('11.10');
    expect(result).toBeCloseTo(11.833, 3);
  });
  
  test('should convert 7.6 to 7.5 feet', () => {
    const result = feetInchesToDecimal('7.6');
    expect(result).toBeCloseTo(7.5, 3);
  });
  
  test('should handle whole numbers', () => {
    const result = feetInchesToDecimal('10');
    expect(result).toBe(10);
  });
  
  test('should handle numeric input', () => {
    const result = feetInchesToDecimal(8.5);
    expect(result).toBe(8.5);
  });
  
  // Test actual span table value
  test('should interpret SPF #2 2x10 beam span correctly', () => {
    // From table: '(2)2x10': { 10: 8.3 }
    // This means 8 feet 3 inches = 8.25 feet
    const spanValue = '8.3';
    const decimal = feetInchesToDecimal(spanValue);
    expect(decimal).toBeCloseTo(8.25, 3);
  });
});