import swaggerAutogen from 'swagger-autogen';

// Definindo o tipo para as respostas
interface Response {
  success: boolean;
  message: string;
}

interface ErrorResponse {
  success: boolean;
  error: string;
}

// Configuração do swaggerAutogen
const swagger = swaggerAutogen({ openapi: '3.0.0', autoBody: false });

// Caminho para os arquivos de saída e entrada
const outputFile: string = './swagger.json';
const endpointsFiles: string[] = ['./src/routes.ts']; // Atualizado para .ts se você estiver usando TypeScript

// Definição do documento Swagger
const doc = {
  info: {
    title: 'WhatsApp API',
    description: 'API Wrapper for WhatsAppWebJS'
  },
  servers: [
    {
      url: '',
      description: ''
    },
    {
      url: 'http://localhost:3000',
      description: 'localhost'
    }
  ],
  securityDefinitions: {
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'x-api-key'
    }
  },
  produces: ['application/json'],
  tags: [
    {
      name: 'Session',
      description: 'Handling multiple sessions logic, creation and deletion'
    },
    {
      name: 'Client',
      description: 'All functions related to the client'
    },
    {
      name: 'Message',
      description: 'May fail if the message is too old (Only from the last 100 Messages of the given chat)'
    }
  ],
  definitions: {
    StartSessionResponse: {
      success: true,
      message: 'Session initiated successfully'
    },
    StatusSessionResponse: {
      success: true,
      state: 'CONNECTED',
      message: 'session_connected'
    },
    RestartSessionResponse: {
      success: true,
      message: 'Restarted successfully'
    },
    TerminateSessionResponse: {
      success: true,
      message: 'Logged out successfully'
    },
    TerminateSessionsResponse: {
      success: true,
      message: 'Flush completed successfully'
    },
    ErrorResponse: {
      success: false,
      error: 'Some server error'
    },
    NotFoundResponse: {
      success: false,
      error: 'Some server error'
    },
    ForbiddenResponse: {
      success: false,
      error: 'Invalid API key'
    }
  }
};

// Gerando o Swagger
swagger(outputFile, endpointsFiles, doc).then(() => {
  console.log('Swagger documentation generated successfully!');
}).catch((error) => {
  console.error('Error generating Swagger documentation:', error);
});
