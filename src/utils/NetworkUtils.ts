import axios from 'axios';
import { BigNumber } from 'ethers';

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

export async function GetGasPriceGWEI(network: string): Promise<number> {
  const cachedGasPriceForNetwork = gasPriceCache[network];
  if (!cachedGasPriceForNetwork || cachedGasPriceForNetwork.checkDate < Date.now() - 120 * 1000) {
    console.log(`GetGasPrice: getting gas price for network ${network}`);
    const chainId = GetChainIdFromNetwork(network);
    const url = `https://open-api.openocean.finance/v1/${chainId}/getGasPrice`;
    const getGasPriceResponse = await axios.get(url);
    gasPriceCache[network] = {
      gasPriceGwei: getGasPriceResponse.data.data.gasPrice,
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

  return BigNumber.from(gasPriceGwei).mul(BigNumber.from(10).pow(9)).toNumber();
}
