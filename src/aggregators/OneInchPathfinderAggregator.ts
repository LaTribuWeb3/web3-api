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
      `https://pathfinder.1inch.io/v1.4/chain/${chainid}/router/v5/quotes?fromTokenAddress=${tokenInAddress}` +
      `&toTokenAddress=${tokenOutAddress}&amount=${tokenInAmount}&preset=maxReturnResult&gasPrice=${gasPrice}`;

    const quoteResponse = await axios.get(callUrl);
    return {
      amountOut: quoteResponse.data.bestResult.toTokenAmount.toString()
    };
  }
}
