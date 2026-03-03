import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type AppointmentInput, type AppointmentsListResponse } from "@shared/routes";

// Helper to log Zod parsing errors for robust debugging
function parseWithLogging<T>(schema: any, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useAppointments(date?: string, room?: string) {
  return useQuery({
    queryKey: [api.appointments.list.path, date, room],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.append("date", date);
      if (room) params.append("room", room);
      
      const url = `${api.appointments.list.path}${params.toString() ? `?${params.toString()}` : ''}`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      
      const data = await res.json();
      return parseWithLogging<AppointmentsListResponse>(
        api.appointments.list.responses[200], 
        data, 
        "appointments.list"
      );
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AppointmentInput) => {
      const validated = api.appointments.create.input.parse(data);
      
      const res = await fetch(api.appointments.create.path, {
        method: api.appointments.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          const error = api.appointments.create.responses[400].parse(errorData);
          throw new Error(error.message);
        }
        throw new Error("Failed to create appointment");
      }
      
      return api.appointments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
    },
  });
}
