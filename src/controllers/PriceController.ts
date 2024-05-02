import express, { Request, Response } from 'express';
import { retry, sleep } from '../utils/Utils';
import {
  ICachedData,
  IPriceCache,
  IPriceResponse,
  coinGeckoChainIdMap,
  defillamaChaindIdMap
} from '../models/PriceModels';
import axios from 'axios';
import { Mutex } from 'async-mutex';
export const priceController = express.Router();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 min price cache
const WAIT_TIME_BETWEEN_CALLS_COINGECKO = 6 * 1000; // 6 seconds between each calls
const WAIT_TIME_BETWEEN_CALLS_DEFILLAMA = 1 * 1000; // 1 seconds between each calls
let lastCoingeckoCall = 0;
let lastDefillamaCall = 0;
const priceMutexCoingecko = new Mutex();
const priceMutexDefillama = new Mutex();

function getPriceMutex(network: string) {
  switch (network.toLowerCase()) {
    case 'eth':
    case 'mode':
    case 'cro':
      return priceMutexDefillama;
    default:
      return priceMutexCoingecko;
  }
}

const priceCache: IPriceCache = {};

const simplePriceCache: { [currency: string]: ICachedData } = {};

priceController.get('/availablenetworks', (req: Request, res: Response) => {
  res.json(['eth', 'cro', 'near', 'bsc', 'matic', 'avax', 'optimistic-ethereum']);
});

// this one just call coingecko
priceController.get('/simple', async (req: Request, res: Response) => {
  const currency = req.query.currency;

  if (!currency) {
    res.status(400).json({ error: 'currency query param mandatory' });
    return;
  }

  try {
    const currencyKey = currency.toString().toLowerCase();

    const price: IPriceResponse | void = await priceMutexCoingecko.runExclusive(async () => {
      if (req.closed) {
        return;
      }

      if (
        !simplePriceCache[currencyKey] ||
        simplePriceCache[currencyKey].cacheDate < Date.now() - PRICE_CACHE_DURATION
      ) {
        // get the price from coingecko simple price api
        const msToWait = WAIT_TIME_BETWEEN_CALLS_COINGECKO - (Date.now() - lastCoingeckoCall);
        if (msToWait > 0) {
          console.log(`waiting ${msToWait} ms before calling coingecko`);
          await sleep(msToWait);
        }
        const price = await retry(GetSimplePriceFromCoinGecko, [currencyKey], 3);

        console.log(`found price ${price} for currency ${currencyKey}`);
        lastCoingeckoCall = Date.now();
        const priceResponse = {
          priceUSD: price,
          source: 'coingecko'
        };

        if (priceResponse.priceUSD != 0) {
          simplePriceCache[currencyKey] = {
            cacheDate: Date.now(),
            priceResponse: priceResponse
          };
        }
      } else {
        const cacheExpiresIn = PRICE_CACHE_DURATION - (Date.now() - simplePriceCache[currencyKey].cacheDate);
        console.log(
          `Returning cached price for ${currencyKey} : ${simplePriceCache[currencyKey].priceResponse.priceUSD}` +
            ` Cache expires in ${cacheExpiresIn / 1000} seconds`
        );
      }

      return simplePriceCache[currencyKey].priceResponse;
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

    const price = await getPriceMutex(networkKey).runExclusive(async () => {
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
      case 'eth':
      case 'cro':
      case 'mode': {
        // call defillama
        const msToWait = WAIT_TIME_BETWEEN_CALLS_DEFILLAMA - (Date.now() - lastDefillamaCall);
        if (msToWait > 0) {
          console.log(`waiting ${msToWait} ms before calling defillama`);
          await sleep(msToWait);
        }

        const defillamaChainId = defillamaChaindIdMap[network];
        if (!defillamaChainId) {
          res.status(400).json({ error: `network unknown ${network}` });
          return;
        }

        const price = await retry(GetPriceFromDefillama, [defillamaChainId, address], 3);

        console.log(`found price ${price} for address ${address} on chain ${defillamaChainId}`);
        lastDefillamaCall = Date.now();
        priceResponse = {
          priceUSD: price,
          source: 'defillama'
        };
        break;
      }
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
          res.status(400).json({ error: `network unknown ${network}` });
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
    if (!priceCache[network]) {
      priceCache[network] = {};
    }

    priceCache[network][address] = {
      cacheDate: Date.now(),
      priceResponse: priceResponse
    };
  } else {
    const cacheExpiresIn = PRICE_CACHE_DURATION - (Date.now() - priceCache[network][address].cacheDate);
    console.log(
      `Returning cached price for network ${network} and token ${address}: ${priceCache[network][address].priceResponse.priceUSD}` +
        ` Cache expires in ${cacheExpiresIn / 1000} seconds`
    );
  }
  return priceCache[network][address].priceResponse;
}

async function GetPriceFromDefillama(network: string, tokenAddress: string): Promise<number> {
  const coinllamaUrl = `https://coins.llama.fi/prices/current/${network}:${tokenAddress}`;
  const coinllamaResponse = await axios.get(coinllamaUrl);
  if (
    !coinllamaResponse.data ||
    !coinllamaResponse.data.coins ||
    !coinllamaResponse.data.coins[`${network}:${tokenAddress}`] ||
    !coinllamaResponse.data.coins[`${network}:${tokenAddress}`].price
  ) {
    console.log(`Could not find coinllama price for ${network}:${tokenAddress}`);
    return 0;
  } else {
    return Number(coinllamaResponse.data.coins[`${network}:${tokenAddress}`].price);
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

async function GetSimplePriceFromCoinGecko(currency: string): Promise<number> {
  const coinGeckoApiCall = `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=USD`;
  const coingeckoResponse = await axios.get(coinGeckoApiCall);
  if (Object.keys(coingeckoResponse.data).length == 0 || !coingeckoResponse.data[currency].usd) {
    console.log(`Could not find coingecko price for ${currency}`);
    return 0;
  } else {
    return Number(coingeckoResponse.data[currency].usd);
  }
}
