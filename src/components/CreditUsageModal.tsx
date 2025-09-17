import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Zap } from "lucide-react";

interface CreditUsageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  creditsRequired: number;
  creditsRemaining: number;
  actionName: string;
  actionDescription: string;
}

export function CreditUsageModal({
  open,
  onOpenChange,
  onConfirm,
  creditsRequired,
  creditsRemaining,
  actionName,
  actionDescription
}: CreditUsageModalProps) {
  const hasEnoughCredits = creditsRemaining >= creditsRequired;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Coins className="w-5 h-5 text-primary" />
            <span>Poraba kreditov</span>
          </DialogTitle>
          <DialogDescription>
            {actionDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="font-medium text-foreground">{actionName}</p>
              <p className="text-sm text-muted-foreground">Stroški analize</p>
            </div>
            <Badge variant="secondary" className="text-lg">
              {creditsRequired} kredit{creditsRequired > 1 ? 'ov' : ''}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Preostali krediti:</span>
            <span className={hasEnoughCredits ? "text-foreground" : "text-destructive font-medium"}>
              {creditsRemaining}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm font-medium">
            <span className="text-foreground">Po analizi:</span>
            <span className={hasEnoughCredits ? "text-foreground" : "text-destructive"}>
              {hasEnoughCredits ? creditsRemaining - creditsRequired : 'Ni dovolj kreditov'}
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2">
          {hasEnoughCredits ? (
            <div className="flex space-x-2 w-full">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Prekliči
              </Button>
              <Button onClick={onConfirm} className="flex-1">
                <Zap className="w-4 h-4 mr-2" />
                Analiziraj
              </Button>
            </div>
          ) : (
            <div className="w-full space-y-2">
              <p className="text-sm text-destructive text-center">
                Nimate dovolj kreditov za to analizo
              </p>
              <Button onClick={() => onOpenChange(false)} className="w-full">
                Nadgradi načrt
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}