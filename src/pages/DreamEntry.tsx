import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Calendar, Heart, Tag } from 'lucide-react';

const DreamEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    dream_date: new Date().toISOString().split('T')[0],
    mood: '',
    tags: '',
  });

  const moods = [
    'Mirno',
    'Sanjavo',
    'Vznemirjeno',
    'Strah',
    'Veselje',
    'Žalost',
    'Zmedenost',
    'Nostalgija',
    'Energično',
    'Miren'
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.content) {
      toast({
        title: "Napaka",
        description: "Prosimo, vnesite naslov in opis sanje.",
        variant: "destructive",
      });
      return;
    }

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
      const tagsArray = formData.tags 
        ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

      const { error } = await supabase
        .from('dreams')
        .insert({
          title: formData.title,
          content: formData.content,
          dream_date: formData.dream_date,
          mood: formData.mood || null,
          tags: tagsArray.length > 0 ? tagsArray : null,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Uspešno shranjeno!",
        description: "Vaša sanja je bila dodana v dnevnik.",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving dream:', error);
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
      {/* Header */}
      <header className="border-b border-border/30 bg-card/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Nazaj na nadzorno ploščo
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Nova sanja</h1>
          </div>
        </div>
      </header>

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
                  required
                />
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
                  placeholder="Opišite svojo sanje s čim več podrobnostmi... Kje ste bili? Kdo je bil z vami? Kaj se je dogajalo? Kako ste se počutili?"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  rows={8}
                  required
                />
              </div>

              {/* Mood */}
              <div className="space-y-2">
                <Label className="text-foreground font-medium flex items-center">
                  <Heart className="h-4 w-4 mr-2" />
                  Razpoloženje
                </Label>
                <Select onValueChange={(value) => handleInputChange('mood', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kako ste se počutili v sanje?" />
                  </SelectTrigger>
                  <SelectContent>
                    {moods.map((mood) => (
                      <SelectItem key={mood} value={mood}>
                        {mood}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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