import mongoose, { Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    action: { type: String, required: true, index: true },
    entity: { type: String, required: true, index: true },
    entityId: { type: String, default: "" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: "timestamp", updatedAt: false } },
);

auditLogSchema.index({ societyId: 1, timestamp: -1 });
auditLogSchema.index({ societyId: 1, entity: 1, timestamp: -1 });

export const AuditLog = mongoose.model("AuditLog", auditLogSchema);
