import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('Dream analysis function called');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dreamId } = await req.json();
    console.log('Analyzing dream ID:', dreamId);

    if (!dreamId) {
      throw new Error('Dream ID is required');
    }

    // Get user from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create client for user authentication with anon key
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Create client for admin operations with service role key  
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get user from authenticated client
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      throw new Error('Invalid authentication token');
    }

    console.log('User authenticated:', user.id);

    // First, reset credits if needed (handles monthly reset)
    const { error: resetError } = await supabaseAdmin
      .rpc('reset_credits_if_needed', { user_id: user.id });

    if (resetError) {
      console.error('Error resetting credits:', resetError);
      // Continue anyway, as this might not be critical
    }

    // Check if user has sufficient credits (1 credit needed for dream analysis)
    const { data: canUseCredits, error: creditError } = await supabaseAdmin
      .rpc('can_use_credits', { user_id: user.id, credits_needed: 1 });

    if (creditError) {
      console.error('Error checking credits:', creditError);
      throw new Error('Failed to check user credits');
    }

    if (!canUseCredits) {
      console.log('User has insufficient credits:', user.id);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Insufficient credits. Please upgrade your plan to continue using AI dream analysis.',
        errorCode: 'INSUFFICIENT_CREDITS'
      }), {
        status: 402, // Payment Required
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if analysis already exists
    const { data: existingAnalysis, error: checkError } = await supabaseAdmin
      .from('dream_analyses')
      .select('*')
      .eq('dream_id', dreamId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing analysis:', checkError);
      throw checkError;
    }

    if (existingAnalysis) {
      console.log('Analysis already exists for dream:', dreamId);
      return new Response(JSON.stringify({ 
        success: true, 
        analysis: existingAnalysis,
        message: 'Analysis already exists'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the dream content
    const { data: dream, error: dreamError } = await supabaseAdmin
      .from('dreams')
      .select('*')
      .eq('id', dreamId)
      .single();

    if (dreamError) {
      console.error('Error fetching dream:', dreamError);
      throw dreamError;
    }

    console.log('Dream fetched successfully:', dream.title);

    // Get OpenAI API key
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Prepare the prompt for dream analysis
    const analysisPrompt = `Analiziraj moje sanje na osnovi naslednjih podatkov:
        
        Naslov sanj: ${dream.title}
        Vsebina sanj: ${dream.content}
        Razpoloženje: ${dream.mood || 'Ni navedeno'}
        Oznake: ${dream.tags ? dream.tags.join(', ') : 'Ni navedenih'}
        
        Vrni analizo v naslednjem JSON formatu v slovenščini:
        {
          "themes": [seznam glavnih tem iz sanj],
          "emotions": [seznam čustev, ki se pojavljajo v sanjah],
          "symbols": [
            {
              "symbol": "ime simbola",
              "meaning": "pomen simbola"
            }
          ],
          "analysis_text": "podrobna analiza sanj v slovenščini",
          "recommendations": "obsežna in podrobna priporočila za nadaljnje razmišljanje in ukrepanje (3-5 konkretnih priporočil, vsako v svojem odstavku z razlago in praktičnimi nasveti)",
          "reflection_questions": [
            "Specifično vprašanje 1 povezano s to sanjijo",
            "Specifično vprašanje 2 povezano s to sanjijo", 
            "Specifično vprašanje 3 povezano s to sanjijo"
          ]
        }

POSEBNE NAVODILA ZA PRIPOROČILA:
- Napiši 3-5 konkretnih, podrobnih priporočil
- Vsako priporočilo naj bo dolg odstavek (3-5 stavkov) z razlago ZAKAJ je pomembno
- Vključi praktične korake, ki jih lahko oseba naredi
- Poveži priporočila z elementi iz sanj in njihovim simbolnim pomenom
- Napiši priporočila kot povezan tekst z odstavki, ne kot oštevilčen seznam
- Vsak odstavek naj se začne z novo vrstico za boljšo berljivost
- Primer strukture: "Prvo priporočilo z razlago...\n\nDrugo priporočilo z razlago...\n\nTretje priporočilo..."

POMEMBNO za reflection_questions:
- Vprašanja MORAJO biti specifična za te natančne sanje: "${dream.title}" - "${dream.content.substring(0, 100)}..."
- Vprašanja naj se začnejo z "Razmislite o..." 
- Vprašanja naj neposredno omenjajo elemente iz sanj (osebe, kraje, predmete, situacije)
- Primeri dobrih vprašanj: 
  * "Razmislite o tem, kako [konkretna oseba/situacija iz sanj] odraža vaše trenutne odnose..."
  * "Razmislite o povezavi med [konkreten element iz sanj] in vašimi nedavnimi skrbmi..."
  * "Razmislite o tem, kaj vam [specifična situacija iz vsebine sanj] sporoča o vaših strahovih/željah..."
- NE uporabljaj splošnih vprašanj kot so "kako se čustva povezujejo z življenjem"

POMEMBNO: Vrni SAMO čisti JSON objekt brez markdown kod blokov, brez \`\`\`json in brez \`\`\`, brez dodatnega besedila.`;

    console.log('Sending request to OpenAI...');

    // Call OpenAI API
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
            content: 'Si izkušen strokovnjak za analizo sanj z globokim razumevanjem simbolike in psihologije. Odgovarjaj vedno v slovenščini in vrni samo JSON objekt. Tvoja naloga je zagotoviti temeljito, podrobno analizo z obsežnimi, praktičnimi priporočili, ki pomagajo osebi razumeti in uporabiti uvide iz sanj v vsakdanjem življenju. Priporočila naj bodo dolga, podrobna in koristna - ne kratka ali splošna.' 
          },
          { 
            role: 'user', 
            content: analysisPrompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 2800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const openAIData = await response.json();
    console.log('OpenAI response received');

    if (!openAIData.choices || !openAIData.choices[0]) {
      throw new Error('Invalid OpenAI response format');
    }

    const analysisContent = openAIData.choices[0].message.content;
    console.log('Analysis content:', analysisContent);

    // Parse the JSON response from OpenAI
    let parsedAnalysis;
    try {
      // Strip markdown code blocks if present
      let cleanContent = analysisContent.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('Cleaned content for parsing:', cleanContent);
      parsedAnalysis = JSON.parse(cleanContent);
      
      // Validate required fields
      if (!parsedAnalysis.themes || !parsedAnalysis.emotions || !parsedAnalysis.symbols || !parsedAnalysis.analysis_text || !parsedAnalysis.recommendations) {
        throw new Error('Missing required fields in analysis');
      }
      
    } catch (parseError) {
      console.error('Error parsing OpenAI JSON response:', parseError);
      console.error('Raw content:', analysisContent);
      
      // Fallback: create a simple analysis if JSON parsing fails
      parsedAnalysis = {
        themes: ['Splošna analiza'],
        emotions: ['Različna čustva'],
        symbols: ['Različni simboli'],
        analysis_text: analysisContent || 'Analiza ni bila mogoča zaradi napake pri obdelavi.',
        recommendations: 'Priporočila niso na voljo zaradi napake pri obdelavi.'
      };
    }

    // Save analysis to database
    const { data: savedAnalysis, error: saveError } = await supabaseAdmin
      .from('dream_analyses')
      .insert({
        dream_id: dreamId,
        themes: parsedAnalysis.themes || [],
        emotions: parsedAnalysis.emotions || [],
        symbols: parsedAnalysis.symbols || [],
        analysis_text: parsedAnalysis.analysis_text || 'Analiza ni na voljo.',
        recommendations: parsedAnalysis.recommendations || 'Priporočila niso na voljo.',
        reflection_questions: parsedAnalysis.reflection_questions || []
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw saveError;
    }

    console.log('Analysis saved successfully:', savedAnalysis.id);

    // Deduct credit and log usage after successful analysis
    // First, get current credit values
    const { data: currentCredits, error: getCurrentError } = await supabaseAdmin
      .from('user_credits')
      .select('credits_remaining, credits_used_this_month')
      .eq('user_id', user.id)
      .single();

    if (getCurrentError) {
      console.error('Error getting current credits:', getCurrentError);
      // Don't fail the request if credit fetch fails, just log it
    } else {
      // Update credits with calculated values
      const { error: creditUpdateError } = await supabaseAdmin
        .from('user_credits')
        .update({ 
          credits_remaining: Math.max(0, currentCredits.credits_remaining - 1),
          credits_used_this_month: currentCredits.credits_used_this_month + 1
        })
        .eq('user_id', user.id);

      if (creditUpdateError) {
        console.error('Error updating credits:', creditUpdateError);
        // Don't fail the request if credit update fails, just log it
      } else {
        console.log('Credits updated successfully for user:', user.id);
      }
    }

    // Log the usage
    const { error: logError } = await supabaseAdmin
      .from('usage_logs')
      .insert({
        user_id: user.id,
        dream_id: dreamId,
        action_type: 'dream_analysis',
        credits_used: 1
      });

    if (logError) {
      console.error('Error logging usage:', logError);
      // Don't fail the request if logging fails
    }

    console.log('Credit deducted and usage logged for user:', user.id);

    return new Response(JSON.stringify({ 
      success: true, 
      analysis: savedAnalysis,
      message: 'Dream analysis completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-dream function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});