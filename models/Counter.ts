import mongoose, { Schema, type Model } from "mongoose";

const CounterSchema = new Schema({ _id: { type: String }, seq: { type: Number, default: 0 } });

export const Counter: Model<any> = mongoose.models.Counter ?? mongoose.model("Counter", CounterSchema);

export async function nextSeq(name: string): Promise<number> {
  const doc: any = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean();
  return doc.seq as number;
}

export const pad = (n: number, len: number) => String(n).padStart(len, "0");
