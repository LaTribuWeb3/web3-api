import express, { Express } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { aggregatorController } from './controllers/AggregatorController';
import loggerMiddleware from './middlewares/LoggerMiddleware';
import { priceController } from './controllers/PriceController';
import { blockController } from './controllers/BlockController';
import { tokenController } from './controllers/TokenController';

const port = process.env.PORT || 8080;

const app: Express = express();

app.use(cors());
app.use(loggerMiddleware);

app.use('/api/aggregator/', aggregatorController);
app.use('/api/price/', priceController);
app.use('/api/getblocktimestamp/', blockController);
app.use('/api/token/', tokenController);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
