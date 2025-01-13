import app from './src/app';
import { baseWebhookURL } from './src/config';
import dotenv from 'dotenv';

dotenv.config();

// Start the server
const port = process.env.PORT || 3000;

if (!baseWebhookURL) {
  console.error('BASE_WEBHOOK_URL environment variable is not available. Exiting...');
  process.exit(1);// Terminate the application with an error code
}

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
