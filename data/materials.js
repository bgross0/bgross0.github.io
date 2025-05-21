// Material definitions and costs
const materials = {
  lumber: {
    '2x6': { costPerFoot: 2.50, widthIn: 5.5, depthIn: 1.5 },
    '2x8': { costPerFoot: 3.25, widthIn: 7.25, depthIn: 1.5 },
    '2x10': { costPerFoot: 4.50, widthIn: 9.25, depthIn: 1.5 },
    '2x12': { costPerFoot: 5.75, widthIn: 11.25, depthIn: 1.5 },
    '6x6': { costPerFoot: 12.00, widthIn: 5.5, depthIn: 5.5 }
  },
  
  hardware: {
    'LUS26': { cost: 3.50, description: '2x6 joist hanger' },
    'LUS28': { cost: 3.75, description: '2x8 joist hanger' },
    'LUS210': { cost: 4.00, description: '2x10 joist hanger' },
    'LUS212': { cost: 4.50, description: '2x12 joist hanger' },
    'LUS2x6': { cost: 3.50, description: '2x6 joist hanger' },
    'LUS2x8': { cost: 3.75, description: '2x8 joist hanger' },
    'LUS2x10': { cost: 4.00, description: '2x10 joist hanger' },
    'LUS2x12': { cost: 4.50, description: '2x12 joist hanger' },
    'PB66': { cost: 35.00, description: '6x6 post base' },
    'PCZ66': { cost: 28.00, description: '6x6 post cap' },
    'PB105': { cost: 22.00, description: 'Beam splice plate' }
  },
  
  // Footing costs by type
  footingCosts: {
    'helical': 500.00,
    'concrete': 150.00,
    'surface': 75.00
  },
  
  standardLengths: {
    '2x6': [8, 10, 12, 14, 16, 20],
    '2x8': [8, 10, 12, 14, 16, 20],
    '2x10': [8, 10, 12, 14, 16, 20],
    '2x12': [8, 10, 12, 14, 16, 20],
    '6x6': [8, 10, 12]
  },
  
  // Species cost multipliers
  speciesMultipliers: {
    'SPF #2': 1.0,
    'DF #1': 1.35,
    'HF #2': 1.15,
    'SP #2': 1.25
  },
  
  // Utility functions
  getStockLength: function(requiredLength, size) {
    const availableLengths = this.standardLengths[size];
    if (!availableLengths) {
      throw new Error(`Unknown lumber size: ${size}`);
    }
    
    // Find the smallest stock length that meets the requirement
    for (const length of availableLengths) {
      if (length >= requiredLength) {
        return length;
      }
    }
    
    // Return the largest available if none are big enough
    return availableLengths[availableLengths.length - 1];
  },
  
  calculateBoardFeet: function(size, lengthFt) {
    const lumber = this.lumber[size];
    if (!lumber) {
      throw new Error(`Unknown lumber size: ${size}`);
    }
    
    // Board feet = (width in inches × thickness in inches × length in feet) / 12
    return (lumber.widthIn * lumber.depthIn * lengthFt) / 12;
  }
};