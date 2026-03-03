import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rooms = ["Boracay", "Cebu", "Bohol", "Davao", "Palawan"] as const;

export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  room: text("room").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  userName: text("user_name").notNull(),
  userEmail: text("user_email").notNull(),
});

export const insertAppointmentSchema = createInsertSchema(appointments).omit({ 
  id: true 
}).extend({
  room: z.enum(["Boracay", "Cebu", "Bohol", "Davao", "Palawan"]),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  userName: z.string().min(1, "Name is required"),
  userEmail: z.string().email("Valid email is required"),
});

export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;