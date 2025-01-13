import express, { Request, Response } from 'express';
const router = express.Router();

interface WebhookRequestBody {
    sessionId: string;
    dataType: string;
    data: any;
}

router.post('/', (req: Request<{}, {}, WebhookRequestBody>, res: Response) => {
    const { sessionId, dataType, data } = req.body;

    console.log(`Webhook recebido:`);
    console.log(`Session ID: ${sessionId}`);
    console.log(`Data Type: ${dataType}`);
    console.log(`Data:`, data);

    // Aqui você pode processar os dados como preferir
    // Exemplo: Salvar em um banco de dados ou enviar para outro serviço

    res.status(200).json({ success: true, message: 'Webhook recebido com sucesso!' });
});

export const webhookRouter = router;
