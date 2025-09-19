import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Webhook, CheckCircle2, AlertCircle } from "lucide-react";

interface WebhookSetupNoticeProps {
  isAdmin?: boolean;
}

export const WebhookSetupNotice: React.FC<WebhookSetupNoticeProps> = ({ isAdmin = false }) => {
  const webhookUrl = "https://zdngnqkjjxzfnnxcolyz.supabase.co/functions/v1/stripe-webhook";

  if (!isAdmin) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          Vaša naročnina je aktivna! Stripe webhook je nastavljen za samodejno sinhronizacijo.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Nastavitev Stripe Webhook
          <Badge variant="outline" className="bg-orange-100">
            Potrebno
          </Badge>
        </CardTitle>
        <CardDescription>
          Za popolno sinhronizacijo naročnin morate nastaviti webhook v Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Brez webhook-a se naročnine ne bodo samodejno sinhroniziralo z vašo aplikacijo.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold">Nastavitve:</h4>
          <div className="bg-white p-3 rounded border">
            <p className="text-sm font-medium mb-1">Webhook URL:</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">
              {webhookUrl}
            </code>
          </div>
          
          <div className="bg-white p-3 rounded border">
            <p className="text-sm font-medium mb-2">Izbrani dogodki:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• customer.subscription.created</li>
              <li>• customer.subscription.updated</li>
              <li>• customer.subscription.deleted</li>
              <li>• invoice.payment_succeeded</li>
            </ul>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open('https://dashboard.stripe.com/webhooks', '_blank')}
          className="w-full"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Odpri Stripe Dashboard
        </Button>
      </CardContent>
    </Card>
  );
};