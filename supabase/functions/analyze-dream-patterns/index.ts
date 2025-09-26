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

    // First check data to estimate cost
    if (!dreams || !analyses || dreams.length === 0 || analyses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No dreams or analyses provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check minimum requirements first
    const analyzedDreamCount = dreams.filter((dream: any) => 
      analyses.some((a: any) => a.dream_id === dream.id)
    ).length;
    
    if (analyzedDreamCount < 10) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Za vzorčno analizo potrebujete vsaj 10 analiziranih sanj. Trenutno imate ${analyzedDreamCount} analiziranih sanj.`,
        errorCode: 'INSUFFICIENT_ANALYZED_DREAMS',
        current: analyzedDreamCount,
        required: 10
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare dream data early for cost calculations
    const analyzedDreams = dreams.filter((dream: any) => 
      analyses.some((a: any) => a.dream_id === dream.id)
    );
    
    // Use the latest 30 analyzed dreams for analysis
    const recentAnalyzedDreams = analyzedDreams
      .sort((a: any, b: any) => new Date(b.dream_date).getTime() - new Date(a.dream_date).getTime())
      .slice(0, 30);

    // Prepare comprehensive dream data for analysis (needed for cost estimation)
    const dreamData = recentAnalyzedDreams.map((dream: any) => {
      const analysis = analyses.find((a: any) => a.dream_id === dream.id);
      return {
        title: dream.title,
        content: dream.content,
        mood: dream.mood,
        dream_date: dream.dream_date,
        tags: dream.tags || [],
        themes: analysis?.themes || [],
        emotions: analysis?.emotions || [],
        symbols: analysis?.symbols || [],
        analysis_text: analysis?.analysis_text || '',
        recommendations: analysis?.recommendations || null
      };
    });

    // Calculate estimated cost based on input data
    const recentDreams = dreams.slice(0, 30);
    const inputText = JSON.stringify(recentDreams) + JSON.stringify(analyses);
    const estimatedTokens = Math.ceil(inputText.length / 4);
    const estimatedCost = Math.max(2, Math.ceil(estimatedTokens / 2000)); // More conservative estimation

    // Check if user has sufficient credits for estimated cost
    const { data: canUseCredits, error: creditError } = await supabase
      .rpc('can_use_credits', { user_id: user.id, credits_needed: estimatedCost });

    if (creditError) {
      console.error('Error checking credits:', creditError);
      throw new Error('Failed to check user credits');
    }

    if (!canUseCredits && !forceRefresh) {
      console.log(`User has insufficient credits for pattern analysis. Required: ${estimatedCost}, User: ${user.id}`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Potrebujete ${estimatedCost} kreditov za to analizo. Nadgradite svoj paket.`,
        errorCode: 'INSUFFICIENT_CREDITS',
        creditsRequired: estimatedCost
      }), {
        status: 402, // Payment Required
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const CURRENT_ANALYSIS_VERSION = 3; // Version 3 = comprehensive analysis with better validation

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
        // Check if it's an old version analysis
        const analysisVersion = cachedAnalysis.analysis_version || 1;
        
        if (analysisVersion < CURRENT_ANALYSIS_VERSION) {
          // Calculate estimated cost for upgrade
          const finalInputText = JSON.stringify(dreamData);
          const finalEstimatedTokens = Math.ceil(finalInputText.length / 4);
          const finalEstimatedCost = Math.max(2, Math.ceil(finalEstimatedTokens / 1000));
          
          console.log('Found older version analysis, offering upgrade');
          return new Response(
            JSON.stringify({ 
              analysis: cachedAnalysis.analysis_data, 
              cached: true,
              upgradeAvailable: true,
              currentVersion: analysisVersion,
              availableVersion: CURRENT_ANALYSIS_VERSION,
              estimatedUpgradeCost: finalEstimatedCost,
              creditsUsed: 0,
              dreamsAnalyzed: cachedAnalysis.dreams_count 
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        
        console.log('Returning cached pattern analysis (current version)');
        return new Response(
          JSON.stringify({ 
            analysis: cachedAnalysis.analysis_data, 
            cached: true,
            creditsUsed: 0,
            dreamsAnalyzed: cachedAnalysis.dreams_count 
          }),
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

    // Calculate estimated cost based on input size
    const finalInputText = JSON.stringify(dreamData);
    const finalEstimatedTokens = Math.ceil(finalInputText.length / 4); // Rough estimation: 4 chars per token
    const finalEstimatedCost = Math.max(2, Math.ceil(finalEstimatedTokens / 1000)); // Minimum 2 credits, +1 per 1000 tokens

    console.log(`Estimated tokens: ${finalEstimatedTokens}, Estimated cost: ${finalEstimatedCost} credits`);

    const prompt = `Kot strokovnjak za analizo sanj analizirajte naslednje podatke ${dreamData.length} sanj uporabnika in ustvarite celovito, poglobljeno analizo vzorcev. KRITIČNO: VEDNO se obračajte na uporabnika v DRUGI OSEBI (vi, vam, vaš, vaše, vaših). Odzovite se v JSON formatu s slovenskimi besedami.

PODATKI O SANJAH IN AI ANALIZAH:
${JSON.stringify(dreamData, null, 2)}

Ustvarite obsežno, večstransko analizo, ki se VEDNO obrača direktno na uporabnika z "vi", "vam", "vaš", "vaše", "vaših". Vključuje:

1. executive_summary: Povzetek ključnih odkritij (4-5 odstavkov, vsak 3-4 stavki). Nagovarjajte uporabnika direktno: "Vaše sanje kažejo...", "V vaših sanjah se pojavlja...", "Vi imate tendence..."

2. theme_patterns: Seznam najpogostejših tem (vsaj 8-12 tem) z:
   - theme: ime teme
   - frequency: število pojavitev
   - significance: opis pomena za UPORABNIKA v drugi osebi (3-4 stavki): "Ta tema vam razkriva...", "V vaših sanjah..."
   - evolution: kako se tema razvija v VAŠIH sanjah skozi čas

3. emotional_journey: Poglobljena čustvena analiza z:
   - emotion: ime čustva
   - frequency: število pojavitev
   - trend: opis trenda za UPORABNIKA: "Vaša čustva kažejo..."
   - psychological_significance: kaj čustvo razkriva o VAŠEM psihičnem stanju
   - triggers: možni sprožilci v VAŠIH sanjah

4. symbol_meanings: Podrobna simbolna interpretacija (vsaj 10-15 simbolov) z:
   - symbol: ime simbola
   - frequency: število pojavitev v VAŠIH sanjah
   - interpretation: interpretacija za UPORABNIKA (4-5 stavkov): "Ta simbol v vaših sanjah predstavlja..."
   - personal_context: kako se povezuje z VAŠIM življenjem
   - archetypal_meaning: univerzalni pomen za VAS

5. temporal_patterns: Obsežna analiza časovnih vzorcev (4-5 odstavkov) direktno nagovarjajoč uporabnika:
   - "Vaši sezonski vzorci kažejo..."
   - "V vašem tedenskem ciklu..."
   - "Evolucija vaših sanj skozi čas..."
   - "Povezave z vašimi življenjskimi dogodki..."

6. psychological_insights: Poglobljena psihološka analiza (4-5 odstavkov) z direktnim nagovarjanjem:
   - "Vaše nezavedne strahove in želje..."
   - "Vaše osebnostne značilnosti..."
   - "Vaši konflikti in notranji boji..."
   - "Vaš potencial za rast..."

7. life_stage_analysis: Analiza življenjske faze (3-4 odstavki) z direktnim nagovarjanjem:
   - "Vaši trenutni življenjski izzivi..."
   - "Vaše razvojne naloge..."
   - "Vaši prehodi in spremembe..."

8. recommendations: Obsežen seznam 12-15 specifičnih priporočil z direktnim nagovarjanjem:
   - action: konkretno dejanje ZA VAS: "Poskusite...", "Razmislite o...", "Vključite v svoj..."
   - rationale: zakaj JE PRIPOROČENO ZA VAS: "To vam bo pomagalo...", "Za vas bo koristno..."
   - implementation: kako VI izveste: "Lahko to storite tako..."
   - expected_outcome: pričakovani rezultat ZA VAS: "S tem boste dosegli..."

9. personal_growth: Celovita analiza osebne rasti (5-6 odstavkov) z direktnim nagovarjanjem:
   - "Vaš doseženi razvoj..."
   - "Vaša področja za izboljšave..."
   - "Vaš potencial za prihodnost..."
   - "Povezave med vašimi sanjami in resničnostjo..."

10. integration_suggestions: Predlogi za integracijo spoznanj (3-4 odstavki) direktno za uporabnika:
    - "V vaših dnevnih praksah..."
    - "Vaše refleksijske tehnike..."
    - "Načini, kako VI lahko uporabite spoznanja..."

KRITIČNO: Vsak stavek mora biti napisan v DRUGI OSEBI. Uporabite "vi", "vam", "vaš", "vaše", "vaših" namesto tretje osebe. Primer: "Vaše sanje kažejo..." namesto "Sanje kažejo...". Analiza naj bo vredna 2+ kreditov z vsaj 3-4 strani vsebine.`;

    console.log('Sending request to OpenAI for pattern analysis...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Si vrhunski strokovnjak za analizo sanj s preko 20 let izkušenj na področju psihologije, nevrologije in dream raziskav. Specializiran si za prepoznavanje vzorcev, simbolne interpretacije in psihološko analizo. KRITIČNO: Vedno odgovoriš z VELJAVNIM JSON objektom brez dodatnega besedila. Tvoje analize so poglobljene, strokovno utemeljene in psihološko natančne. Uporabi slovensko besedila za vse vrednosti.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 8000,
        response_format: { type: "json_object" }
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

    console.log('Raw OpenAI response length:', analysisContent.length);

    let parsedAnalysis;
    try {
      // Validate JSON completeness before parsing
      if (!analysisContent.trim().endsWith('}')) {
        console.error('OpenAI response appears truncated - missing closing brace');
        throw new Error('Truncated JSON response');
      }
      
      parsedAnalysis = JSON.parse(analysisContent);
      
      // Validate required fields
      const requiredFields = ['executive_summary', 'theme_patterns', 'emotional_journey', 'symbol_meanings'];
      for (const field of requiredFields) {
        if (!parsedAnalysis[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Validate minimum content requirements
      if (parsedAnalysis.theme_patterns.length < 6) {
        throw new Error('Insufficient theme patterns (minimum 6 required)');
      }
      if (parsedAnalysis.emotional_journey.length < 4) {
        throw new Error('Insufficient emotional journey entries (minimum 4 required)');
      }
      if (parsedAnalysis.symbol_meanings.length < 8) {
        throw new Error('Insufficient symbol meanings (minimum 8 required)');
      }
      
      console.log('OpenAI analysis validated successfully');
    } catch (parseError) {
      console.error('Failed to parse or validate OpenAI response:', parseError);
      console.error('Response content:', analysisContent.substring(0, 500) + '...');
      
      // Return error instead of fallback - force user to try again
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `AI analiza ni bila uspešna zaradi tehnične napake. Poskusite znova.`,
        errorCode: 'AI_ANALYSIS_FAILED',
        details: errorMessage
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache the analysis result with current version
    const latestDreamDate = Math.max(...dreams.map((d: any) => new Date(d.dream_date).getTime()));
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('pattern_analyses')
      .upsert({
        user_id: user.id,
        analysis_data: parsedAnalysis,
        dreams_count: dreams.length,
        last_dream_date: new Date(latestDreamDate).toISOString().split('T')[0],
        analysis_version: CURRENT_ANALYSIS_VERSION
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
      // Use proper SQL syntax for credit deduction
      const { error: creditUpdateError } = await supabase
        .rpc('reset_credits_if_needed', { user_id: user.id }); // Ensure credits are current
        
      if (creditUpdateError) {
        console.error('Error resetting credits before deduction:', creditUpdateError);
      }

      // Get current credits and deduct
      const { data: currentCredits } = await supabase
        .from('user_credits')
        .select('credits_remaining, credits_used_this_month')
        .eq('user_id', user.id)
        .single();

      if (currentCredits) {
        const { error: updateError } = await supabase
          .from('user_credits')
          .update({ 
            credits_remaining: Math.max(0, currentCredits.credits_remaining - finalEstimatedCost),
            credits_used_this_month: (currentCredits.credits_used_this_month || 0) + finalEstimatedCost
          })
          .eq('user_id', user.id);

        if (updateError) {
          console.error('Error updating credits:', updateError);
        } else {
          console.log(`Deducted ${finalEstimatedCost} credits for pattern analysis:`, user.id);
        }
      }

      // Log the usage
      const { error: logError } = await supabase
        .from('usage_logs')
        .insert({
          user_id: user.id,
          action_type: 'pattern_analysis',
          credits_used: finalEstimatedCost
        });

      if (logError) {
        console.error('Error logging usage:', logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        analysis: parsedAnalysis, 
        cached: false, 
        creditsUsed: finalEstimatedCost,
        dreamsAnalyzed: recentAnalyzedDreams.length 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in pattern analysis function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});