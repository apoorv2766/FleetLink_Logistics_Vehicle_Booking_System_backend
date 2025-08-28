// src/routes/vehicles.js
const express = require("express");
const router = express.Router();
const Vehicle = require("../src/models/Vehicle");
const Booking = require("../src/models/Booking");
const { vehicleSchema, availabilityQuerySchema } = require("../src/validators");
const { findAvailableVehicles } = require("../src/services/availability");
// const calculateDuration = require("../utils/calculateDuration")

// POST /api/vehicles
router.post("/", async (req, res) => {
  try {
    const { error, value } = vehicleSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const vehicleSave = new Vehicle(value);
    await vehicleSave.save();
    return res.status(201).json({message:"Vehicle added successfuly",vehicleSave});
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "Vehicle name already exists" });
    console.log(err);
  }
});

function calculateDuration(fromPincode, toPincode) {
  // take absolute differencethen modulo 24
  const diff = Math.abs(parseInt(toPincode) - parseInt(fromPincode));
  // wrap within 24 hours
  const hours = diff % 24; 
  return hours === 0 ? 1 : hours; 
}


router.get("/available", async (req, res) => {
  try {
    // Validate query params
    const { error, value } = availabilityQuerySchema.validate(req.query);
    if (error) return res.status(400).json({ message: error.message });

    const { capacityRequired, fromPincode, toPincode, startTime } = value;

    // Calculate estimated ride duration
    const estimatedRideDurationHours = calculateDuration(fromPincode, toPincode);

    // Calculate end time
    const startTimeISO = new Date(startTime);
    const endTimeISO = new Date(startTimeISO);
    endTimeISO.setHours(endTimeISO.getHours() + estimatedRideDurationHours);

    // Find vehicles with enough capacity
    const vehicles = await Vehicle.find({
      capacityKg: { $gte: capacityRequired },
    });

    // Condition 1: No vehicles at all
    if (!vehicles.length) {
      return res.status(201).json({
        message: `No vehicle found that can handle at least ${capacityRequired} kg.`,
      });
    }

    // Filter out vehicles with booking conflicts
    const availableVehicles = [];
    for (const vehicle of vehicles) {
      const conflict = await Booking.findOne({
        vehicleId: vehicle._id,
        $or: [
          { startTime: { $lt: endTimeISO, $gte: startTimeISO } },
          { endTime: { $gt: startTimeISO, $lte: endTimeISO } },
          { startTime: { $lte: startTimeISO }, endTime: { $gte: endTimeISO } },
        ],
      });

      if (!conflict) availableVehicles.push(vehicle);
    }

    // no available vehicles after conflict check
    if (!availableVehicles.length) {
      return res.status(400).json({
        message: `All vehicles with at least ${capacityRequired} kg capacity are booked during this time.`,
      });
    }

    // respond with available vehicles and duration
    return res.status(200).json({
      estimatedRideDurationHours,
      vehicles: availableVehicles,
    });
  } catch (err) {
    console.error(err);
  }
});


module.exports = router;
