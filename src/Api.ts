import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { AggregatorProxy } from './aggregators/AggregatorProxy';
import { OneInchPathfinderAggregator } from './aggregators/OneInchPathfinderAggregator';

const port = process.env.PORT;

const aggregatorProxy = new AggregatorProxy();
const oneInchAggregator = new OneInchPathfinderAggregator();

const app: Express = express();

app.use(cors());

app.get('/api/getamountout', async (req: Request, res: Response) => {
  const network = req.query.network;

  if (!network) {
    res.status(400).json({ error: 'network query param mandatory' });
    return;
  }

  const tokenInAddress = req.query.tokenInAddress;
  if (!tokenInAddress) {
    res.status(400).json({ error: 'tokenInAddress query param mandatory' });
    return;
  }
  const tokenOutAddress = req.query.tokenOutAddress;
  if (!tokenOutAddress) {
    res.status(400).json({ error: 'tokenOutAddress query param mandatory' });
    return;
  }
  const amountIn = req.query.amountIn;
  if (!amountIn) {
    res.status(400).json({ error: 'amountIn query param mandatory' });
    return;
  }

  try {
    const proxyResponse = await aggregatorProxy.GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    res.json(proxyResponse);
  } catch (e) {
    console.log('exception', e);
    res.status(503).json({ error: 'something went wrong', exception: e });
  }
});

app.get('/api/getamountoutmulti', async (req: Request, res: Response) => {
  const network = req.query.network;

  if (!network) {
    res.status(400).json({ error: 'network query param mandatory' });
    return;
  }

  const tokenInAddress = req.query.tokenInAddress;
  if (!tokenInAddress) {
    res.status(400).json({ error: 'tokenInAddress query param mandatory' });
    return;
  }
  const tokenOutAddress = req.query.tokenOutAddress;
  if (!tokenOutAddress) {
    res.status(400).json({ error: 'tokenOutAddress query param mandatory' });
    return;
  }
  const amountIn = req.query.amountIn;
  if (!amountIn) {
    res.status(400).json({ error: 'amountIn query param mandatory' });
    return;
  }

  try {
    const openOceanResponse = aggregatorProxy.GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    const oneInchResp = oneInchAggregator.GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    await Promise.all([openOceanResponse, oneInchResp]);

    res.json({ openOcean: await openOceanResponse, '1inch': await oneInchResp });
  } catch (e) {
    console.log('exception', e);
    res.status(503).json({ error: 'something went wrong', exception: e });
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
