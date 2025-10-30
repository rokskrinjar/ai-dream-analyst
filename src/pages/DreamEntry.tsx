import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Calendar, Heart, Tag, Mic, Square, Loader2 } from 'lucide-react';
import { EmotionWheel } from '@/components/EmotionWheel';
import { z } from 'zod';
import { AppHeader } from "@/components/AppHeader";

const dreamSchema = z.object({
  title: z.string()
    .trim()
    .min(3, 'Naslov mora vsebovati vsaj 3 znake')
    .max(200, 'Naslov ne sme presegati 200 znakov'),
  content: z.string()
    .trim()
    .min(10, 'Vsebina mora vsebovati vsaj 10 znakov')
    .max(5000, 'Vsebina ne sme presegati 5000 znakov za optimalno AI analizo'),
  tags: z.string()
    .max(200, 'Oznake ne smejo presegati 200 znakov')
    .refine(
      (tags) => {
        if (!tags) return true;
        const tagArray = tags.split(',').map(t => t.trim());
        return tagArray.length <= 10;
      },
      'Maksimalno 10 oznak dovoljeno'
    )
    .optional(),
  primary_emotion: z.string().max(50).optional(),
  secondary_emotion: z.string().max(50).optional(),
  dream_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Neveljaven format datuma')
});

const DreamEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    dream_date: new Date().toISOString().split('T')[0],
    primary_emotion: '',
    secondary_emotion: '',
    tags: '',
  });

  const handleEmotionSelect = (primary: string, secondary: string) => {
    setFormData(prev => ({
      ...prev,
      primary_emotion: primary,
      secondary_emotion: secondary
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Snemanje začeto",
        description: "Govorite jasno in počasi za najboljše rezultate.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Napaka pri snemanju",
        description: "Preverite dovoljenja za mikrofon in poskusite znova.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      const base64Audio = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data:audio/webm;base64, prefix
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
      });

      console.log('Sending audio for transcription...');

      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });

      if (error) throw error;

      if (data?.text) {
        // Append transcribed text to existing content
        const transcribedText = data.text.trim();
        const separator = formData.content ? '\n\n' : '';
        
        handleInputChange('content', formData.content + separator + transcribedText);
        
        toast({
          title: "Transkripcija uspešna!",
          description: "Besedilo je bilo dodano v opis sanje. Prosim preverite in uredite po potrebi.",
        });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Napaka pri transkripciji",
        description: "Poskusite znova ali vnesite besedilo ročno.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
      setRecordingTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Napaka",
        description: "Niste prijavljeni.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Validate input with zod schema
      const validated = dreamSchema.parse({
        title: formData.title,
        content: formData.content,
        tags: formData.tags,
        primary_emotion: formData.primary_emotion,
        secondary_emotion: formData.secondary_emotion,
        dream_date: formData.dream_date
      });

      const tagsArray = validated.tags 
        ? validated.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      const { error } = await supabase
        .from('dreams')
        .insert({
          title: validated.title,
          content: validated.content,
          dream_date: validated.dream_date,
          primary_emotion: validated.primary_emotion || null,
          secondary_emotion: validated.secondary_emotion || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Uspešno shranjeno!",
        description: "Vaša sanja je bila dodana v dnevnik.",
      });

      navigate('/dashboard');
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Neveljavni podatki",
          description: err.issues[0].message,
          variant: "destructive",
        });
        return;
      }
      
      console.error('Error saving dream:', err);
      toast({
        title: "Napaka",
        description: "Napaka pri shranjevanju sanje.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBackButton title="Nova sanja" subtitle="Zabeležite svojo sanjsko izkušnjo" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Save className="h-5 w-5 mr-2" />
              Beleženje sanje
            </CardTitle>
            <CardDescription>
              Opišite svojo sanje čim bolj podrobno. Več podrobnosti pomeni boljšo analizo.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground font-medium">
                  Naslov sanje *
                </Label>
                <Input
                  id="title"
                  placeholder="Kratko povzemite svojo sanje..."
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {formData.title.length}/200 znakov
                </p>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="dream_date" className="text-foreground font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Datum sanje
                </Label>
                <Input
                  id="dream_date"
                  type="date"
                  value={formData.dream_date}
                  onChange={(e) => handleInputChange('dream_date', e.target.value)}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="content" className="text-foreground font-medium">
                    Opis sanje *
                  </Label>
                  
                  {/* Voice Recording Button */}
                  <div className="flex items-center gap-2">
                    {isRecording && (
                      <span className="text-sm text-muted-foreground">
                        {formatTime(recordingTime)}
                      </span>
                    )}
                    
                    {isTranscribing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled
                      >
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Transkribiram...
                      </Button>
                    ) : isRecording ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={stopRecording}
                      >
                        <Square className="h-4 w-4 mr-2 fill-current" />
                        Ustavi
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={startRecording}
                      >
                        <Mic className="h-4 w-4 mr-2" />
                        Posnemi
                      </Button>
                    )}
                  </div>
                </div>
                
                <Textarea
                  id="content"
                  placeholder="Opišite svojo sanje s čim več podrobnostmi... Kje ste bili? Kdo je bil z vami? Kaj se je dogajalo? Kako ste se počutili?"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  maxLength={5000}
                  rows={8}
                  required
                  disabled={isTranscribing}
                  className={isTranscribing ? 'opacity-50' : ''}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Min. 10 znakov</span>
                  <span className={formData.content.length > 5000 ? 'text-destructive' : ''}>
                    {formData.content.length}/5000
                  </span>
                </div>
              </div>

              {/* Emotions */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium flex items-center">
                  <Heart className="h-4 w-4 mr-2" />
                  Čustva v sanje
                </Label>
                <EmotionWheel
                  onEmotionSelect={handleEmotionSelect}
                  selectedPrimary={formData.primary_emotion}
                  selectedSecondary={formData.secondary_emotion}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-foreground font-medium flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Ključne besede
                </Label>
                <Input
                  id="tags"
                  placeholder="voda, letenje, družina, hiša... (ločite z vejico)"
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Vnesite ključne besede, ki najbolje opisujejo vašo sanje (ločite z vejico)
                </p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Prekliči
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.title || !formData.content}
                  className="flex-1"
                >
                  {isLoading ? "Shranjujem..." : "Shrani sanje"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tips Card */}
        <Card className="border-border/50 mt-6 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">💡 Nasveti za boljše beleženje</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Beležite sanje takoj po prebujanju, ko so še sveže v spominu</p>
            <p>• Opišite čustva in občutke, ne samo dogodke</p>
            <p>• Pozornost namenite detajlem - barve, zvoki, vonji</p>
            <p>• Ne skrbite za logičnost - sanje imajo svojo logiko</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DreamEntry;