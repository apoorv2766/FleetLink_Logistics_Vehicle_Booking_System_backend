const request = require("supertest");
const app = require("../index");
const mongoose = require("mongoose");
const Vehicle = require("../src/models/Vehicle");
const Booking = require("../src/models/Booking");

let vehicleId;

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/fleetlink_test");
  await Vehicle.deleteMany({});
  await Booking.deleteMany({});

  const vehicle = await Vehicle.create({
    name: "Booking Test Vehicle",
    capacityKg: 1500,
    tyres: 6,
  });
  vehicleId = vehicle._id;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Booking API", () => {
  test("POST /api/bookings → should create booking successfully", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send({
        vehicleId,
        fromPincode: "560001",
        toPincode: "560050",
        startTime: "2025-08-27T10:00:00Z",
        customerId: "customer123",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.vehicleId).toBe(vehicleId.toString());
    expect(res.body.estimatedRideDurationHours).toBeDefined();
  });

  test("POST /api/bookings → should fail due to time overlap", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .send({
        vehicleId,
        fromPincode: "560001",
        toPincode: "560050",
        startTime: "2025-08-27T10:30:00Z",
        customerId: "customer456",
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already booked/i);
  });
});
