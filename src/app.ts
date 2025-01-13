import express from 'express';
import bodyParser from 'body-parser';
import { restoreSessions } from './sessions';
import { routes } from './routes';
import { webhookRouter } from './webhook';
import { maxAttachmentSize } from './config';

const app = express();

app.disable('x-powered-by');
app.use(bodyParser.json({ limit: maxAttachmentSize + 1000000 }));
app.use(bodyParser.urlencoded({ limit: maxAttachmentSize + 1000000, extended: true }));
app.use('/webhook', webhookRouter);
app.use('/', routes);

restoreSessions();

export default app;
