const qr = require('qr-image')
const { setupSession, deleteSession, reloadSession, validateSession, flushSessions, sessions } = require('../sessions')
const { sendErrorResponse, waitForNestedObject } = require('../utils')
import { Request, Response } from 'express';
import { Client } from 'whatsapp-web.js';

/**
 * Starts a session for the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error starting the session.
 */
interface SetupSessionReturn {
  success: boolean;
  message: string;
  client?: Client;
}

const startSession = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Start new session'
  // #swagger.description = 'Starts a session for the given session ID.'
  try {
    const sessionId = req.params.sessionId;
    const setupSessionReturn: SetupSessionReturn = setupSession(sessionId);
    if (!setupSessionReturn.success) {
      /* #swagger.responses[422] = {
        description: "Unprocessable Entity.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
      sendErrorResponse(res, 422, setupSessionReturn.message);
      return;
    }
    /* #swagger.responses[200] = {
      description: "Status of the initiated session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StartSessionResponse" }
        }
      }
    }
    */
    // wait until the client is created
    waitForNestedObject(setupSessionReturn.client, 'pupPage')
      .then(() => res.json({ success: true, message: setupSessionReturn.message }))
      .catch((err: Error) => { sendErrorResponse(res, 500, err.message); });
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('startSession ERROR', error);
    if (error instanceof Error) {
      sendErrorResponse(res, 500, error);
    } else {
      sendErrorResponse(res, 500, 'Unknown error');
    }
  }
};

/**
 * Status of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
interface StatusSessionResponse {
  success: boolean;
  message: string;
  data?: {
    id: number;
    name: string;
  };
}

const statusSession = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Get session status'
  // #swagger.description = 'Status of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId;
    const sessionData: StatusSessionResponse = await validateSession(sessionId);
    /* #swagger.responses[200] = {
      description: "Status of the session.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/StatusSessionResponse" }
        }
      }
    }
    */
    res.json(sessionData);
  } catch (error) {
    console.log('statusSession ERROR', error);
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error);
  }
}

/**
 * QR code of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
interface SessionQrCodeResponse {
  success: boolean;
  message?: string;
  qr?: string;
}

const sessionQrCode = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Get session QR code'
  // #swagger.description = 'QR code of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);
    if (!session) {
      const response: SessionQrCodeResponse = { success: false, message: 'session_not_found' };
      res.json(response);
      return;
    }
    if (session.qr) {
      const response: SessionQrCodeResponse = { success: true, qr: session.qr };
      res.json(response);
      return;
    }
    const response: SessionQrCodeResponse = { success: false, message: 'qr code not ready or already scanned' };
    res.json(response);
    return;
  } catch (error) {
    console.log('sessionQrCode ERROR', error);
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error);
  }
}

/**
 * QR code as image of the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to start.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error getting status of the session.
 */
interface SessionQrCodeImageResponse {
  success: boolean;
  message?: string;
}

const sessionQrCodeImage = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Get session QR code as image'
  // #swagger.description = 'QR code as image of the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId;
    const session = sessions.get(sessionId);
    if (!session) {
      const response: SessionQrCodeImageResponse = { success: false, message: 'session_not_found' };
      res.json(response);
    }
    if (session.qr) {
      const qrImage = qr.image(session.qr);
      /* #swagger.responses[200] = {
          description: "QR image.",
          content: {
            "image/png": {}
          }
        }
      */
      res.writeHead(200, {
        'Content-Type': 'image/png'
      });
      return qrImage.pipe(res);
    }
    const response: SessionQrCodeImageResponse = { success: false, message: 'qr code not ready or already scanned' };
    await res.json(response);
    return;
  } catch (error) {
    console.log('sessionQrCodeImage ERROR', error);
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    sendErrorResponse(res, 500, error);
  }
}

/**
 * Restarts the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to terminate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the session.
 */
interface RestartSessionResponse {
  success: boolean;
  message: string;
}

const restartSession = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Restart session'
  // #swagger.description = 'Restarts the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId;
    const validation: StatusSessionResponse = await validateSession(sessionId);
    if (validation.message === 'session_not_found') {
      res.json(validation);
      return;
    }
    await reloadSession(sessionId);
    /* #swagger.responses[200] = {
      description: "Sessions restarted.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/RestartSessionResponse" }
        }
      }
    }
    */
    const response: RestartSessionResponse = { success: true, message: 'Restarted successfully' };
    res.json(response);
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('restartSession ERROR', error);
    sendErrorResponse(res, 500, error);
  }
}

/**
 * Terminates the session with the given session ID.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @param {string} req.params.sessionId - The session ID to terminate.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the session.
 */
interface TerminateSessionResponse {
  success: boolean;
  message: string;
}

const terminateSession = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Terminate session'
  // #swagger.description = 'Terminates the session with the given session ID.'
  try {
    const sessionId = req.params.sessionId;
    const validation: StatusSessionResponse = await validateSession(sessionId);
    if (validation.message === 'session_not_found') {
      await res.json(validation);
      return;
    }
    await deleteSession(sessionId, validation);
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionResponse" }
        }
      }
    }
    */
    const response: TerminateSessionResponse = { success: true, message: 'Logged out successfully' };
    res.json(response);
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateSession ERROR', error);
    sendErrorResponse(res, 500, error);
  }
}

/**
 * Terminates all inactive sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
interface TerminateInactiveSessionsResponse {
  success: boolean;
  message: string;
}

const terminateInactiveSessions = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Terminate inactive sessions'
  // #swagger.description = 'Terminates all inactive sessions.'
  try {
    await flushSessions(true)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    const response: TerminateInactiveSessionsResponse = { success: true, message: 'Flush completed successfully' };
    res.json(response);
  } catch (error) {
    /* #swagger.responses[500] = {
      description: "Server Failure.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/ErrorResponse" }
        }
      }
    }
    */
    console.log('terminateInactiveSessions ERROR', error);
    sendErrorResponse(res, 500, error);
  }
}

/**
 * Terminates all sessions.
 *
 * @function
 * @async
 * @param {Object} req - The HTTP request object.
 * @param {Object} res - The HTTP response object.
 * @returns {Promise<void>}
 * @throws {Error} If there was an error terminating the sessions.
 */
interface TerminateAllSessionsResponse {
  success: boolean;
  message: string;
}

const terminateAllSessions = async (req: Request, res: Response): Promise<void> => {
  // #swagger.summary = 'Terminate all sessions'
  // #swagger.description = 'Terminates all sessions.'
  try {
    await flushSessions(false)
    /* #swagger.responses[200] = {
      description: "Sessions terminated.",
      content: {
        "application/json": {
          schema: { "$ref": "#/definitions/TerminateSessionsResponse" }
        }
      }
    }
    */
    const response: TerminateAllSessionsResponse = { success: true, message: 'Flush completed successfully' };
    res.json(response);
  } catch (error) {
    /* #swagger.responses[500] = {
        description: "Server Failure.",
        content: {
          "application/json": {
            schema: { "$ref": "#/definitions/ErrorResponse" }
          }
        }
      }
      */
    console.log('terminateAllSessions ERROR', error);
    sendErrorResponse(res, 500, error);
  }
}

export = {
  startSession,
  statusSession,
  sessionQrCode,
  sessionQrCodeImage,
  restartSession,
  terminateSession,
  terminateInactiveSessions,
  terminateAllSessions
}
