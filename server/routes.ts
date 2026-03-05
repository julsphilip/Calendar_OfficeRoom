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
      
      // Philippine Standard Time (UTC+8) validation
      // Use a consistent offset to avoid server timezone issues
      const getPSTTime = (date: Date) => {
        // Adjust for UTC+8
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        return new Date(utc + (3600000 * 8));
      };

      const pstStart = getPSTTime(input.startTime);
      const pstEnd = getPSTTime(input.endTime);
      
      const startHour = pstStart.getHours();
      const startMinutes = pstStart.getMinutes();
      const endHour = pstEnd.getHours();
      const endMinutes = pstEnd.getMinutes();
      
      const isWithinHours = (h: number, m: number) => {
        if (h < 5) return false;
        if (h > 20) return false;
        if (h === 20 && m > 0) return false;
        return true;
      };

      if (!isWithinHours(startHour, startMinutes) || !isWithinHours(endHour, endMinutes)) {
        return res.status(400).json({
          message: "Appointments must be between 5:00 AM and 8:00 PM Philippine Standard Time (PST)",
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
      
      // Mock Notification logic
      const appointmentTime = pstStart.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true });
      const appointmentDate = pstStart.toLocaleDateString('en-PH', { dateStyle: 'full' });
      console.log(`
------------------------------------------------------------
[PRODUCTION EMAIL SIMULATION]
To: ${appointment.userEmail}
Subject: Booking Confirmation - ${appointment.room} Room
Body: 
Hi ${appointment.userName},

Your booking for the ${appointment.room} room has been confirmed.
Date: ${appointmentDate}
Time: ${appointmentTime} (Philippine Standard Time)

Thank you for using our service!
------------------------------------------------------------
      `);

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