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

    const { dreams, analyses, forceRefresh } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    const token = authHeader?.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User authenticated:', user.id);

    // First, reset credits if needed (handles monthly reset)
    const { error: resetError } = await supabase
      .rpc('reset_credits_if_needed', { user_id: user.id });

    if (resetError) {
      console.error('Error resetting credits:', resetError);
      // Continue anyway, as this might not be critical
    }

    // Check if user has sufficient credits (2 credits needed for pattern analysis)
    const { data: canUseCredits, error: creditError } = await supabase
      .rpc('can_use_credits', { user_id: user.id, credits_needed: 2 });

    if (creditError) {
      console.error('Error checking credits:', creditError);
      throw new Error('Failed to check user credits');
    }

    if (!canUseCredits && !forceRefresh) {
      console.log('User has insufficient credits for pattern analysis:', user.id);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Insufficient credits for pattern analysis (2 credits required). Please upgrade your plan.',
        errorCode: 'INSUFFICIENT_CREDITS'
      }), {
        status: 402, // Payment Required
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!dreams || !analyses || dreams.length === 0 || analyses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No dreams or analyses provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check for cached analysis unless force refresh is requested
    if (!forceRefresh) {
      const latestDreamDate = Math.max(...dreams.map((d: any) => new Date(d.dream_date).getTime()));
      const { data: cachedAnalysis } = await supabase
        .from('pattern_analyses')
        .select('*')
        .eq('user_id', user.id)
        .eq('dreams_count', dreams.length)
        .gte('last_dream_date', new Date(latestDreamDate).toISOString().split('T')[0])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (cachedAnalysis) {
        console.log('Returning cached pattern analysis');
        return new Response(
          JSON.stringify({ analysis: cachedAnalysis.analysis_data, cached: true }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
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

1. overall_insights: Celovit pregled vzorcev (3-4 stavki o glavnih odkritjih)

2. theme_patterns: Seznam najpogostejših tem z:
   - theme: ime teme
   - frequency: število pojavitev
   - significance: kratek opis pomena (1-2 stavka)

3. emotional_journey: Čustveni vzorci z:
   - emotion: ime čustva
   - frequency: število pojavitev  
   - trend: opis trenda (naraščajoč, padajoč, stalen)

4. symbol_meanings: Simboli in interpretacije z:
   - symbol: ime simbola
   - frequency: število pojavitev
   - interpretation: psihološka interpretacija (2-3 stavki)

5. temporal_patterns: Opis časovnih vzorcev (2-3 stavki o tem, kako se sanje spreminjajo skozi čas)

6. recommendations: Seznam 3-5 priporočil za uporabnika (vsako 1-2 stavka)

7. personal_growth: Analiza osebne rasti na podlagi sanj (3-4 stavki o tem, kaj sanje razkrivajo o razvoju)

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

    // Cache the analysis result
    const latestDreamDate = Math.max(...dreams.map((d: any) => new Date(d.dream_date).getTime()));
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('pattern_analyses')
      .upsert({
        user_id: user.id,
        analysis_data: parsedAnalysis,
        dreams_count: dreams.length,
        last_dream_date: new Date(latestDreamDate).toISOString().split('T')[0],
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving pattern analysis:', saveError);
      throw saveError;
    }

    console.log('Pattern analysis cached successfully');

    // Deduct credits and log usage after successful analysis (only if not from cache)
    if (!forceRefresh) {
      const { error: creditUpdateError } = await supabase
        .from('user_credits')
        .update({ 
          credits_remaining: supabase.raw('credits_remaining - 2'),
          credits_used_this_month: supabase.raw('credits_used_this_month + 2')
        })
        .eq('user_id', user.id);

      if (creditUpdateError) {
        console.error('Error updating credits:', creditUpdateError);
        // Don't fail the request if credit update fails, just log it
      }

      // Log the usage
      const { error: logError } = await supabase
        .from('usage_logs')
        .insert({
          user_id: user.id,
          action_type: 'pattern_analysis',
          credits_used: 2
        });

      if (logError) {
        console.error('Error logging usage:', logError);
        // Don't fail the request if logging fails
      }

      console.log('Credits deducted and usage logged for pattern analysis:', user.id);
    }

    return new Response(
      JSON.stringify({ analysis: parsedAnalysis, cached: false }),
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