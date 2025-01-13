import fs from 'fs';
import path from 'path';
import {
  Buttons,
  BusinessCategory,
  BusinessContact,
  BusinessHours,
  BusinessHoursOfDay,
  Call,
  Chat,
  ChatId,
  Client,
  ClientInfo,
  ClientOptions,
  Contact,
  Events,
  GroupChat,
  GroupMembershipRequest,
  GroupNotification,
  GroupNotificationTypes,
  GroupParticipant,
  InviteV4Data,
  Label,
  LegacySessionAuth,
  List,
  Location,
  LocalAuth,
  MediaFromURLOptions,
  Message,
  MessageAck,
  MessageContent,
  MessageEditOptions,
  MessageId,
  MessageMedia,
  MessageSearchOptions,
  MessageSendOptions,
  MessageTypes,
  MembershipRequestActionOptions,
  MembershipRequestActionResult,
  NoAuth,
  Order,
  Payment,
  Poll,
  PollVote,
  PrivateChat,
  Product,
  ProductMetadata,
  Reaction,
  ReactionList,
  RemoteAuth,
  SelectedPollOption,
  Status,
  AuthStrategy,
  AddParticipantsResult,
  AddParticipantsOptions,
  WAState,
} from 'whatsapp-web.js';
import { baseWebhookURL, sessionFolderPath, maxAttachmentSize, setMessagesAsSeen, webVersion, webVersionCacheType, recoverSessions } from './config';
import { triggerWebhook, waitForNestedObject, checkIfEventisEnabled } from './utils';



interface ValidationResult {
  success: boolean;
  message: string;
  state: WAState | null;
  client?: Client;
}


const sessions: Map<string, Client> = new Map();



const restoreSessions = (): void => {
  try {
    if (!fs.existsSync(sessionFolderPath)) {
      fs.mkdirSync(sessionFolderPath);
    }

    fs.readdir(sessionFolderPath, (_, files) => {
      files.forEach((file) => {
        const match = file.match(/^session-(.+)$/);
        if (match) {
          const sessionId = match[1];
          console.log('Existing session detected:', sessionId);
          setupSession(sessionId);
        }
      });
    });
  } catch (error) {
    console.error('Failed to restore sessions:', error);
  }
};
const validateSession = async (sessionId: string): Promise<ValidationResult> => {
  if (!sessions.has(sessionId) || !sessions.get(sessionId)) {
    return { success: false, message: 'session_not_found', state: null };
  }

  const client = sessions.get(sessionId)!;

  try {
    // Aguarda o cliente estar disponível
    await waitForNestedObject(client, 'pupPage');


    if (client.pupPage?.isClosed()) {
      return { success: false, message: 'browser tab closed', state: null };
    }

    const state = await client.getState();
    return state === 'CONNECTED'
      ? { success: true, message: 'session_connected', state: 'CONNECTED' as WAState } // Type Assertion
      : { success: false, message: 'session_not_connected', state: state as WAState }; // Type Assertion
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      state: null,
    };
  }
};


const setupSession = (sessionId: string): ValidationResult => {
  console.log('Iniciando configuração da sessão:', sessionId); // Log de início da configuração

  try {
    // Verifica se a sessão já existe
    if (sessions.has(sessionId)) {
      console.log(`Sessão já existe para: ${sessionId}`);
      return {
        success: false,
        message: `Session already exists for: ${sessionId}`,
        state: null,
      };
    }

    // Cria a estratégia de autenticação LocalAuth
    const localAuth = new LocalAuth({ clientId: sessionId, dataPath: sessionFolderPath });
    console.log('Estratégia de autenticação criada com sucesso para:', sessionId);

    // Sobrescreve a função de logout
    localAuth.logout = async () => {
      console.log('Logout personalizado substituído para a sessão:', sessionId);
      return Promise.resolve();
    };

    // Configuração de opções do cliente
    const clientOptions: ClientOptions = {
      puppeteer: {
        executablePath: process.env.CHROME_BIN || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      authStrategy: localAuth,
    };

    console.log('Opções de cliente configuradas para:', sessionId);

    if (webVersion) {
      clientOptions.webVersion = webVersion;
      switch (webVersionCacheType.toLowerCase()) {
        case 'local':
          clientOptions.webVersionCache = { type: 'local' };
          break;
        case 'remote':
          clientOptions.webVersionCache = {
            type: 'remote',
            remotePath: `https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/${webVersion}.html`,
          };
          break;
        default:
          clientOptions.webVersionCache = { type: 'none' };
      }
    }

    // Cria o cliente
    console.log('Criando o cliente WhatsApp...');
    const client = new Client(clientOptions);

    // Inicializa o cliente
    client.initialize().catch((err) => console.error('Erro ao inicializar cliente:', err.message));
    console.log('Cliente inicializado com sucesso.');

    // Inicializa eventos
    initializeEvents(client, sessionId);

    // Armazena o cliente na lista de sessões
    sessions.set(sessionId, client);

    console.log('Sessão iniciada com sucesso para:', sessionId);

    return { success: true, message: 'Session initiated successfully', state: 'CONNECTED' as WAState };
  } catch (error) {
    console.error('Erro ao configurar a sessão:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      state: null,
    };
  }
};



const initializeEvents = (client: Client, sessionId: string): void => {
  const sessionWebhook = process.env[`${sessionId.toUpperCase()}_WEBHOOK_URL`] || baseWebhookURL;

  if (recoverSessions) {
    waitForNestedObject(client, 'pupPage')
      .then(() => {
        const restartSession = async (sessionId: string) => {
          sessions.delete(sessionId);
          try {
            await client.destroy();
          } catch (error: unknown) {
            console.error(`Error destroying client for session ${sessionId}:`, (error as Error).message);
          }
          setupSession(sessionId);
        };

        if (client.pupPage) {
          client.pupPage.once('close', () => {
            console.log(`Browser page closed for ${sessionId}. Restoring session.`);
            restartSession(sessionId);
          });

          client.pupPage.once('error', () => {
            console.log(`Error occurred on browser page for ${sessionId}. Restoring session.`);
            restartSession(sessionId);
          });
        } else {
          console.warn(`pupPage is not available for client ${sessionId}`);
        }
      })
      .catch((error: unknown) => {
        console.error(`Error waiting for pupPage for session ${sessionId}:`, (error as Error).message);
      });
  }


  checkIfEventisEnabled('auth_failure')
    .then(_ => {
      client.on('auth_failure', (msg: string) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'status', { msg });
        } else {
          console.warn('Webhook URL is not defined for auth_failure');
        }
      });
    });

  checkIfEventisEnabled('authenticated')
    .then(_ => {
      client.on('authenticated', () => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'authenticated', {});
        } else {
          console.warn('Webhook URL is not defined for authenticated');
        }
      });
    });

  checkIfEventisEnabled('call').then(() => {
    client.on('call', async (call: { from: string; isVideo: boolean; }) => {
      if (sessionWebhook) {
        triggerWebhook(sessionWebhook, sessionId, 'call', { call });
      } else {
        console.warn(`Webhook URL is not defined for session ${sessionId}`);
      }
    });
  });

  checkIfEventisEnabled('change_state')
    .then(_ => {
      client.on('change_state', (state: string) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'change_state', { state });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('disconnected')
    .then(_ => {
      client.on('disconnected', (reason: string) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'disconnected', { reason });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('group_join')
    .then(_ => {
      client.on('group_join', (notification: { id: string; participant: string }) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'group_join', { notification });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('group_leave')
    .then(_ => {
      client.on('group_leave', (notification: { id: string; participant: string }) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'group_leave', { notification });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('group_update')
    .then(_ => {
      client.on('group_update', (notification: { id: string; description?: string }) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'group_update', { notification });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('loading_screen')
    .then(_ => {
      client.on('loading_screen', (percent: number, message: string) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'loading_screen', { percent, message });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('media_uploaded')
    .then(_ => {
      client.on('media_uploaded', (message: { id: string; type: string }) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'media_uploaded', { message });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('message').then(() => {
    client.on('message', async (message: {
      hasMedia: boolean;
      _data: { size: number };
      downloadMedia: () => Promise<{ mimetype: string; data: string }>;
      getChat: () => Promise<{ id: string; sendSeen: () => void }>;
    }) => {
      if (sessionWebhook) {
        triggerWebhook(sessionWebhook, sessionId, 'message', { message });
      } else {
        console.warn(`Webhook URL is not defined for session ${sessionId}`);
      }

      if (message.hasMedia && message._data?.size < maxAttachmentSize) {
        checkIfEventisEnabled('media').then(() => {
          message.downloadMedia().then((messageMedia) => {
            if (sessionWebhook) {
              triggerWebhook(sessionWebhook, sessionId, 'media', { messageMedia, message });
            } else {
              console.warn(`Webhook URL is not defined for session ${sessionId}`);
            }
          }).catch((e: Error) => {
            console.log('Download media error:', e.message);
          });
        });
      }

      if (setMessagesAsSeen) {
        const chat = await message.getChat();
        chat.sendSeen();
      }
    });
  });

  checkIfEventisEnabled('message_ack')
    .then(_ => {
      client.on('message_ack', async (message: { getChat: () => Promise<Chat>; }, ack: number) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'message_ack', { message, ack });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }

        if (setMessagesAsSeen) {
          const chat = await message.getChat();
          chat.sendSeen();
        }
      });
    });

  checkIfEventisEnabled('message_create')
    .then(_ => {
      client.on('message_create', async (message: { getChat: () => Promise<Chat>; }) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'message_create', { message });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }

        if (setMessagesAsSeen) {
          const chat = await message.getChat();
          chat.sendSeen();
        }
      });
    });

  checkIfEventisEnabled('message_reaction')
    .then(_ => {
      client.on('message_reaction', (reaction: { emoji: string; messageId: string; }) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'message_reaction', { reaction });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('message_edit')
    .then(_ => {
      client.on('message_edit', (message: Message, newBody: string, prevBody: string) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'message_edit', { message, newBody, prevBody });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('message_ciphertext')
    .then(_ => {
      client.on('message_ciphertext', (message: Message) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'message_ciphertext', { message });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('message_revoke_everyone')
    .then(_ => {
      client.on('message_revoke_everyone', async (message: Message) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'message_revoke_everyone', { message });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('message_revoke_me')
    .then(_ => {
      client.on('message_revoke_me', async (message: Message) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'message_revoke_me', { message });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });
  client.on('qr', (qr: string) => {
    // Salva o QR Code no cliente, garantindo que a propriedade seja opcional
    (client as unknown as Record<string, string>).qr = qr;

    // Verifica se o evento 'qr' está habilitado
    checkIfEventisEnabled('qr')
      .then(() => {
        if (sessionWebhook) {
          // Dispara o webhook com o QR Code
          triggerWebhook(sessionWebhook, sessionId, 'qr', { qr });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId} (qr event)`);
        }
      })
      .catch((error) => {
        console.error(`Failed to handle QR event for session ${sessionId}:`, error.message);
      });
  });

  checkIfEventisEnabled('ready')
    .then(_ => {
      client.on('ready', () => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'ready', {}); // Adicionado o argumento `data` como objeto vazio
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });


  checkIfEventisEnabled('contact_changed')
    .then(_ => {
      client.on('contact_changed', async (message: Message, oldId: string, newId: string, isContact: boolean) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'contact_changed', { message, oldId, newId, isContact });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('chat_removed')
    .then(_ => {
      client.on('chat_removed', async (chat: Chat) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'chat_removed', { chat });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('chat_archived')
    .then(_ => {
      client.on('chat_archived', async (chat: Chat, currState: string, prevState: string) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'chat_archived', { chat, currState, prevState });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });

  checkIfEventisEnabled('unread_count')
    .then(_ => {
      client.on('unread_count', async (chat: Chat) => {
        if (sessionWebhook) {
          triggerWebhook(sessionWebhook, sessionId, 'unread_count', { chat });
        } else {
          console.warn(`Webhook URL is not defined for session ${sessionId}`);
        }
      });
    });
}
// Function to delete client session folder
const deleteSessionFolder = async (sessionId: string): Promise<void> => {
  try {
    const targetDirPath = path.join(sessionFolderPath, `session-${sessionId}`);
    const resolvedTargetDirPath = await fs.promises.realpath(targetDirPath);
    const resolvedSessionPath = await fs.promises.realpath(sessionFolderPath);

    // Ensure the target directory path ends with a path separator
    const safeSessionPath = `${resolvedSessionPath}${path.sep}`;

    // Validate the resolved target directory path is a subdirectory of the session folder path
    if (!resolvedTargetDirPath.startsWith(safeSessionPath)) {
      throw new Error('Invalid path: Directory traversal detected');
    }

    // Remove all files in the directory
    const files = await fs.promises.readdir(resolvedTargetDirPath);
    for (const file of files) {
      const filePath = path.join(resolvedTargetDirPath, file);
      try {
        await fs.promises.unlink(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EPERM' || (error as NodeJS.ErrnoException).code === 'EBUSY') {
          console.warn(`Failed to delete file ${filePath}, retrying...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await fs.promises.unlink(filePath);
        } else {
          throw error;
        }
      }
    }

    // Remove the directory
    await fs.promises.rmdir(resolvedTargetDirPath);
  } catch (error) {
    console.log('Folder deletion error', error);
    throw error;
  }
};
const reloadSession = async (sessionId: string): Promise<void> => {
  try {
    const client = sessions.get(sessionId);
    if (!client) {
      console.warn(`Session not found: ${sessionId}`);
      return;
    }

    if (!client.pupPage) {
      console.warn(`pupPage is not defined for session: ${sessionId}`);
      return;
    }

    if (!client.pupBrowser) {
      console.warn(`pupBrowser is not defined for session: ${sessionId}`);
      return;
    }

    // Remove event listeners para evitar conflitos
    client.pupPage.removeAllListeners('close');
    client.pupPage.removeAllListeners('error');

    try {
      // Fecha todas as páginas do navegador
      const pages = await client.pupBrowser.pages();
      await Promise.all(pages.map((page) => page.close()));

      // Fecha o navegador ou força o encerramento após 5 segundos
      await Promise.race([
        client.pupBrowser.close(),
        new Promise<void>((resolve) => setTimeout(resolve, 5000)),
      ]);
    } catch (error) {
      // Força o encerramento do processo do navegador, se necessário
      const childProcess = client.pupBrowser.process?.();
      if (childProcess) {
        childProcess.kill(9);
      }
    }


    // Remove a sessão atual e recria uma nova
    sessions.delete(sessionId);
    setupSession(sessionId);
  } catch (error) {
    console.error(`Error reloading session ${sessionId}:`, error);
    throw error;
  }
};


const deleteSession = async (
  sessionId: string,
  validation: ValidationResult // Alterado para usar a interface ValidationResult
): Promise<void> => {
  try {
    const client = sessions.get(sessionId);
    if (!client) {
      console.warn(`Session not found: ${sessionId}`);
      return;
    }

    if (!client.pupPage) {
      console.warn(`pupPage is not defined for session: ${sessionId}`);
      return;
    }

    // Remove event listeners para evitar conflitos
    client.pupPage.removeAllListeners('close');
    client.pupPage.removeAllListeners('error');

    if (validation.success) {
      // Client Connected, request logout
      console.log(`Logging out session ${sessionId}`);
      await client.logout();
    } else if (validation.message === 'session_not_connected') {
      // Client not Connected, request destroy
      console.log(`Destroying session ${sessionId}`);
      await client.destroy();
    }

    // Verifica e aguarda o navegador ser desconectado
    if (client.pupBrowser && typeof client.pupBrowser.isConnected === 'function') {
      let maxDelay = 0;
      while (client.pupBrowser.isConnected() && maxDelay < 10) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        maxDelay++;
      }
    } else {
      console.warn(`pupBrowser is not defined or does not support isConnected for session: ${sessionId}`);
    }

    // Deleta a pasta da sessão
    await deleteSessionFolder(sessionId);
    sessions.delete(sessionId);
    console.log(`Sessão ${sessionId} terminada com sucesso.`);
  } catch (error) {
    console.error(`Error deleting session ${sessionId}:`, error);
    throw error;
  }
};

const flushSessions = async (deleteOnlyInactive: boolean): Promise<void> => {
  try {
    // Verifica se a pasta de sessões existe
    if (!fs.existsSync(sessionFolderPath)) {
      console.warn(`Session folder path does not exist: ${sessionFolderPath}`);
      return;
    }

    // Lê o conteúdo da pasta de sessões
    const files = await fs.promises.readdir(sessionFolderPath);

    // Itera sobre os arquivos encontrados
    for (const file of files) {
      // Usa expressão regular para capturar o ID da sessão
      const match = file.match(/^session-(.+)$/);
      if (match) {
        const sessionId = match[1];
        console.log(`Processing session: ${sessionId}`);

        try {
          // Valida a sessão atual
          const validation = await validateSession(sessionId);

          // Remove a sessão se ela for inválida ou se `deleteOnlyInactive` for falso
          if (!deleteOnlyInactive || !validation.success) {
            console.log(`Deleting session: ${sessionId}`);
            await deleteSession(sessionId, validation); // Agora o tipo está alinhado
          } else {
            console.log(`Skipping active session: ${sessionId}`);
          }
        } catch (validationError) {
          console.warn(`Error validating session ${sessionId}:`, validationError);
        }
      }
    }
  } catch (error) {
    console.error('Error flushing sessions:', error);
    throw error;
  }
};


export {
  ValidationResult,
  sessions,
  setupSession,
  restoreSessions,
  validateSession,
  deleteSession,
  reloadSession,
  flushSessions
}
