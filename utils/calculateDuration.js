function calculateDuration(fromPincode, toPincode) {
  const diff = Math.abs(parseInt(fromPincode) - parseInt(toPincode));
  return diff % 24 || 1; // Ensure at least 1 hour
}

module.exports = calculateDuration;
