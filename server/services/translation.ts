import translate from 'google-translate-api-x';

// Função auxiliar para mapear códigos de idioma
function mapLanguageCode(langCode: string): string {
  const langMap: Record<string, string> = {
    'pt-BR': 'pt',
    'en-US': 'en', 
    'es-ES': 'es'
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
      "please": "por favor"
    },
    "en-US": {
      "olá": "hello",
      "bom": "good", 
      "ruim": "bad",
      "sim": "yes",
      "não": "no",
      "obrigado": "thank you",
      "por favor": "please"
    },
    "es-ES": {
      "olá": "hola",
      "bom": "bueno",
      "ruim": "malo", 
      "sim": "sí",
      "não": "no",
      "obrigado": "gracias",
      "por favor": "por favor"
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

  return {
    translatedText: translatedText === text ? `[Tradução básica] ${text}` : translatedText,
    confidence: 0.3,
    detectedLanguage: "Auto-detectado"
  };
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