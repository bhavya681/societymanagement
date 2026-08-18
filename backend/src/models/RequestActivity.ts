import mongoose, { Schema } from "mongoose";

const activitySchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    requestId: { type: Schema.Types.ObjectId, ref: "MaintenanceRequest", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    fromStatus: { type: String, default: "" },
    toStatus: { type: String, default: "" },
    message: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activitySchema.index({ requestId: 1, createdAt: 1 });

export const RequestActivity = mongoose.model("RequestActivity", activitySchema);
