import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

import NotFound from "@/pages/not-found";
import BookingPage from "@/pages/booking-page";
import StaffDashboard from "@/pages/staff-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={BookingPage} />
      <Route path="/staff" component={StaffDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style}>
          <div className="flex h-screen w-full overflow-hidden bg-background">
            <AppSidebar />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
              {/* Mobile Sidebar Trigger - Hidden on desktop by Sidebar component defaults but useful for tight layouts */}
              <div className="md:hidden absolute top-4 left-4 z-50">
                <SidebarTrigger className="bg-background/80 backdrop-blur-sm border shadow-sm rounded-lg" />
              </div>
              
              <main className="flex-1 w-full h-full flex flex-col overflow-hidden">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
