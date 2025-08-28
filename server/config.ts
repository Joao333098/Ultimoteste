import fs from 'fs';
import path from 'path';

// Carregar configurações do JSON
const configPath = path.join(process.cwd(), 'config.json');
const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export const config = {
  // API Keys
  GLM4_API_KEY: "b485981aab354d57b8c5c4ae99f8eac3.J4PnQJDNSLMSqwJy",
  GLM4_TRANSLATION_API_KEY: "169333d61357466ab7078e7d02234777.y5QbB9ANOULVdNrf",

  // Outras configurações vêm do JSON
  app: configJson.app,
  ai: {
    ...configJson.ai,
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    model: "glm-4-flash"
  },
  translation: configJson.translation,
  transcription: configJson.transcription
};