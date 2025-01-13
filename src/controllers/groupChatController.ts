import { GroupChat, GroupParticipant, MessageMedia } from 'whatsapp-web.js';
import { sessions } from '../sessions'; // Certifique-se de que `sessions` é exportado corretamente
import { sendErrorResponse } from '../utils'; // Evite redefinir `sendErrorResponse` em outro arquivo
import { group } from 'console';
import { Request, Response } from 'express';



/**
 * Adds participants to a group chat.
 * @async
 * @function
 * @param {Object} req - The request object containing the chatId and contactIds in the body.
 * @param {string} req.body.chatId - The ID of the group chat.
 * @param {Array<string>} req.body.contactIds - An array of contact IDs to be added to the group.
 * @param {Object} res - The response object.
 * @returns {Object} Returns a JSON object containing a success flag and the updated participants list.
 * @throws {Error} Throws an error if the chat is not a group chat.
*/

const addParticipants = async (
  req: { body: { chatId: string; contactIds: string[] }; params: { sessionId: string } },
  res: { json: (arg: { success: boolean; participants?: GroupParticipant[]; error?: string }) => void }
): Promise<void> => {
  try {
    const { chatId, contactIds } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      throw new Error('Session not found');
    }

    const chat = await client.getChatById(chatId);

    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    const groupChat = chat as GroupChat; // Cast para garantir acesso às funções de grupo
    await groupChat.addParticipants(contactIds);

    res.json({ success: true, participants: groupChat.participants });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
};


/**
 * Removes participants from a group chat
 *
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Returns a JSON object with success flag and updated participants list
 * @throws {Error} If chat is not a group
 */
const removeParticipants = async (
  req: { body: { chatId: string; contactIds: string[] }; params: { sessionId: string } },
  res: { json: (arg: { success: boolean; participants?: GroupParticipant[]; error?: string }) => void }
): Promise<void> => {
  try {
    const { chatId, contactIds } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      throw new Error('Session not found');
    }

    const chat = await client.getChatById(chatId);

    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    const groupChat = chat as GroupChat; // Cast para garantir acesso às funções de grupo
    await groupChat.removeParticipants(contactIds);

    res.json({ success: true, participants: groupChat.participants });
  } catch (error) {
    res.json({ success: false, error: (error as Error).message });
  }
};

/**
 * Promotes participants in a group chat to admin
 *
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Returns a JSON object with success flag and updated participants list
 * @throws {Error} If chat is not a group
 */
// Função para obter cliente e grupo
const getClientAndGroupChat = async (sessionId: string, chatId: string) => {
  const client = sessions.get(sessionId);
  if (!client) {
    throw new Error('Session not found');
  }

  const chat = await client.getChatById(chatId);
  if (!chat || !chat.isGroup) {
    throw new Error('The chat is not a group');
  }

  return chat as GroupChat;
};

// Função para promover participantes
const promoteParticipants = async (
  req: { body: { chatId: string; contactIds: string[] }; params: { sessionId: string } },
  res: Response
): Promise<void> => {
  try {
    const { chatId, contactIds } = req.body;
    const { sessionId } = req.params;

    const groupChat = await getClientAndGroupChat(sessionId, chatId);

    // Promove os participantes para administradores
    await groupChat.promoteParticipants(contactIds);

    res.json({ success: true, participants: groupChat.participants });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

// Função para rebaixar participantes
const demoteParticipants = async (
  req: { body: { chatId: string; contactIds: string[] }; params: { sessionId: string } },
  res: Response
): Promise<void> => {
  try {
    const { chatId, contactIds } = req.body;
    const { sessionId } = req.params;

    const groupChat = await getClientAndGroupChat(sessionId, chatId);

    // Rebaixa os participantes para membros
    await groupChat.demoteParticipants(contactIds);

    res.json({ success: true, participants: groupChat.participants });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

// Função para obter o código do convite
const getInviteCode = async (
  req: { body: { chatId: string }; params: { sessionId: string } },
  res: Response
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const { sessionId } = req.params;

    const groupChat = await getClientAndGroupChat(sessionId, chatId);

    // Obtém o código do convite
    const inviteCode = await groupChat.getInviteCode();

    res.json({ success: true, inviteCode });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};

// Função para definir o assunto do grupo
const setSubject = async (
  req: { body: { chatId: string; subject: string }; params: { sessionId: string } },
  res: Response
): Promise<void> => {
  try {
    const { chatId, subject } = req.body;
    const { sessionId } = req.params;

    const groupChat = await getClientAndGroupChat(sessionId, chatId);

    // Define o novo assunto do grupo
    await groupChat.setSubject(subject);

    res.json({ success: true, chat: groupChat });
  } catch (error: unknown) {
    sendErrorResponse(res, 500, error || 'Unexpected server error');
  }
};


/**
 * Sets the description of a group chat
 *
 * @async
 * @function
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Returns a JSON object with success flag and updated chat object
 * @throws {Error} If chat is not a group
 */
// Função para definir a descrição do grupo
const setDescription = async (
  req: { body: { chatId: string; description: string }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { chatId, description } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      throw new Error('Session not found');
    }

    const chat = await client.getChatById(chatId);

    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Realiza um cast para GroupChat
    const groupChat = chat as GroupChat;

    // Define a nova descrição para o grupo
    await groupChat.setDescription(description);

    // Retorna o chat atualizado
    res.json({ success: true, chat: groupChat });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Função para deixar um grupo
const leave = async (
  req: { body: { chatId: string }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      throw new Error('Session not found');
    }

    const chat = await client.getChatById(chatId);

    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Realiza um cast para GroupChat e chama o método leave
    const groupChat = chat as GroupChat;
    await groupChat.leave();

    res.json({ success: true, outcome: 'Left the group successfully' });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Função para obter as informações do grupo
const getClassInfo = async (
  req: { body: { chatId: string }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      throw new Error('Session not found');
    }

    const chat = await client.getChatById(chatId);

    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Verifica se o chat é do tipo GroupChat e retorna as informações
    const groupChat = chat as GroupChat;

    res.json({ success: true, chat: groupChat });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Função para revogar o link de convite do grupo
const revokeInvite = async (
  req: { body: { chatId: string }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { chatId } = req.body;
    const client = sessions.get(req.params.sessionId);

    if (!client) {
      throw new Error('Session not found');
    }

    const chat = await client.getChatById(chatId);

    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Realiza um cast para GroupChat
    const groupChat = chat as GroupChat;

    // Chama o método revokeInvite e verifica o retorno
    const newInviteCode = await groupChat.revokeInvite();

    if (typeof newInviteCode !== 'string') {
      throw new Error('Failed to retrieve new invite code');
    }

    res.json({ success: true, newInviteCode });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

/**
 * Sets admins-only status of a group chat's info or messages.
 *
 * @async
 * @function setInfoAdminsOnly
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @param {string} req.params.sessionId - ID of the user's session.
 * @param {Object} req.body - Request body.
 * @param {string} req.body.chatId - ID of the group chat.
 * @param {boolean} req.body.adminsOnly - Desired admins-only status.
 * @returns {Promise<void>} Promise representing the success or failure of the operation.
 * @throws {Error} If the chat is not a group.
 */
// Função para definir o status de admins-only nas informações do grupo
const setInfoAdminsOnly = async (
  req: { body: { chatId: string; adminsOnly: boolean }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { chatId, adminsOnly } = req.body;

    // Obtém a sessão do cliente
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém o chat pelo ID
    const chat = await client.getChatById(chatId);
    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Garante que o chat seja do tipo correto
    const groupChat = chat as GroupChat;

    // Define as informações do grupo apenas para administradores
    const result = await groupChat.setInfoAdminsOnly(adminsOnly);

    res.json({ success: true, result });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Função para definir o status de admins-only nas mensagens do grupo
const setMessagesAdminsOnly = async (
  req: { body: { chatId: string; adminsOnly: boolean }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { chatId, adminsOnly } = req.body;

    // Obtém a sessão do cliente
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém o chat pelo ID
    const chat = await client.getChatById(chatId);
    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Garante que o chat seja do tipo correto
    const groupChat = chat as GroupChat;

    // Define mensagens para somente administradores
    const result = await groupChat.setMessagesAdminsOnly(adminsOnly);

    res.json({ success: true, result });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Função para definir a foto de perfil do grupo
const setPicture = async (
  req: { body: { pictureMimetype: string; pictureData: string; chatId: string }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { pictureMimetype, pictureData, chatId } = req.body;

    // Obtém a sessão do cliente
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Cria a mídia a partir dos dados fornecidos
    const media = new MessageMedia(pictureMimetype, pictureData);

    // Obtém o chat pelo ID
    const chat = await client.getChatById(chatId);
    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Garante que o chat seja do tipo correto
    const groupChat = chat as GroupChat;

    // Define a nova imagem do grupo
    const result = await groupChat.setPicture(media);

    res.json({ success: true, result });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};

// Função para remover a foto de perfil do grupo
const deletePicture = async (
  req: { body: { chatId: string }; params: { sessionId: string } },
  res: Response // Corrigido tipo de 'res' para Response
): Promise<void> => {
  try {
    const { chatId } = req.body;

    // Obtém a sessão do cliente
    const client = sessions.get(req.params.sessionId);
    if (!client) {
      throw new Error('Session not found');
    }

    // Obtém o chat pelo ID
    const chat = await client.getChatById(chatId);
    if (!chat.isGroup) {
      throw new Error('The chat is not a group');
    }

    // Garante que o chat seja do tipo correto
    const groupChat = chat as GroupChat;

    // Remove a imagem do grupo
    const result = await groupChat.deletePicture();

    res.json({ success: true, result });
  } catch (error) {
    sendErrorResponse(res, 500, (error as Error).message);
  }
};
const groupController = {
  getClassInfo,
  addParticipants,
  demoteParticipants,
  getInviteCode,
  leave,
  promoteParticipants,
  removeParticipants,
  revokeInvite,
  setDescription,
  setInfoAdminsOnly,
  setMessagesAdminsOnly,
  setSubject,
  setPicture,
  deletePicture
}
export default groupController;
