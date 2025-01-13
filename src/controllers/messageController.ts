import { sessions } from '../sessions';
import { Request, Response } from 'express';

import { sendErrorResponse } from '../utils';
import { Contact, Message, MessageInfo, MessageMedia, Order } from 'whatsapp-web.js';
/**
 * Get message by its ID from a given chat using the provided client.
 * @async
 * @function
 * @param {object} client - The chat client.
 * @param {string} messageId - The ID of the message to get.
 * @param {string} chatId - The ID of the chat to search in.
 * @returns {Promise<object>} - A Promise that resolves with the message object that matches the provided ID, or undefined if no such message exists.
 * @throws {Error} - Throws an error if the provided client, message ID or chat ID is invalid.
 */
const _getMessageById = async (client: { getChatById: (arg0: string) => any }, messageId: string, chatId: string) => {
  const chat = await client.getChatById(chatId);
  const messages = await chat.fetchMessages({ limit: 100 });
  const message = messages.find((message: { id: { id: string } }) => message.id.id === messageId);
  return message;
}

/**
 * Gets information about a message's class.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.messageId - The message ID.
 * @param {string} req.body.chatId - The chat ID.
 * @returns {Promise<void>} - A Promise that resolves with no value when the function completes.
 */
interface GetClassInfoBody {
  messageId: string;
  chatId: string;
}

interface GetClassInfoResponse {
  success: boolean;
  message: Message;
}

const getClassInfo = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetClassInfoResponse>
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    res.json({ success: true, message });
  } catch (error: unknown) {
    console.error('getClassInfo ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Deletes a message.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.messageId - The message ID.
 * @param {string} req.body.chatId - The chat ID.
 * @param {boolean} req.body.everyone - Whether to delete the message for everyone or just the sender.
 * @returns {Promise<void>} - A Promise that resolves with no value when the function completes.
 */
// Interface para o corpo da requisição
interface DeleteMessageBody {
  messageId: string;
  chatId: string;
  everyone: boolean;
}

interface DeleteMessageResponse {
  success: boolean;
  result: boolean;  // Se a operação de delete retorna um booleano
}

const deleteMessage = async (
  req: Request<{ sessionId: string }>,
  res: Response<DeleteMessageResponse>
): Promise<void> => {
  try {
    const { messageId, chatId, everyone } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    const result = await message.delete(everyone);

    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('deleteMessage ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Downloads media from a message.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.messageId - The message ID.
 * @param {string} req.body.chatId - The chat ID.
 * @param {boolean} req.body.everyone - Whether to download the media for everyone or just the sender.
 * @returns {Promise<void>} - A Promise that resolves with no value when the function completes.
 */
// Interface para o corpo da requisição
// Interface para o corpo da requisição
interface DownloadMediaBody {
  messageId: string;
  chatId: string;
  everyone: boolean;
}

// Interface para a resposta
interface DownloadMediaResponse {
  success: boolean;
  messageMedia: MessageMedia; // Usando MessageMedia como tipo
}

const downloadMedia = async (
  req: Request<{ sessionId: string }>,  // Tipo de requisição
  res: Response<DownloadMediaResponse>  // Tipo de resposta
): Promise<void> => {
  try {
    const { messageId, chatId, everyone } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Faz o download da mídia da mensagem
    const messageMedia = await message.downloadMedia(everyone);

    // Retorna a mídia da mensagem
    res.json({ success: true, messageMedia });
  } catch (error: unknown) {
    console.error('downloadMedia ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Forwards a message to a destination chat.
 * @async
 * @function forward
 * @param {Object} req - The request object received by the server.
 * @param {Object} req.body - The body of the request object.
 * @param {string} req.body.messageId - The ID of the message to forward.
 * @param {string} req.body.chatId - The ID of the chat that contains the message to forward.
 * @param {string} req.body.destinationChatId - The ID of the chat to forward the message to.
 * @param {string} req.params.sessionId - The ID of the session to use the Telegram API with.
 * @param {Object} res - The response object to be sent back to the client.
 * @returns {Object} - The response object with a JSON body containing the result of the forward operation.
 * @throws Will throw an error if the message is not found or if there is an error during the forward operation.
 */
// Interface para o corpo da requisição
interface ForwardBody {
  messageId: string;
  chatId: string;
  destinationChatId: string;
}

interface ForwardResponse {
  success: boolean;
  result: Message; // Alterado para Message
}


const forward = async (
  req: Request<{ sessionId: string }>,  // Tipo correto para o request
  res: Response<ForwardResponse>  // Tipo correto para o response
): Promise<void> => {
  try {
    const { messageId, chatId, destinationChatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Encaminha a mensagem para o destino
    const result = await message.forward(destinationChatId);

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('forward ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Gets information about a message.
 * @async
 * @function getInfo
 * @param {Object} req - The request object received by the server.
 * @param {Object} req.body - The body of the request object.
 * @param {string} req.body.messageId - The ID of the message to get information about.
 * @param {string} req.body.chatId - The ID of the chat that contains the message to get information about.
 * @param {string} req.params.sessionId - The ID of the session to use the Telegram API with.
 * @param {Object} res - The response object to be sent back to the client.
 * @returns {Object} - The response object with a JSON body containing the information about the message.
 * @throws Will throw an error if the message is not found or if there is an error during the get info operation.
 */
// Interface para o corpo da requisição
interface GetInfoBody {
  messageId: string;
  chatId: string;
}

// Interface para a resposta
interface GetInfoResponse {
  success: boolean;
  info: MessageInfo;  // Usando um tipo mais específico que representa as informações da mensagem
}

const getInfo = async (
  req: Request<{ sessionId: string }>, // Tipagem correta para o 'req'
  res: Response<GetInfoResponse> // Tipagem correta para o 'res'
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Obtém as informações da mensagem
    const info = await message.getInfo();

    // Retorna as informações da mensagem
    res.json({ success: true, info });
  } catch (error: unknown) {
    console.error('getInfo ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Retrieves a list of contacts mentioned in a specific message
 *
 * @async
 * @function
 * @param {Object} req - The HTTP request object
 * @param {Object} req.body - The request body
 * @param {string} req.body.messageId - The ID of the message to retrieve mentions from
 * @param {string} req.body.chatId - The ID of the chat where the message was sent
 * @param {string} req.params.sessionId - The ID of the session for the client making the request
 * @param {Object} res - The HTTP response object
 * @returns {Promise<void>} - The JSON response with the list of contacts
 * @throws {Error} - If there's an error retrieving the message or mentions
 */

// Interface para o corpo da requisição
interface GetMentionsBody {
  messageId: string;
  chatId: string;
}

// Interface para a resposta
interface GetMentionsResponse {
  success: boolean;
  contacts: Contact[];
}

const getMentions = async (
  req: Request<{ sessionId: string }>, // Tipagem correta para 'req'
  res: Response<GetMentionsResponse> // Tipagem correta para 'res'
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Obtém as menções da mensagem
    const contacts = await message.getMentions();

    // Retorna as menções
    res.json({ success: true, contacts });
  } catch (error: unknown) {
    console.error('getMentions ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Retrieves the order information contained in a specific message
 *
 * @async
 * @function
 * @param {Object} req - The HTTP request object
 * @param {Object} req.body - The request body
 * @param {string} req.body.messageId - The ID of the message to retrieve the order from
 * @param {string} req.body.chatId - The ID of the chat where the message was sent
 * @param {string} req.params.sessionId - The ID of the session for the client making the request
 * @param {Object} res - The HTTP response object
 * @returns {Promise<void>} - The JSON response with the order information
 * @throws {Error} - If there's an error retrieving the message or order information
 */
// Interface para o corpo da requisição
interface GetOrderBody {
  messageId: string;
  chatId: string;
}

// Interface para a resposta
interface GetOrderResponse {
  success: boolean;
  order: Order;
}

const getOrder = async (
  req: Request<{ sessionId: string }>,  // Tipagem correta para 'req'
  res: Response<GetOrderResponse> // Tipagem correta para 'res'
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Obtém a ordem da mensagem
    const order = await message.getOrder();

    // Retorna a ordem
    res.json({ success: true, order });
  } catch (error: unknown) {
    console.error('getOrder ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Retrieves the payment information from a specific message identified by its ID.
 *
 * @async
 * @function getPayment
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID associated with the client making the request.
 * @param {Object} req.body - The message ID and chat ID associated with the message to retrieve payment information from.
 * @param {string} req.body.messageId - The ID of the message to retrieve payment information from.
 * @param {string} req.body.chatId - The ID of the chat the message is associated with.
 * @returns {Object} An object containing a success status and the payment information for the specified message.
 * @throws {Object} If the specified message is not found or if an error occurs during the retrieval process.
 */
// Interface para o corpo da requisição
// Interface para o corpo da requisição
interface GetPaymentBody {
  messageId: string;
  chatId: string;
}

// Interface para a resposta
interface GetPaymentResponse {
  success: boolean;
  payment: any;
}

const getPayment = async (
  req: Request<{ sessionId: string }, {}, GetPaymentBody>,
  res: Response<GetPaymentResponse>
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Obtém o pagamento da mensagem
    const payment = await message.getPayment();

    // Retorna o pagamento
    res.json({ success: true, payment });
  } catch (error: unknown) {
    console.error('getPayment ERROR:', error);
    res.status(500).json({ success: false, payment: null });
  }
};

/**
 * Retrieves the quoted message information from a specific message identified by its ID.
 *
 * @async
 * @function getQuotedMessage
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID associated with the client making the request.
 * @param {Object} req.body - The message ID and chat ID associated with the message to retrieve quoted message information from.
 * @param {string} req.body.messageId - The ID of the message to retrieve quoted message information from.
 * @param {string} req.body.chatId - The ID of the chat the message is associated with.
 * @returns {Object} An object containing a success status and the quoted message information for the specified message.
 * @throws {Object} If the specified message is not found or if an error occurs during the retrieval process.
 */
// Interface para o corpo da requisição
interface GetQuotedMessageBody {
  messageId: string;
  chatId: string;
}

// Interface para a resposta
interface GetQuotedMessageResponse {
  success: boolean;
  quotedMessage: any;
}

const getQuotedMessage = async (
  req: Request<{ sessionId: string }, {}, GetQuotedMessageBody>,
  res: Response<GetQuotedMessageResponse>
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Obtém a mensagem citada
    const quotedMessage = await message.getQuotedMessage();

    // Retorna a mensagem citada
    res.json({ success: true, quotedMessage });
  } catch (error: unknown) {
    console.error('getQuotedMessage ERROR:', error);
    res.status(500).json({ success: false, quotedMessage: null });
  }
};



/**
 * React to a specific message in a chat
 *
 * @async
 * @function react
 * @param {Object} req - The HTTP request object containing the request parameters and body.
 * @param {Object} res - The HTTP response object to send the result.
 * @param {string} req.params.sessionId - The ID of the session to use.
 * @param {string} req.body.messageId - The ID of the message to react to.
 * @param {string} req.body.chatId - The ID of the chat the message is in.
 * @param {string} req.body.reaction - The reaction to add to the message.
 * @returns {Object} The HTTP response containing the result of the operation.
 * @throws {Error} If there was an error during the operation.
 */

interface ReactBody {
  messageId: string;
  chatId: string;
  reaction: string; // A reação pode ser uma string representando o emoji ou outro valor
}

// Interface para a resposta
interface ReactResponse {
  success: boolean;
  result: boolean | null;  // 'result' pode ser um booleano, dependendo do sucesso da reação
}

const react = async (
  req: Request<{ sessionId: string }, {}, ReactBody>,
  res: Response<ReactResponse>
): Promise<void> => {
  try {
    const { messageId, chatId, reaction } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Adiciona a reação à mensagem
    const result = await message.react(reaction);

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('react ERROR:', error);
    res.status(500).json({ success: false, result: null });
  }
};


/**
 * Reply to a specific message in a chat
 *
 * @async
 * @function reply
 * @param {Object} req - The HTTP request object containing the request parameters and body.
 * @param {Object} res - The HTTP response object to send the result.
 * @param {string} req.params.sessionId - The ID of the session to use.
 * @param {string} req.body.messageId - The ID of the message to reply to.
 * @param {string} req.body.chatId - The ID of the chat the message is in.
 * @param {string} req.body.content - The content of the message to send.
 * @param {string} req.body.destinationChatId - The ID of the chat to send the reply to.
 * @param {Object} req.body.options - Additional options for sending the message.
 * @returns {Object} The HTTP response containing the result of the operation.
 * @throws {Error} If there was an error during the operation.
 */

interface ReplyBody {
  messageId: string;
  chatId: string;
  content: string | any;
  destinationChatId: string;
  options?: Record<string, unknown>; // Opções adicionais que podem ser passadas para a resposta
}
interface ReplyResponse {
  success: boolean;
  repliedMessage: Message | null; // Alterado para Message
}


const reply = async (
  req: Request<{ sessionId: string }, {}, ReplyBody>,
  res: Response<ReplyResponse>
): Promise<void> => {
  try {
    const { messageId, chatId, content, destinationChatId, options } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Responde à mensagem
    const repliedMessage = await message.reply(content, destinationChatId, options);

    // Retorna a resposta
    res.json({ success: true, repliedMessage });
  } catch (error: unknown) {
    console.error('reply ERROR:', error);
    res.status(500).json({ success: false, repliedMessage: null });
  }
};


/**
 * @function star
 * @async
 * @description Stars a message by message ID and chat ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.messageId - The message ID.
 * @param {string} req.body.chatId - The chat ID.
 * @returns {Promise} A Promise that resolves with the result of the message.star() call.
 * @throws {Error} If message is not found, it throws an error with the message "Message not Found".
 */

// Interface para o corpo da requisição
interface StarBody {
  messageId: string;
  chatId: string;
}

// Interface para a resposta
interface StarResponse {
  success: boolean;
  result: boolean | null; // Alterado para boolean
}

const star = async (
  req: Request<{ sessionId: string }, {}, StarBody>,
  res: Response<StarResponse>
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Marca a mensagem como estrela
    const result = await message.star();

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('star ERROR:', error);
    res.status(500).json({ success: false, result: null });
  }
};

/**
 * @function unstar
 * @async
 * @description Unstars a message by message ID and chat ID.
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.messageId - The message ID.
 * @param {string} req.body.chatId - The chat ID.
 * @returns {Promise} A Promise that resolves with the result of the message.unstar() call.
 * @throws {Error} If message is not found, it throws an error with the message "Message not Found".
 */
// Interface para o corpo da requisição
interface UnstarBody {
  messageId: string;
  chatId: string;
}

// Interface para a resposta
interface UnstarResponse {
  success: boolean;
  result: boolean | null;
}

const unstar = async (
  req: Request<{ sessionId: string }, {}, UnstarBody>,
  res: Response<UnstarResponse>
): Promise<void> => {
  try {
    const { messageId, chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém a mensagem usando o ID
    const message = await _getMessageById(client, messageId, chatId);
    if (!message) {
      throw new Error('Message not Found');
    }

    // Desmarca a mensagem como estrela
    const result = await message.unstar();

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('unstar ERROR:', error);
    res.status(500).json({ success: false, result: null });
  }
};

const mensageController = {
  getClassInfo,
  deleteMessage,
  downloadMedia,
  forward,
  getInfo,
  getMentions,
  getOrder,
  getPayment,
  getQuotedMessage,
  react,
  reply,
  star,
  unstar
}
export default mensageController;
