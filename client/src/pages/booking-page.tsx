import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, setHours, setMinutes, isBefore, isAfter, startOfDay } from "date-fns";
import { CalendarIcon, Clock, User, Mail, Building, ArrowRight, CheckCircle2 } from "lucide-react";
import { rooms } from "@shared/schema";
import { useAppointments, useCreateAppointment } from "@/hooks/use-appointments";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Operating hours: 5:00 AM to 8:00 PM
const formatTimeLabel = (timeStr: string) => {
  const [hour, min] = timeStr.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
};

const generateTimeSlots = () => {
  const slots = [];
  for (let i = 5; i <= 20; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`);
    if (i !== 20) slots.push(`${i.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

// Frontend-specific form schema
const bookingFormSchema = z.object({
  room: z.enum(rooms),
  date: z.date({
    required_error: "A date is required.",
  }),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  userName: z.string().min(2, "Name must be at least 2 characters."),
  userEmail: z.string().email("Please enter a valid email address."),
}).refine((data) => {
  // Validate end time is after start time
  const startIdx = TIME_SLOTS.indexOf(data.startTime);
  const endIdx = TIME_SLOTS.indexOf(data.endTime);
  return endIdx > startIdx;
}, {
  message: "End time must be after start time",
  path: ["endTime"],
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export default function BookingPage() {
  const { toast } = useToast();
  const { data: appointments } = useAppointments();
  const createAppointment = useCreateAppointment();
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      userName: "",
      userEmail: "",
      startTime: "09:00",
      endTime: "10:00",
    },
  });

  const selectedDate = form.watch("date");
  const selectedRoom = form.watch("room");
  const selectedStartTime = form.watch("startTime");

  // Get occupied slots for selected room and date
  const occupiedSlots = appointments?.filter(apt => 
    apt.room === selectedRoom && 
    selectedDate && 
    format(new Date(apt.startTime), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
  ).map(apt => ({
    start: format(new Date(apt.startTime), "HH:mm"),
    end: format(new Date(apt.endTime), "HH:mm")
  })) || [];

  const isSlotOccupied = (time: string) => {
    // If date is today, check if time has already passed
    if (selectedDate && format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) {
      const [h, m] = time.split(':').map(Number);
      const slotDate = new Date();
      slotDate.setHours(h, m, 0, 0);
      if (isBefore(slotDate, new Date())) return true;
    }
    return occupiedSlots.some(slot => time >= slot.start && time < slot.end);
  };

  const availableStartSlots = TIME_SLOTS.slice(0, -1).filter(time => !isSlotOccupied(time));
  
  const availableEndSlots = TIME_SLOTS.slice(1).filter(time => {
    const startIdx = TIME_SLOTS.indexOf(selectedStartTime);
    const currentIdx = TIME_SLOTS.indexOf(time);
    if (currentIdx <= startIdx) return false;
    
    // Check if there's any appointment between selected start and this end time
    const nextAppointment = occupiedSlots
      .filter(slot => slot.start > selectedStartTime)
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    
    if (nextAppointment && time > nextAppointment.start) return false;
    
    return true;
  });

  function onSubmit(data: BookingFormValues) {
    // Combine Date and Time strings into final Date objects for API
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    
    // Ensure the date is treated correctly in the local timezone (PST)
    const startTimeDate = new Date(data.date);
    startTimeDate.setHours(startHour, startMin, 0, 0);
    
    const endTimeDate = new Date(data.date);
    endTimeDate.setHours(endHour, endMin, 0, 0);

    createAppointment.mutate({
      room: data.room,
      userName: data.userName,
      userEmail: data.userEmail,
      startTime: startTimeDate,
      endTime: endTimeDate,
    }, {
      onSuccess: () => {
        setIsSuccess(true);
        form.reset();
        toast({
          title: "Room Booked Successfully!",
          description: `Your appointment for the ${data.room} room has been confirmed.`,
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Booking Failed",
          description: error.message,
        });
      }
    });
  }

  if (isSuccess) {
    return (
      <div className="flex-1 w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-secondary/30">
        <div className="max-w-md w-full bg-card rounded-3xl p-10 text-center shadow-xl shadow-black/5 border border-border/50 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-4">Booking Confirmed</h2>
          <p className="text-muted-foreground mb-8">
            Your workspace has been successfully reserved. We've sent a calendar invitation to your email.
          </p>
          <Button 
            className="w-full rounded-xl h-12 text-base font-semibold"
            onClick={() => {
              setIsSuccess(false);
              form.reset();
            }}
          >
            Book Another Room
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full overflow-y-auto bg-gradient-to-br from-background via-background to-secondary/30">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 lg:px-8 flex flex-col lg:flex-row gap-12 items-start">
        
        {/* Left Column: Copy & Branding */}
        <div className="lg:w-5/12 pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Rooms Available
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-extrabold text-primary leading-[1.1] mb-6">
            Reserve Your<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Ideal Workspace
            </span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Select from our premium designed meeting rooms. Available daily from 5:00 AM to 8:00 PM for all your professional needs.
          </p>
          
          <div className="space-y-4">
            {rooms.slice(0, 3).map((room, i) => (
              <div key={room} className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
                <div className="bg-secondary p-3 rounded-xl">
                  <Building className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{room} Room</h4>
                  <p className="text-sm text-muted-foreground">Premium amenities</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:w-7/12 w-full">
          <div className="glass-panel rounded-3xl p-8 md:p-10 relative overflow-hidden">
            {/* Decorative background blob */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <h3 className="text-2xl font-display font-bold mb-8 flex items-center gap-3">
              Appointment Details
            </h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                
                {/* Personal Info Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="userName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3.5 top-3 h-5 w-5 text-muted-foreground" />
                            <Input 
                              placeholder="John Doe" 
                              className="pl-11 h-12 rounded-xl bg-background/50 focus:bg-background transition-colors" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="userEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/80">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-3 h-5 w-5 text-muted-foreground" />
                            <Input 
                              placeholder="john@company.com" 
                              type="email"
                              className="pl-11 h-12 rounded-xl bg-background/50 focus:bg-background transition-colors" 
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="h-px w-full bg-border/60 my-2"></div>

                {/* Room Selection */}
                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/80">Select Room</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl bg-background/50 focus:bg-background">
                            <SelectValue placeholder="Choose a meeting room" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          {rooms.map((room) => (
                            <SelectItem key={room} value={room} className="rounded-lg py-3 cursor-pointer">
                              {room} Room
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date and Time Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-1">
                        <FormLabel className="text-foreground/80 mb-1">Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full h-12 rounded-xl pl-3 text-left font-normal bg-background/50 focus:bg-background border-border",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => isBefore(date, startOfDay(new Date()))}
                              initialFocus
                              className="rounded-xl"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">Start Time</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-background/50">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <SelectValue placeholder="Start" />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 rounded-xl">
                              {availableStartSlots.map((time) => (
                                <SelectItem key={time} value={time} className="rounded-lg">{formatTimeLabel(time)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground/80">End Time</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-background/50">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <SelectValue placeholder="End" />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-60 rounded-xl">
                              {availableEndSlots.map((time) => (
                                <SelectItem key={time} value={time} className="rounded-lg">{formatTimeLabel(time)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-xl text-base font-semibold mt-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
                  disabled={createAppointment.isPending}
                >
                  {createAppointment.isPending ? "Confirming..." : "Confirm Booking"}
                  {!createAppointment.isPending && <ArrowRight className="ml-2 w-5 h-5" />}
                </Button>
              </form>
            </Form>
          </div>
        </div>

      </div>
    </div>
  );
}
