import {
  MessageMedia,
  Location,
  Buttons,
  List,
  Poll,
  Contact,
  Chat,
  Label,
  WAState,
  Message,
  Client,
  ClientOptions,
  ClientInfo,
  AuthStrategy,
  NoAuth,
  LocalAuth,
  RemoteAuth,
  LegacySessionAuth,
  GroupChat,
  PrivateChat,
  ChatId,
  MessageContent,
  MessageId,
  MessageSearchOptions,
  MessageSendOptions,
  MessageEditOptions,
  MediaFromURLOptions,
  Reaction,
  ReactionList,
  GroupNotification,
  GroupNotificationTypes,
  MessageAck,
  MessageTypes,
  Status,
  Events,
  InviteV4Data,
  Product,
  Order,
  Payment,
  Call,
  GroupParticipant,
  AddParticipantsResult,
  AddParticipantsOptions,
  MembershipRequestActionOptions,
  MembershipRequestActionResult,
  GroupMembershipRequest,
  ProductMetadata,
  SelectedPollOption,
  PollVote,
  BusinessContact,
  BusinessCategory,
  BusinessHours,
  BusinessHoursOfDay,
} from 'whatsapp-web.js';
import { sessions } from '../sessions';
import { sendErrorResponse } from '../utils';
import { Request, Response } from 'express';

/**
 * Send a message to a chat using the WhatsApp API
 *
 * @async
 * @function sendMessage
 * @param {Object} req - The request object containing the request parameters
 * @param {Object} req.body - The request body containing the chatId, content, contentType and options
 * @param {string} req.body.chatId - The chat id where the message will be sent
 * @param {string|Object} req.body.content - The message content to be sent, can be a string or an object containing the MessageMedia data
 * @param {string} req.body.contentType - The type of the message content, must be one of the following: 'string', 'MessageMedia', 'MessageMediaFromURL', 'Location', 'Buttons', or 'List'
 * @param {Object} req.body.options - Additional options to be passed to the WhatsApp API
 * @param {string} req.params.sessionId - The id of the WhatsApp session to be used
 * @param {Object} res - The response object
 * @returns {Object} - The response object containing a success flag and the sent message data
 * @throws {Error} - If there is an error while sending the message
 */

// Atualização de interfaces para incluir propriedades opcionais ou genéricas
interface SendMessageBody {
  chatId: string;
  content: string | MessageMedia | Location | Buttons | List | Poll | GenericResponse | Contact | any;
  contentType:
  | 'string'
  | 'MessageMedia'
  | 'MessageMediaFromURL'
  | 'Location'
  | 'Buttons'
  | 'List'
  | 'Contact'
  | 'Poll';
  options?: { media?: MessageMedia };
}

// Ajuste genérico para casos onde não há definição clara
type GenericResponse = {
  success: boolean;
  [key: string]: any; // Permite incluir quaisquer propriedades adicionais
};

interface SendMessageResponse {
  success: boolean;
  message: Message | string;
};

const sendMessage = async (
  req: Request<{ sessionId: string }>,
  res: Response<SendMessageResponse>
): Promise<void> => {
  try {
    const { chatId, content, contentType, options } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    let messageOut;
    switch (contentType) {
      case 'string':
        if (options?.media) {
          const media = options.media;

          // Forçar a conversão para string se for null ou undefined
          media.filename = media.filename ?? '';  // Ou forneça um valor padrão
          media.filesize = media.filesize ?? 0;

          options.media = new MessageMedia(media.mimetype, media.data, media.filename, media.filesize);
        }


        messageOut = await client.sendMessage(chatId, content, options);
        break;
      case 'MessageMediaFromURL': {
        const messageMediaFromURL = await MessageMedia.fromUrl(content, { unsafeMime: true });
        messageOut = await client.sendMessage(chatId, messageMediaFromURL, options);
        break;
      }
      case 'MessageMedia': {
        const messageMedia = new MessageMedia(content.mimetype, content.data, content.filename, content.filesize);
        messageOut = await client.sendMessage(chatId, messageMedia, options);
        break;
      }
      case 'Location': {
        const location = new Location(content.latitude, content.longitude, content.description);
        messageOut = await client.sendMessage(chatId, location, options);
        break;
      }
      case 'Buttons': {
        const buttons = new Buttons(content.body, content.buttons, content.title, content.footer);
        messageOut = await client.sendMessage(chatId, buttons, options);
        break;
      }
      case 'List': {
        const list = new List(content.body, content.buttonText, content.sections, content.title, content.footer);
        messageOut = await client.sendMessage(chatId, list, options);
        break;
      }
      case 'Contact': {
        const contactId = content.contactId.endsWith('@c.us') ? content.contactId : `${content.contactId}@c.us`;
        const contact = await client.getContactById(contactId);
        messageOut = await client.sendMessage(chatId, contact, options);
        break;
      }
      case 'Poll': {
        const poll = new Poll(content.pollName, content.pollOptions, content.options);
        messageOut = await client.sendMessage(chatId, poll, options);
        break;
      }
      default:
        return sendErrorResponse(res, 404, 'contentType invalid, must be string, MessageMedia, MessageMediaFromURL, Location, Buttons, List, Contact or Poll');
    }

    // Retorna a resposta com sucesso e a mensagem enviada
    res.json({ success: true, message: messageOut });
  } catch (error) {
    console.error('sendMessage ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Get session information for a given sessionId
 *
 * @async
 * @function getClientInfo
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.params.sessionId - The sessionId for which the session info is requested
 * @returns {Object} - Response object with session info
 * @throws Will throw an error if session info cannot be retrieved
 */
interface GetClassInfoResponse {
  success: boolean;
  sessionInfo?: ClientInfo;
  message?: string;
}

const getClassInfo = async (
  req: { params: { sessionId: string } }, // Especifica `sessionId` como string
  res: { json: (response: GetClassInfoResponse) => void }
): Promise<void> => {
  try {
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      res.json({ success: false, message: "Session not found" });
      return;
    }

    // Obtém as informações da sessão
    const sessionInfo = await client.info; // Assume que `client.info` tem o tipo ClientInfo
    res.json({ success: true, sessionInfo });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An error occurred while fetching session info";
    res.json({ success: false, message });
  }
};


/**
 * Check if a user is registered on WhatsApp
 *
 * @async
 * @function isRegisteredUser
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.params.sessionId - The sessionId in which the user is registered
 * @param {string} req.body.id - The id of the user to check
 * @returns {Object} - Response object with a boolean indicating whether the user is registered
 * @throws Will throw an error if user registration cannot be checked
 */
interface IsRegisteredUserBody {
  number: string;
}

// Interface para a resposta
interface IsRegisteredUserResponse {
  success: boolean;
  result: boolean; // Substitua 'boolean' por outro tipo se necessário, dependendo da estrutura de 'result'
}

const isRegisteredUser = async (
  req: Request<{ sessionId: string }>,
  res: Response<IsRegisteredUserResponse>
): Promise<void> => {
  try {
    const { number } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Verifica se o número está registrado
    const result = await client.isRegisteredUser(number);

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('isRegisteredUser ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Retrieves the registered WhatsApp ID for a number
 *
 * @async
 * @function getNumberId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.params.sessionId - The sessionId in which the user is registered
 * @param {string} req.body.id - The id of the user to check
 * @returns {Object} - Response object with a boolean indicating whether the user is registered
 * @throws Will throw an error if user registration cannot be checked
 */
// Interface para o corpo da requisição
interface GetNumberIdBody {
  number: string;
}

// Interface para a resposta
interface GetNumberIdResponse {
  success: boolean;
  result: string | unknown; // Ajustado para permitir null
}

const getNumberId = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetNumberIdResponse>
): Promise<void> => {
  try {
    const { number } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém o número ou ID
    const result = await client.getNumberId(number);

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('getNumberId ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Create a group with the given name and participants
 *
 * @async
 * @function createGroup
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.params.sessionId - The sessionId in which to create the group
 * @param {string} req.body.name - The name of the group to create
 * @param {Array} req.body.participants - Array of user ids to add to the group
 * @returns {Object} - Response object with information about the created group
 * @throws Will throw an error if group cannot be created
 */
interface CreateGroupBody {
  name: string;
  participants: string[];
}

const createGroup = async (
  req: Request<{ sessionId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { name, participants } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Cria o grupo
    const response = await client.createGroup(name, participants);

    // Retorna o resultado
    res.json({ success: true, response });
  } catch (error: unknown) {
    console.error('createGroup ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Set the status of the user in a given session
 *
 * @async
 * @function setStatus
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {string} req.params.sessionId - The sessionId in which to set the status
 * @param {string} req.body.status - The status to set
 * @returns {Object} - Response object indicating success
 * @throws Will throw an error if status cannot be set
 */

// Interface para o corpo da requisição
interface SetStatusBody {
  status: string;
}

// Interface para a resposta
interface SetStatusResponse {
  success: boolean;
}

const setStatus = async (
  req: Request<{ sessionId: string }, {}, SetStatusBody>, // Tipagem de 'req'
  res: Response<SetStatusResponse> // Tipagem de 'res'
): Promise<void> => {
  try {
    const { status } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Define o novo status
    await client.setStatus(status);

    // Retorna a resposta de sucesso
    res.json({ success: true });
  } catch (error: unknown) {
    // Refinamento do erro para garantir que ele seja tratado corretamente
    if (error instanceof Error) {
      console.error('setStatus ERROR:', error);
      sendErrorResponse(res, 500, error || 'Unexpected server error');
    } else {
      console.error('Unknown error', error);
      sendErrorResponse(res, 500, 'Unexpected server error');
    }
  }
};



/**
 * Retrieves the contacts of the current session.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID associated with the client.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A Promise that resolves with the retrieved contacts or rejects with an error.
 */

interface GetContactsResponse {
  success: boolean;
  contacts: Contact[];
}
const getContacts = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetContactsResponse>
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém os contatos
    const contacts = await client.getContacts();

    // Retorna os contatos encontrados
    res.json({ success: true, contacts });
  } catch (error: unknown) {
    console.error('getContacts ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Retrieve all chats for the given session ID.
 *
 * @function
 * @async
 *
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {Object} res - The response object.
 *
 * @returns {Promise<void>} A Promise that resolves when the operation is complete.
 *
 * @throws {Error} If the operation fails, an error is thrown.
 */

interface GetChatsResponse {
  success: boolean;
  chats: Chat[];
}
const getChats = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetChatsResponse>
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém os chats
    const chats = await client.getChats();

    // Retorna os chats encontrados
    res.json({ success: true, chats });
  } catch (error: unknown) {
    console.error('getChats ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Returns the profile picture URL for a given contact ID.
 *
 * @async
 * @function
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {string} req.params.sessionId - The ID of the current session.
 * @param {string} req.body.contactId - The ID of the contact to get the profile picture for.
 * @returns {Promise<void>} - A Promise that resolves with the profile picture URL.
 * @throws {Error} - If there is an error retrieving the profile picture URL.
 */
// Interface para o corpo da requisição
interface GetProfilePictureUrlBody {
  contactId: string;
}

// Interface para a resposta
interface GetProfilePictureUrlResponse {
  success: boolean;
  result: string; // Supondo que o resultado seja uma URL (string), mas você pode ajustar conforme necessário
}

const getProfilePictureUrl = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetProfilePictureUrlResponse>
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém a URL da foto de perfil
    const result = await client.getProfilePicUrl(contactId);

    // Retorna a URL da foto de perfil
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('getProfilePictureUrl ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Accepts an invite.
 *
 * @async
 * @function
 * @param {Object} req - The HTTP request object.
 * @param {Object} req.body - The request body.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.sessionId - The ID of the session.
 * @param {Object} res - The HTTP response object.
 * @returns {Object} The response object.
 * @throws {Error} If there is an error while accepting the invite.
 */
const acceptInvite = async (
  req: Request<{ sessionId: string }, {}, { inviteCode: string }>,
  res: Response
) => {
  /*
    #swagger.requestBody = {
      required: true,
      schema: {
        type: 'object',
        properties: {
          inviteCode: {
            type: 'string',
            description: 'Invitation code',
            example: ''
          },
        }
      },
    }
  */
  try {
    const { inviteCode } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const acceptInvite = await client.acceptInvite(inviteCode);
    res.json({ success: true, acceptInvite });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};

/**
 * Retrieves the version of WhatsApp Web currently being run.
 *
 * @async
 * @function getWWebVersion
 * @param {Object} req - The HTTP request object.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.sessionId - The ID of the session.
 * @param {Object} res - The HTTP response object.
 * @returns {Object} The response object.
 * @throws {Error} If there is an error while accepting the invite.
 */
// Interface para a resposta

interface GetWWebVersionResponse {
  success: boolean;
  result: string; // Ou o tipo adequado dependendo do retorno de `getWWebVersion`
}

const getWWebVersion = async (
  req: Request<{ sessionId: string }>, // Tipagem do parâmetro 'sessionId' na URL
  res: Response<GetWWebVersionResponse> // Tipagem correta para a resposta
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    // Obtém a versão do WhatsApp Web
    const result = await client.getWWebVersion();

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('getWWebVersion ERROR:', error);

    // Melhora o tratamento de erro, garantindo que o erro seja um objeto com a propriedade 'message'
    const errorMessage = error instanceof Error ? error : 'Unexpected server error';
    sendErrorResponse(res, 500, errorMessage);
  }
};


/**
 * Archives a chat.
 *
 * @async
 * @function
 * @param {Object} req - The HTTP request object.
 * @param {Object} req.body - The request body.
 * @param {Object} req.params - The request parameters.
 * @param {string} req.params.sessionId - The ID of the session.
 * @param {Object} res - The HTTP response object.
 * @returns {Object} The response object.
 * @throws {Error} If there is an error while archiving the chat.
 */

const archiveChat = async (
  req: Request<{ sessionId: string }>,
  res: Response
): Promise<void> => {
  /*
    #swagger.requestBody = {
      required: true,
      schema: {
        type: 'object',
        properties: {
          chatId: {
            type: 'string',
            description: 'ID of the chat',
            example: ''
          },
        }
      },
    }
  */
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const result = await client.archiveChat(chatId);
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('archiveChat ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Get the list of blocked contacts for the user's client.
 *
 * @async
 * @function getBlockedContacts
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID to use for the client.
 * @param {Object} res - The response object.
 * @returns {Promise<Object>} - A promise that resolves to an object with a success property and an array of blocked contacts.
 * @throws {Error} - Throws an error if the operation fails.
 */
const getBlockedContacts = async (
  req: Request<{ sessionId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém os contatos bloqueados
    const blockedContacts = await client.getBlockedContacts();

    // Retorna a resposta
    res.json({ success: true, blockedContacts });
  } catch (error: unknown) {
    console.error('getBlockedContacts ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Get the chat with the given ID.
 *
 * @async
 * @function getChatById
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID to use for the client.
 * @param {string} req.body.chatId - The ID of the chat to get.
 * @param {Object} res - The response object.
 * @returns {Promise<Object>} - A promise that resolves to an object with a success property and the chat object.
 * @throws {Error} - Throws an error if the operation fails.
 */
interface GetChatBody {
  chatId: string;
}

const getChatById = async (
  req: Request<{ sessionId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém o chat pelo ID
    const chat = await client.getChatById(chatId);

    // Retorna o chat encontrado
    res.json({ success: true, chat });
  } catch (error: unknown) {
    console.error('getChatById ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Get the labels for the chat with the given ID.
 *
 * @async
 * @function getChatLabels
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID to use for the client.
 * @param {string} req.body.chatId - The ID of the chat to get labels for.
 * @param {Object} res - The response object.
 * @returns {Promise<Object>} - A promise that resolves to an object with a success property and an array of labels for the chat.
 * @throws {Error} - Throws an error if the operation fails.
 */
interface GetChatLabelsBody {
  chatId: string;
}

const getChatLabels = async (
  req: Request<{ sessionId: string }>,
  res: Response
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém os rótulos do chat
    const chatLabels = await client.getChatLabels(chatId);

    // Retorna os rótulos do chat encontrados
    res.json({ success: true, chatLabels });
  } catch (error: unknown) {
    console.error('getChatLabels ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Get the chats with the given label ID.
 *
 * @async
 * @function getChatsByLabelId
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID to use for the client.
 * @param {string} req.body.labelId - The ID of the label to get chats for.
 * @param {Object} res - The response object.
 * @returns {Promise<Object>} - A promise that resolves to an object with a success property and an array of chats with the given label.
 * @throws {Error} - Throws an error if the operation fails.
 */

interface GetChatsByLabelIdBody {
  labelId: string;
}

// Definindo a estrutura da resposta
interface GetChatsByLabelIdResponse {
  success: boolean;
  chats: Chat[];
}

const getChatsByLabelId = async (
  req: Request<{ sessionId: string }>, // Requisição
  res: Response<GetChatsByLabelIdResponse> // Resposta com o tipo específico
): Promise<void> => {
  try {
    const { labelId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém os chats com base no ID do rótulo
    const chats = await client.getChatsByLabelId(labelId);

    // Retorna os chats encontrados
    res.json({ success: true, chats });
  } catch (error: unknown) {
    console.error('getChatsByLabelId ERROR:', error);
    sendErrorResponse(res, 500, error instanceof Error ? error.message : 'Unexpected server error');
  }
};


/**
 * Retrieves the common groups between the client's session and the specified contact.
 * @async
 * @function getCommonGroups
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID of the client.
 * @param {string} req.body.contactId - The ID of the contact to retrieve the common groups with.
 * @param {Object} res - The response object.
 * @returns {Object} - An object containing a success flag and the retrieved groups.
 * @throws {Error} - If an error occurs while retrieving the common groups.
 */
// Interface para o corpo da requisição
// Interface para o corpo da requisição
interface GetCommonGroupsBody {
  contactId: string;
}

// Interface para a resposta
interface GetCommonGroupsResponse {
  success: boolean;
  groups: ChatId[]; // Usando o tipo ChatId[] que é mais específico
}

const getCommonGroups = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetCommonGroupsResponse>
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém os grupos comuns
    const groups = await client.getCommonGroups(contactId);

    // Retorna os grupos encontrados
    res.json({ success: true, groups });
  } catch (error: unknown) {
    console.error('getCommonGroups ERROR:', error);
    sendErrorResponse(res, 500, error instanceof Error ? error.message : 'Unexpected server error');
  }
};

/**
 * Retrieves the contact with the specified ID.
 * @async
 * @function getContactById
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID of the client.
 * @param {string} req.body.contactId - The ID of the contact to retrieve.
 * @param {Object} res - The response object.
 * @returns {Object} - An object containing a success flag and the retrieved contact.
 * @throws {Error} - If an error occurs while retrieving the contact.
 */
// Interface para o corpo da requisição
interface GetContactByIdBody {
  contactId: string;
}

// Interface para a resposta
interface GetContactByIdResponse {
  success: boolean;
  contact: Contact;
}

const getContactById = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetContactByIdResponse>
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém o contato pelo ID
    const contact = await client.getContactById(contactId);

    // Retorna o contato encontrado
    res.json({ success: true, contact });
  } catch (error: unknown) {
    console.error('getContactById ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Retrieves the invite information for the specified invite code.
 * @async
 * @function getInviteInfo
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The session ID of the client.
 * @param {string} req.body.inviteCode - The invite code to retrieve information for.
 * @param {Object} res - The response object.
 * @returns {Object} - An object containing a success flag and the retrieved invite information.
 * @throws {Error} - If an error occurs while retrieving the invite information.
 */
// Interface para o corpo da requisição
interface GetInviteInfoBody {
  inviteCode: string;
}

// Interface para a resposta
interface GetInviteInfoResponse {
  success: boolean;
  inviteInfo: any; // Usando um tipo mais flexível, se necessário  //  inviteInfo: InviteV4Data da erro//

}

const getInviteInfo = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetInviteInfoResponse>
): Promise<void> => {
  try {
    const { inviteCode } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém as informações do convite
    const inviteInfo = await client.getInviteInfo(inviteCode);

    // Retorna as informações do convite
    res.json({ success: true, inviteInfo });
  } catch (error: unknown) {
    console.error('getInviteInfo ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Retrieves the label with the given ID for a particular session.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The ID of the session to retrieve the label for.
 * @param {Object} req.body - The request body object.
 * @param {string} req.body.labelId - The ID of the label to retrieve.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error retrieving the label.
 */
// Interface para o corpo da requisição
interface GetLabelByIdBody {
  labelId: string;
}

// Interface para a resposta
interface GetLabelByIdResponse {
  success: boolean;
  label: Label;
}

const getLabelById = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetLabelByIdResponse>
): Promise<void> => {
  try {
    const { labelId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém o label pelo ID
    const label = await client.getLabelById(labelId);

    // Retorna o label encontrado
    res.json({ success: true, label });
  } catch (error: unknown) {
    console.error('getLabelById ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Retrieves all labels for a particular session.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The ID of the session to retrieve the labels for.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error retrieving the labels.
 */
// Interface para a resposta com os rótulos
interface GetLabelsResponse {
  success: boolean;
  labels: Label[];
}

const getLabels = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetLabelsResponse>
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém os rótulos
    const labels = await client.getLabels();

    // Retorna os rótulos encontrados
    res.json({ success: true, labels });
  } catch (error: unknown) {
    console.error('getLabels ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Adds or removes labels to/from chats.
 * @async
 * @function
 * @param {Object} req - the request object
 * @param {Object} res - the response object
 * @return {Promise} a Promise that resolves to the JSON response with success status and labels
 * @throws {Error} if an error occurs
 */
// Interface para o corpo da requisição
interface AddOrRemoveLabelsBody {
  labelIds: string[];
  chatIds: string[];
}

// Interface para a resposta
interface AddOrRemoveLabelsResponse {
  success: boolean;
  labels: void;
}

const addOrRemoveLabels = async (
  req: Request<{ sessionId: string }>,
  res: Response<AddOrRemoveLabelsResponse>
): Promise<void> => {
  try {
    const { labelIds, chatIds } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Adiciona ou remove os rótulos
    const labels = await client.addOrRemoveLabels(labelIds, chatIds);

    // Retorna os rótulos atualizados
    res.json({ success: true, labels });
  } catch (error: unknown) {
    console.error('addOrRemoveLabels ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Retrieves the state for a particular session.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {string} req.params.sessionId - The ID of the session to retrieve the state for.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 * @throws {Error} If there is an error retrieving the state.
 */
// Interface para a resposta
interface GetStateResponse {
  success: boolean;
  state: WAState;
}

const getState = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetStateResponse>
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Obtém o estado
    const state = await client.getState();

    // Retorna o estado
    res.json({ success: true, state });
  } catch (error: unknown) {
    console.error('getState ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Marks a chat as unread.
 *
 * @async
 * @function markChatUnread
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.chatId - The ID of the chat to mark as unread.
 * @returns {Promise<void>} - A Promise that resolves when the chat is marked as unread.
 * @throws {Error} - If an error occurs while marking the chat as unread.
 */
// Interface para o corpo da requisição
interface MarkChatUnreadBody {
  chatId: string;
}

// Interface para a resposta
interface MarkChatUnreadResponse {
  success: boolean;
  mark: void; // Substitua 'any' por um tipo mais específico, caso você tenha a estrutura de 'mark'
}

const markChatUnread = async (
  req: Request<{ sessionId: string }>,
  res: Response<MarkChatUnreadResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Marca o chat como não lido
    const mark = await client.markChatUnread(chatId); // Se markChatUnread retorna void

    // Retorna o resultado da operação
    res.json({ success: true, mark });
  } catch (error: unknown) {
    console.error('markChatUnread ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Mutes a chat.
 *
 * @async
 * @function muteChat
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.chatId - The ID of the chat to mute.
 * @param {Date} [req.body.unmuteDate] - The date and time when the chat should be unmuted. If not provided, the chat will be muted indefinitely.
 * @returns {Promise<void>} - A Promise that resolves when the chat is muted.
 * @throws {Error} - If an error occurs while muting the chat.
 */
interface MuteChatBody {
  chatId: string;
  unmuteDate?: string;
}

interface MuteChatBody {
  chatId: string;
  unmuteDate?: string; // A data de desmutagem pode ser opcional
}

// Interface para a resposta
interface MuteChatResponse {
  success: boolean;
  mute: any;
}

const muteChat = async (
  req: Request<{ sessionId: string }>,
  res: Response<MuteChatResponse>
): Promise<void> => {
  try {
    const { chatId, unmuteDate } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Muta o chat com base na data de desmutagem fornecida
    const mute = unmuteDate
      ? await client.muteChat(chatId, new Date(unmuteDate))
      : await client.muteChat(chatId, undefined);

    // Retorna o resultado da mutagem
    res.json({ success: true, mute });
  } catch (error: unknown) {
    console.error('muteChat ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Pins a chat.
 *
 * @async
 * @function pinChat
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.chatId - The ID of the chat to pin.
 * @returns {Promise<void>} - A Promise that resolves when the chat is pinned.
 * @throws {Error} - If an error occurs while pinning the chat.
 */
interface PinChatBody {
  chatId: string;
}

// Interface para a resposta
interface PinChatResponse {
  success: boolean;
  result: boolean;
}

const pinChat = async (
  req: Request<{ sessionId: string }>,
  res: Response<PinChatResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Marca o chat como fixado
    const result = await client.pinChat(chatId);

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('pinChat ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};
/**
 * Search messages with the given query and options.
 * @async
 * @function searchMessages
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {Object} req.body - The request body.
 * @param {string} req.body.query - The search query.
 * @param {Object} [req.body.options] - The search options (optional).
 * @returns {Promise<void>} - A Promise that resolves with the search results.
 * @throws {Error} - If there's an error during the search.
 */
// Interface para o corpo da requisição
interface SearchMessagesBody {
  query: string;
  options?: Record<string, unknown>; // 'options' é opcional e pode ser um objeto com qualquer estrutura
}

// Interface para a resposta
interface SearchMessagesResponse {
  success: boolean;
  messages: Message[];
}

const searchMessages = async (
  req: Request<{ sessionId: string }>,
  res: Response<SearchMessagesResponse>
): Promise<void> => {
  try {
    const { query, options } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Realiza a busca por mensagens
    let messages;
    if (options) {
      messages = await client.searchMessages(query, options);
    } else {
      messages = await client.searchMessages(query);
    }

    // Retorna as mensagens encontradas
    res.json({ success: true, messages });
  } catch (error: unknown) {
    console.error('searchMessages ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Send presence available to the XMPP server.
 * @async
 * @function sendPresenceAvailable
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @returns {Promise<void>} - A Promise that resolves with the presence status.
 * @throws {Error} - If there's an error during the presence sending.
 */
interface SendPresenceAvailableResponse {
  success: boolean;
  presence: any;
}

const sendPresenceAvailable = async (
  req: Request<{ sessionId: string }>,
  res: Response<SendPresenceAvailableResponse>
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Envia a presença disponível
    const presence = await client.sendPresenceAvailable();

    // Retorna o resultado da operação
    res.json({ success: true, presence });
  } catch (error: unknown) {
    console.error('sendPresenceAvailable ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};
/**
 * Send presence unavailable to the XMPP server.
 * @async
 * @function sendPresenceUnavailable
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @returns {Promise<void>} - A Promise that resolves with the presence status.
 * @throws {Error} - If there's an error during the presence sending.
 */
interface SendPresenceUnavailableResponse {
  success: boolean;
  presence: any;
}

const sendPresenceUnavailable = async (
  req: Request<{ sessionId: string }>,
  res: Response<SendPresenceUnavailableResponse>
): Promise<void> => {
  try {
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Envia a presença indisponível
    const presence = await client.sendPresenceUnavailable();

    // Retorna o resultado da operação
    res.json({ success: true, presence });
  } catch (error: unknown) {
    console.error('sendPresenceUnavailable ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Send a 'seen' message status for a given chat ID.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.body.chatId - The ID of the chat to set the seen status for.
 * @param {string} req.params.sessionId - The ID of the session for the user.
 * @returns {Object} Returns a JSON object with a success status and the result of the function.
 * @throws {Error} If there is an issue sending the seen status message, an error will be thrown.
 */
interface SendSeenBody {
  chatId: string;
}

// Interface para a resposta
interface SendSeenResponse {
  success: boolean;
  result: boolean;
}

const sendSeen = async (
  req: Request<{ sessionId: string }>,
  res: Response<SendSeenResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Envia a confirmação de leitura para o chat
    const result = await client.sendSeen(chatId);

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('sendSeen ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Set the display name for the user's WhatsApp account.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.body.displayName - The new display name to set for the user's WhatsApp account.
 * @param {string} req.params.sessionId - The ID of the session for the user.
 * @returns {Object} Returns a JSON object with a success status and the result of the function.
 * @throws {Error} If there is an issue setting the display name, an error will be thrown.
 */

// Interface para o corpo da requisição
interface SetDisplayNameBody {
  displayName: string;
}

// Interface para a resposta
interface SetDisplayNameResponse {
  success: boolean;
  result: boolean;
}

const setDisplayName = async (
  req: Request<{ sessionId: string }>,
  res: Response<SetDisplayNameResponse>
): Promise<void> => {
  try {
    const { displayName } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return; // Finaliza o fluxo após a resposta
    }

    // Define o novo nome de exibição
    const result = await client.setDisplayName(displayName);

    // Retorna o resultado
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('setDisplayName ERROR:', error);
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

/**
 * Unarchive a chat for the user's WhatsApp account.
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.body.chatId - The ID of the chat to unarchive.
 * @param {string} req.params.sessionId - The ID of the session for the user.
 * @returns {Object} Returns a JSON object with a success status and the result of the function.
 * @throws {Error} If there is an issue unarchiving the chat, an error will be thrown.
 */

// Tipagem para o corpo da requisição para 'UnarchiveChat'
interface UnarchiveChatBody {
  chatId: string;
}

// Tipagem para a resposta de 'UnarchiveChat'
interface UnarchiveChatResponse {
  success: boolean;
  result: boolean; // ou o tipo específico que retorna a operação
}

const unarchiveChat = async (
  req: Request<{ sessionId: string }>,
  res: Response<UnarchiveChatResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const result = await client.unarchiveChat(chatId);
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('unarchiveChat ERROR:', error);
    sendErrorResponse(res, 500, (error as Error).message || 'Unexpected server error');
  }
};

// Tipagem para o corpo da requisição para 'UnmuteChat'
interface UnmuteChatBody {
  chatId: string;
}

// Tipagem para a resposta de 'UnmuteChat'
interface UnmuteChatResponse {
  success: boolean;
  result: void; // ou o tipo específico que retorna a operação
}

const unmuteChat = async (
  req: Request<{ sessionId: string }>,
  res: Response<UnmuteChatResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const result = await client.unmuteChat(chatId);
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('unmuteChat ERROR:', error);
    sendErrorResponse(res, 500, (error as Error).message || 'Unexpected server error');
  }
};

// Tipagem para o corpo da requisição para 'UnpinChat'
interface UnpinChatBody {
  chatId: string;
}

// Tipagem para a resposta de 'UnpinChat'
interface UnpinChatResponse {
  success: boolean;
  result: boolean; // ou o tipo específico que retorna a operação
}

const unpinChat = async (
  req: Request<{ sessionId: string }>,
  res: Response<UnpinChatResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const result = await client.unpinChat(chatId);
    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('unpinChat ERROR:', error);
    sendErrorResponse(res, 500, (error as Error).message || 'Unexpected server error');
  }
};

// Tipagem para o corpo da requisição para 'SetProfilePicture'
interface SetProfilePictureBody {
  pictureMimetype: string;
  pictureData: string;  // Base64 data string for the picture
}

interface SetProfilePictureResponse {
  success: boolean;
  result: boolean; // ou o tipo que representa o resultado da operação
}

const setProfilePicture = async (
  req: Request<{ sessionId: string }>,
  res: Response<SetProfilePictureResponse>
): Promise<void> => {
  try {
    const { pictureMimetype, pictureData } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const media = new MessageMedia(pictureMimetype, pictureData);
    const result = await client.setProfilePicture(media);

    res.json({ success: true, result });
  } catch (error: unknown) {
    console.error('setProfilePicture ERROR:', error);
    sendErrorResponse(res, 500, (error as Error).message || 'Unexpected server error');
  }
};

const clientController = {
  getClassInfo,
  acceptInvite,
  archiveChat,
  createGroup,
  getBlockedContacts,
  getChatById,
  getChatLabels,
  getChats,
  getChatsByLabelId,
  getCommonGroups,
  getContactById,
  getContacts,
  getInviteInfo,
  getLabelById,
  getLabels,
  addOrRemoveLabels,
  isRegisteredUser,
  getNumberId,
  getProfilePictureUrl,
  getState,
  markChatUnread,
  muteChat,
  pinChat,
  searchMessages,
  sendMessage,
  sendPresenceAvailable,
  sendPresenceUnavailable,
  sendSeen,
  setDisplayName,
  setProfilePicture,
  setStatus,
  unarchiveChat,
  unmuteChat,
  unpinChat,
  getWWebVersion
}
export default clientController;
