// Utility functions for the engine

/**
 * Convert feet.inches format to decimal feet
 * @param {number} value - Value in feet.inches format (e.g., 6.2 = 6'-2")
 * @returns {number} - Decimal feet value
 */
function feetInchesToDecimal(value) {
  const parts = value.toString().split('.');
  const feet = parseInt(parts[0]);
  const inches = parts[1] ? parseInt(parts[1]) : 0;
  return feet + (inches / 12);
}

// Export for use in other modules
window.engineUtils = {
  feetInchesToDecimal
};