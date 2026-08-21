import bcrypt from "bcryptjs";
import { CookieOptions, Request, Response } from "express";
import { User } from "../models/User";
import { Society } from "../models/Society";
import { Building } from "../models/Building";
import { Flat } from "../models/Flat";
import { AppError } from "../utils/AppError";
import { created, success } from "../utils/response";
import { asyncHandler } from "../utils/asyncHandler";
import { signToken } from "../utils/jwt";
import { env } from "../config/env";
import { publicDoc } from "../utils/serialize";

const SALT_ROUNDS = 12;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: env.isProd ? "strict" : "lax",
    secure: env.cookieSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

function tokenFor(user: { _id: unknown; role: string; societyId: unknown }) {
  return signToken({
    userId: String(user._id),
    role: user.role,
    societyId: String(user.societyId),
  });
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone,
    password,
    societyCode,
    flatNumber,
    buildingName,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw AppError.conflict("Email is already registered", "EMAIL_TAKEN");

  const society = await Society.findOne({ inviteCode: String(societyCode).trim().toUpperCase() });
  if (!society) {
    throw AppError.badRequest("Society code was not found. Ask your committee for the invite code.", "SOCIETY_NOT_FOUND");
  }

  const wingName = (buildingName as string)?.trim() || "Main";
  let building = await Building.findOne({ societyId: society._id, name: wingName });
  if (!building) {
    building = await Building.create({
      societyId: society._id,
      name: wingName,
      numberOfFloors: 10,
      units: 1,
    });
  }

  let flat = await Flat.findOne({ societyId: society._id, buildingId: building._id, flatNumber });
  if (!flat) {
    const floorMatch = String(flatNumber).match(/(\d+)/);
    flat = await Flat.create({
      societyId: society._id,
      buildingId: building._id,
      flatNumber,
      floor: floorMatch ? Number(floorMatch[1].slice(0, 2)) || 1 : 1,
      type: "2BHK",
      ownershipStatus: "TENANT_OCCUPIED",
    });
    building.units += 1;
    await building.save();
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role: "RESIDENT",
    status: "ACTIVE",
    societyId: society._id,
    flatId: flat._id,
    occupancyRole: "TENANT",
    emergencyContactName: emergencyContactName ?? "",
    emergencyContactPhone: emergencyContactPhone ?? "",
  });

  if (!flat.occupants.map(String).includes(String(user._id))) {
    flat.occupants.push(user._id);
    if (flat.ownershipStatus === "VACANT") flat.ownershipStatus = "TENANT_OCCUPIED";
    await flat.save();
  }

  const token = tokenFor(user);
  res.cookie("token", token, cookieOptions());
  const safe = await User.findById(user._id).populate("societyId", "name city currency inviteCode");
  return created(res, { token, user: publicDoc(safe) }, "Registration successful");
});

export const registerSociety = asyncHandler(async (req: Request, res: Response) => {
  const {
    name,
    email,
    phone,
    password,
    societyName,
    address,
    city,
    state,
    pincode,
    contactPhone,
    buildingName,
  } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw AppError.conflict("Email is already registered", "EMAIL_TAKEN");

  const society = await Society.create({
    name: societyName,
    address,
    city,
    state,
    pincode,
    contactEmail: email.toLowerCase(),
    contactPhone: contactPhone || phone,
  });

  if (buildingName) {
    await Building.create({
      societyId: society._id,
      name: buildingName,
      numberOfFloors: 5,
      units: 0,
    });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role: "ADMIN",
    status: "ACTIVE",
    societyId: society._id,
  });

  const token = tokenFor(user);
  res.cookie("token", token, cookieOptions());
  const safe = await User.findById(user._id).populate("societyId", "name city currency inviteCode");
  return created(
    res,
    { token, user: publicDoc(safe), society: publicDoc(society) },
    "Society created. Share the invite code with residents.",
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!user) throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw AppError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
  if (user.status !== "ACTIVE") {
    throw AppError.forbidden("Account is not active", "ACCOUNT_INACTIVE");
  }
  user.lastLogin = new Date();
  await user.save();
  const token = tokenFor(user);
  res.cookie("token", token, cookieOptions());
  const safe = await User.findById(user._id)
    .populate("flatId", "flatNumber floor")
    .populate("societyId", "name city currency inviteCode");
  return success(res, { token, user: publicDoc(safe) }, "Logged in");
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  return success(res, null, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
    .populate("flatId", "flatNumber floor ownershipStatus")
    .populate("societyId", "name city currency inviteCode");
  if (!user) throw AppError.unauthorized("User not found", "USER_NOT_FOUND");
  return success(res, publicDoc(user));
});
