import fs from 'fs';
import qrcode from 'qrcode-terminal';
import { Request, Response } from 'express';
import { sessionFolderPath } from '../config';
import { sendErrorResponse } from '../utils';

/**
 * Escreve mensagens de log em um arquivo especificado.
 * @param {string} message - Mensagem a ser escrita no log.
 * @param {boolean} isError - Define se é uma mensagem de erro.
 */
const writeLog = (message: string, isError = false): void => {
  const logMessage = isError ? `(ERROR) ${message}` : message;
  fs.writeFile(
    `${sessionFolderPath}/message_log.txt`,
    `${logMessage}\r\n`,
    { flag: 'a+' },
    (err) => {
      if (err) console.error('Erro ao escrever no log:', err);
    }
  );
};

/**
 * Responds to ping request with 'pong'
 *
 * @function ping
 * @async
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Promise that resolves once response is sent
 * @throws {Object} - Throws error if response fails
 */
const ping = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({ success: true, message: 'pong' });
  } catch (error) {
    console.error('Ping error:', error);
    writeLog(JSON.stringify(error), true);
    sendErrorResponse(res, 500, error instanceof Error ? error.message : 'An unknown error occurred');
  }
};

/**
 * Example local callback function that generates a QR code and writes a log file
 *
 * @function localCallbackExample
 * @async
 * @param {Request} req - Express request object containing a body object with dataType and data
 * @param {string} req.body.dataType - Type of data (in this case, 'qr')
 * @param {Object} req.body.data - Data to generate a QR code from
 * @param {Response} res - Express response object
 * @returns {Promise<void>} - Promise that resolves once response is sent
 * @throws {Object} - Throws error if response fails
 */
const localCallbackExample = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dataType, data }: { dataType: string; data: { qr: string } } = req.body;

    if (dataType === 'qr') {
      qrcode.generate(data.qr, { small: true });
    }

    writeLog(JSON.stringify(req.body));
    res.json({ success: true });
  } catch (error) {
    console.error('localCallbackExample error:', error);
    writeLog(JSON.stringify(error), true);
    sendErrorResponse(res, 500, error instanceof Error ? error.message : 'An unknown error occurred');
  }
};

/**
 * Health controller export
 */
const healthController = {
  ping,
  localCallbackExample,
};

export default healthController;
