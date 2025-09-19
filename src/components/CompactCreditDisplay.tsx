import React from 'react';
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCreditContext } from "@/contexts/CreditContext";

export const CompactCreditDisplay: React.FC = () => {
  const navigate = useNavigate();
  const { credits, plan, loading, isUnlimited } = useCreditContext();

  if (loading || !credits || !plan) {
    return null;
  }

  const totalCredits = isUnlimited ? 'neomejeno' : plan.ai_credits_monthly;
  const remaining = isUnlimited ? 'neomejeno' : credits.credits_remaining;

  return (
    <div className="flex items-center gap-3">
      <div className="text-sm">
        <span className="text-primary font-medium">{plan.name}</span>
        <span className="text-muted-foreground"> - {remaining}/{totalCredits} na voljo</span>
      </div>
      {!isUnlimited && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate('/pricing')}
          className="h-8 px-3 text-xs"
        >
          Nadgradi
        </Button>
      )}
    </div>
  );
};