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
 * Retrieves information about a WhatsApp contact by ID.
 *
 * @async
 * @function
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The ID of the current session.
 * @param {string} req.body.contactId - The ID of the contact to retrieve information for.
 * @throws {Error} If there is an error retrieving the contact information.
 * @returns {Object} The contact information object.
 */

// Tipagem para o corpo da requisição para 'getClassInfo'
interface GetClassInfoBody {
  contactId: string;
}

// Tipagem para a resposta de 'getClassInfo'
interface GetClassInfoResponse {
  success: boolean;
  result: Contact | null; // Definindo que o 'result' pode ser um contato ou null
}

const getClassInfo = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetClassInfoResponse>
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    // Obtém o cliente da sessão
    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const contact = await client.getContactById(contactId);
    if (!contact) {
      sendErrorResponse(res, 404, 'Contact not Found');
      return;
    }

    res.json({ success: true, result: contact });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Tipagem para o corpo da requisição para 'block'
interface BlockBody {
  contactId: string;
}

// Tipagem para a resposta de 'block'
interface BlockResponse {
  success: boolean;
  result: boolean;
}

const block = async (
  req: Request<{ sessionId: string }>,
  res: Response<BlockResponse>
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const contact = await client.getContactById(contactId);
    if (!contact) {
      sendErrorResponse(res, 404, 'Contact not Found');
      return;
    }

    const result = await contact.block();
    res.json({ success: true, result });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Tipagem para o corpo da requisição para 'getAbout'
interface GetAboutBody {
  contactId: string;
}

// Tipagem para a resposta de 'getAbout'
interface GetAboutResponse {
  success: boolean;
  result: string | null; // O resultado pode ser uma string ou null
}

const getAbout = async (
  req: Request<{ sessionId: string }>,
  res: Response<GetAboutResponse>
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    const client = sessions.get(sessionId);
    if (!client) {
      sendErrorResponse(res, 404, 'Session not found');
      return;
    }

    const contact = await client.getContactById(contactId);
    if (!contact) {
      sendErrorResponse(res, 404, 'Contact not Found');
      return;
    }

    const result = await contact.getAbout();
    res.json({ success: true, result });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};


/**
 * Retrieves the chat information of a contact with a given contactId.
 *
 * @async
 * @function getChat
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.contactId - The ID of the client whose chat information is being retrieved.
 * @throws {Error} If the contact with the given contactId is not found or if there is an error retrieving the chat information.
 * @returns {Promise<void>} A promise that resolves with the chat information of the contact.
 */

// Função para verificar se o cliente e o contato existem
const getClientAndContact = async (sessionId: string, contactId: string) => {
  const client = sessions.get(sessionId);
  if (!client) {
    throw new Error('Session not found');
  }
  const contact = await client.getContactById(contactId);
  if (!contact) {
    throw new Error('Contact not found');
  }
  return { client, contact };
};

// Função para obter o chat de um contato
const getChat = async (req: { body: { contactId: string }; params: { sessionId: string } }, res: Response) => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    const { contact } = await getClientAndContact(sessionId, contactId);
    const result = await contact.getChat();
    res.json({ success: true, result });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

// Função para obter o número formatado do contato
const getFormattedNumber = async (req: { body: { contactId: string }; params: { sessionId: string } }, res: Response) => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    const { contact } = await getClientAndContact(sessionId, contactId);
    const result = await contact.getFormattedNumber();
    res.json({ success: true, result });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

// Função para obter o código do país do contato
const getCountryCode = async (req: { body: { contactId: string }; params: { sessionId: string } }, res: Response) => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    const { contact } = await getClientAndContact(sessionId, contactId);
    const result = await contact.getCountryCode();
    res.json({ success: true, result });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};
/**
 * Retrieves the profile picture url of a contact with a given contactId.
 *
 * @async
 * @function getProfilePicUrl
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {string} req.params.sessionId - The session ID.
 * @param {string} req.body.contactId - The ID of the client whose chat information is being retrieved.
 * @throws {Error} If the contact with the given contactId is not found or if there is an error retrieving the chat information.
 * @returns {Promise<void>} A promise that resolves with the profile picture url of the contact.
 */
// Função para obter a URL da foto de perfil do contato
const getProfilePicUrl = async (
  req: { body: { contactId: string }; params: { sessionId: string } },
  res: Response
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    const { contact } = await getClientAndContact(sessionId, contactId);

    const result = await contact.getProfilePicUrl() || null;

    res.json({ success: true, result });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

// Função para desbloquear o contato
const unblock = async (
  req: { body: { contactId: string }; params: { sessionId: string } },
  res: Response
): Promise<void> => {
  try {
    const { contactId } = req.body;
    const { sessionId } = req.params;

    const { contact } = await getClientAndContact(sessionId, contactId);

    const result = await contact.unblock();

    res.json({ success: true, result });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


const contactController = {
  getClassInfo,
  block,
  getAbout,
  getChat,
  unblock,
  getFormattedNumber,
  getCountryCode,
  getProfilePicUrl
}
export default contactController;
