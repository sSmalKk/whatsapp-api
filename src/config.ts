import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Configuração global
export const sessionFolderPath: string = process.env.SESSIONS_PATH || './sessions';
export const enableLocalCallbackExample: boolean = (process.env.ENABLE_LOCAL_CALLBACK_EXAMPLE || '').toLowerCase() === 'true';
export const globalApiKey: string | undefined = process.env.API_KEY;
export const baseWebhookURL: string | undefined = process.env.BASE_WEBHOOK_URL;
export const maxAttachmentSize: number = parseInt(process.env.MAX_ATTACHMENT_SIZE || '10000000', 10);
export const setMessagesAsSeen: boolean = (process.env.SET_MESSAGES_AS_SEEN || '').toLowerCase() === 'true';
export const disabledCallbacks: string[] = process.env.DISABLED_CALLBACKS ? process.env.DISABLED_CALLBACKS.split('|') : [];
export const enableSwaggerEndpoint: boolean = (process.env.ENABLE_SWAGGER_ENDPOINT || '').toLowerCase() === 'true';
export const webVersion: string | undefined = process.env.WEB_VERSION;
export const webVersionCacheType: string = process.env.WEB_VERSION_CACHE_TYPE || 'none';
export const rateLimitMax: number = parseInt(process.env.RATE_LIMIT_MAX || '1000', 10);
export const rateLimitWindowMs: number = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '1000', 10);
export const recoverSessions: boolean = (process.env.RECOVER_SESSIONS || '').toLowerCase() === 'true';
