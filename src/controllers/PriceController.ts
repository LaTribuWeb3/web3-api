import express, { Request, Response } from 'express';
import { retry } from '../utils/Utils';
import { IPriceCache, IPriceResponse, coinGeckoChainIdMap } from '../models/PriceModels';
import axios from 'axios';
export const priceController = express.Router();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 min price cache

const priceCache: IPriceCache = {};

priceController.get('/availablenetworks', (req: Request, res: Response) => {
  res.json(['eth', 'cro', 'near', 'bsc', 'matic', 'avax']);
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

    if (
      !priceCache[networkKey] ||
      !priceCache[networkKey][tokenAddressKey] ||
      priceCache[networkKey][tokenAddressKey].cacheDate < Date.now() - PRICE_CACHE_DURATION
    ) {
      console.log(`Price for ${tokenAddressKey} not found in cache for network ${networkKey}`);
      let priceResponse: IPriceResponse | undefined = undefined;
      switch (networkKey) {
        case 'eth': {
          const price = await retry(GetPriceFromKyber, [tokenAddressKey], 10);
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
        case 'avax': {
          // call coingecko
          const coingeckoChainId = coinGeckoChainIdMap[networkKey];
          if (!coingeckoChainId) {
            res.status(400).json({ error: 'amountIn query param mandatory' });
            return;
          }

          const price = await retry(GetPriceFromCoinGecko, [coingeckoChainId, tokenAddressKey], 10);

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
        if (!priceCache[networkKey]) {
          priceCache[networkKey] = {};
        }

        priceCache[networkKey][tokenAddressKey] = {
          cacheDate: Date.now(),
          priceResponse: priceResponse
        };
      }

      res.json(priceResponse);
    } else {
      console.log(`Returning cache price for network ${networkKey} and token ${tokenAddressKey}`);
      res.json(priceCache[networkKey][tokenAddressKey].priceResponse);
    }
  } catch (e) {
    console.log('exception', e);
    res.status(503).json({ error: 'something went wrong', exception: e });
  }
});

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
