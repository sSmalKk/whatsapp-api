import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { globalApiKey, rateLimitMax, rateLimitWindowMs } from './config';
import { sendErrorResponse } from './utils';
import { validateSession } from './sessions';

const apikey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('Expected API Key:', globalApiKey);
  console.log('Received API Key:', req.headers['x-api-key']);

  if (globalApiKey) {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey || apiKey !== globalApiKey) {
      return sendErrorResponse(res, 403, 'Invalid API key');
    }
  }
  next();
};

const sessionNameValidation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!/^[\w-]+$/.test(req.params.sessionId)) {
    return sendErrorResponse(res, 422, 'Session should be alphanumerical or -'); // Altere de 403 para 422
  }
  next();
};

const sessionValidation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const validation = await validateSession(req.params.sessionId);
  if (validation.success !== true) {
    /* #swagger.responses[404] = {
        description: "Not Found.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/NotFoundResponse" }
          }
        }
      }
    */
    return sendErrorResponse(
      res, 404, validation.message,
    );
  }
  next();
};

const rateLimiter = rateLimit({
  max: rateLimitMax,
  windowMs: rateLimitWindowMs,
  message: "You can't make any more requests at the moment. Try again later",
});

const sessionSwagger = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  next();
  /*
  #swagger.tags = ['Session']
*/
};

const clientSwagger = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  /*
  #swagger.tags = ['Client']
*/
  next();
};

const contactSwagger = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  next();
  /*
  #swagger.tags = ['Contact']
  #swagger.requestBody = {
    required: true,
    schema: {
      type: 'object',
      properties: {
        contactId: {
          type: 'string',
          description: 'Unique whatsApp identifier for the contact',
          example: '6281288888888@c.us'
        }
      }
    }
  }
*/

};

const messageSwagger = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  next();
  /*
  #swagger.tags = ['Message']
  #swagger.requestBody = {
    required: true,
    schema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'The Chat id which contains the message',
          example: '6281288888888@c.us'
        },
        messageId: {
          type: 'string',
          description: 'Unique whatsApp identifier for the message',
          example: 'ABCDEF999999999'
        }
      }
    }
  }
*/
};

const chatSwagger = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  next();
  /*
  #swagger.tags = ['Chat']
  #swagger.requestBody = {
    required: true,
    schema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'Unique whatsApp identifier for the given Chat (either group or personnal)',
          example: '6281288888888@c.us'
        }
      }
    }
  }
*/
};

const groupChatSwagger = async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
  next();
  /*
  #swagger.tags = ['Group Chat']
  #swagger.requestBody = {
    required: true,
    schema: {
      type: 'object',
      properties: {
        chatId: {
          type: 'string',
          description: 'Unique whatsApp identifier for the given Chat (either group or personnal)',
          example: '6281288888888@c.us'
        }
      }
    }
  }
*/
};

const middleware = {
  sessionValidation,
  apikey,
  sessionNameValidation,
  sessionSwagger,
  clientSwagger,
  contactSwagger,
  messageSwagger,
  chatSwagger,
  groupChatSwagger,
  rateLimiter,
};

export default middleware;
