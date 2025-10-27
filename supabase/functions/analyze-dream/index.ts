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
      console.error('Auth error details:', {
        error: userError?.message,
        errorName: userError?.name,
        hasAuthHeader: !!authHeader,
        authHeaderLength: authHeader?.length || 0
      });
      
      // Distinguish between different auth error types
      if (userError?.message?.includes('expired') || userError?.name === 'AuthSessionMissingError') {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Session expired. Please refresh the page and log in again.',
          errorCode: 'SESSION_EXPIRED'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!authHeader) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Missing authentication. Please log in.',
          errorCode: 'AUTH_MISSING'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
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

    // Validate content length to prevent cost abuse
    if (dream.content.length > 5000) {
      console.error('Dream content too long:', dream.content.length);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Vsebina sanje je predolga za analizo. Prosimo, skrajšajte na 5000 znakov.',
          errorCode: 'CONTENT_TOO_LONG'
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Check recent analyses (5 per minute, 50 per day)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentCount } = await supabaseAdmin
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'dream_analysis')
      .gte('created_at', oneMinuteAgo);

    if (recentCount && recentCount >= 5) {
      console.warn('Rate limit exceeded (per minute):', user.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Omejitev hitrosti: Maksimalno 5 analiz na minuto.',
          errorCode: 'RATE_LIMIT_EXCEEDED'
        }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
    const { count: dailyCount } = await supabaseAdmin
      .from('usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action_type', 'dream_analysis')
      .gte('created_at', oneDayAgo);

    if (dailyCount && dailyCount >= 50) {
      console.warn('Rate limit exceeded (per day):', user.id);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Omejitev hitrosti: Maksimalno 50 analiz na dan.',
          errorCode: 'RATE_LIMIT_EXCEEDED'
        }), 
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Language detection function
    const detectLanguage = (text: string): string => {
      const lowerText = text.toLowerCase();
      
      const croatianPatterns = /\b(je|sam|bio|bila|mogu|trebam|imam|htio|htjela|bio|bio sam|imao|nisam|trebao)\b/g;
      const croatianCount = (lowerText.match(croatianPatterns) || []).length;
      
      const slovenianPatterns = /\b(je|sem|bil|bila|lahko|moram|imam|hotel|hotela|nisem|moral|lahko)\b/g;
      const slovenianCount = (lowerText.match(slovenianPatterns) || []).length;
      
      const englishPatterns = /\b(the|is|was|were|have|had|can|will|would|been|has|are)\b/g;
      const englishCount = (lowerText.match(englishPatterns) || []).length;
      
      const germanPatterns = /\b(der|die|das|ich|bin|war|habe|hatte|kann|wird|würde)\b/g;
      const germanCount = (lowerText.match(germanPatterns) || []).length;
      
      const scores = { hr: croatianCount, sl: slovenianCount, en: englishCount, de: germanCount };
      const detected = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
      
      return croatianCount + slovenianCount + englishCount + germanCount < 3 ? 'en' : detected;
    };

    // Detect language from dream content
    const detectedLanguage = detectLanguage(dream.content);
    console.log('Detected language:', detectedLanguage);

    // Language-specific prompts
    const prompts: any = {
      en: {
        system: 'You are an experienced dream analysis expert with deep understanding of symbolism and psychology. Always respond in English and return only a JSON object. Your task is to provide thorough, detailed analysis with comprehensive, practical recommendations that help the person understand and use insights from dreams in daily life. Recommendations should be long, detailed, and useful - not short or generic.',
        instruction: `Analyze my dream based on the following data:
        
        Dream Title: ${dream.title}
        Dream Content: ${dream.content}
        Mood: ${dream.mood || 'Not specified'}
        Tags: ${dream.tags ? dream.tags.join(', ') : 'None specified'}
        
        Return the analysis in the following JSON format in English:
        {
          "themes": [list of main themes from the dream],
          "emotions": [list of emotions appearing in the dream],
          "symbols": [
            {
              "symbol": "symbol name",
              "meaning": "symbol meaning"
            }
          ],
          "analysis_text": "detailed dream analysis in English",
          "recommendations": "comprehensive and detailed recommendations for further reflection and action (3-5 concrete recommendations, each in its own paragraph with explanation and practical advice)",
          "reflection_questions": [
            "Specific question 1 related to this dream",
            "Specific question 2 related to this dream",
            "Specific question 3 related to this dream"
          ]
        }

SPECIAL INSTRUCTIONS FOR RECOMMENDATIONS:
- Write 3-5 concrete, detailed recommendations
- Each recommendation should be a long paragraph (3-5 sentences) with explanation of WHY it's important
- Include practical steps the person can take
- Connect recommendations with elements from the dream and their symbolic meaning
- Write recommendations as connected text with paragraphs, not as a numbered list
- Each paragraph should start with a new line for better readability
- Example structure: "First recommendation with explanation...\\n\\nSecond recommendation with explanation...\\n\\nThird recommendation..."

IMPORTANT for reflection_questions:
- Questions MUST be specific to these exact dreams: "${dream.title}" - "${dream.content.substring(0, 100)}..."
- Questions should start with "Reflect on..."
- Questions should directly mention elements from the dream (people, places, objects, situations)
- Examples of good questions:
  * "Reflect on how [specific person/situation from dream] reflects your current relationships..."
  * "Reflect on the connection between [concrete element from dream] and your recent concerns..."
  * "Reflect on what [specific situation from dream content] is telling you about your fears/desires..."
- DO NOT use generic questions like "how do emotions connect with life"

IMPORTANT: Return ONLY clean JSON object without markdown code blocks, without \`\`\`json and without \`\`\`, without additional text.`
      },
      hr: {
        system: 'Vi ste iskusni stručnjak za analizu snova sa dubokim razumijevanjem simbolike i psihologije. Uvijek odgovarajte na hrvatskom i vratite samo JSON objekt. Vaš zadatak je pružiti temeljitu, detaljnu analizu s opsežnim, praktičnim preporukama koje pomažu osobi razumjeti i koristiti uvide iz snova u svakodnevnom životu. Preporuke trebaju biti dugačke, detaljne i korisne - ne kratke ili generičke.',
        instruction: `Analizirajte moj san na temelju sljedećih podataka:
        
        Naslov sna: ${dream.title}
        Sadržaj sna: ${dream.content}
        Raspoloženje: ${dream.mood || 'Nije navedeno'}
        Oznake: ${dream.tags ? dream.tags.join(', ') : 'Nisu navedene'}
        
        Vratite analizu u sljedećem JSON formatu na hrvatskom:
        {
          "themes": [popis glavnih tema iz sna],
          "emotions": [popis emocija koje se pojavljuju u snu],
          "symbols": [
            {
              "symbol": "ime simbola",
              "meaning": "značenje simbola"
            }
          ],
          "analysis_text": "detaljna analiza sna na hrvatskom",
          "recommendations": "opsežne i detaljne preporuke za daljnje razmišljanje i djelovanje (3-5 konkretnih preporuka, svaka u svom odlomku s obrazloženjem i praktičnim savjetima)",
          "reflection_questions": [
            "Specifično pitanje 1 povezano s ovim snom",
            "Specifično pitanje 2 povezano s ovim snom",
            "Specifično pitanje 3 povezano s ovim snom"
          ]
        }

POSEBNE UPUTE ZA PREPORUKE:
- Napišite 3-5 konkretnih, detaljnih preporuka
- Svaka preporuka neka bude dugačak odlomak (3-5 rečenica) s obrazloženjem ZAŠTO je važna
- Uključite praktične korake koje osoba može napraviti
- Povežite preporuke s elementima iz sna i njihovim simboličkim značenjem
- Napišite preporuke kao povezan tekst s odlomcima, ne kao numerirani popis
- Svaki odlomak neka počinje novim retkom za bolju čitljivost

VAŽNO za reflection_questions:
- Pitanja MORAJU biti specifična za ove točne snove: "${dream.title}" - "${dream.content.substring(0, 100)}..."
- Pitanja neka počinju s "Razmislite o..."
- Pitanja neka izravno spominju elemente iz sna (osobe, mjesta, predmete, situacije)

VAŽNO: Vratite SAMO čisti JSON objekt bez markdown kod blokova, bez \`\`\`json i bez \`\`\`, bez dodatnog teksta.`
      },
      sl: {
        system: 'Si izkušen strokovnjak za analizo sanj z globokim razumevanjem simbolike in psihologije. Odgovarjaj vedno v slovenščini in vrni samo JSON objekt. Tvoja naloga je zagotoviti temeljito, podrobno analizo z obsežnimi, praktičnimi priporočili, ki pomagajo osebi razumeti in uporabiti uvide iz sanj v vsakdanjem življenju. Priporočila naj bodo dolga, podrobna in koristna - ne kratka ali splošna.',
        instruction: `Analiziraj moje sanje na osnovi naslednjih podatkov:
        
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

POMEMBNO za reflection_questions:
- Vprašanja MORAJO biti specifična za te natančne sanje: "${dream.title}" - "${dream.content.substring(0, 100)}..."
- Vprašanja naj se začnejo z "Razmislite o..."
- Vprašanja naj neposredno omenjajo elemente iz sanj (osebe, kraje, predmete, situacije)

POMEMBNO: Vrni SAMO čisti JSON objekt brez markdown kod blokov, brez \`\`\`json in brez \`\`\`, brez dodatnega besedila.`
      },
      de: {
        system: 'Sie sind ein erfahrener Traumanalyse-Experte mit tiefem Verständnis für Symbolik und Psychologie. Antworten Sie immer auf Deutsch und geben Sie nur ein JSON-Objekt zurück. Ihre Aufgabe ist es, eine gründliche, detaillierte Analyse mit umfassenden, praktischen Empfehlungen zu liefern, die der Person helfen, Einsichten aus Träumen zu verstehen und im täglichen Leben zu nutzen. Empfehlungen sollten lang, detailliert und nützlich sein - nicht kurz oder allgemein.',
        instruction: `Analysieren Sie meinen Traum anhand der folgenden Daten:
        
        Traumtitel: ${dream.title}
        Trauminhalt: ${dream.content}
        Stimmung: ${dream.mood || 'Nicht angegeben'}
        Tags: ${dream.tags ? dream.tags.join(', ') : 'Keine angegeben'}
        
        Geben Sie die Analyse im folgenden JSON-Format auf Deutsch zurück:
        {
          "themes": [Liste der Hauptthemen aus dem Traum],
          "emotions": [Liste der im Traum auftretenden Emotionen],
          "symbols": [
            {
              "symbol": "Symbolname",
              "meaning": "Symbolbedeutung"
            }
          ],
          "analysis_text": "detaillierte Traumanalyse auf Deutsch",
          "recommendations": "umfassende und detaillierte Empfehlungen für weitere Reflexion und Handlung (3-5 konkrete Empfehlungen, jede in ihrem eigenen Absatz mit Erklärung und praktischen Ratschlägen)",
          "reflection_questions": [
            "Spezifische Frage 1 im Zusammenhang mit diesem Traum",
            "Spezifische Frage 2 im Zusammenhang mit diesem Traum",
            "Spezifische Frage 3 im Zusammenhang mit diesem Traum"
          ]
        }

BESONDERE ANWEISUNGEN FÜR EMPFEHLUNGEN:
- Schreiben Sie 3-5 konkrete, detaillierte Empfehlungen
- Jede Empfehlung sollte ein langer Absatz (3-5 Sätze) mit Erklärung sein, WARUM sie wichtig ist
- Fügen Sie praktische Schritte hinzu, die die Person unternehmen kann
- Verbinden Sie Empfehlungen mit Elementen aus dem Traum und ihrer symbolischen Bedeutung

WICHTIG für reflection_questions:
- Fragen MÜSSEN spezifisch für diese genauen Träume sein: "${dream.title}" - "${dream.content.substring(0, 100)}..."
- Fragen sollten mit "Denken Sie über..." beginnen
- Fragen sollten direkt Elemente aus dem Traum erwähnen (Personen, Orte, Objekte, Situationen)

WICHTIG: Geben Sie NUR ein sauberes JSON-Objekt ohne Markdown-Codeblöcke, ohne \`\`\`json und ohne \`\`\`, ohne zusätzlichen Text zurück.`
      }
    };

    const languagePrompts = prompts[detectedLanguage] || prompts['en'];

    // Get Lovable API key
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
    }

    console.log('Sending request to Lovable AI...');

    // Call Lovable AI API
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: languagePrompts.system },
          { role: 'user', content: languagePrompts.instruction }
        ],
        max_tokens: 2800,
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
      const errorText = await response.text();
      console.error('Lovable AI API error:', errorText);
      throw new Error(`Lovable AI API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    console.log('Lovable AI response received');

    if (!aiData.choices || !aiData.choices[0]) {
      throw new Error('Invalid AI response format');
    }

    const analysisContent = aiData.choices[0].message.content;
    console.log('Analysis content:', analysisContent);

    // Parse the JSON response from AI with enhanced cleaning
    let parsedAnalysis;
    try {
      // Enhanced JSON cleaning to handle control characters and newlines
      let cleanedContent = analysisContent.replace(/```json|```/g, '').trim();
      
      // Remove or escape problematic control characters step by step
      cleanedContent = cleanedContent
        // Remove control characters except newlines, tabs, and carriage returns
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // Handle newlines in JSON strings properly
        .replace(/(?<!\\)\n/g, '\\n')
        // Handle carriage returns
        .replace(/(?<!\\)\r/g, '\\r')
        // Handle tabs
        .replace(/(?<!\\)\t/g, '\\t');

      console.log('Cleaned content for parsing:', cleanedContent);
      parsedAnalysis = JSON.parse(cleanedContent);
      
      // Validate required fields
      if (!parsedAnalysis.themes || !parsedAnalysis.emotions || !parsedAnalysis.symbols || !parsedAnalysis.analysis_text || !parsedAnalysis.recommendations) {
        throw new Error('Missing required fields in analysis');
      }
      
    } catch (parseError) {
      console.error('Error parsing AI JSON response:', parseError);
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      const positionMatch = errorMessage.match(/position (\d+)/);
      console.error('Parse error details:', {
        message: errorMessage,
        position: positionMatch?.[1]
      });
      console.error('Raw content:', analysisContent);
      
      // Try alternative cleaning approach
      try {
        const alternativeClean = analysisContent
          .replace(/```json|```/g, '')
          // Replace all problematic characters with spaces and normalize
          .replace(/[\x00-\x1F\x7F]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        parsedAnalysis = JSON.parse(alternativeClean);
        console.log('Successfully parsed with alternative cleaning');
        
      } catch (secondError) {
        console.error('Alternative parsing also failed:', secondError);
        
        // Final fallback: extract structured content using regex
        try {
          const themeMatch = analysisContent.match(/"themes":\s*\[(.*?)\]/s);
          const emotionMatch = analysisContent.match(/"emotions":\s*\[(.*?)\]/s);
          const analysisMatch = analysisContent.match(/"analysis_text":\s*"(.*?)"/s);
          const recommendationsMatch = analysisContent.match(/"recommendations":\s*"(.*?)"/s);
          const questionsMatch = analysisContent.match(/"reflection_questions":\s*\[(.*?)\]/s);
          
          parsedAnalysis = {
            themes: themeMatch ? JSON.parse(`[${themeMatch[1]}]`) : ["Splošna analiza"],
            emotions: emotionMatch ? JSON.parse(`[${emotionMatch[1]}]`) : ["Različna čustva"],
            symbols: [{ symbol: "sanje", meaning: "simboli iz sanj" }],
            analysis_text: analysisMatch ? analysisMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : "Analiza ni bila mogoča zaradi napake pri obdelavi.",
            recommendations: recommendationsMatch ? recommendationsMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : "Priporočila niso na voljo zaradi napake pri obdelavi.",
            reflection_questions: questionsMatch ? JSON.parse(`[${questionsMatch[1]}]`) : ["Razmislite o svojih sanjah."]
          };
          console.log('Successfully extracted content using regex fallback');
          
        } catch (regexError) {
          console.error('Regex extraction also failed:', regexError);
          
          // Ultimate fallback: create simple structure
          parsedAnalysis = {
            themes: ['Splošna analiza'],
            emotions: ['Različna čustva'],
            symbols: [{ symbol: "sanje", meaning: "simboli iz sanj" }],
            analysis_text: analysisContent.replace(/```json|```/g, '').trim() || 'Analiza ni bila mogoča zaradi napake pri obdelavi.',
            recommendations: 'Priporočila niso na voljo zaradi napake pri obdelavi.',
            reflection_questions: ["Razmislite o svojih sanjah."]
          };
        }
      }
    }

    // Generate AI image for the dream
    let imageUrl = null;
    try {
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        console.warn('LOVABLE_API_KEY not configured, skipping image generation');
      } else {
        // Create descriptive prompt from actual dream content
        const dreamSummary = dream.content.substring(0, 500); // First 500 chars of actual content
        const emotionsText = parsedAnalysis.emotions?.slice(0, 3).join(', ') || '';
        const symbolsText = parsedAnalysis.symbols?.slice(0, 3).map((s: any) => s.symbol).join(', ') || '';
        const themesText = parsedAnalysis.themes?.slice(0, 3).join(', ') || '';
        
        const imagePrompt = `Create a vivid, artistic illustration that captures this dream scene: "${dreamSummary}". 

Key elements to include: ${symbolsText}
Themes: ${themesText}
Emotional tone: ${emotionsText}
Art style: Surreal dreamscape, artistic, cinematic, atmospheric. Use visual metaphors and symbolic imagery. The mood should reflect the dream's emotional content - not artificially cheerful.

Important: Focus on accurately depicting the specific scenes, actions, and settings from the dream content, not generic dream symbols.`;
        
        console.log('Generating AI image with prompt:', imagePrompt);
        
        const imageResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: imagePrompt
              }
            ],
            modalities: ['image', 'text']
          }),
        });

        if (imageResponse.ok) {
          const imageData = await imageResponse.json();
          
          // Log the full response to debug the structure
          console.log('Image API response structure:', JSON.stringify(imageData, null, 2));
          
          // Try to extract the image URL
          imageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (imageUrl) {
            console.log('AI image generated successfully, URL length:', imageUrl.length);
          } else {
            console.error('Image URL not found in response. Response:', imageData);
          }
        } else {
          const errorText = await imageResponse.text();
          console.error('Image generation failed:', imageResponse.status, errorText);
        }
      }
    } catch (imageError) {
      console.error('Error generating image:', imageError);
      // Continue without image if generation fails
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
        reflection_questions: parsedAnalysis.reflection_questions || [],
        image_url: imageUrl
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});