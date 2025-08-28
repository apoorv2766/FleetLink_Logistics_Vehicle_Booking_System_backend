const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const app = require("..");
const Vehicle = require("../src/models/Vehicle");
const Booking = require("../src/models/Booking");

let mongoServer;
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await Vehicle.deleteMany({});
  await Booking.deleteMany({});
});

test("POST /api/vehicles - create and validation", async () => {
  const res = await request(app).post("/api/vehicles").send({
    name: "KA01TEST",
    capacityKg: 1000,
    tyres: 6,
  });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe("KA01TEST");

  const bad = await request(app).post("/api/vehicles").send({ name: "X" });
  expect(bad.status).toBe(400);
});

test("GET /api/vehicles/available respects overlaps and back-to-back", async () => {
  // create vehicle
  const v = await Vehicle.create({ name: "V1", capacityKg: 1000, tyres: 6 });

  // create an existing booking from 10:00 to 12:00
  const startExisting = new Date("2025-08-27T10:00:00.000Z");
  const endExisting = new Date("2025-08-27T12:00:00.000Z");
  await Booking.create({
    vehicleId: v._id,
    fromPincode: "560001",
    toPincode: "560100",
    startTime: startExisting,
    endTime: endExisting,
    estimatedRideDurationHours: 2,
    customerId: "cust1",
    status: "confirmed",
  });

  // request a search that starts exactly at 12:00 (back-to-back) with duration 2 hours.
  // choose pincodes so estimate becomes 2 hours: use numbers diff % 24 => diff 2
  const res = await request(app).get("/api/vehicles/available").query({
    capacityRequired: 500,
    fromPincode: "560102", // parseInt 560102
    toPincode: "560100", // parseInt 560100 -> difference 2 % 24 = 2 hours
    startTime: "2025-08-27T12:00:00.000Z",
  });

  // since existing.endTime === req.startTime, back-to-back allowed -> vehicle should be available
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  expect(res.body.length).toBe(1);

  // now request overlapping (starts at 11:00) should exclude the vehicle
  const res2 = await request(app).get("/api/vehicles/available").query({
    capacityRequired: 500,
    fromPincode: "560102",
    toPincode: "560100",
    startTime: "2025-08-27T11:00:00.000Z",
  });
  expect(res2.status).toBe(200);
  expect(res2.body.length).toBe(0);
});

test("POST /api/bookings - conflict and success", async () => {
  const v = await Vehicle.create({ name: "V2", capacityKg: 2000, tyres: 8 });

  // create a booking that occupies 10:00-14:00
  const existingStart = new Date("2025-08-27T10:00:00.000Z");
  const existingEnd = new Date("2025-08-27T14:00:00.000Z");
  await Booking.create({
    vehicleId: v._id,
    fromPincode: "100000",
    toPincode: "100004",
    startTime: existingStart,
    endTime: existingEnd,
    estimatedRideDurationHours: 4,
    customerId: "c1",
    status: "confirmed",
  });

  const duration = Math.abs(parseInt("654321") - parseInt("123456")) % 24;
  const endTime = new Date(
    new Date("2025-08-27T10:00:00Z").getTime() + duration * 60 * 60 * 1000
  );

  const vehicleRes = await request(app).post("/api/vehicles").send({
    name: "Truck 1",
    capacity: 1000,
  });

  const vehicleId = vehicleRes.body.id;

  // try to book overlapping window -> should return 409
  const overlapping = await request(app).post("/api/bookings").send({
    vehicleId: vehicleId,
    startTime: "2025-08-27T10:00:00Z",
    endTime: "2025-08-27T19:00:00.000Z",
    fromPincode: "123456",
    toPincode: "654321",
    customerId: "c2",
  });

  expect(overlapping.status).toBe(409);

  // try booking after 14:00 (back-to-back allowed) -> should succeed
  const success = await request(app).post("/api/bookings").send({
    vehicleId: v._id.toString(),
    fromPincode: "100000",
    toPincode: "100002",
    startTime: "2025-08-27T14:00:00.000Z",
    customerId: "c3",
  });
  expect(success.status).toBe(201);
  expect(success.body.vehicleId).toBe(v._id.toString());
});
