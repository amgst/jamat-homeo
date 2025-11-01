"use client";

import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth";
import { LogOut } from "lucide-react";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

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

  return (
    <header className="border-b bg-card/50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="cursor-pointer" onClick={() => router.push("/")}> 
            <Logo />
          </div>
          <nav className="flex gap-2">
            {navItems.map((item) => (
              <Button
                key={item.href}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                onClick={() => router.push(item.href)}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}