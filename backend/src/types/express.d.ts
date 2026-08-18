import { Types } from "mongoose";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: string;
      societyId: string;
      flatId?: string | null;
      name: string;
      email: string;
      status: string;
    }

    interface Request {
      user?: AuthUser;
      societyObjectId?: Types.ObjectId;
    }
  }
}

export {};
