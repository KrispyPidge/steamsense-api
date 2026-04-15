import 'dotenv/config';
import Fastify from 'fastify';
import { healthRoutes } from './routes/health';
import { authRoutes } from './routes/auth';

const app = Fastify({ logger: true });

app.register(healthRoutes);
app.register(authRoutes);

const port = parseInt(process.env.PORT || '3000', 10);
const host = '0.0.0.0';

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});
