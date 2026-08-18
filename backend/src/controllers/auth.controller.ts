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
    flatNumber,
    buildingName,
    emergencyContactName,
    emergencyContactPhone,
  } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw AppError.conflict("Email is already registered", "EMAIL_TAKEN");

  const society = await Society.findOne().sort({ createdAt: 1 });
  if (!society) {
    throw AppError.badRequest(
      "No society is configured yet. Ask an administrator to seed the platform.",
      "SOCIETY_NOT_READY",
    );
  }

  let flat = await Flat.findOne({ societyId: society._id, flatNumber });
  if (!flat && buildingName) {
    const building = await Building.findOne({ societyId: society._id, name: buildingName });
    if (building) {
      flat = await Flat.findOne({ societyId: society._id, buildingId: building._id, flatNumber });
    }
  }
  if (!flat) {
    throw AppError.badRequest("Flat/unit was not found in this society", "FLAT_NOT_FOUND");
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
  return created(res, { token, user: publicDoc(user) }, "Registration successful");
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
  const safe = await User.findById(user._id).populate("flatId", "flatNumber floor");
  return success(res, { token, user: publicDoc(safe) }, "Logged in");
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  res.clearCookie("token", { path: "/" });
  return success(res, null, "Logged out");
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
    .populate("flatId", "flatNumber floor ownershipStatus")
    .populate("societyId", "name city currency");
  if (!user) throw AppError.unauthorized("User not found", "USER_NOT_FOUND");
  return success(res, publicDoc(user));
});
