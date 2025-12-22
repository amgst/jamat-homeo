"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { LogOut, Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "ڈیش بورڈ", href: "/dashboard" },
    { label: "مریض", href: "/patients" },
    { label: "کیمپ", href: "/camp" },
    { label: "ڈاکٹر", href: "/doctor" },
    { label: "ادویات", href: "/medicines" },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleNavClick = (href: string) => {
    router.push(href);
    setMobileMenuOpen(false);
  };

  return (
    <header className="border-b bg-card/50 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex justify-between items-center">
          {/* Logo and Desktop Nav */}
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <div className="cursor-pointer" onClick={() => router.push("/")}> 
              <Logo />
            </div>
            {/* Desktop Navigation - Hidden on mobile */}
            <nav className="hidden md:flex gap-2">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  onClick={() => router.push(item.href)}
                  className="text-sm"
                >
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>

          {/* Right side: Mobile Menu Button and Logout */}
          <div className="flex items-center gap-2">
            {/* Logout Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              className="h-9 w-9 md:h-10 md:w-10"
            >
              <LogOut className="h-4 w-4 md:h-5 md:w-5" />
            </Button>

            {/* Mobile Menu Sheet */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="md:hidden h-9 w-9"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]" dir="rtl">
                <SheetHeader>
                  <SheetTitle>مینو</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-2 mt-6">
                  {navItems.map((item) => (
                    <SheetClose key={item.href} asChild>
                      <Button
                        variant={isActive(item.href) ? "secondary" : "ghost"}
                        onClick={() => handleNavClick(item.href)}
                        className="w-full justify-start text-base py-6"
                      >
                        {item.label}
                      </Button>
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}