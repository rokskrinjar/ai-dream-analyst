import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

interface EmotionWheelProps {
  onEmotionSelect: (primary: string, secondary: string) => void;
  selectedPrimary?: string;
  selectedSecondary?: string;
}

const emotionData = {
  Veselje: [
    'Radosten', 'Zadovoljen', 'Zainteresiran', 'Ponosen', 'Sprejet', 
    'Mocen', 'Optimističen', 'Energičen', 'Vesoljuden', 'Uspešen'
  ],
  Zaupanje: [
    'Samozavesten', 'Spoštovan', 'Cenjen', 'Pogumen', 'Svoboden', 
    'Miren', 'Zaskrbljen', 'Ljubeč', 'Hvaležen', 'Navdušen'
  ],
  Strah: [
    'Prestrašen', 'Presenečen', 'Zmeden', 'Oddaljen', 'Kritičen', 
    'Napet', 'Otopel', 'Odsoten', 'Skeptičen', 'Omejovan'
  ],
  Presenečenje: [
    'Osupel', 'Začuden', 'Razburjen', 'Razočaran', 'Delžen poslednjanja', 
    'Predrzen', 'Navdušen', 'Zmeden', 'Presenečen'
  ],
  Žalost: [
    'Žalosten', 'Objokaval', 'Potrten', 'Razočaran', 'Besen', 
    'Nesrečen', 'Nostalgičen', 'Melanholic', 'Osamlinen'
  ],
  Gnus: [
    'Zoprn', 'Sovražen', 'Kritičen', 'Odsoten', 'Ogaben', 
    'Razdražen', 'Nezadovoljen', 'Prezirljiv'
  ],
  Jeza: [
    'Jezen', 'Frustriran', 'Agresiven', 'Razdražen', 'Razjarjen', 
    'Sovražen', 'Ljubosumen', 'Izzvan', 'Zamižav'
  ]
};

const emotionColors = {
  Veselje: 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border-yellow-300',
  Zaupanje: 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300',
  Strah: 'bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300',
  Presenečenje: 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300',
  Žalost: 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300',
  Gnus: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300',
  Jeza: 'bg-red-100 hover:bg-red-200 text-red-800 border-red-300'
};

export const EmotionWheel = ({ onEmotionSelect, selectedPrimary, selectedSecondary }: EmotionWheelProps) => {
  const [currentStep, setCurrentStep] = useState<'primary' | 'secondary'>('primary');
  const [tempPrimary, setTempPrimary] = useState<string>('');

  const handlePrimarySelect = (emotion: string) => {
    setTempPrimary(emotion);
    setCurrentStep('secondary');
  };

  const handleSecondarySelect = (secondary: string) => {
    onEmotionSelect(tempPrimary, secondary);
    setCurrentStep('primary');
    setTempPrimary('');
  };

  const handleBack = () => {
    setCurrentStep('primary');
    setTempPrimary('');
  };

  const resetSelection = () => {
    onEmotionSelect('', '');
    setCurrentStep('primary');
    setTempPrimary('');
  };

  if (selectedPrimary && selectedSecondary) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="text-center space-y-4">
            <div className="text-sm text-muted-foreground">Izbrane čustva:</div>
            <div className="space-y-2">
              <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${emotionColors[selectedPrimary as keyof typeof emotionColors]}`}>
                {selectedPrimary}
              </div>
              <div className="text-lg font-medium text-foreground">
                {selectedSecondary}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetSelection}>
              Spremeni
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        {currentStep === 'primary' ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Korak 1: Izberite glavno čustvo
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(emotionData).map((emotion) => (
                <Button
                  key={emotion}
                  variant="outline"
                  className={`h-auto py-3 text-sm font-medium transition-colors ${emotionColors[emotion as keyof typeof emotionColors]}`}
                  onClick={() => handlePrimarySelect(emotion)}
                >
                  {emotion}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="p-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center text-sm text-muted-foreground flex-1">
                Korak 2: Izberite specifično čustvo za "{tempPrimary}"
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {emotionData[tempPrimary as keyof typeof emotionData]?.map((secondary) => (
                <Button
                  key={secondary}
                  variant="outline"
                  size="sm"
                  className={`text-xs py-2 transition-colors ${emotionColors[tempPrimary as keyof typeof emotionColors]}`}
                  onClick={() => handleSecondarySelect(secondary)}
                >
                  {secondary}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};