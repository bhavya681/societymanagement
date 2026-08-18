import mongoose, { Schema } from "mongoose";

const buildingSchema = new Schema(
  {
    societyId: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    name: { type: String, required: true, trim: true },
    numberOfFloors: { type: Number, required: true, min: 1 },
    units: { type: Number, default: 0 },
  },
  { timestamps: true },
);

buildingSchema.index({ societyId: 1, name: 1 }, { unique: true });

export const Building = mongoose.model("Building", buildingSchema);
