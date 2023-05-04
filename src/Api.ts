import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { AggregatorProxy } from './aggregators/AggregatorProxy';
import { OneInchPathfinderAggregator } from './aggregators/OneInchPathfinderAggregator';
import { KyberAggregator } from './aggregators/KyberAggregator';
import { AggregatorInterface } from './aggregators/AggregatorInterface';
import { OpenOceanAggregator } from './aggregators/OpenOceanAggregator';
import { ZeroXAggregator } from './aggregators/ZeroXAggregator';
import { aggregatorController } from './controllers/AggregatorController';
const aggregatorProxy = new AggregatorProxy();

const port = process.env.PORT;

const app: Express = express();

app.use(cors());

app.use('/api/aggregator/', aggregatorController);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
