import { Types } from "mongoose";
import { AuditLog } from "../models/AuditLog";

export async function writeAudit(input: {
  userId: string;
  societyId: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await AuditLog.create({
    userId: new Types.ObjectId(input.userId),
    societyId: new Types.ObjectId(input.societyId),
    action: input.action,
    entity: input.entity,
    entityId: input.entityId ?? "",
    metadata: input.metadata ?? {},
  });
}
