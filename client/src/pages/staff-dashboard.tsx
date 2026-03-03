import { useState, useMemo } from "react";
import { format, parseISO, startOfDay, getHours, getMinutes, differenceInMinutes, isSameDay } from "date-fns";
import { CalendarIcon, LayoutList, CalendarDays, RefreshCw } from "lucide-react";
import { rooms, type Appointment } from "@shared/schema";
import { useAppointments } from "@/hooks/use-appointments";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Operating hours
const START_HOUR = 5;
const END_HOUR = 20; // 8 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIMELINE_COLS = TOTAL_HOURS * 2; // Half-hour increments

export default function StaffDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [view, setView] = useState<'timeline' | 'list'>('timeline');

  const { data: appointments, isLoading, refetch, isRefetching } = useAppointments(
    selectedDate.toISOString()
  );

  // Filter appointments for the selected date (API might return more depending on implementation, good to double check)
  const todaysAppointments = useMemo(() => {
    if (!appointments) return [];
    return appointments.filter(apt => isSameDay(new Date(apt.startTime), selectedDate));
  }, [appointments, selectedDate]);

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-secondary/20 overflow-hidden">
      {/* Header Area */}
      <header className="px-8 py-6 bg-card border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Staff Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor daily room occupancy.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            className="rounded-xl h-10 w-10 bg-background"
            title="Refresh data"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] h-10 rounded-xl justify-start text-left font-medium bg-background",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="rounded-xl"
              />
            </PopoverContent>
          </Popover>

          <div className="flex p-1 bg-secondary rounded-xl border border-border/50">
            <Button
              variant={view === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('timeline')}
              className={cn("rounded-lg px-4", view === 'timeline' && "bg-background shadow-sm")}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              Timeline
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className={cn("rounded-lg px-4", view === 'list' && "bg-background shadow-sm")}
            >
              <LayoutList className="h-4 w-4 mr-2" />
              List
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[100px] w-full rounded-2xl" />
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        ) : view === 'timeline' ? (
          <TimelineView appointments={todaysAppointments} />
        ) : (
          <ListView appointments={todaysAppointments} />
        )}
      </main>
    </div>
  );
}

// --- Subcomponents ---

function TimelineView({ appointments }: { appointments: Appointment[] }) {
  // Generate header hours (5 AM to 8 PM)
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border bg-muted/30">
        <h3 className="font-semibold font-display text-lg">Daily Schedule</h3>
      </div>
      
      <div className="overflow-x-auto timeline-scroll pb-4">
        <div className="min-w-[1000px] p-6">
          {/* Timeline Grid */}
          <div 
            className="grid relative"
            style={{ 
              gridTemplateColumns: `120px repeat(${TIMELINE_COLS}, minmax(40px, 1fr))` 
            }}
          >
            {/* Header Row (Time labels) */}
            <div className="col-start-1 sticky left-0 z-20 bg-card"></div>
            {hours.slice(0, -1).map((hour, i) => (
              <div 
                key={hour} 
                className="col-span-2 text-xs font-semibold text-muted-foreground border-l border-border/50 pl-2 pb-4 flex flex-col items-center justify-end h-full"
              >
                <span>{format(new Date(2000, 0, 1, hour), 'h a')}</span>
                <span className="text-[10px] opacity-60">PST</span>
              </div>
            ))}

            {/* Room Rows */}
            {rooms.map((room, roomIdx) => {
              const roomAppointments = appointments.filter(a => a.room === room);

              return (
                <div key={room} className="contents group">
                  {/* Room Label (Sticky Left) */}
                  <div className="col-start-1 sticky left-0 z-20 bg-card py-4 pr-4 border-t border-border group-hover:bg-muted/30 transition-colors flex items-center">
                    <span className="font-medium text-foreground">{room}</span>
                  </div>

                  {/* Grid cells for this row (background lines) */}
                  {Array.from({ length: TIMELINE_COLS }).map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "border-t border-border group-hover:bg-muted/10 transition-colors h-20 relative",
                        i % 2 === 0 ? "border-l border-border/50" : "border-l border-border/20 border-dashed"
                      )}
                    />
                  ))}

                  {/* Render appointment blocks for this room */}
                  {roomAppointments.map((apt) => {
                    const start = new Date(apt.startTime);
                    const end = new Date(apt.endTime);
                    
                    // Calculate grid positions
                    const startH = getHours(start);
                    const startM = getMinutes(start);
                    
                    // If start time is before operating hours, clamp it for display
                    const displayStartH = Math.max(startH, START_HOUR);
                    const displayStartM = startH < START_HOUR ? 0 : startM;

                    // Calculate offset in half-hour blocks from 5 AM
                    const startOffset = ((displayStartH - START_HOUR) * 2) + (displayStartM >= 30 ? 1 : 0);
                    
                    // Calculate duration in minutes, capped at end of day
                    const totalMins = differenceInMinutes(end, start);
                    const durationBlocks = Math.ceil(totalMins / 30);

                    // Grid column index starts at 1, but we have 1 column for labels, so data starts at 2
                    const gridColStart = startOffset + 2; 

                    return (
                      <div
                        key={apt.id}
                        className="absolute mt-2 rounded-lg bg-primary/10 border border-primary/20 p-2 shadow-sm hover-elevate cursor-default group/block z-10 flex flex-col justify-center overflow-hidden"
                        style={{
                          // Row height is ~80px (h-20), label column is 120px
                          // Top position is calculated based on row index + header height
                          top: `${(roomIdx + 1) * 80 + 20}px`, 
                          // Left is 120px + (offset * columnWidth)
                          left: `calc(120px + (${startOffset} * (100% - 120px) / ${TIMELINE_COLS}))`,
                          width: `calc(${durationBlocks} * (100% - 120px) / ${TIMELINE_COLS})`,
                          height: '60px',
                        }}
                      >
                        <div className="w-full h-full flex flex-col justify-center border-l-4 border-l-primary pl-2">
                          <p className="text-[11px] font-bold text-foreground truncate leading-tight">{apt.userName}</p>
                          <p className="text-[9px] text-muted-foreground truncate leading-tight">
                            {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
                          </p>
                        </div>
                        
                        {/* Tooltip on hover */}
                        <div className="absolute hidden group-hover/block:flex flex-col bottom-full left-0 mb-2 w-64 bg-foreground text-background p-3 rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
                          <p className="font-bold text-sm mb-1">{apt.userName}</p>
                          <p className="text-xs opacity-90">{apt.userEmail}</p>
                          <div className="h-px bg-background/20 my-2" />
                          <p className="text-xs">Room: <span className="font-semibold">{apt.room}</span></p>
                          <p className="text-xs">Time: <span className="font-semibold">{format(start, 'h:mm a')} - {format(end, 'h:mm a')}</span></p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-12 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <CalendarIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-display font-semibold mb-2">No Appointments</h3>
        <p className="text-muted-foreground">There are no bookings for the selected date.</p>
      </div>
    );
  }

  // Sort by start time
  const sorted = [...appointments].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Time</TableHead>
            <TableHead className="font-semibold">Room</TableHead>
            <TableHead className="font-semibold">Client Name</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold text-right">Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((apt) => {
            const start = new Date(apt.startTime);
            const end = new Date(apt.endTime);
            const durationMins = differenceInMinutes(end, start);
            const durationText = durationMins >= 60 
              ? `${Math.floor(durationMins / 60)}h ${durationMins % 60 > 0 ? `${durationMins % 60}m` : ''}`
              : `${durationMins}m`;

            return (
              <TableRow key={apt.id} className="group hover:bg-secondary/50 transition-colors">
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{format(start, 'h:mm a')}</span>
                    <span className="text-xs text-muted-foreground">to {format(end, 'h:mm a')}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                    {apt.room}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{apt.userName}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{apt.userEmail}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">
                  {durationText}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
