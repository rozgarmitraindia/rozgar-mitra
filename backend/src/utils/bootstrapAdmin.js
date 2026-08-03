import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

export async function bootstrapAdmin() {
  if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    const existing = await User.findOne({ role: "admin", email: process.env.ADMIN_EMAIL.toLowerCase() });
    if (!existing) {
      await User.create({
        role: "admin",
        status: "verified",
        immutableId: "rozgarmitra-adminid-ROOT",
        fullName: "Rozgar Mitra Admin",
        email: process.env.ADMIN_EMAIL.toLowerCase(),
        phone: process.env.ADMIN_PHONE || "rozgarmitra-admin-phone-ROOT",
        emailVerified: true,
        phoneVerified: true,
        passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 10),
      });
      console.log("Bootstrap admin created from ADMIN_EMAIL");
    }
  }

  if (process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
    const existingSuperAdmin = await User.findOne({ role: "superAdmin", email: process.env.SUPER_ADMIN_EMAIL.toLowerCase() });
    if (!existingSuperAdmin) {
      await User.create({
        role: "superAdmin",
        status: "verified",
        immutableId: "rozgarmitra-superadminid-ROOT",
        fullName: "Rozgar Mitra Super Admin",
        email: process.env.SUPER_ADMIN_EMAIL.toLowerCase(),
        phone: process.env.SUPER_ADMIN_PHONE || "rozgarmitra-superadmin-phone-ROOT",
        emailVerified: true,
        phoneVerified: true,
        passwordHash: await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD, 10),
      });
      console.log("Bootstrap super admin created from SUPER_ADMIN_EMAIL");
    }
  }
}
