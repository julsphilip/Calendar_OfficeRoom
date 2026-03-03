import { z } from 'zod';
import { insertAppointmentSchema, appointments } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  appointments: {
    list: {
      method: 'GET' as const,
      path: '/api/appointments' as const,
      input: z.object({
        date: z.string().optional(),
        room: z.string().optional()
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof appointments.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/appointments' as const,
      input: insertAppointmentSchema,
      responses: {
        201: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type AppointmentInput = z.infer<typeof api.appointments.create.input>;
export type AppointmentResponse = z.infer<typeof api.appointments.create.responses[201]>;
export type AppointmentsListResponse = z.infer<typeof api.appointments.list.responses[200]>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
