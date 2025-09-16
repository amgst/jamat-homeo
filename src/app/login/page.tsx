"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/auth';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPin = e.target.value;
    setError('');
    // Only allow numbers and limit to 4 digits
    if (/^[0-9]*$/.test(newPin) && newPin.length <= 4) {
      setPin(newPin);
      if (newPin.length === 4) {
        handleSubmit(newPin);
      }
    }
  };

  const handleSubmit = async (finalPin: string) => {
    setIsLoading(true);
    setError('');
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (login(finalPin)) {
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.replace('/dashboard');
    } else {
      setError('Invalid PIN. Please try again.');
      setPin('');
      toast({
        variant: 'destructive',
        title: "Login Failed",
        description: "The PIN you entered is incorrect.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-background">
      <div className="mb-8 cursor-pointer" onClick={() => router.push('/')}>
        <Logo />
      </div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Enter PIN</CardTitle>
          <CardDescription>Enter your 4-digit PIN to access the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(pin); }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Input
                  id="pin"
                  type="password" // Use password type to hide PIN
                  value={pin}
                  onChange={handlePinChange}
                  maxLength={4}
                  placeholder="****"
                  // For mobile numeric keyboard
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="text-center text-2xl tracking-[1em] h-14"
                  disabled={isLoading}
                  autoFocus
                />
                 {error && <p className="text-sm font-medium text-destructive text-center pt-2">{error}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || pin.length < 4}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Unlock
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
