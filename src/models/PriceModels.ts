export const coinGeckoChainIdMap: { [network: string]: string } = {
  eth: 'ethereum',
  avax: 'avalanche',
  matic: 'polygon-pos',
  bsc: 'binance-smart-chain',
  near: 'aurora',
  cro: 'cronos',
  optimism: 'optimistic-ethereum',
  ftm: 'fantom'
};

export const defillamaChaindIdMap: { [network: string]: string } = {
  eth: 'ethereum',
  cro: 'cronos',
  mode: 'mode',
  bsc: 'bsc'
};

export interface IPriceResponse {
  priceUSD: number;
  source: string;
}

export interface ICachedData {
  cacheDate: number;
  priceResponse: IPriceResponse;
}

export interface IPriceCache {
  [network: string]: { [tokenAddress: string]: ICachedData };
}
