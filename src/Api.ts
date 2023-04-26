import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
dotenv.config();
import cors from 'cors';
import { AggregatorProxy } from './aggregators/AggregatorProxy';

const port = process.env.PORT;

const aggregatorProxy = new AggregatorProxy();

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
    const response = await aggregatorProxy.GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    res.json(response);
  } catch (e) {
    console.log('exception', e);
    res.status(503).json({ error: 'something went wrong', exception: e });
  }
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
