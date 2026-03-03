import { db } from "./db";
import { appointments, type InsertAppointment, type Appointment } from "@shared/schema";
import { eq, and, or, lt, gt, gte, lte } from "drizzle-orm";

export interface IStorage {
  getAppointments(): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  checkOverlap(room: string, start: Date, end: Date): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getAppointments(): Promise<Appointment[]> {
    return await db.select().from(appointments);
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async checkOverlap(room: string, start: Date, end: Date): Promise<boolean> {
    const overlapping = await db.select().from(appointments).where(
      and(
        eq(appointments.room, room),
        lt(appointments.startTime, end),
        gt(appointments.endTime, start)
      )
    );
    return overlapping.length > 0;
  }
}

export const storage = new DatabaseStorage();