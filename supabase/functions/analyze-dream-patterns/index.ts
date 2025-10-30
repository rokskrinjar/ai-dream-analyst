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

    // Check minimum requirements first - exclude deleted dreams
    const analyzedDreamCount = dreams
      .filter((dream: any) => !dream.is_deleted)
      .filter((dream: any) => 
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

    // Prepare dream data early for cost calculations - filter out deleted dreams
    const analyzedDreams = dreams
      .filter((dream: any) => !dream.is_deleted)
      .filter((dream: any) => 
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
    const estimatedCost = Math.max(2, Math.ceil(estimatedTokens / 15000)); // Realistic cost: ~5-10 credits for pattern analysis

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
      console.log('Checking for cached pattern analysis...');
      
      // Get the most recent analysis for this user (no strict dreams_count match)
      const { data: cachedAnalysis, error: cacheError } = await supabase
        .from('pattern_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cacheError) {
        console.error('Error fetching cached analysis:', cacheError);
      }

      if (cachedAnalysis) {
        console.log(`Found cached analysis: ${cachedAnalysis.dreams_count} dreams, created ${cachedAnalysis.created_at}`);
        
        // Check if the cached analysis is recent enough (within 30 days)
        const cacheAge = Date.now() - new Date(cachedAnalysis.created_at).getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        const isRecent = cacheAge < thirtyDaysInMs;
        
        // Check if it covers at least 80% of current dreams
        const coveragePercentage = (cachedAnalysis.dreams_count / dreams.length) * 100;
        const hasGoodCoverage = coveragePercentage >= 80;
        
        console.log(`Cache age: ${Math.floor(cacheAge / (24 * 60 * 60 * 1000))} days, Coverage: ${coveragePercentage.toFixed(1)}%`);
        
        // If cache is valid (recent and good coverage), return it
        if (isRecent && hasGoodCoverage) {
          // Check if it's an old version analysis
          const analysisVersion = cachedAnalysis.analysis_version || 1;
          
          if (analysisVersion < CURRENT_ANALYSIS_VERSION) {
            // Calculate estimated cost for upgrade
            const finalInputText = JSON.stringify(dreamData);
            const finalEstimatedTokens = Math.ceil(finalInputText.length / 4);
            const finalEstimatedCost = Math.max(2, Math.ceil(finalEstimatedTokens / 15000));
            
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
          
          console.log('Returning cached pattern analysis (current version, recent, good coverage)');
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
        } else {
          console.log(`Cache invalid - Recent: ${isRecent}, Coverage: ${hasGoodCoverage}. Generating new analysis.`);
        }
      } else {
        console.log('No cached analysis found. Generating new analysis.');
      }
    }

    // Language detection function
    const detectLanguage = (dreams: any[]): string => {
      const combinedText = dreams.map(d => d.content).join(' ').toLowerCase();
      
      const croatianPatterns = /\b(je|sam|bio|bila|mogu|trebam|imam|htio|htjela)\b/g;
      const croatianCount = (combinedText.match(croatianPatterns) || []).length;
      
      const slovenianPatterns = /\b(je|sem|bil|bila|lahko|moram|imam|hotel|hotela)\b/g;
      const slovenianCount = (combinedText.match(slovenianPatterns) || []).length;
      
      const englishPatterns = /\b(the|is|was|were|have|had|can|will|would)\b/g;
      const englishCount = (combinedText.match(englishPatterns) || []).length;
      
      const germanPatterns = /\b(der|die|das|ich|bin|war|habe|kann|wird)\b/g;
      const germanCount = (combinedText.match(germanPatterns) || []).length;
      
      const scores = { hr: croatianCount, sl: slovenianCount, en: englishCount, de: germanCount };
      const detected = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
      
      return croatianCount + slovenianCount + englishCount + germanCount < 10 ? 'en' : detected;
    };

    // Detect language from dream content
    const detectedLanguage = detectLanguage(dreams);
    console.log('Detected language for pattern analysis:', detectedLanguage);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('Lovable API key not found');
      return new Response(
        JSON.stringify({ error: 'Lovable API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Language-specific prompts
    const promptTemplates: any = {
      en: {
        system: 'You are a top expert in dream analysis with over 20 years of experience in psychology, neuroscience, and dream research. You specialize in pattern recognition, symbolic interpretation, and psychological analysis. CRITICAL: Always respond with a VALID JSON object without additional text. Your analyses are in-depth, professionally grounded, and psychologically accurate. Use English text for all values.',
        prompt: `As a dream analysis expert, analyze the following data from ${dreamData.length} user dreams and create a comprehensive, in-depth pattern analysis. CRITICAL: ALWAYS address the user in SECOND PERSON (you, your, yours). Respond in JSON format with English words.

DREAM DATA AND AI ANALYSES:
${JSON.stringify(dreamData, null, 2)}

Create an extensive, multi-page analysis that ALWAYS addresses the user directly with "you", "your", "yours". Include:

1. executive_summary: Summary of key findings (4-5 paragraphs, each 3-4 sentences). Address the user directly: "Your dreams show...", "In your dreams...", "You have tendencies..."

2. theme_patterns: List of most frequent themes (at least 8-12 themes) with:
   - theme: theme name
   - frequency: number of occurrences
   - significance: description of meaning for YOU in second person (3-4 sentences): "This theme reveals to you...", "In your dreams..."
   - evolution: how the theme develops in YOUR dreams over time

3. emotional_journey: In-depth emotional analysis with:
   - emotion: emotion name
   - frequency: number of occurrences
   - trend: trend description for YOU: "Your emotions show..."
   - psychological_significance: what the emotion reveals about YOUR mental state
   - triggers: possible triggers in YOUR dreams

4. symbol_meanings: Detailed symbolic interpretation (at least 10-15 symbols) with:
   - symbol: symbol name
   - frequency: occurrences in YOUR dreams
   - interpretation: interpretation for YOU (4-5 sentences): "This symbol in your dreams represents..."
   - personal_context: how it connects with YOUR life
   - archetypal_meaning: universal meaning for YOU

5. temporal_patterns: Extensive time pattern analysis (4-5 paragraphs) directly addressing you:
   - "Your seasonal patterns show..."
   - "In your weekly cycle..."
   - "Evolution of your dreams over time..."
   - "Connections with your life events..."

6. psychological_insights: In-depth psychological analysis (4-5 paragraphs) with direct addressing:
   - "Your unconscious fears and desires..."
   - "Your personality traits..."
   - "Your conflicts and internal struggles..."
   - "Your potential for growth..."

7. life_stage_analysis: Life stage analysis (3-4 paragraphs) with direct addressing:
   - "Your current life challenges..."
   - "Your developmental tasks..."
   - "Your transitions and changes..."

8. recommendations: Extensive list of 12-15 specific recommendations with direct addressing:
   - action: concrete action FOR YOU: "Try...", "Reflect on...", "Include in your..."
   - rationale: why IT'S RECOMMENDED FOR YOU: "This will help you...", "For you it will be beneficial..."
   - implementation: how YOU execute it: "You can do this by..."
   - expected_outcome: expected result FOR YOU: "With this you will achieve..."

9. personal_growth: Comprehensive personal growth analysis (5-6 paragraphs) with direct addressing:
   - "Your achieved development..."
   - "Your areas for improvement..."
   - "Your potential for the future..."
   - "Connections between your dreams and reality..."

10. integration_suggestions: Suggestions for integrating insights (3-4 paragraphs) directly for you:
     - "In your daily practices..."
     - "Your reflection techniques..."
     - "Ways YOU can use insights..."

CRITICAL: Every sentence must be written in SECOND PERSON. Use "you", "your", "yours" instead of third person. Example: "Your dreams show..." instead of "Dreams show...". Analysis should be worth 2+ credits with at least 3-4 pages of content.`
      },
      hr: {
        system: 'Vi ste vrhunski stručnjak za analizu snova s preko 20 godina iskustva u psihologiji, neuroznanosti i istraživanju snova. Specijalizirani ste za prepoznavanje obrazaca, simboličku interpretaciju i psihološku analizu. KRITIČNO: Uvijek odgovorite s VAŽEĆIM JSON objektom bez dodatnog teksta. Vaše analize su dubinske, stručno utemeljene i psihološki točne. Koristite hrvatski tekst za sve vrijednosti.',
        prompt: `Kao stručnjak za analizu snova analizirajte sljedeće podatke iz ${dreamData.length} korisničkih snova i stvorite sveobuhvatnu, dubinsku analizu obrazaca. KRITIČNO: UVIJEK se obraćajte korisniku u DRUGOM LICU (vi, vaš, vaše). Odgovorite u JSON formatu gdje su KLJUČEVI (field names) na ENGLESKOM jeziku, a VRIJEDNOSTI (content) na hrvatskom.

PODACI O SNOVIMA I AI ANALIZAMA:
${JSON.stringify(dreamData, null, 2)}

Stvorite opsežnu, višestručnu analizu koja se UVIJEK obraća izravno korisniku s "vi", "vaš", "vaše". Koristite ENGLESKE ključeve: executive_summary, theme_patterns, emotional_journey, symbol_meanings, temporal_patterns, psychological_insights, life_stage_analysis, recommendations, personal_growth, integration_suggestions. Sadržaj svih vrijednosti mora biti na hrvatskom jeziku sa 8-12 tema, 10-15 simbola, 12-15 preporuka itd.`
      },
      sl: {
        system: 'Si vrhunski strokovnjak za analizo sanj s preko 20 let izkušenj na področju psihologije, nevrologije in dream raziskav. Specializiran si za prepoznavanje vzorcev, simbolne interpretacije in psihološko analizo. KRITIČNO: Vedno odgovoriš z VELJAVNIM JSON objektom brez dodatnega besedila. Tvoje analize so poglobljene, strokovno utemeljene in psihološko natančne. Uporabi slovensko besedila za vse vrednosti.',
        prompt: `Kot strokovnjak za analizo sanj analizirajte naslednje podatke ${dreamData.length} sanj uporabnika in ustvarite celovito, poglobljeno analizo vzorcev. KRITIČNO: VEDNO se obračajte na uporabnika v DRUGI OSEBI (vi, vam, vaš, vaše, vaših). Odzovite se v JSON formatu kjer so KLJUČI (field names) v ANGLEŠČINI, VREDNOSTI (content) pa v slovenščini.

PODATKI O SANJAH IN AI ANALIZAH:
${JSON.stringify(dreamData, null, 2)}

Ustvarite obsežno, večstransko analizo, ki se VEDNO obrača direktno na uporabnika z "vi", "vam", "vaš", "vaše", "vaših". Uporabite ANGLEŠKE ključe: executive_summary, theme_patterns, emotional_journey, symbol_meanings, temporal_patterns, psychological_insights, life_stage_analysis, recommendations, personal_growth, integration_suggestions. Vsebina vseh vrednosti mora biti v slovenščini z 8-12 temami, 10-15 simboli, 12-15 priporočili itd.`
      },
      de: {
        system: 'Sie sind ein Spitzenexperte für Traumanalyse mit über 20 Jahren Erfahrung in Psychologie, Neurowissenschaften und Traumforschung. Sie sind auf Mustererkennung, symbolische Interpretation und psychologische Analyse spezialisiert. KRITISCH: Antworten Sie immer mit einem GÜLTIGEN JSON-Objekt ohne zusätzlichen Text. Ihre Analysen sind tiefgründig, fachlich fundiert und psychologisch präzise. Verwenden Sie deutschen Text für alle Werte.',
        prompt: `Als Traumanalyse-Experte analysieren Sie die folgenden Daten aus ${dreamData.length} Benutzerträumen und erstellen Sie eine umfassende, tiefgehende Musteranalyse. KRITISCH: Sprechen Sie den Benutzer IMMER in der ZWEITEN PERSON an (Sie, Ihr, Ihre). Antworten Sie im JSON-Format wo die SCHLÜSSEL (field names) auf ENGLISCH sind, aber die WERTE (content) auf Deutsch.

TRAUMDATEN UND KI-ANALYSEN:
${JSON.stringify(dreamData, null, 2)}

Erstellen Sie eine umfangreiche, mehrseitige Analyse, die sich IMMER direkt an den Benutzer mit "Sie", "Ihr", "Ihre" wendet. Verwenden Sie ENGLISCHE Schlüssel: executive_summary, theme_patterns, emotional_journey, symbol_meanings, temporal_patterns, psychological_insights, life_stage_analysis, recommendations, personal_growth, integration_suggestions. Der Inhalt aller Werte muss auf Deutsch sein mit 8-12 Themen, 10-15 Symbolen, 12-15 Empfehlungen usw.`
      }
    };

    const languagePrompt = promptTemplates[detectedLanguage] || promptTemplates['en'];

    console.log('Sending request to Lovable AI for pattern analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: languagePrompt.system },
          { role: 'user', content: languagePrompt.prompt }
        ],
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limits exceeded. Please try again in a moment.',
          errorCode: 'RATE_LIMIT_EXCEEDED'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI usage limit reached. Please contact support or try again later.',
          errorCode: 'PAYMENT_REQUIRED'
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const error = await response.text();
      console.error('Lovable AI API error:', error);
      throw new Error(`Lovable AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received for pattern analysis');

    let analysisContent = data.choices[0].message.content.trim();

    // Clean up the response to extract JSON (Gemini sometimes adds markdown)
    if (analysisContent.startsWith('```json')) {
      analysisContent = analysisContent.replace(/```json\s*/, '').replace(/```\s*$/, '');
    } else if (analysisContent.startsWith('```')) {
      analysisContent = analysisContent.replace(/```\s*/, '').replace(/```\s*$/, '');
    }

    console.log('Raw AI response length:', analysisContent.length);

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
      
      console.log('AI analysis validated successfully');
    } catch (parseError) {
      console.error('Failed to parse or validate AI response:', parseError);
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
        analysis_version: CURRENT_ANALYSIS_VERSION,
        language: detectedLanguage
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