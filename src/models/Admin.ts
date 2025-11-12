import mongoose, { Schema, models } from "mongoose";

const AdminSchema = new Schema(
  {
    email: { type: String, unique: true, required: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

const Admin = models.Admin || mongoose.model("Admin", AdminSchema);
export default Admin;
