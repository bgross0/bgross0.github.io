// Input validation functions
function validatePayload(payload) {
  const errors = [];
  
  // Required fields
  const required = ['width_ft', 'length_ft', 'height_ft', 'attachment', 'footing_type', 
                   'species_grade', 'decking_type'];
  
  required.forEach(field => {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Numeric validation
  if (payload.width_ft <= 0) errors.push('width_ft must be greater than 0');
  if (payload.length_ft <= 0) errors.push('length_ft must be greater than 0');
  if (payload.height_ft < 0) errors.push('height_ft must be >= 0');
  
  // Enum validation
  if (payload.attachment && !['ledger', 'free'].includes(payload.attachment)) {
    errors.push('attachment must be "ledger" or "free"');
  }
  
  if (payload.beam_style_outer && !['drop', 'inline'].includes(payload.beam_style_outer)) {
    errors.push('beam_style_outer must be "drop" or "inline" or null');
  }
  
  if (payload.beam_style_inner && !['drop', 'inline'].includes(payload.beam_style_inner)) {
    errors.push('beam_style_inner must be "drop" or "inline" or null');
  }
  
  if (payload.footing_type && !['helical', 'concrete', 'surface'].includes(payload.footing_type)) {
    errors.push('footing_type must be "helical", "concrete", or "surface"');
  }
  
  if (payload.species_grade && !['SPF #2', 'DF #1', 'HF #2', 'SP #2'].includes(payload.species_grade)) {
    errors.push('Invalid species_grade');
  }
  
  if (payload.forced_joist_spacing_in && ![12, 16, 24].includes(payload.forced_joist_spacing_in)) {
    errors.push('forced_joist_spacing_in must be 12, 16, or 24');
  }
  
  if (payload.decking_type && !['composite_1in', 'wood_5/4', 'wood_2x'].includes(payload.decking_type)) {
    errors.push('Invalid decking_type');
  }
  
  if (payload.optimization_goal && !['cost', 'strength'].includes(payload.optimization_goal)) {
    errors.push('optimization_goal must be "cost" or "strength"');
  }
  
  // Business rule validation
  if (payload.footing_type === 'surface' && payload.height_ft >= 2.5 && payload.attachment === 'ledger') {
    errors.push('Surface footings illegal if height_ft >= 2.5 ft and attachment = "ledger"');
  }
  
  return errors;
}

class EngineError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = 'EngineError';
  }
}