import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Dream pattern analysis function called');

    const { dreams, analyses } = await req.json();

    if (!dreams || !analyses || dreams.length === 0 || analyses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No dreams or analyses provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Analyzing ${dreams.length} dreams with ${analyses.length} analyses`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Prepare dream data for analysis
    const dreamData = dreams.map((dream: any) => {
      const analysis = analyses.find((a: any) => a.dream_id === dream.id);
      return {
        title: dream.title,
        content: dream.content.substring(0, 200), // Limit content length
        mood: dream.mood,
        dream_date: dream.dream_date,
        themes: analysis?.themes || [],
        emotions: analysis?.emotions || [],
        symbols: analysis?.symbols || [],
        analysis_summary: analysis?.analysis_text ? analysis.analysis_text.substring(0, 300) : null
      };
    });

    const prompt = `Analizirajte naslednje podatke o sanjah uporabnika in ustvarite celovito analizo vzorcev. Odzovite se v JSON formatu s slovenskimi besedami in besedili.

PODATKI O SANJAH:
${JSON.stringify(dreamData, null, 2)}

Ustvarite podrobno analizo, ki vključuje:

1. OVERALL_INSIGHTS: Celovit pregled vzorcev (3-4 stavki o glavnih odkritjih)

2. THEME_PATTERNS: Seznam najpogostejših tem z:
   - theme: ime teme
   - frequency: število pojavitev
   - significance: kratek opis pomena (1-2 stavka)

3. EMOTIONAL_JOURNEY: Čustveni vzorci z:
   - emotion: ime čustva
   - frequency: število pojavitev  
   - trend: opis trenda (naraščajoč, padajoč, stalen)

4. SYMBOL_MEANINGS: Simboli in interpretacije z:
   - symbol: ime simbola
   - frequency: število pojavitev
   - interpretation: psihološka interpretacija (2-3 stavki)

5. TEMPORAL_PATTERNS: Opis časovnih vzorcev (2-3 stavki o tem, kako se sanje spreminjajo skozi čas)

6. RECOMMENDATIONS: Seznam 3-5 priporočil za uporabnika (vsako 1-2 stavka)

7. PERSONAL_GROWTH: Analiza osebne rasti na podlagi sanj (3-4 stavki o tem, kaj sanje razkrivajo o razvoju)

Odgovor mora biti strukturiran JSON s slovenskim besedilom. Bodite psihološko natančni in empatični.`;

    console.log('Sending request to OpenAI for pattern analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional dream analyst and psychologist specialized in pattern recognition and psychological interpretation of dreams. Always respond in Slovenian language with JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response received for pattern analysis');

    let analysisContent = data.choices[0].message.content.trim();

    // Clean up the response to extract JSON
    if (analysisContent.startsWith('```json')) {
      analysisContent = analysisContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (analysisContent.startsWith('```')) {
      analysisContent = analysisContent.replace(/```\s*/, '').replace(/```\s*$/, '');
    }

    console.log('Pattern analysis content:', analysisContent);

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      // Fallback: create a simple analysis
      parsedAnalysis = {
        overall_insights: "Analizirali smo vaše sanje in odkrili zanimive vzorce. Za podrobnejšo analizo potrebujemo več podatkov.",
        theme_patterns: [],
        emotional_journey: [],
        symbol_meanings: [],
        temporal_patterns: "Časovni vzorci bodo vidni z več zabeleženih sanj.",
        recommendations: ["Beležite sanje redno", "Poskusite prepoznati ponavljajoče se elemente"],
        personal_growth: "Vaše sanje so okno v podzavest in lahko razkrijejo pomembne vidike osebnega razvoja."
      };
    }

    return new Response(
      JSON.stringify({ analysis: parsedAnalysis }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in pattern analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});