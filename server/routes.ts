import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.appointments.list.path, async (req, res) => {
    try {
      const appointments = await storage.getAppointments();
      res.json(appointments);
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.appointments.create.path, async (req, res) => {
    try {
      const input = api.appointments.create.input.parse(req.body);
      
      // Business logic validation: Operating hours 5:00 AM to 8:00 PM
      const startHour = input.startTime.getHours();
      const endHour = input.endTime.getHours();
      const endMinutes = input.endTime.getMinutes();
      
      if (startHour < 5 || startHour > 20 || (endHour === 20 && endMinutes > 0) || endHour > 20 || endHour < 5) {
        return res.status(400).json({
          message: "Appointments must be between 5:00 AM and 8:00 PM",
          field: "startTime"
        });
      }

      if (input.endTime <= input.startTime) {
        return res.status(400).json({
          message: "End time must be after start time",
          field: "endTime"
        });
      }

      // Check for overlap
      const hasOverlap = await storage.checkOverlap(input.room, input.startTime, input.endTime);
      if (hasOverlap) {
        return res.status(400).json({
          message: "This room is already booked for the selected time slot",
          field: "room"
        });
      }

      const appointment = await storage.createAppointment(input);
      res.status(201).json(appointment);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Seed database
  const existing = await storage.getAppointments();
  if (existing.length === 0) {
    const today = new Date();
    today.setHours(9, 0, 0, 0);
    const endToday = new Date(today);
    endToday.setHours(10, 0, 0, 0);

    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    tmrw.setHours(14, 0, 0, 0);
    const endTmrw = new Date(tmrw);
    endTmrw.setHours(15, 30, 0, 0);

    await storage.createAppointment({
      room: "Boracay",
      startTime: today,
      endTime: endToday,
      userName: "Alice Smith",
      userEmail: "alice@example.com"
    });

    await storage.createAppointment({
      room: "Cebu",
      startTime: tmrw,
      endTime: endTmrw,
      userName: "Bob Jones",
      userEmail: "bob@example.com"
    });
  }

  return httpServer;
}