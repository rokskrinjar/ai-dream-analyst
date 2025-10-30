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
        system: 'You are an expert dream analyst combining psychological frameworks from Freud, Jung, Gestalt therapy, and cognitive neuroscience. Always respond in English and return only a JSON object.',
        instruction: `Analyze this dream with deep psychological insight:

Title: ${dream.title}
Content: ${dream.content}
Date: ${dream.dream_date}
Mood: ${dream.mood || 'Not specified'}
Primary Emotion: ${dream.primary_emotion || 'Not specified'}

REQUIRED JSON OUTPUT:
{
  "summary": "4-6 sentence analytical summary including key events, main themes/symbols, emotional tone, and central psychological insight",
  "initial_exploration": {
    "core_narrative": "2-3 sentences describing the basic story, setting, and plot",
    "key_imagery": ["striking object/person 1", "striking action 1", "striking object 2", ...],
    "emotional_tone": "Primary feeling with nuance (e.g., 'anxious determination', 'joyful nostalgia')",
    "characters": ["character 1: role and interaction", "character 2: role and interaction", ...]
  },
  "psychological_perspectives": {
    "freudian": {
      "manifest_content": "What literally happened (2-3 sentences)",
      "latent_content": "Hidden wish or repressed thought (2-3 sentences)",
      "interpretation": "Psychodynamic meaning in terms of unconscious desires, conflicts, or defenses (3-4 sentences)"
    },
    "jungian": {
      "archetypes_identified": ["The Shadow: description", "The Anima/Animus: description", ...],
      "individuation_stage": "Where the dreamer is in the journey toward wholeness (2-3 sentences)",
      "collective_unconscious": "Universal symbols and their significance (2-3 sentences)"
    },
    "gestalt": {
      "fragmented_parts": ["part 1 of dreamer's psyche", "part 2...", ...],
      "integration_message": "How the dream shows split-off aspects seeking integration (3-4 sentences)",
      "dreamwork_exercise": "Suggested Gestalt technique to integrate these parts (2-3 sentences)"
    },
    "cognitive": {
      "problem_being_processed": "Real-life concern or memory being worked through (2-3 sentences)",
      "threat_simulation": "Potential threats or challenges being rehearsed (2-3 sentences)",
      "memory_consolidation": "Recent experiences or learning being integrated (2-3 sentences)"
    }
  },
  "structured_analysis": {
    "dominant_theme": "Primary theme based on emotional intensity and symbolism (1-2 sentences)",
    "symbolic_breakdown": [
      {"symbol": "name", "interpretation": "personal meaning", "archetypal_meaning": "universal significance"},
      {"symbol": "name2", "interpretation": "personal meaning", "archetypal_meaning": "universal significance"},
      ...
    ],
    "waking_life_connections": "Key questions linking dream to current life (3-4 questions in paragraph form)",
    "emotional_message": "The most certain psychological message from the dream's emotions (2-3 sentences)"
  },
  "themes": ["theme1", "theme2", "theme3", ...],
  "emotions": ["emotion1", "emotion2", ...],
  "recommendations": "3-5 actionable recommendations based on the analysis (each as a paragraph, separated by \\n\\n)",
  "reflection_questions": ["Deep question 1 specific to this dream?", "Deep question 2?", "Deep question 3?"]
}

CRITICAL REQUIREMENTS:
- All text fields must be thoughtful and substantive
- Each psychological perspective must be distinct and valuable
- Summary must capture BOTH what happened AND what it means psychologically
- Symbolic breakdown must have at least 5-8 symbols with both personal and archetypal meanings
- All arrays must have multiple items (min 3-4 for themes/emotions, 5-8 for symbols)
- Maintain professional psychological depth throughout
- Return ONLY clean JSON without markdown blocks or extra text`
      },
      hr: {
        system: 'Vi ste stručnjak za analizu snova koji kombinira psihološke okvire Freuda, Junga, Gestalt terapije i kognitivne neuroznanosti. Uvijek odgovarajte na hrvatskom i vratite samo JSON objekt.',
        instruction: `Analizirajte ovaj san s dubokim psihološkim uvidom:

Naslov: ${dream.title}
Sadržaj: ${dream.content}
Datum: ${dream.dream_date}
Raspoloženje: ${dream.mood || 'Nije navedeno'}
Primarna emocija: ${dream.primary_emotion || 'Nije navedeno'}

POTREBAN JSON OUTPUT:
{
  "summary": "Analitički sažetak od 4-6 rečenica uključujući ključne događaje, glavne teme/simbole, emocionalni ton i središnji psihološki uvid",
  "initial_exploration": {
    "core_narrative": "2-3 rečenice koje opisuju osnovnu priču, okruženje i zaplet",
    "key_imagery": ["upečatljiv objekt/osoba 1", "upečatljiva akcija 1", "objekt 2", ...],
    "emotional_tone": "Primarna emocija s nijansom (npr., 'tjeskobna odlučnost', 'radosna nostalgija')",
    "characters": ["lik 1: uloga i interakcija", "lik 2: uloga i interakcija", ...]
  },
  "psychological_perspectives": {
    "freudian": {
      "manifest_content": "Što se doslovno dogodilo (2-3 rečenice)",
      "latent_content": "Skrivena želja ili potisnuta misao (2-3 rečenice)",
      "interpretation": "Psihodinamičko značenje u smislu nesvjesnih želja, konflikata ili obrana (3-4 rečenice)"
    },
    "jungian": {
      "archetypes_identified": ["Sjena: opis", "Anima/Animus: opis", ...],
      "individuation_stage": "Gdje se sanjar nalazi na putu prema cjelovitosti (2-3 rečenice)",
      "collective_unconscious": "Univerzalni simboli i njihovo značenje (2-3 rečenice)"
    },
    "gestalt": {
      "fragmented_parts": ["dio 1 sanjareve psihe", "dio 2...", ...],
      "integration_message": "Kako san pokazuje razdvojene aspekte koji traže integraciju (3-4 rečenice)",
      "dreamwork_exercise": "Predložena Gestalt tehnika za integraciju ovih dijelova (2-3 rečenice)"
    },
    "cognitive": {
      "problem_being_processed": "Problem iz stvarnog života ili sjećanje koje se obrađuje (2-3 rečenice)",
      "threat_simulation": "Potencijalne prijetnje ili izazovi koji se uvježbavaju (2-3 rečenice)",
      "memory_consolidation": "Nedavna iskustva ili učenje koje se integrira (2-3 rečenice)"
    }
  },
  "structured_analysis": {
    "dominant_theme": "Primarna tema temeljena na emocionalnom intenzitetu i simbolici (1-2 rečenice)",
    "symbolic_breakdown": [
      {"symbol": "ime", "interpretation": "osobno značenje", "archetypal_meaning": "univerzalno značenje"},
      {"symbol": "ime2", "interpretation": "osobno značenje", "archetypal_meaning": "univerzalno značenje"},
      ...
    ],
    "waking_life_connections": "Ključna pitanja koja povezuju san s trenutnim životom (3-4 pitanja u obliku paragrafa)",
    "emotional_message": "Najsigurnija psihološka poruka iz emocija sna (2-3 rečenice)"
  },
  "themes": ["tema1", "tema2", "tema3", ...],
  "emotions": ["emocija1", "emocija2", ...],
  "recommendations": "3-5 preporuka temeljenih na analizi (svaka kao paragraf, odvojeno sa \\n\\n)",
  "reflection_questions": ["Duboko pitanje 1 specifično za ovaj san?", "Pitanje 2?", "Pitanje 3?"]
}

KRITIČNI ZAHTJEVI:
- Sva tekstualna polja moraju biti promišljena i sadržajna
- Svaka psihološka perspektiva mora biti različita i vrijedna
- Sažetak mora obuhvatiti I što se dogodilo I što to psihološki znači
- Simbolička analiza mora imati najmanje 5-8 simbola s osobnim i arhetipskim značenjima
- Svi nizovi moraju imati više stavki (min 3-4 za teme/emocije, 5-8 za simbole)
- Održavajte profesionalnu psihološku dubinu
- Vratite SAMO čisti JSON bez markdown blokova ili dodatnog teksta`
      },
      sl: {
        system: 'Si strokovnjak za analizo sanj, ki združuje psihološke okvire Freuda, Junga, Gestalt terapije in kognitivne nevroznanosti. Vedno odgovarjaj v slovenščini in vrni samo JSON objekt.',
        instruction: `Analiziraj te sanje z globokim psihološkim vpogledom:

Naslov: ${dream.title}
Vsebina: ${dream.content}
Datum: ${dream.dream_date}
Razpoloženje: ${dream.mood || 'Ni navedeno'}
Primarno čustvo: ${dream.primary_emotion || 'Ni navedeno'}

ZAHTEVAN JSON OUTPUT:
{
  "summary": "Analitični povzetek v 4-6 stavkih, vključno s ključnimi dogodki, glavnimi temami/simboli, čustvenim tonom in osrednjim psihološkim vpogledom",
  "initial_exploration": {
    "core_narrative": "2-3 stavki, ki opisujejo osnovno zgodbo, okolje in zaplet",
    "key_imagery": ["izrazit objekt/oseba 1", "izrazito dejanje 1", "objekt 2", ...],
    "emotional_tone": "Primarno čustvo z nianso (npr., 'tesnobna odločnost', 'radostna nostalgija')",
    "characters": ["lik 1: vloga in interakcija", "lik 2: vloga in interakcija", ...]
  },
  "psychological_perspectives": {
    "freudian": {
      "manifest_content": "Kaj se je dobesedno zgodilo (2-3 stavki)",
      "latent_content": "Skrita želja ali potisnjena misel (2-3 stavki)",
      "interpretation": "Psihodinamični pomen v smislu nezavednih želja, konfliktov ali obrambnih mehanizmov (3-4 stavki)"
    },
    "jungian": {
      "archetypes_identified": ["Senca: opis", "Anima/Animus: opis", ...],
      "individuation_stage": "Kje se sanjalec nahaja na poti k celovitosti (2-3 stavki)",
      "collective_unconscious": "Univerzalni simboli in njihov pomen (2-3 stavki)"
    },
    "gestalt": {
      "fragmented_parts": ["del 1 sanjalčeve psihe", "del 2...", ...],
      "integration_message": "Kako sanje kažejo razcepljene vidike, ki iščejo integracijo (3-4 stavki)",
      "dreamwork_exercise": "Predlagana Gestalt tehnika za integracijo teh delov (2-3 stavki)"
    },
    "cognitive": {
      "problem_being_processed": "Realna življenjska skrb ali spomin, ki se obdeluje (2-3 stavki)",
      "threat_simulation": "Potencialne grožnje ali izzivi, ki se vadijo (2-3 stavki)",
      "memory_consolidation": "Nedavne izkušnje ali učenje, ki se integrira (2-3 stavki)"
    }
  },
  "structured_analysis": {
    "dominant_theme": "Primarna tema, ki temelji na čustveni intenzivnosti in simboliki (1-2 stavka)",
    "symbolic_breakdown": [
      {"symbol": "ime", "interpretation": "osebni pomen", "archetypal_meaning": "univerzalni pomen"},
      {"symbol": "ime2", "interpretation": "osebni pomen", "archetypal_meaning": "univerzalni pomen"},
      ...
    ],
    "waking_life_connections": "Ključna vprašanja, ki povezujejo sanje s trenutnim življenjem (3-4 vprašanja v obliki odstavka)",
    "emotional_message": "Najprepričljivejše psihološko sporočilo iz čustev sanj (2-3 stavki)"
  },
  "themes": ["tema1", "tema2", "tema3", ...],
  "emotions": ["čustvo1", "čustvo2", ...],
  "recommendations": "3-5 priporočil, ki temeljijo na analizi (vsako kot odstavek, ločeno z \\n\\n)",
  "reflection_questions": ["Globoko vprašanje 1, specifično za te sanje?", "Vprašanje 2?", "Vprašanje 3?"]
}

KRITIČNE ZAHTEVE:
- Vsa besedilna polja morajo biti premišljena in vsebinska
- Vsaka psihološka perspektiva mora biti drugačna in vredna
- Povzetek mora zajeti TAKO kaj se je zgodilo KOT tudi kaj to psihološko pomeni
- Simbolna analiza mora imeti vsaj 5-8 simbolov z osebnimi in arhetipskimi pomeni
- Vsi seznami morajo imeti več elementov (min 3-4 za teme/čustva, 5-8 za simbole)
- Ohranjaj profesionalno psihološko globino
- Vrni SAMO čist JSON brez markdown blokov ali dodatnega besedila`
      },
      de: {
        system: 'Sie sind ein Traumanalyse-Experte, der psychologische Frameworks von Freud, Jung, Gestalttherapie und kognitiver Neurowissenschaft kombiniert. Antworten Sie immer auf Deutsch und geben Sie nur ein JSON-Objekt zurück.',
        instruction: `Analysieren Sie diesen Traum mit tiefem psychologischem Einblick:

Titel: ${dream.title}
Inhalt: ${dream.content}
Datum: ${dream.dream_date}
Stimmung: ${dream.mood || 'Nicht angegeben'}
Primäre Emotion: ${dream.primary_emotion || 'Nicht angegeben'}

ERFORDERLICHE JSON-AUSGABE:
{
  "summary": "Analytische Zusammenfassung in 4-6 Sätzen einschließlich Schlüsselereignissen, Hauptthemen/Symbolen, emotionalem Ton und zentraler psychologischer Einsicht",
  "initial_exploration": {
    "core_narrative": "2-3 Sätze, die die Grundgeschichte, das Setting und den Handlungsverlauf beschreiben",
    "key_imagery": ["auffälliges Objekt/Person 1", "auffällige Handlung 1", "Objekt 2", ...],
    "emotional_tone": "Primäres Gefühl mit Nuance (z.B., 'ängstliche Entschlossenheit', 'freudige Nostalgie')",
    "characters": ["Figur 1: Rolle und Interaktion", "Figur 2: Rolle und Interaktion", ...]
  },
  "psychological_perspectives": {
    "freudian": {
      "manifest_content": "Was buchstäblich geschah (2-3 Sätze)",
      "latent_content": "Verborgener Wunsch oder verdrängter Gedanke (2-3 Sätze)",
      "interpretation": "Psychodynamische Bedeutung im Hinblick auf unbewusste Wünsche, Konflikte oder Abwehrmechanismen (3-4 Sätze)"
    },
    "jungian": {
      "archetypes_identified": ["Der Schatten: Beschreibung", "Die Anima/Animus: Beschreibung", ...],
      "individuation_stage": "Wo sich der Träumende auf dem Weg zur Ganzheit befindet (2-3 Sätze)",
      "collective_unconscious": "Universelle Symbole und ihre Bedeutung (2-3 Sätze)"
    },
    "gestalt": {
      "fragmented_parts": ["Teil 1 der Träumerpsyche", "Teil 2...", ...],
      "integration_message": "Wie der Traum abgespaltene Aspekte zeigt, die Integration suchen (3-4 Sätze)",
      "dreamwork_exercise": "Vorgeschlagene Gestalt-Technik zur Integration dieser Teile (2-3 Sätze)"
    },
    "cognitive": {
      "problem_being_processed": "Reales Lebensproblem oder Erinnerung, die verarbeitet wird (2-3 Sätze)",
      "threat_simulation": "Potenzielle Bedrohungen oder Herausforderungen, die geprobt werden (2-3 Sätze)",
      "memory_consolidation": "Kürzliche Erfahrungen oder Lernen, das integriert wird (2-3 Sätze)"
    }
  },
  "structured_analysis": {
    "dominant_theme": "Hauptthema basierend auf emotionaler Intensität und Symbolik (1-2 Sätze)",
    "symbolic_breakdown": [
      {"symbol": "Name", "interpretation": "persönliche Bedeutung", "archetypal_meaning": "universelle Bedeutung"},
      {"symbol": "Name2", "interpretation": "persönliche Bedeutung", "archetypal_meaning": "universelle Bedeutung"},
      ...
    ],
    "waking_life_connections": "Schlüsselfragen, die den Traum mit dem aktuellen Leben verbinden (3-4 Fragen in Absatzform)",
    "emotional_message": "Die sicherste psychologische Botschaft aus den Emotionen des Traums (2-3 Sätze)"
  },
  "themes": ["Thema1", "Thema2", "Thema3", ...],
  "emotions": ["Emotion1", "Emotion2", ...],
  "recommendations": "3-5 Empfehlungen basierend auf der Analyse (jede als Absatz, getrennt durch \\n\\n)",
  "reflection_questions": ["Tiefe Frage 1 spezifisch für diesen Traum?", "Frage 2?", "Frage 3?"]
}

KRITISCHE ANFORDERUNGEN:
- Alle Textfelder müssen durchdacht und substanziell sein
- Jede psychologische Perspektive muss unterschiedlich und wertvoll sein
- Zusammenfassung muss SOWOHL was geschah ALS AUCH was es psychologisch bedeutet erfassen
- Symbolische Analyse muss mindestens 5-8 Symbole mit persönlichen und archetypischen Bedeutungen haben
- Alle Arrays müssen mehrere Elemente haben (min 3-4 für Themen/Emotionen, 5-8 für Symbole)
- Professionelle psychologische Tiefe beibehalten
- Nur sauberes JSON ohne Markdown-Blöcke oder zusätzlichen Text zurückgeben`
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
        max_tokens: 4500,
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
      if (!parsedAnalysis.summary || parsedAnalysis.summary.length < 100) {
        throw new Error('Summary must be at least 100 characters');
      }
      
      if (!parsedAnalysis.initial_exploration || !parsedAnalysis.psychological_perspectives || !parsedAnalysis.structured_analysis) {
        throw new Error('Missing required analysis sections');
      }
      
      // Validate psychological perspectives
      const perspectives = parsedAnalysis.psychological_perspectives;
      if (!perspectives.freudian || !perspectives.jungian || !perspectives.gestalt || !perspectives.cognitive) {
        throw new Error('All 4 psychological perspectives are required');
      }
      
      // Validate structured analysis
      if (!parsedAnalysis.structured_analysis.symbolic_breakdown || 
          !Array.isArray(parsedAnalysis.structured_analysis.symbolic_breakdown) ||
          parsedAnalysis.structured_analysis.symbolic_breakdown.length < 5) {
        throw new Error('Symbolic breakdown must have at least 5 symbols');
      }
      
      // Validate basic fields
      if (!parsedAnalysis.themes || !parsedAnalysis.emotions || !parsedAnalysis.recommendations) {
        throw new Error('Missing themes, emotions, or recommendations');
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
        summary: parsedAnalysis.summary,
        analysis_data: parsedAnalysis,
        // Keep legacy fields for backward compatibility
        themes: parsedAnalysis.themes || [],
        emotions: parsedAnalysis.emotions || [],
        symbols: parsedAnalysis.structured_analysis?.symbolic_breakdown?.map((s: any) => s.symbol) || [],
        analysis_text: parsedAnalysis.summary || 'Analiza ni na voljo.',
        recommendations: parsedAnalysis.recommendations || 'Priporočila niso na voljo.',
        reflection_questions: parsedAnalysis.reflection_questions || [],
        image_url: imageUrl,
        language: detectedLanguage
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