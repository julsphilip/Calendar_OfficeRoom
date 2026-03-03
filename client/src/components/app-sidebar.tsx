import { CalendarPlus, LayoutDashboard, Building2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Book a Room", url: "/", icon: CalendarPlus },
  { title: "Staff Dashboard", url: "/staff", icon: LayoutDashboard },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-3 text-primary">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-display leading-tight text-foreground">Nexus</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Workspaces</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-6 mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-4 space-y-1">
              {items.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        w-full rounded-xl px-4 py-3 transition-all duration-200
                        ${isActive 
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 hover:text-primary-foreground' 
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        }
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
