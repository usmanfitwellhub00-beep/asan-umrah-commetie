import mongoose, { Schema, type Model } from "mongoose";

const SettingsSchema = new Schema({
  _id: { type: String },
  maxSM: { type: Number, default: 5 },
  leadAmount: { type: Number, default: 5000 },
  rights: { type: Schema.Types.Mixed, default: {} },
});

export const Settings: Model<any> = mongoose.models.Settings ?? mongoose.model("Settings", SettingsSchema);
