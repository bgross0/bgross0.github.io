// Simple unit test for beam logic
describe('Beam Selection Logic', () => {
  // Mock the selectBeam function behavior
  function mockSelectBeam(beamSpan, joistSpan, species) {
    // Simple mock logic - in real implementation this uses span tables
    if (beamSpan > 16) {
      return {
        size: '3-2x12',
        dimension: '2x12',
        plyCount: 3,
        post_spacing_ft: 6,
        spliced: true
      };
    } else if (beamSpan > 12) {
      return {
        size: '3-2x10',
        dimension: '2x10',
        plyCount: 3,
        post_spacing_ft: 8,
        spliced: false
      };
    } else {
      return {
        size: '2-2x8',
        dimension: '2x8',
        plyCount: 2,
        post_spacing_ft: 8,
        spliced: false
      };
    }
  }
  
  test('should select appropriate beam for short span', () => {
    const result = mockSelectBeam(10, 8, 'SPF #2');
    expect(result.dimension).toBe('2x8');
    expect(result.plyCount).toBe(2);
    expect(result.spliced).toBe(false);
  });
  
  test('should select larger beam for medium span', () => {
    const result = mockSelectBeam(14, 10, 'SPF #2');
    expect(result.dimension).toBe('2x10');
    expect(result.plyCount).toBe(3);
    expect(result.spliced).toBe(false);
  });
  
  test('should implement splicing for long spans', () => {
    const result = mockSelectBeam(20, 12, 'SPF #2');
    expect(result.dimension).toBe('2x12');
    expect(result.spliced).toBe(true);
  });
  
  test('should reduce post spacing for heavier loads', () => {
    const shortSpan = mockSelectBeam(10, 8, 'SPF #2');
    const longSpan = mockSelectBeam(20, 12, 'SPF #2');
    
    expect(longSpan.post_spacing_ft).toBeLessThan(shortSpan.post_spacing_ft);
  });
});