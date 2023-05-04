import axios from 'axios';
import { retry } from './Utils';

export function GetChainIdFromNetwork(network: string): number {
  switch (network.toLowerCase()) {
    case 'eth':
      return 1;
    case 'gnosis':
      return 100;
    case 'arbitrum':
      return 42161;
    default:
      throw new Error(`Could not find chainid for ${network}`);
  }
}

const gasPriceCache: { [network: string]: GasCachedValue } = {};

interface GasCachedValue {
  gasPriceGwei: number;
  checkDate: number;
}

async function getGasFromOpenOcean(chainid: number): Promise<number> {
  const url = `https://open-api.openocean.finance/v1/${chainid}/getGasPrice`;
  const getGasPriceResponse = await axios.get(url);
  return Number(getGasPriceResponse.data.data.gasPrice);
}

export async function GetGasPriceGWEI(network: string): Promise<number> {
  const cachedGasPriceForNetwork = gasPriceCache[network];
  if (!cachedGasPriceForNetwork || cachedGasPriceForNetwork.checkDate < Date.now() - 120 * 1000) {
    console.log(`GetGasPrice: getting gas price for network ${network}`);
    const chainId = GetChainIdFromNetwork(network);
    const gasPrice = await retry(getGasFromOpenOcean, [chainId], 3);
    gasPriceCache[network] = {
      gasPriceGwei: gasPrice,
      checkDate: Date.now()
    };

    console.log(`Updated gas price to ${gasPriceCache[network].gasPriceGwei} for network ${network}`);
  } else {
    console.log(`returning gas price from cache: ${gasPriceCache[network].gasPriceGwei} for network ${network}`);
  }

  return gasPriceCache[network].gasPriceGwei;
}

export async function GetGasPriceWei(network: string): Promise<number> {
  const gasPriceGwei = await GetGasPriceGWEI(network);

  return gasPriceGwei * 10 ** 9;
}
