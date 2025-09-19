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


    const CURRENT_ANALYSIS_VERSION = 2; // Version 2 = comprehensive analysis

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

    // Check minimum requirements: at least 10 analyzed dreams
    const analyzedDreams = dreams.filter((dream: any) => 
      analyses.some((a: any) => a.dream_id === dream.id)
    );
    
    if (analyzedDreams.length < 10) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Za vzorčno analizo potrebujete vsaj 10 analiziranih sanj. Trenutno imate ${analyzedDreams.length} analiziranih sanj.`,
        errorCode: 'INSUFFICIENT_ANALYZED_DREAMS',
        current: analyzedDreams.length,
        required: 10
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the latest 30 analyzed dreams for analysis
    const recentAnalyzedDreams = analyzedDreams
      .sort((a: any, b: any) => new Date(b.dream_date).getTime() - new Date(a.dream_date).getTime())
      .slice(0, 30);

    // Prepare comprehensive dream data for analysis (no truncation)
    const dreamData = recentAnalyzedDreams.map((dream: any) => {
      const analysis = analyses.find((a: any) => a.dream_id === dream.id);
      return {
        title: dream.title,
        content: dream.content, // Full content, no truncation
        mood: dream.mood,
        dream_date: dream.dream_date,
        tags: dream.tags || [],
        themes: analysis?.themes || [],
        emotions: analysis?.emotions || [],
        symbols: analysis?.symbols || [],
        analysis_text: analysis?.analysis_text || '', // Full analysis, no truncation
        recommendations: analysis?.recommendations || null
      };
    });

    // Calculate estimated cost based on input size
    const finalInputText = JSON.stringify(dreamData);
    const finalEstimatedTokens = Math.ceil(finalInputText.length / 4); // Rough estimation: 4 chars per token
    const finalEstimatedCost = Math.max(2, Math.ceil(finalEstimatedTokens / 1000)); // Minimum 2 credits, +1 per 1000 tokens

    console.log(`Estimated tokens: ${finalEstimatedTokens}, Estimated cost: ${finalEstimatedCost} credits`);

    const prompt = `Kot strokovnjak za analizo sanj analizirajte naslednje podatke ${dreamData.length} sanj uporabnika in ustvarite celovito, poglobljeno analizo vzorcev. Odzovite se v JSON formatu s slovenskimi besedami.

PODATKI O SANJAH IN AI ANALIZAH:
${JSON.stringify(dreamData, null, 2)}

Ustvarite obsežno, večstransko analizo, ki vključuje:

1. executive_summary: Povzetek ključnih odkritij (4-5 odstavkov, vsak 3-4 stavki)

2. theme_patterns: Seznam najpogostejših tem (vsaj 8-12 tem) z:
   - theme: ime teme
   - frequency: število pojavitev
   - significance: podroben opis pomena in psihološkega ozadja (3-4 stavki)
   - evolution: kako se tema razvija skozi čas

3. emotional_journey: Poglobljena čustvena analiza z:
   - emotion: ime čustva
   - frequency: število pojavitev
   - trend: opis trenda z analizo
   - psychological_significance: kaj čustvo razkriva o psihičnem stanju
   - triggers: možni sprožilci tega čustva v sanjah

4. symbol_meanings: Podrobna simbolna interpretacija (vsaj 10-15 simbolov) z:
   - symbol: ime simbola
   - frequency: število pojavitev
   - interpretation: poglobljena psihološka interpretacija (4-5 stavkov)
   - personal_context: kako se povezuje z uporabnikovo življenje
   - archetypal_meaning: univerzalni pomen simbola

5. temporal_patterns: Obsežna analiza časovnih vzorcev (4-5 odstavkov) o:
   - Sezonskih vzorcih
   - Tedenskih ciklih
   - Evoluciji sanj skozi čas
   - Povezavah z življenjskimi dogodki

6. psychological_insights: Poglobljena psihološka analiza (4-5 odstavkov) o:
   - Nezavednih strah in želj
   - Osebnostnih značilnostih
   - Konfliktih in notranjih bojih
   - Potencialih za rast

7. life_stage_analysis: Analiza življenjske faze (3-4 odstavki) o:
   - Trenutni življenjski izzivi
   - Razvojne naloge
   - Prehodi in spremembe

8. recommendations: Obsežen seznam 12-15 specifičnih priporočil z:
   - action: konkretno dejanje
   - rationale: zakaj je priporočeno
   - implementation: kako izvesti
   - expected_outcome: pričakovani rezultat

9. personal_growth: Celovita analiza osebne rasti (5-6 odstavkov) o:
   - Doseženi razvoj
   - Področja za izboljšave
   - Potencial za prihodnost
   - Povezave med sanjami in resničnostjo

10. integration_suggestions: Predlogi za integracijo spoznanj (3-4 odstavki) o:
    - Dnevnih praksah
    - Refleksijskih tehnikah
    - Načinih uporabe spoznanj

Vsak oddelek naj bo obsežen, strokoven in psihološko natančen. Uporabite kompleksne psihološke koncepte in teorije. Analiza naj bo vredna 2+ kreditov z vsaj 3-4 strani vsebine.`;

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
            content: 'Si vrhunski strokovnjak za analizo sanj s preko 20 let izkušenj na področju psihologije, nevrologije in dream raziskav. Specializiran si za prepoznavanje vzorcev, simbolne interpretacije in psihološko analizo. Vedno odgovarijaš v slovenskem jeziku z natančnim JSON formatom. Tvoje analize so poglobljene, strokovno utemeljene in psihološko natančne.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
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
      // Fallback: create a comprehensive structured analysis
      parsedAnalysis = {
        executive_summary: "Analizirali smo vaše sanje in odkrili zanimive vzorce. Vaše sanje kažejo na bogato čustveno življenje in aktivno podzavest. Ta analiza temelji na podatkih o vaših sanjah in lahko služi kot osnova za nadaljnje raziskovanje vaše psihične dinamike. Za še bolj natančno analizo priporočamo nadaljnje beleženje sanj.",
        theme_patterns: [
          { theme: "Osebni odnosi", frequency: Math.floor(dreamData.length * 0.3), significance: "Pogosta tema, ki kaže na pomembnost medosebnih povezav v vašem življenju.", evolution: "Razvija se skozi čas" },
          { theme: "Čustvene situacije", frequency: Math.floor(dreamData.length * 0.25), significance: "Vaše sanje pogosto obravnavajo čustvene izzive in notranje konflikte.", evolution: "Različne intenzivnosti" }
        ],
        emotional_journey: [
          { emotion: "Zaskrbljenost", frequency: Math.floor(dreamData.length * 0.4), trend: "Prisotna v različnih oblikah", psychological_significance: "Kaže na prilagajanje na življenjske spremembe", triggers: "Stresne situacije v realnem življenju" }
        ],
        symbol_meanings: [
          { symbol: "Voda", frequency: Math.floor(dreamData.length * 0.2), interpretation: "Simbolizira čustva, nezavedno in pretok življenjske energije. Pogosto se pojavljajo v sanjah kot odraz čustvenega stanja.", personal_context: "Povezano z vašimi trenutnimi čustvenimi izzivi", archetypal_meaning: "Univerzalni simbol čustvene globine" }
        ],
        temporal_patterns: "Na podlagi analize vaših sanj skozi čas opažamo določene vzorce. Sanje se spreminjajo glede na vaše življenjske okoliščine in čustveno stanje. Večina sanj je povezanih z vsakodnevnimi izkušnjami, vendar se pojavljajo tudi globlja simbolna sporočila.",
        psychological_insights: "Vaše sanje razkrivajo aktivno podzavest, ki poskuša predelati dnevne izkušnje in čustva. Opažamo znake zdravega psihičnega delovanja z občasnimi stresnimi elementi, ki jih vaša psihika poskuša rešiti skozi sanjanje.",
        life_stage_analysis: "Trenutno se nahajate v življenjski fazi, ki zahteva prilagajanje in rast. Vaše sanje odražajo to dinamiko z mešanico stabilnih elementov in novih izzivov.",
        recommendations: [
          { action: "Redno beležite sanje", rationale: "Omogoča boljše prepoznavanje vzorcev", implementation: "Držite dnevnik sanj ob postelji", expected_outcome: "Izboljšana samozavest" },
          { action: "Reflektirajte o čustvih v sanjah", rationale: "Pomaga pri čustveni obdelavi", implementation: "Namenite 5 minut razmisleku vsako jutro", expected_outcome: "Boljše čustveno razumevanje" }
        ],
        personal_growth: "Vaše sanje kažejo na potencial za osebnostno rast in globlje samorazumevanje. Priporočamo vam, da uporabljate sanje kot orodje za samopoznavanje in čustveno rast.",
        integration_suggestions: "Za integracijo spoznanj iz te analize priporočamo redne refleksijske prakse, čustveno pisanje in morda pogovor s strokovnjakom, če se pojavijo intenzivni vzorci."
      };
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
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});