import express, { Request, Response } from 'express';
import { AggregatorProxy } from '../aggregators/AggregatorProxy';
import { AggregatorInterface } from '../aggregators/AggregatorInterface';
import { OneInchPathfinderAggregator } from '../aggregators/OneInchPathfinderAggregator';
import { KyberAggregator } from '../aggregators/KyberAggregator';
import { OpenOceanAggregator } from '../aggregators/OpenOceanAggregator';
import { ZeroXAggregator } from '../aggregators/ZeroXAggregator';
export const aggregatorController = express.Router();

const aggregatorProxy = new AggregatorProxy();

aggregatorController.get('/getamountout', async (req: Request, res: Response) => {
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

aggregatorController.get('/getspecificamountout', async (req: Request, res: Response) => {
  const network = req.query.network;

  if (!network) {
    res.status(400).json({ error: 'network query param mandatory' });
    return;
  }

  const aggregator = req.query.aggregator;

  if (!aggregator) {
    res.status(400).json({ error: 'aggregator query param mandatory' });
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
    let agg: AggregatorInterface | undefined = undefined;

    if (aggregator.toString().toLowerCase() == '1inch') {
      agg = new OneInchPathfinderAggregator();
    }
    if (aggregator.toString().toLowerCase() == 'kyber') {
      agg = new KyberAggregator();
    }

    if (aggregator.toString().toLowerCase() == 'openocean') {
      agg = new OpenOceanAggregator();
    }

    if (aggregator.toString().toLowerCase() == '0x') {
      agg = new ZeroXAggregator();
    }

    if (!agg) {
      res.status(400).json({ error: 'unknown aggregator' });
      return;
    }

    const aggregatorResponse = await agg.GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    res.json(aggregatorResponse);
  } catch (e) {
    console.log('exception', e);
    res.status(503).json({ error: 'something went wrong', exception: e });
  }
});

aggregatorController.get('/getamountoutmulti', async (req: Request, res: Response) => {
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

    const oneInchResp = new OneInchPathfinderAggregator().GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    const kyberResp = new KyberAggregator().GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    const zeroXResp = new ZeroXAggregator().GetAmountOut(
      network.toString(),
      tokenInAddress.toString(),
      tokenOutAddress.toString(),
      amountIn.toString()
    );

    await Promise.all([openOceanResponse, oneInchResp, kyberResp, zeroXResp]);

    res.json({
      openOcean: await openOceanResponse,
      '1inch': await oneInchResp,
      kyber: await kyberResp,
      '0x': await zeroXResp
    });
  } catch (e) {
    console.log('exception', e);
    res.status(503).json({ error: 'something went wrong', exception: e });
  }
});
