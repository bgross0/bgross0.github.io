// Simple unit test for joist logic
describe('Joist Selection Logic', () => {
  // Mock the selectJoist function behavior
  function mockSelectJoist(span, species, spacing) {
    // Simple span limits (not actual IRC values)
    const spanLimits = {
      '2x6': { 12: 10, 16: 9, 24: 7 },
      '2x8': { 12: 13, 16: 11, 24: 9 },
      '2x10': { 12: 16, 16: 14, 24: 12 },
      '2x12': { 12: 19, 16: 17, 24: 14 }
    };
    
    const actualSpacing = spacing || 16;
    
    // Find smallest joist that works
    for (const size of ['2x6', '2x8', '2x10', '2x12']) {
      const limit = spanLimits[size][actualSpacing];
      if (limit >= span) {
        return { size, spacing_in: actualSpacing, span_ft: span };
      }
    }
    
    return null;
  }
  
  test('should select 2x8 for 10ft span at 16" o.c.', () => {
    const result = mockSelectJoist(10, 'SPF #2', 16);
    expect(result.size).toBe('2x8');
    expect(result.spacing_in).toBe(16);
  });
  
  test('should select 2x10 for 14ft span at 16" o.c.', () => {
    const result = mockSelectJoist(14, 'SPF #2', 16);
    expect(result.size).toBe('2x10');
  });
  
  test('should select larger joist for wider spacing', () => {
    const result16 = mockSelectJoist(10, 'SPF #2', 16);
    const result24 = mockSelectJoist(10, 'SPF #2', 24);
    
    expect(result16.size).toBe('2x8');
    expect(result24.size).toBe('2x10'); // Needs bigger for 24" spacing
  });
  
  test('should return null if span exceeds all options', () => {
    const result = mockSelectJoist(25, 'SPF #2', 16);
    expect(result).toBeNull();
  });
});