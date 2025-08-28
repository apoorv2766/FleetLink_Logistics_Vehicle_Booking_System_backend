// src/services/availability.js
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");

// Duration formula as required:
// Math.abs(parseInt(toPincode) - parseInt(fromPincode)) % 24
function computeEstimatedHours(fromPincode, toPincode) {
  const a = parseInt(fromPincode, 10);
  const b = parseInt(toPincode, 10);
  if (Number.isNaN(a) || Number.isNaN(b)) return 4; // fallback
  return Math.abs(a - b) % 24;
}

/**
 * Returns array of available vehicles for the window.
 * Each item includes vehicle doc + estimatedRideDurationHours, projectedEndTime
 */
async function findAvailableVehicles({
  capacityRequired,
  fromPincode,
  toPincode,
  startTimeISO,
}) {
  const startTime = new Date(startTimeISO);
  if (isNaN(startTime.getTime())) throw new Error("Invalid startTime");

  const estimatedRideDurationHours = computeEstimatedHours(
    fromPincode,
    toPincode
  );
  const endTime = new Date(
    startTime.getTime() + estimatedRideDurationHours * 3600 * 1000
  );

  // Step 1: candidates by capacity & active
  const candidates = await Vehicle.find({
    capacityKg: { $gte: capacityRequired },
    active: true,
  }).lean();

  if (candidates.length === 0) return [];

  const candidateIds = candidates.map((v) => v._id);

  // Step 2: find conflicting bookings
  const conflicts = await Booking.find({
    vehicleId: { $in: candidateIds },
    status: "confirmed",
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  }).lean();

  const conflictedVehicleIds = new Set(
    conflicts.map((c) => c.vehicleId.toString())
  );

  // Step 3: filter out conflicted vehicles and attach computed fields
  const available = candidates
    .filter((v) => !conflictedVehicleIds.has(v._id.toString()))
    .map((v) => ({
      vehicleId: v._id,
      name: v.name,
      capacityKg: v.capacityKg,
      tyres: v.tyres,
      estimatedRideDurationHours,
      projectedEndTime: endTime.toISOString(),
    }));

  return available;
}

module.exports = { computeEstimatedHours, findAvailableVehicles };
