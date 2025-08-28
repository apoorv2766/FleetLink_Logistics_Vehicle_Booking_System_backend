const express = require("express");
const Booking = require("../src/models/Booking");
const Vehicle = require("../src/models/Vehicle");
const router = express.Router();
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ObjectId = Schema.Types.ObjectId;

// Helper function for duration calculation based on core logic
function calculateRideDuration(fromPincode, toPincode) {
  const from = parseInt(fromPincode, 10);
  const to = parseInt(toPincode, 10);
  // calculate absolute difference and keep within 24 hours
  const estimatedRideDurationHours = Math.abs(to - from) % 24;
  // fallback in case calculation yields 0 (e.g., same pin)
  return estimatedRideDurationHours === 0 ? 1 : estimatedRideDurationHours;
}

router.post("/", async (req, res, next) => {
  try {
    const { vehicleId, fromPincode, toPincode, startTime, customerId } =
      req.body;
    // Validate payload
    if (!vehicleId || !fromPincode || !toPincode || !startTime || !customerId) {
      return res.status(400).json({
        message:
          "vehicleId, fromPincode, toPincode, startTime, and customerId are required.",
      });
    }
    // Check if vehicle exists
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found." });
    }

    // Calculate duration and booking window
    const estimatedRideDurationHours = calculateRideDuration(
      fromPincode,
      toPincode
    );
    const bookingStartTime = new Date(startTime);
    const bookingEndTime = new Date(
      bookingStartTime.getTime() + estimatedRideDurationHours * 60 * 60 * 1000
    );

    // Check for conflicts (no overlapping bookings)
    const conflict = await Booking.findOne({
      vehicleId,
      $or: [
        { startTime: { $lt: bookingEndTime, $gte: bookingStartTime } },
        { endTime: { $gt: bookingStartTime, $lte: bookingEndTime } },
        {
          startTime: { $lte: bookingStartTime },
          endTime: { $gte: bookingEndTime },
        },
      ],
    });

    if (conflict) {
      return res
        .status(409)
        .json({ message: "Vehicle is already booked for the selected slot." });
    }

    // Create booking
    const newBooking = new Booking({
      vehicleId,
      customerId,
      fromPincode,
      toPincode,
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      estimatedRideDurationHours,
    });

    await newBooking.save();

    // Return the full booking object in response
    return res
      .status(201)
      .json({ message: "Booking created successfully.", newBooking });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const bookings = await Booking.find().populate("vehicleId");
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/bookings/:id
 * @desc Cancel a booking
 */

router.delete("/:vehicleId", async (req, res, next) => {
  try {
    const booking = await Booking.findOneAndDelete({
      vehicleId: req.params.vehicleId,
    });
    if (!booking) {
      return res
        .status(404)
        .json({ message: "No booking found for this vehicleId." });
    }
    res.json({ message: "Booking cancelled successfully.", booking });
  } catch (error) {
    res.status(404).json({message:"Some Error Occurred"})
    
  }
});

module.exports = router;
