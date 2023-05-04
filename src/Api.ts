import express, { Express } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { aggregatorController } from './controllers/AggregatorController';
import loggerMiddleware from './middlewares/LoggerMiddleware';
import { priceController } from './controllers/PriceController';

const port = process.env.PORT;

const app: Express = express();

app.use(cors());
app.use(loggerMiddleware);

app.use('/api/aggregator/', aggregatorController);
app.use('/api/price/', priceController);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
