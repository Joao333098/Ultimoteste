import translate from 'google-translate-api-x';

// Função auxiliar para mapear códigos de idioma
function mapLanguageCode(langCode: string): string {
  const langMap: Record<string, string> = {
    'pt-BR': 'pt',
    'en-US': 'en', 
    'es-ES': 'es',
    'pt': 'pt',
    'en': 'en',
    'es': 'es'
  };
  return langMap[langCode] || langCode.split('-')[0];
}

// Tradução básica de fallback
function basicTranslation(text: string, targetLanguage: string): {
  translatedText: string;
  confidence: number;
  detectedLanguage: string;
} {
  console.log('🔄 Usando tradução básica de fallback');

  // Dicionário básico de traduções
  const basicDict: Record<string, Record<string, string>> = {
    "pt-BR": {
      "hello": "olá",
      "good": "bom", 
      "bad": "ruim",
      "yes": "sim",
      "no": "não",
      "thank you": "obrigado",
      "please": "por favor",
      "hola": "olá",
      "bueno": "bom",
      "malo": "ruim",
      "sí": "sim",
      "gracias": "obrigado",
      "cómo": "como",
      "dónde": "onde",
      "cuándo": "quando",
      "por qué": "por que"
    },
    "en-US": {
      "olá": "hello",
      "bom": "good", 
      "ruim": "bad",
      "sim": "yes",
      "não": "no",
      "obrigado": "thank you",
      "por favor": "please",
      "como": "how",
      "onde": "where", 
      "quando": "when",
      "por que": "why",
      "hola": "hello",
      "bueno": "good",
      "malo": "bad",
      "sí": "yes",
      "gracias": "thank you"
    },
    "es-ES": {
      "olá": "hola",
      "bom": "bueno",
      "ruim": "malo", 
      "sim": "sí",
      "não": "no",
      "obrigado": "gracias",
      "por favor": "por favor",
      "hello": "hola",
      "good": "bueno",
      "bad": "malo",
      "yes": "sí",
      "thank you": "gracias",
      "please": "por favor",
      "como": "cómo",
      "onde": "dónde",
      "quando": "cuándo",
      "por que": "por qué"
    }
  };

  let translatedText = text;
  const dictionary = basicDict[targetLanguage];

  if (dictionary) {
    Object.entries(dictionary).forEach(([original, translation]) => {
      const regex = new RegExp(`\\b${original}\\b`, 'gi');
      translatedText = translatedText.replace(regex, translation);
    });
  }

  // Se houve mudanças, retornar tradução; se não, indicar que precisa de API
  if (translatedText !== text) {
    return {
      translatedText: translatedText,
      confidence: 0.6,
      detectedLanguage: "Traduzido com dicionário básico"
    };
  } else {
    return {
      translatedText: `[TRADUÇÃO INDISPONÍVEL] Configure Google Translate API ou GLM4_API_KEY para traduzir: "${text}"`,
      confidence: 0.1,
      detectedLanguage: "Não foi possível traduzir"
    };
  }
}

export async function translateText(
  text: string,
  targetLanguage: string = "pt-BR",
  isAutoTranslation: boolean = false
): Promise<{
  translatedText: string;
  confidence: number;
  detectedLanguage: string;
}> {
  console.log(`🌐 Iniciando tradução Google: "${text}" → ${targetLanguage}`);

  try {
    // Usar Google Translate API como método principal
    const targetLangCode = mapLanguageCode(targetLanguage);
    const result = await translate(text, { to: targetLangCode });
    
    console.log(`✅ Google Translate sucesso: "${result.text}"`);
    
    return {
      translatedText: result.text,
      confidence: 0.95,
      detectedLanguage: result.from.language.iso || "auto-detectado"
    };
    
  } catch (googleError: any) {
    console.error('❌ Erro no Google Translate:', googleError.message);
    console.log('🔄 Usando fallback básico...');
    
    // Se Google Translate falhar, usar tradução básica
    return basicTranslation(text, targetLanguage);
  }
}