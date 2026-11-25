import mongoose, { Schema, type Model } from "mongoose";

const LeadSchema = new Schema(
  {
    leadId: { type: String, required: true, unique: true }, // LD-000001
    name: { type: String, required: true, trim: true },
    fatherHusbandName: { type: String, required: true, trim: true },
    cnic: { type: String, required: true, trim: true, index: true },
    email: { type: String, lowercase: true, trim: true, default: "" }, // optional
    gender: { type: String, enum: ["male", "female"] },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, required: true, trim: true },
    whatsappSameAsPhone: { type: Boolean, default: false },
    address: { type: String, required: true, trim: true },
    pictureUrl: { type: String, default: "" }, // optional (Cloudinary URL)
    picturePublicId: { type: String, default: "" },
    amount: { type: Number, required: true, default: 5000 },
    paymentPlatform: { type: String, required: true },
    paymentScreenshotUrl: { type: String, required: true }, // Cloudinary URL
    paymentScreenshotPublicId: { type: String, default: "" },
    paymentStatus: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    verifiedAt: { type: Date, default: null },
    commissionGenerated: { type: Boolean, default: false },
    se: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sm: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    seId: { type: String, required: true }, // SE-0001-000001
    smId: { type: String, required: true }, // SM-0001
  },
  { timestamps: true }
);

export const Lead: Model<any> = mongoose.models.Lead ?? mongoose.model("Lead", LeadSchema);
