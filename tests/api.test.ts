import request from 'supertest';
import fs from 'fs';
import app from '../src/app'; // Supondo que o app seja do tipo Express
import { Server } from 'http';

// Mock your application's environment variabless
process.env.API_KEY = 'test_api_key'; // Altere para corresponder à chave usada nos testes
process.env.SESSIONS_PATH = './sessions_test';
process.env.ENABLE_LOCAL_CALLBACK_EXAMPLE = 'TRUE';
process.env.BASE_WEBHOOK_URL = 'http://localhost:3000/localCallbackExample';

jest.mock('qrcode-terminal');

let server: Server;

beforeAll(() => {
  server = app.listen(3000); // Verifique se o servidor está ouvindo na porta certa
});

beforeEach(async () => {
  if (fs.existsSync('./sessions_test/message_log.txt')) {
    fs.writeFileSync('./sessions_test/message_log.txt', '');
  }
});
afterAll(async () => {
  server.close();
  await fs.promises.rm('./sessions_test', { recursive: true, force: true });
});

// Define test cases
describe('API health checks', () => {
  it('should return valid healthcheck', async () => {
    const response = await request(app).get('/ping');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'pong', success: true });
  });

  it('should return a valid callback', async () => {
    const response = await request(app).post('/localCallbackExample')
      .set('x-api-key', 'test_api_key')
      .send({ sessionId: '1', dataType: 'testDataType', data: 'testData' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });

    expect(fs.existsSync('./sessions_test/message_log.txt')).toBe(true);
    expect(fs.readFileSync('./sessions_test/message_log.txt', 'utf-8')).toEqual('{"sessionId":"1","dataType":"testDataType","data":"testData"}\r\n');
  });
});

describe('API Authentication Tests', () => {
  it('should return 403 Forbidden for invalid API key', async () => {
    const response = await request(app).get('/session/start/1');
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ success: false, error: 'Invalid API key' });
  });

  it('should fail invalid sessionId', async () => {
    const response = await request(app).get('/session/start/ABCD1@').set('x-api-key', 'test_api_key');
    expect(response.status).toBe(422);
    expect(response.body).toEqual({ success: false, error: 'Session should be alphanumerical or -' });
  });

  it('should setup and terminate a client session', async () => {
    const response = await request(app).get('/session/start/1').set('x-api-key', 'test_api_key');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Session initiated successfully' });
    expect(fs.existsSync('./sessions_test/session-1')).toBe(true);
    await waitForFileNotToBeEmpty('./sessions_test/message_log.txt');

    const response2 = await request(app).get('/session/terminate/1').set('x-api-key', 'test_api_key');
    expect(response2.status).toBe(200);
    expect(response2.body).toEqual({ success: true, message: 'Logged out successfully' });

    expect(fs.existsSync('./sessions_test/session-1')).toBe(false);
  }, 15000);

  it('should setup and flush multiple client sessions', async () => {
    const response = await request(app).get('/session/start/2').set('x-api-key', 'test_api_key');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Session initiated successfully' });
    expect(fs.existsSync('./sessions_test/session-2')).toBe(true);

    const response2 = await request(app).get('/session/start/3').set('x-api-key', 'test_api_key');
    expect(response2.status).toBe(200);
    expect(response2.body).toEqual({ success: true, message: 'Session initiated successfully' });
    expect(fs.existsSync('./sessions_test/session-3')).toBe(true);

    const response3 = await request(app).get('/session/terminateInactive').set('x-api-key', 'test_api_key');
    expect(response3.status).toBe(200);
    expect(response3.body).toEqual({ success: true, message: 'Flush completed successfully' });

    expect(fs.existsSync('./sessions_test/session-2')).toBe(false);
    expect(fs.existsSync('./sessions_test/session-3')).toBe(false);
  }, 10000);
});

describe('API Action Tests', () => {
  it('should setup, create at least a QR, and terminate a client session', async () => {
    const response = await request(app).get('/session/start/4').set('x-api-key', 'test_api_key');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'Session initiated successfully' });
    expect(fs.existsSync('./sessions_test/session-4')).toBe(true);

    // Wait for message_log.txt to not be empty
    const result = await waitForFileNotToBeEmpty('./sessions_test/message_log.txt')
      .then(() => { return true; })
      .catch(() => { return false; });
    expect(result).toBe(true);

    // Verify the message content
    const expectedMessage = {
      dataType: 'qr',
      data: expect.objectContaining({ qr: expect.any(String) }),
      sessionId: '4',
    };
    expect(JSON.parse(fs.readFileSync('./sessions_test/message_log.txt', 'utf-8'))).toEqual(expectedMessage);

    const response2 = await request(app).get('/session/terminate/4').set('x-api-key', 'test_api_key');
    expect(response2.status).toBe(200);
    expect(response2.body).toEqual({ success: true, message: 'Logged out successfully' });
    expect(fs.existsSync('./sessions_test/session-4')).toBe(false);
  }, 15000);
});

// Function to wait for a specific item to be equal to a specific value
const waitForFileNotToBeEmpty = (
  filePath: string,  // Tipo correto para o parâmetro
  maxWaitTime: number = 10000,
  interval: number = 100
): Promise<void> => {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const checkFileContent = () => {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      if (fileContent.trim() !== '') {
        resolve();  // Resolve a promise quando o arquivo não estiver vazio
      } else if (Date.now() - start > maxWaitTime) {
        reject(new Error('Timeout waiting for file content to be non-empty'));
      } else {
        setTimeout(checkFileContent, interval); // Retry every interval
      }
    };
    checkFileContent();
  });
};
