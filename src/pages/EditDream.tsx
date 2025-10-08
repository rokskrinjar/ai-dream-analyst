import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useCreditContext } from '@/contexts/CreditContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Save, Calendar, Heart, Tag, Sparkles, Brain } from 'lucide-react';
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

const EditDream = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { credits } = useCreditContext();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showReanalyzeDialog, setShowReanalyzeDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    dream_date: new Date().toISOString().split('T')[0],
    primary_emotion: '',
    secondary_emotion: '',
    tags: '',
  });

  useEffect(() => {
    if (!id || !user) {
      navigate('/dashboard');
      return;
    }

    const fetchDream = async () => {
      try {
        const { data, error } = await supabase
          .from('dreams')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            title: data.title,
            content: data.content,
            dream_date: data.dream_date,
            primary_emotion: data.primary_emotion || '',
            secondary_emotion: data.secondary_emotion || '',
            tags: data.tags ? data.tags.join(', ') : '',
          });
        }
      } catch (err) {
        console.error('Error fetching dream:', err);
        toast({
          title: "Napaka",
          description: "Napaka pri nalaganju sanje.",
          variant: "destructive",
        });
        navigate('/dashboard');
      } finally {
        setIsFetching(false);
      }
    };

    fetchDream();
  }, [id, user, navigate, toast]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !id) {
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
        .update({
          title: validated.title,
          content: validated.content,
          dream_date: validated.dream_date,
          primary_emotion: validated.primary_emotion || null,
          secondary_emotion: validated.secondary_emotion || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Delete the old analysis so it can be re-analyzed with updated content
      const { error: deleteAnalysisError } = await supabase
        .from('dream_analyses')
        .delete()
        .eq('dream_id', id);

      if (deleteAnalysisError) {
        console.warn('Failed to delete old analysis:', deleteAnalysisError);
        // Don't throw - continue anyway
      }

      toast({
        title: "Uspešno posodobljeno!",
        description: "Vaša sanja je bila posodobljena.",
      });

      // Show re-analyze dialog
      setShowReanalyzeDialog(true);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Neveljavni podatki",
          description: err.issues[0].message,
          variant: "destructive",
        });
        return;
      }
      
      console.error('Error updating dream:', err);
      toast({
        title: "Napaka",
        description: "Napaka pri posodabljanju sanje.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReanalyze = async () => {
    setShowReanalyzeDialog(false);
    
    // Navigate to dashboard with a flag to trigger analysis
    navigate('/dashboard', { state: { analyzeId: id } });
  };

  if (isFetching) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-primary" />
          <p className="text-muted-foreground">Nalaganje sanje...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader showBackButton title="Uredi sanje" subtitle="Posodobite svojo sanjsko izkušnjo" />

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Save className="h-5 w-5 mr-2" />
              Urejanje sanje
            </CardTitle>
            <CardDescription>
              Posodobite svojo sanje in izberite, ali jo želite ponovno analizirati.
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
                <Label htmlFor="content" className="text-foreground font-medium">
                  Opis sanje *
                </Label>
                <Textarea
                  id="content"
                  placeholder="Opišite svojo sanje s čim več podrobnostmi..."
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  maxLength={5000}
                  rows={8}
                  required
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
                  {isLoading ? "Shranjujem..." : "Posodobi sanje"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Re-analyze Dialog */}
      <AlertDialog open={showReanalyzeDialog} onOpenChange={setShowReanalyzeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-primary" />
              Sanja posodobljena!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Vaša sanja je bila uspešno posodobljena.</p>
              <p className="font-medium">
                Želite ponovno analizirati sanje z AI? (1 kredit)
              </p>
              <p className="text-xs">
                Trenutno stanje kreditov: {credits?.credits_remaining || 0}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => navigate('/dashboard')}>
              Morda kasneje
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReanalyze}
              disabled={(credits?.credits_remaining || 0) < 1}
              className="bg-primary"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Ponovno analiziraj
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EditDream;
