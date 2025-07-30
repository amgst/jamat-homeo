import { Stethoscope } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <div className="rounded-lg bg-accent p-1.5 text-accent-foreground">
        <Stethoscope className="h-5 w-5" />
      </div>
      <h1 className="text-xl font-bold font-headline">MediTrack Lite</h1>
    </div>
  );
}
