import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../app";
import { Society } from "../models/Society";
import { Building } from "../models/Building";
import { Flat } from "../models/Flat";
import { User } from "../models/User";
import { rupeesToPaise } from "../utils/money";

process.env.JWT_SECRET = "test-secret";
process.env.MONGODB_URI = "mongodb://localhost/test";
process.env.CLIENT_URL = "http://localhost:5173";

const app = createApp();
let mongo: MongoMemoryServer;
let societyId: string;
let adminToken: string;
let residentToken: string;
let otherSocietyToken: string;
let flatId: string;
let residentId: string;

async function login(email: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password: "password" });
  return res.body.data.token as string;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  const hash = await bcrypt.hash("password", 10);
  const society = await Society.create({
    name: "Test Society",
    address: "1 Test Street",
    city: "Pune",
    state: "MH",
    pincode: "411001",
    contactEmail: "a@test.com",
    contactPhone: "9999999999",
    defaultMaintenancePaise: rupeesToPaise(3000),
    penaltyConfig: {
      type: "FIXED",
      fixedPenalty: rupeesToPaise(100),
      percentage: 2,
      gracePeriodDays: 10,
      maxPenalty: rupeesToPaise(500),
      autoApply: true,
    },
  });
  societyId = String(society._id);
  const building = await Building.create({ societyId, name: "A Wing", numberOfFloors: 2, units: 1 });
  const flat = await Flat.create({
    societyId,
    buildingId: building._id,
    flatNumber: "A-101",
    floor: 1,
    type: "2BHK",
    ownershipStatus: "OWNER_OCCUPIED",
  });
  flatId = String(flat._id);
  const admin = await User.create({
    name: "Admin",
    email: "admin@example.com",
    phone: "1111111111",
    passwordHash: hash,
    role: "ADMIN",
    status: "ACTIVE",
    societyId,
  });
  const resident = await User.create({
    name: "Resident",
    email: "resident@example.com",
    phone: "2222222222",
    passwordHash: hash,
    role: "RESIDENT",
    status: "ACTIVE",
    societyId,
    flatId: flat._id,
  });
  residentId = String(resident._id);
  flat.owner = resident._id;
  flat.occupants = [resident._id];
  await flat.save();

  const other = await Society.create({
    name: "Other Society",
    address: "2 Other",
    city: "Mumbai",
    state: "MH",
    pincode: "400001",
    contactEmail: "o@test.com",
    contactPhone: "8888888888",
  });
  await User.create({
    name: "Other Admin",
    email: "other@example.com",
    phone: "3333333333",
    passwordHash: hash,
    role: "ADMIN",
    status: "ACTIVE",
    societyId: other._id,
  });

  adminToken = await login("admin@example.com");
  residentToken = await login("resident@example.com");
  otherSocietyToken = await login("other@example.com");
  void admin;
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("auth", () => {
  it("rejects invalid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "admin@example.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns the current user", async () => {
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("admin@example.com");
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

describe("authorization", () => {
  it("blocks residents from admin dashboard", async () => {
    const res = await request(app)
      .get("/api/dashboard/admin")
      .set("Authorization", `Bearer ${residentToken}`);
    expect(res.status).toBe(403);
  });

  it("prevents cross-society access", async () => {
    const res = await request(app)
      .get("/api/residents")
      .set("Authorization", `Bearer ${otherSocietyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(0);
  });
});

describe("billing and payments", () => {
  let billId: string;

  it("generates a maintenance bill", async () => {
    const due = new Date();
    due.setDate(due.getDate() + 10);
    const res = await request(app)
      .post("/api/bills/generate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        billingMonth: 8,
        billingYear: 2026,
        dueDate: due.toISOString(),
        baseAmount: 3000,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.created.length).toBe(1);
    billId = res.body.data.created[0].id;
    expect(res.body.data.created[0].totalAmount).toBe(3000);
  });

  it("prevents duplicate monthly bills", async () => {
    const due = new Date();
    const res = await request(app)
      .post("/api/bills/generate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        billingMonth: 8,
        billingYear: 2026,
        dueDate: due.toISOString(),
        baseAmount: 3000,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.created.length).toBe(0);
    expect(res.body.data.skipped.length).toBe(1);
  });

  it("records a partial payment and updates status", async () => {
    const res = await request(app)
      .post(`/api/bills/${billId}/payment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 1000, paymentMethod: "UPI" });
    expect(res.status).toBe(201);
    expect(res.body.data.bill.status).toBe("PARTIALLY_PAID");
    expect(res.body.data.bill.paidAmount).toBe(1000);
  });

  it("rejects overpayment", async () => {
    const res = await request(app)
      .post(`/api/bills/${billId}/payment`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ amount: 5000, paymentMethod: "CASH" });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("PAYMENT_EXCEEDS_REMAINING");
  });

  it("prevents a resident from seeing another society's bill", async () => {
    const res = await request(app)
      .get(`/api/bills/${billId}`)
      .set("Authorization", `Bearer ${otherSocietyToken}`);
    expect(res.status).toBe(404);
  });

  it("allows the resident to view their own bill", async () => {
    const res = await request(app)
      .get(`/api/bills/${billId}`)
      .set("Authorization", `Bearer ${residentToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(billId);
  });

  it("completes payment and marks the bill paid", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ billId, amount: 2000, paymentMethod: "CASH" });
    expect(res.status).toBe(201);
    const bill = await request(app).get(`/api/bills/${billId}`).set("Authorization", `Bearer ${adminToken}`);
    expect(bill.body.data.status).toBe("PAID");
  });
});

describe("resident restrictions", () => {
  it("does not let a resident create another admin", async () => {
    const res = await request(app)
      .post("/api/residents")
      .set("Authorization", `Bearer ${residentToken}`)
      .send({
        name: "Hacker",
        email: "hack@test.com",
        phone: "4444444444",
        password: "password1",
      });
    expect(res.status).toBe(403);
  });

  it("keeps resident ids isolated in list for other society", async () => {
    const res = await request(app)
      .get(`/api/residents/${residentId}`)
      .set("Authorization", `Bearer ${otherSocietyToken}`);
    expect(res.status).toBe(404);
  });
});
