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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Check if analysis already exists
    const { data: existingAnalysis, error: checkError } = await supabase
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
    const { data: dream, error: dreamError } = await supabase
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
    const analysisPrompt = `Analizirajte vaše sanje in vrnite strukturiran odgovor v JSON formatu. Vaše sanje:

Naslov: ${dream.title}
Vsebina: ${dream.content}
Razpoloženje: ${dream.mood || 'Ni navedeno'}
Oznake: ${dream.tags ? dream.tags.join(', ') : 'Ni oznak'}

Prosim, analizirajte vaše sanje in vrnite JSON z naslednjimi ključi (direktno nagovarjajte uporabnika v drugi osebi):
- "themes": seznam glavnih tem (največ 5)
- "emotions": seznam čustev (največ 5) 
- "symbols": seznam simbolov in njihovih možnih pomenov (največ 5)
- "analysis_text": podroben opis analize v drugi osebi (2-3 odstavki) - "Vaše sanje razkrivajo..."
- "recommendations": terapevtska priporočila in nasveti v drugi osebi (2-3 odstavki) - "Predlagam vam..."

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
            content: 'Si strokovnjak za analizo sanj. Odgovarjaj vedno v slovenščini in vrni samo JSON objekt.' 
          },
          { 
            role: 'user', 
            content: analysisPrompt 
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
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
    const { data: savedAnalysis, error: saveError } = await supabase
      .from('dream_analyses')
      .insert({
        dream_id: dreamId,
        themes: parsedAnalysis.themes || [],
        emotions: parsedAnalysis.emotions || [],
        symbols: parsedAnalysis.symbols || [],
        analysis_text: parsedAnalysis.analysis_text || 'Analiza ni na voljo.',
        recommendations: parsedAnalysis.recommendations || 'Priporočila niso na voljo.'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving analysis:', saveError);
      throw saveError;
    }

    console.log('Analysis saved successfully:', savedAnalysis.id);

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