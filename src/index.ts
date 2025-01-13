import app from './app';
import { restoreSessions } from './sessions';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  restoreSessions();
});