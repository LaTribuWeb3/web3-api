import axios from 'axios';
import { GetChainIdFromNetwork, GetGasPriceWei } from '../utils/NetworkUtils';
import { AggregatorInterface, GetAmountOutResponse } from './AggregatorInterface';

export class OneInchPathfinderAggregator extends AggregatorInterface {
  async GetAmountOut(
    network: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInAmount: string
  ): Promise<GetAmountOutResponse> {
    const gasPrice = await GetGasPriceWei(network);
    const chainid = GetChainIdFromNetwork(network);

    const callUrl =
      `https://pathfinder-api.1inch.io/v1.4/chain/${chainid}/router/v5/quotes?fromTokenAddress=${tokenInAddress}` +
      `&toTokenAddress=${tokenOutAddress}&amount=${tokenInAmount}&preset=maxReturnResult&gasPrice=${gasPrice}`;
    const axiosConfig = {
      headers: {
        Referer: 'https://app.1inch.io',
        'user-agent': 'PostmanRuntime/7.32.2'
      }
    };
    try {
      const quoteResponse = await axios.get(callUrl, axiosConfig);
      return {
        amountOut: quoteResponse.data.bestResult.toTokenAmount.toString(),
        aggregator: '1inch'
      };
    } catch (e: any) {
      if (e.response && e.response.data && e.response.data.err == 'all quoteResults failed') {
        return {
          amountOut: '0',
          aggregator: '1inch'
        };
      }

      throw e;
    }
  }
}
