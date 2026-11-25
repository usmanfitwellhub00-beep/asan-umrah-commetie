import mongoose, { Schema, type Model } from "mongoose";

const UserSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true }, // ADMIN | SM-0001 | SE-0001-000001
    role: { type: String, enum: ["admin", "SM", "SE"], required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    fatherName: { type: String, trim: true },
    gender: { type: String, enum: ["male", "female", ""], default: "" },
    cnic: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    whatsappSameAsPhone: { type: Boolean, default: false },
    address: { type: String, trim: true },
    pictureUrl: { type: String, default: "" },
    picturePublicId: { type: String, default: "" },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
    smCode: { type: String }, // SM: own 4-digit code, SE: code of the SM they are under
    seCode: { type: String }, // SE: own 6-digit code
    sm: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true }, // SE -> parent SM
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const User: Model<any> = mongoose.models.User ?? mongoose.model("User", UserSchema);
