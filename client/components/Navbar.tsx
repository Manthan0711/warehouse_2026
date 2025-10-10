import { Link, useLocation } from "react-router-dom";
import { Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

export function Navbar() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const { isProfessional } = useTheme();

  const navItems = [
    { name: "Find Warehouses", path: "/warehouses" },
    { name: "ML Recommendations", path: "/ml-recommendations" },
    { name: "List Your Property", path: "/list-property" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <header className={cn(
      "border-b sticky top-0 z-50",
      isProfessional 
        ? "navbar-professional border-blue-900/10" 
        : "dark:border-gray-800 bg-background/95 backdrop-blur-sm"
    )}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link to="/" className="flex items-center space-x-2">
            <div className="relative">
              <Building2 className={cn(
                "h-8 w-8",
                isProfessional 
                  ? "text-blue-400 glow-blue" 
                  : "text-blue-600 dark:text-blue-400"
              )} />
              {isProfessional && (
                <Sparkles className="h-3 w-3 text-blue-300 absolute -top-1 -right-1 animate-pulse-soft" />
              )}
            </div>
            <span className={cn(
              "font-bold text-xl",
              isProfessional 
                ? "text-gradient-blue" 
                : "text-foreground"
            )}>
              SmartWarehouse
            </span>
          </Link>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={cn(
                "font-medium transition-colors",
                isProfessional 
                  ? "text-slate-400 hover:text-blue-400" 
                  : "text-muted-foreground hover:text-foreground",
                pathname === item.path && (
                  isProfessional 
                    ? "text-blue-400 font-semibold" 
                    : "text-foreground font-semibold"
                )
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          <ThemeToggle />
          
          {user ? (
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <div className="hidden sm:block">
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.email?.includes('admin') ? 'System Administrator' : 'Storage Seeker'}
                </p>
              </div>
              <Button 
                variant="ghost" 
                asChild
                className={isProfessional ? "text-slate-300 hover:text-blue-400" : ""}
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => signOut()}
                className={isProfessional ? "btn-professional-outline" : ""}
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                asChild
                className={isProfessional ? "text-slate-300 hover:text-blue-400" : ""}
              >
                <Link to="/login">Sign In</Link>
              </Button>
              <Button 
                asChild
                className={isProfessional ? "btn-professional-gradient" : ""}
              >
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
