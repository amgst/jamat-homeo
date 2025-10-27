"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Stethoscope } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground">
        <div className="mb-4 rounded-full bg-accent/10 p-4 text-accent">
            <Stethoscope className="h-16 w-16 animate-pulse"/>
        </div>
        <h2 className="text-2xl font-headline text-foreground">لوڈ ہو رہا ہے...</h2>
        <p className="max-w-md text-muted-foreground">آپ کو درست مقام پر لے جایا جا رہا ہے۔</p>
    </div>
  );
}
