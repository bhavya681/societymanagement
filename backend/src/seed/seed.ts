import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { Society } from "../models/Society";
import { Building } from "../models/Building";
import { Flat } from "../models/Flat";
import { User } from "../models/User";
import { Bill } from "../models/Bill";
import { Payment } from "../models/Payment";
import { Expense } from "../models/Expense";
import { MaintenanceRequest } from "../models/MaintenanceRequest";
import { RequestActivity } from "../models/RequestActivity";
import { Announcement } from "../models/Announcement";
import { AnnouncementRead } from "../models/AnnouncementRead";
import { AuditLog } from "../models/AuditLog";
import { SocietyDocument } from "../models/Document";
import { rupeesToPaise, computeBillTotalPaise } from "../utils/money";
import { deriveBillStatus } from "../services/penalty.service";

async function reset() {
  await Promise.all([
    Society.deleteMany({}),
    Building.deleteMany({}),
    Flat.deleteMany({}),
    User.deleteMany({}),
    Bill.deleteMany({}),
    Payment.deleteMany({}),
    Expense.deleteMany({}),
    MaintenanceRequest.deleteMany({}),
    RequestActivity.deleteMany({}),
    Announcement.deleteMany({}),
    AnnouncementRead.deleteMany({}),
    AuditLog.deleteMany({}),
    SocietyDocument.deleteMany({}),
  ]);
}

function dueDate(year: number, month: number, day = 10) {
  return new Date(year, month - 1, day, 23, 59, 59);
}

async function seed() {
  await connectDatabase();
  console.log("Connected. Resetting demo data...");
  await reset();

  const passwordHash = await bcrypt.hash("password", 12);

  const society = await Society.create({
    name: "Sunrise Residency",
    registrationNumber: "MH/PUNE/SOC/2014/1182",
    address: "12 Baner Road, Near Balewadi High Street",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411045",
    contactEmail: "committee@sunriseresidency.in",
    contactPhone: "020-25678900",
    totalBuildings: 2,
    totalUnits: 9,
    financialYear: "2026-27",
    maintenanceDueDay: 10,
    currency: "INR",
    defaultMaintenancePaise: rupeesToPaise(3500),
    penaltyConfig: {
      type: "FIXED",
      fixedPenalty: rupeesToPaise(100),
      percentage: 2,
      gracePeriodDays: 10,
      maxPenalty: rupeesToPaise(500),
      autoApply: true,
    },
    privacy: {
      showResidentPhone: true,
      showResidentEmail: false,
      showDirectoryToResidents: true,
    },
  });

  const wingA = await Building.create({
    societyId: society._id,
    name: "A Wing",
    numberOfFloors: 5,
    units: 5,
  });
  const wingB = await Building.create({
    societyId: society._id,
    name: "B Wing",
    numberOfFloors: 5,
    units: 4,
  });

  const flatDefs = [
    { building: wingA, number: "A-101", floor: 1, type: "2BHK", area: 980 },
    { building: wingA, number: "A-102", floor: 1, type: "2BHK", area: 980 },
    { building: wingA, number: "A-103", floor: 1, type: "3BHK", area: 1320 },
    { building: wingA, number: "A-201", floor: 2, type: "2BHK", area: 980 },
    { building: wingA, number: "A-202", floor: 2, type: "1BHK", area: 640 },
    { building: wingB, number: "B-101", floor: 1, type: "3BHK", area: 1400 },
    { building: wingB, number: "B-102", floor: 1, type: "2BHK", area: 1010 },
    { building: wingB, number: "B-201", floor: 2, type: "2BHK", area: 1010 },
    { building: wingB, number: "B-202", floor: 2, type: "4BHK", area: 1850 },
  ];

  const flats = [];
  for (const def of flatDefs) {
    flats.push(
      await Flat.create({
        societyId: society._id,
        buildingId: def.building._id,
        flatNumber: def.number,
        floor: def.floor,
        type: def.type,
        area: def.area,
        parkingSpaces: def.type === "4BHK" ? 2 : 1,
        ownershipStatus: def.number === "B-202" ? "VACANT" : "OWNER_OCCUPIED",
      }),
    );
  }

  const admin = await User.create({
    name: "Rajesh Kulkarni",
    email: "admin@example.com",
    phone: "9876500001",
    passwordHash,
    role: "ADMIN",
    status: "ACTIVE",
    societyId: society._id,
  });

  const residentDefs = [
    { name: "Priya Sharma", email: "resident@example.com", phone: "9876500101", flat: "A-101" },
    { name: "Amit Deshpande", email: "amit@example.com", phone: "9876500102", flat: "A-102" },
    { name: "Neha Joshi", email: "neha@example.com", phone: "9876500103", flat: "A-103" },
    { name: "Rahul Patil", email: "rahul@example.com", phone: "9876500104", flat: "A-201" },
    { name: "Sneha Iyer", email: "sneha@example.com", phone: "9876500105", flat: "A-202" },
    { name: "Vikram Rao", email: "vikram@example.com", phone: "9876500106", flat: "B-101" },
    { name: "Meera Nair", email: "meera@example.com", phone: "9876500107", flat: "B-102" },
    { name: "Karan Shah", email: "karan@example.com", phone: "9876500108", flat: "B-201" },
  ];

  const residents = [];
  for (const def of residentDefs) {
    const flat = flats.find((f) => f.flatNumber === def.flat)!;
    const user = await User.create({
      name: def.name,
      email: def.email,
      phone: def.phone,
      passwordHash,
      role: "RESIDENT",
      status: "ACTIVE",
      societyId: society._id,
      flatId: flat._id,
      occupancyRole: "OWNER",
      emergencyContactName: "Family",
      emergencyContactPhone: "9876599999",
    });
    flat.owner = user._id;
    flat.occupants = [user._id];
    flat.ownershipStatus = "OWNER_OCCUPIED";
    await flat.save();
    residents.push(user);
  }

  const staff = await User.create({
    name: "Suresh Maintenance",
    email: "staff@example.com",
    phone: "9876500999",
    passwordHash,
    role: "MAINTENANCE_STAFF",
    status: "ACTIVE",
    societyId: society._id,
  });

  let billSeq = 1;
  const now = new Date();
  const occupied = flats.filter((f) => f.flatNumber !== "B-202");
  for (let offset = 3; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    for (const flat of occupied) {
      const resident = residents.find((r) => String(r.flatId) === String(flat._id));
      const base = rupeesToPaise(3500);
      const total = computeBillTotalPaise({ baseAmount: base, additionalCharges: 0, penalty: 0, discount: 0 });
      const due = dueDate(year, month, 10);
      let paid = 0;
      let status = "PENDING";
      if (offset >= 2) {
        paid = total;
        status = "PAID";
      } else if (offset === 1) {
        paid = rupeesToPaise(1500);
        status = "PARTIALLY_PAID";
      } else {
        paid = 0;
        status = deriveBillStatus({ totalAmount: total, paidAmount: 0, dueDate: due, currentStatus: "PENDING" });
      }
      const bill = await Bill.create({
        billNumber: `MH-${year}-${String(billSeq).padStart(5, "0")}`,
        societyId: society._id,
        flatId: flat._id,
        residentId: resident?._id,
        billingMonth: month,
        billingYear: year,
        billKind: "MAINTENANCE",
        baseAmount: base,
        additionalCharges: 0,
        penalty: 0,
        discount: 0,
        totalAmount: total,
        paidAmount: paid,
        dueDate: due,
        status,
        notes: `Monthly maintenance ${month}/${year}`,
      });
      billSeq += 1;
      if (paid > 0) {
        await Payment.create({
          billId: bill._id,
          societyId: society._id,
          residentId: resident!._id,
          flatId: flat._id,
          amount: paid,
          paymentMethod: offset >= 2 ? "UPI" : "BANK_TRANSFER",
          transactionId: offset >= 2 ? `UPI${year}${month}${flat.flatNumber.replace("-", "")}` : "",
          paymentDate: new Date(year, month - 1, 8),
          status: "SUCCESS",
          recordedBy: admin._id,
          notes: "Seed payment",
        });
      }
    }
  }

  await Expense.create([
    {
      societyId: society._id,
      title: "Common area electricity",
      category: "electricity",
      description: "MSEB bill for common lights and lifts",
      amount: rupeesToPaise(28400),
      vendor: "MSEDCL",
      invoiceNumber: "EL-8821",
      expenseDate: new Date(now.getFullYear(), now.getMonth() - 1, 5),
      paymentMethod: "BANK_TRANSFER",
      status: "PAID",
      createdBy: admin._id,
    },
    {
      societyId: society._id,
      title: "Security agency retainer",
      category: "security",
      amount: rupeesToPaise(45000),
      vendor: "ShieldPlus Security",
      invoiceNumber: "SEC-104",
      expenseDate: new Date(now.getFullYear(), now.getMonth() - 1, 2),
      paymentMethod: "BANK_TRANSFER",
      status: "PAID",
      createdBy: admin._id,
    },
    {
      societyId: society._id,
      title: "Housekeeping staff",
      category: "housekeeping",
      amount: rupeesToPaise(22000),
      vendor: "CleanCo",
      expenseDate: new Date(now.getFullYear(), now.getMonth() - 1, 3),
      paymentMethod: "BANK_TRANSFER",
      status: "PAID",
      createdBy: admin._id,
    },
    {
      societyId: society._id,
      title: "Lift AMC",
      category: "lift",
      amount: rupeesToPaise(18000),
      vendor: "Otis Service",
      invoiceNumber: "LFT-77",
      expenseDate: new Date(now.getFullYear(), now.getMonth(), 4),
      paymentMethod: "CHEQUE",
      status: "PAID",
      createdBy: admin._id,
    },
    {
      societyId: society._id,
      title: "Garden maintenance",
      category: "gardening",
      amount: rupeesToPaise(6500),
      vendor: "GreenScape",
      expenseDate: new Date(now.getFullYear(), now.getMonth(), 6),
      paymentMethod: "UPI",
      status: "PAID",
      createdBy: admin._id,
    },
  ]);

  const req1 = await MaintenanceRequest.create({
    societyId: society._id,
    flatId: residents[0].flatId,
    createdBy: residents[0]._id,
    assignedTo: staff._id,
    title: "Kitchen sink leakage",
    category: "plumbing",
    description: "Continuous drip under the kitchen sink since yesterday evening.",
    priority: "HIGH",
    location: "A-101 Kitchen",
    status: "IN_PROGRESS",
  });
  await RequestActivity.create([
    {
      societyId: society._id,
      requestId: req1._id,
      actorId: residents[0]._id,
      actorName: residents[0].name,
      action: "created",
      toStatus: "OPEN",
      message: "Request created",
    },
    {
      societyId: society._id,
      requestId: req1._id,
      actorId: admin._id,
      actorName: admin.name,
      action: "assigned",
      fromStatus: "OPEN",
      toStatus: "ASSIGNED",
      message: `Assigned to ${staff.name}`,
    },
    {
      societyId: society._id,
      requestId: req1._id,
      actorId: admin._id,
      actorName: admin.name,
      action: "status_changed",
      fromStatus: "ASSIGNED",
      toStatus: "IN_PROGRESS",
      message: "Status changed to IN_PROGRESS",
    },
  ]);

  await MaintenanceRequest.create({
    societyId: society._id,
    flatId: residents[1].flatId,
    createdBy: residents[1]._id,
    title: "Corridor light not working",
    category: "electrical",
    description: "The light near A-102 staircase is flickering.",
    priority: "MEDIUM",
    location: "A Wing 1st floor corridor",
    status: "OPEN",
  });

  await Announcement.create([
    {
      societyId: society._id,
      title: "Water supply interruption on Sunday",
      content: "Municipal water supply will be interrupted from 8 AM to 2 PM on Sunday for tank cleaning. Please store water.",
      category: "water",
      priority: "IMPORTANT",
      important: true,
      pinned: true,
      publishDate: new Date(),
      expiryDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
      createdBy: admin._id,
      status: "PUBLISHED",
    },
    {
      societyId: society._id,
      title: "AGM scheduled for 30 August",
      content: "The Annual General Meeting will be held in the clubhouse at 10:30 AM. All owners are requested to attend.",
      category: "meeting",
      priority: "NORMAL",
      publishDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
      createdBy: admin._id,
      status: "PUBLISHED",
    },
    {
      societyId: society._id,
      title: "Festival decoration volunteers",
      content: "Looking for volunteers for Ganesh Utsav common area decoration. Please contact the committee.",
      category: "event",
      priority: "NORMAL",
      publishDate: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
      createdBy: admin._id,
      status: "PUBLISHED",
    },
  ]);

  await SocietyDocument.create([
    {
      societyId: society._id,
      title: "Society bye-laws",
      category: "rules",
      description: "Registered bye-laws of Sunrise Residency",
      url: "https://example.com/sunrise-bylaws.pdf",
      fileName: "sunrise-bylaws.pdf",
      storageProvider: "external_url",
      visibleToResidents: true,
      uploadedBy: admin._id,
    },
    {
      societyId: society._id,
      title: "FY 2025-26 audited accounts",
      category: "financial_report",
      description: "Audited financial statements",
      url: "https://example.com/accounts-2025.pdf",
      fileName: "accounts-2025.pdf",
      storageProvider: "external_url",
      visibleToResidents: true,
      uploadedBy: admin._id,
    },
  ]);

  await AuditLog.create({
    userId: admin._id,
    societyId: society._id,
    action: "seed.completed",
    entity: "Society",
    entityId: String(society._id),
    metadata: { note: "Demo dataset loaded" },
  });

  console.log("Seed complete.");
  console.log("Admin:    admin@example.com / password");
  console.log("Resident: resident@example.com / password");
  await disconnectDatabase();
}

seed().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
