import express, { Request, Response } from 'express';
import { retry, sleep } from '../utils/Utils';
import { IPriceCache, IPriceResponse, coinGeckoChainIdMap } from '../models/PriceModels';
import axios from 'axios';
import { Mutex } from 'async-mutex';
export const priceController = express.Router();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 min price cache
const WAIT_TIME_BETWEEN_CALLS_KYBER = 2 * 1000; // 2 seconds between each calls
const WAIT_TIME_BETWEEN_CALLS_COINGECKO = 6 * 1000; // 6 seconds between each calls
let lastCoingeckoCall = 0;
let lastKyberCall = 0;

const getPriceMutex = new Mutex();

const priceCache: IPriceCache = {};

priceController.get('/availablenetworks', (req: Request, res: Response) => {
  res.json(['eth', 'cro', 'near', 'bsc', 'matic', 'avax', 'optimistic-ethereum']);
});

priceController.get('/', async (req: Request, res: Response) => {
  const network = req.query.network;

  if (!network) {
    res.status(400).json({ error: 'network query param mandatory' });
    return;
  }

  const tokenAddress = req.query.tokenAddress;
  if (!tokenAddress) {
    res.status(400).json({ error: 'tokenAddress query param mandatory' });
    return;
  }

  try {
    const networkKey = network.toString().toLowerCase();
    const tokenAddressKey = tokenAddress.toString().toLowerCase();

    const price = await getPriceMutex.runExclusive(async () => {
      if (req.closed) {
        return;
      }
      return await getCachedPrice(networkKey, tokenAddressKey, res);
    });

    if (req.closed) {
      console.log('ending request because closed');
      res.json({ msg: 'request closed' });
      return;
    }

    if (!price) {
      throw new Error('Unknown price error');
    }

    res.json(price);
  } catch (e) {
    console.log('exception', e);
    res.status(503).json({ error: 'something went wrong', exception: e });
  }
});

async function getCachedPrice(network: string, address: string, res: Response): Promise<IPriceResponse | undefined> {
  if (
    !priceCache[network] ||
    !priceCache[network][address] ||
    priceCache[network][address].cacheDate < Date.now() - PRICE_CACHE_DURATION
  ) {
    console.log(`Price for ${address} not found in cache for network ${network}`);
    let priceResponse: IPriceResponse | undefined = undefined;

    switch (network) {
      case 'eth': {
        const msToWait = WAIT_TIME_BETWEEN_CALLS_KYBER - (Date.now() - lastKyberCall);
        if (msToWait > 0) {
          console.log(`waiting ${msToWait} ms before calling kyber`);
          await sleep(msToWait);
        }
        // call kyber
        const price = await retry(GetPriceFromKyber, [address], 3);
        console.log(`found price ${price} for address ${address} from kyber`);
        lastKyberCall = Date.now();
        priceResponse = {
          priceUSD: price,
          source: 'kyberkrystal'
        };
        break;
      }
      case 'cro':
      case 'near':
      case 'bsc':
      case 'matic':
      case 'avax':
      case 'optimism': {
        // call coingecko
        const msToWait = WAIT_TIME_BETWEEN_CALLS_COINGECKO - (Date.now() - lastCoingeckoCall);
        if (msToWait > 0) {
          console.log(`waiting ${msToWait} ms before calling coingecko`);
          await sleep(msToWait);
        }
        const coingeckoChainId = coinGeckoChainIdMap[network];
        if (!coingeckoChainId) {
          res.status(400).json({ error: 'amountIn query param mandatory' });
          return;
        }

        const price = await retry(GetPriceFromCoinGecko, [coingeckoChainId, address], 3);

        console.log(`found price ${price} for address ${address} on chain ${coingeckoChainId}`);
        lastCoingeckoCall = Date.now();
        priceResponse = {
          priceUSD: price,
          source: 'coingecko'
        };
        break;
      }
      default:
        throw new Error(`Unknown network ${network}`);
    }

    // only cache if price != 0
    if (priceResponse.priceUSD != 0) {
      if (!priceCache[network]) {
        priceCache[network] = {};
      }

      priceCache[network][address] = {
        cacheDate: Date.now(),
        priceResponse: priceResponse
      };
    }
  } else {
    console.log(
      `Returning cached price for network ${network} and token ${address}: ${priceCache[network][address].priceResponse}`
    );
  }
  return priceCache[network][address].priceResponse;
}

async function GetPriceFromKyber(tokenAddress: string): Promise<number> {
  const krystalApiCall = `https://pricing-prod.krystal.team/v1/market?addresses=${tokenAddress}&chain=ethereum@1&sparkline=false`;
  const krystalResponse = await axios.get(krystalApiCall);
  if (krystalResponse.data.marketData.length == 0 || !krystalResponse.data.marketData[0].price) {
    console.log(`Could not find kyber price for ${tokenAddress}`);
    return 0;
  } else {
    return Number(krystalResponse.data.marketData[0].price);
  }
}

async function GetPriceFromCoinGecko(coingeckoChainId: string, tokenAddress: string): Promise<number> {
  const coinGeckoApiCall = `https://api.coingecko.com/api/v3/simple/token_price/${coingeckoChainId}?contract_addresses=${tokenAddress}&vs_currencies=USD`;
  const coingeckoResponse = await axios.get(coinGeckoApiCall);
  if (Object.keys(coingeckoResponse.data).length == 0 || !coingeckoResponse.data[tokenAddress].usd) {
    console.log(`Could not find coingecko price for ${tokenAddress}`);
    return 0;
  } else {
    return Number(coingeckoResponse.data[tokenAddress].usd);
  }
}
