const request = require("supertest");
const app = require("../index");
const mongoose = require("mongoose");
const Vehicle = require("../src/models/Vehicle");
const Booking = require("../src/models/Booking");

beforeAll(async () => {
  await mongoose.connect("mongodb://127.0.0.1:27017/fleetlink_test");
  await Vehicle.deleteMany({});
  await Booking.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Vehicle API", () => {
  let vehicleId;

  test("POST /api/vehicles → should create a new vehicle", async () => {
    const res = await request(app)
      .post("/api/vehicles")
      .send({ name: "Mahindra Bolero", capacityKg: 1200, tyres: 4 });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe("Mahindra Bolero");
    vehicleId = res.body._id;
  });

  test("POST /api/vehicles → should fail if name already exists", async () => {
    const res = await request(app)
      .post("/api/vehicles")
      .send({ name: "Mahindra Bolero", capacityKg: 1200, tyres: 4 });

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });
});
