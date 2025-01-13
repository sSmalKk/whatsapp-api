import { Request, Response } from 'express';
import { sessions } from '../sessions';
import { sendErrorResponse } from '../utils';
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
/**
 * @function
 * @async
 * @name getClassInfo
 * @description Gets information about a chat using the chatId and sessionId
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} req.body.chatId - The ID of the chat to get information for
 * @param {string} req.params.sessionId - The ID of the session to use
 * @returns {Object} - Returns a JSON object with the success status and chat information
 * @throws {Error} - Throws an error if chat is not found or if there is a server error
 */
// Interface personalizada para o Request
interface GetClassInfoRequest extends Request {
  body: {
    chatId: string;
  };
  params: {
    sessionId: string;
  };
}

// Interface para a resposta da função
interface GetClassInfoResponse {
  success: boolean;
  chat?: Chat;
  error?: string;
}

// Função `getClassInfo` com as interfaces implementadas
const getClassInfo = async (
  req: GetClassInfoRequest,
  res: Response<GetClassInfoResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }

    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }

    res.json({
      success: true,
      chat,
    });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};


/**
 * Clears all messages in a chat.
 *
 * @function
 * @async
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The ID of the session.
 * @param {string} req.body.chatId - The ID of the chat to clear messages from.
 * @throws {Error} If the chat is not found or there is an internal server error.
 * @returns {Object} The success status and the cleared messages.
 */
interface ClearMessagesBody {
  chatId: string;
}

interface ClearStateBody {
  chatId: string;
}

interface DeleteChatBody {
  chatId: string;
}

// Tipagem para a resposta de sucesso
interface SuccessResponse {
  success: boolean;
  [key: string]: unknown; 
}

// Função para limpar as mensagens do chat
const clearMessages = async (
  req: Request<{ sessionId: string }, {}, ClearMessagesBody>, 
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }
    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }
    const clearMessages = await chat.clearMessages();
    res.json({ success: true, clearMessages });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};


/**
 * Stops typing or recording in chat immediately.
 *
 * @function
 * @async
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {string} req.body.chatId - ID of the chat to clear the state for.
 * @param {string} req.params.sessionId - ID of the session the chat belongs to.
 * @returns {Promise<void>} - A Promise that resolves with a JSON object containing a success flag and the result of clearing the state.
 * @throws {Error} - If there was an error while clearing the state.
 */
// Função para limpar o estado de digitação do chat
const clearState = async (
  req: Request<{ sessionId: string }, {}, ClearStateBody>, 
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }
    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }
    const clearState = await chat.clearState();
    res.json({ success: true, clearState });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};


/**
 * Delete a chat.
 *
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.chatId - The ID of the chat to be deleted.
 * @returns {Object} A JSON response indicating whether the chat was deleted successfully.
 * @throws {Object} If there is an error while deleting the chat, an error response is sent with a status code of 500.
 * @throws {Object} If the chat is not found, an error response is sent with a status code of 404.
 */
// Função para excluir o chat
const deleteChat = async (
  req: Request<{ sessionId: string }, {}, ClearStateBody>, 
  res: Response<SuccessResponse>
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }
    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }
    const deleteChat = await chat.delete();
    res.json({ success: true, deleteChat });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};


/**
 * Fetches messages from a specified chat.
 *
 * @function
 * @async
 *
 * @param {Object} req - The request object containing sessionId, chatId, and searchOptions.
 * @param {string} req.params.sessionId - The ID of the session associated with the chat.
 * @param {Object} req.body - The body of the request containing chatId and searchOptions.
 * @param {string} req.body.chatId - The ID of the chat from which to fetch messages.
 * @param {Object} req.body.searchOptions - The search options to use when fetching messages.
 *
 * @param {Object} res - The response object to send the fetched messages.
 * @returns {Promise<Object>} A JSON object containing the success status and fetched messages.
 *
 * @throws {Error} If the chat is not found or there is an error fetching messages.
 */

interface FetchMessagesBody {
  chatId: string;
  searchOptions: Record<string, unknown>; 
}

/**
 * Interface para a resposta
 */
interface FetchMessagesResponse {
  success: boolean;
  messages: Message[];
}

const fetchMessages = async (
  req: Request<{ sessionId: string }, unknown, FetchMessagesBody>, // Tipagem de 'req'
  res: Response<FetchMessagesResponse> // Tipagem de 'res'
): Promise<void> => {
  try {
    const { chatId, searchOptions } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }

    const messages = await chat.fetchMessages(searchOptions);
    res.json({ success: true, messages });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};

/**
 * Interface para o corpo da requisição
 */
interface GetContactBody {
  chatId: string;
}

/**
 * Interface para a resposta
 */
interface GetContactResponse {
  success: boolean;
  contact: Contact;
}

const getContact = async (
  req: Request<{ sessionId: string }, unknown, GetContactBody>, // Tipagem de 'req'
  res: Response<GetContactResponse> // Tipagem de 'res'
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }

    const contact = await chat.getContact();
    res.json({ success: true, contact });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};

/**
 * Interface para o corpo da requisição
 */
interface SendStateRecordingBody {
  chatId: string;
}

/**
 * Interface para a resposta
 */
interface SendStateRecordingResponse {
  success: boolean;
  sendStateRecording: void;
}

const sendStateRecording = async (
  req: Request<{ sessionId: string }, unknown, SendStateRecordingBody>, // Tipagem de 'req'
  res: Response<SendStateRecordingResponse> // Tipagem de 'res'
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }

    const sendStateRecording = await chat.sendStateRecording();
    res.json({ success: true, sendStateRecording });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};

/**
 * Interface para o corpo da requisição
 */
interface SendStateTypingBody {
  chatId: string;
}

/**
 * Interface para a resposta
 */
interface SendStateTypingResponse {
  success: boolean;
  sendStateTyping: void;
}

const sendStateTyping = async (
  req: Request<{ sessionId: string }, unknown, SendStateTypingBody>, // Tipagem de 'req'
  res: Response<SendStateTypingResponse> // Tipagem de 'res'
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const chat = await client.getChatById(chatId);
    if (!chat) {
      sendErrorResponse(res, 404, 'Chat not Found');
      return;
    }

    const sendStateTyping = await chat.sendStateTyping();
    res.json({ success: true, sendStateTyping });
  } catch (error) {
    sendErrorResponse(res, 500, error);
  }
};

const chatController = {
  getClassInfo,
  clearMessages,
  clearState,
  deleteChat,
  fetchMessages,
  getContact,
  sendStateRecording,
  sendStateTyping
}
export default chatController;
