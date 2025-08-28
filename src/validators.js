// src/validators.js
const Joi = require("joi");

const vehicleSchema = Joi.object({
  name: Joi.string().required(),
  capacityKg: Joi.number().positive().required(),
  tyres: Joi.number().integer().positive().required(),
});

const availabilityQuerySchema = Joi.object({
  capacityRequired: Joi.number().positive().required(),
  fromPincode: Joi.string().pattern(/^\d+$/).required(),
  toPincode: Joi.string().pattern(/^\d+$/).required(),
  startTime: Joi.string().isoDate().required(),
});

const bookingSchema = Joi.object({
  vehicleId: Joi.string().required(),
  fromPincode: Joi.string().pattern(/^\d+$/).required(),
  toPincode: Joi.string().pattern(/^\d+$/).required(),
  startTime: Joi.string().isoDate().required(),
  customerId: Joi.string().required(),
});

module.exports = { vehicleSchema, availabilityQuerySchema, bookingSchema };
