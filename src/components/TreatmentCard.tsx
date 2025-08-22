import type { Treatment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Trash2 } from 'lucide-react';
import { EditTreatmentDialog } from './EditTreatmentDialog';

type TreatmentCardProps = {
  treatment: Treatment;
  onUpdateTreatment?: (treatment: Treatment) => void;
  onDeleteTreatment?: (treatmentId: string) => void;
};

export function TreatmentCard({ treatment, onUpdateTreatment, onDeleteTreatment }: TreatmentCardProps) {
  const displayDate = new Date(treatment.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC', // Treat date string as UTC
  });

  return (
    <Card className="bg-background/50">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-semibold">Treatment Record</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground shrink-0 ml-4">
                <div className="flex items-center gap-2">
                    {onUpdateTreatment && (
                        <EditTreatmentDialog 
                            treatment={treatment} 
                            onUpdateTreatment={onUpdateTreatment} 
                        />
                    )}
                    {onDeleteTreatment && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteTreatment(treatment.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{displayDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    <span>{treatment.time}</span>
                </div>
            </div>
        </div>
        {treatment.remedy && (
            <CardDescription className="flex items-center gap-2 pt-1">
                <span className="font-semibold text-foreground">Remedy:</span>
                <span className="font-medium text-foreground">{treatment.remedy}</span>
            </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap">{treatment.observations}</p>
      </CardContent>
    </Card>
  );
}
