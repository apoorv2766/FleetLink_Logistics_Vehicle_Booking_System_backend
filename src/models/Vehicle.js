const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    capacityKg: { type: Number, required: true },
    tyres: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);
