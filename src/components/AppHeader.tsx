import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CompactCreditDisplay } from "@/components/CompactCreditDisplay";
import { Menu, X, ChevronLeft, User, CreditCard, BarChart3, Settings, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppHeaderProps {
  showBackButton?: boolean;
  title?: string;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ showBackButton, title, subtitle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActiveRoute = (path: string) => location.pathname === path;

  const navigationItems = [
    { path: '/dashboard', label: 'Nadzorna plošča', icon: BarChart3 },
    { path: '/pricing', label: 'Naročnine', icon: CreditCard },
    { path: '/account', label: 'Račun', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-gradient-to-r from-background/95 via-background/98 to-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left Section: Logo + Optional Back Button */}
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-accent/50 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 group transition-transform hover:scale-105"
            >
              <div className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                🌙
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all">
                  Lovilec Sanj
                </span>
                {title && (
                  <span className="text-xs text-muted-foreground">{title}</span>
                )}
              </div>
            </button>
          </div>

          {/* Right Section: Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4">
            <nav className="flex items-center gap-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => navigate(item.path)}
                    className={`gap-2 transition-all ${
                      isActive 
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <CompactCreditDisplay />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 hover:bg-accent/50">
                  <User className="h-4 w-4" />
                  <span className="max-w-[150px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-xl border-border/50">
                <DropdownMenuItem onClick={() => navigate('/account')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Nastavitve računa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Odjava
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="hover:bg-accent/50"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border/40 py-4 animate-fade-in">
            <nav className="flex flex-col gap-2 mb-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    className={`w-full justify-start gap-2 ${
                      isActive ? 'bg-primary/10 text-primary' : ''
                    }`}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                );
              })}
            </nav>

            <div className="flex flex-col gap-3 pt-3 border-t border-border/40">
              <CompactCreditDisplay />
              
              <div className="flex items-center justify-between px-3 py-2 rounded-md bg-accent/20">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {user?.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Optional Subtitle Bar */}
      {subtitle && (
        <div className="border-t border-border/40 bg-accent/5">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      )}
    </header>
  );
};
