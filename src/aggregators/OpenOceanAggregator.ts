import axios from 'axios';
import { AggregatorInterface, GetAmountOutResponse } from './AggregatorInterface';
import { GetChainIdFromNetwork, GetGasPriceGWEI } from '../utils/NetworkUtils';

export class OpenOceanAggregator extends AggregatorInterface {
  async GetAmountOut(
    network: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInAmount: string
  ): Promise<GetAmountOutResponse> {
    const gasPrice = await GetGasPriceGWEI(network);
    const chainid = GetChainIdFromNetwork(network);

    const callUrl =
      `https://ethapi.openocean.finance/v2/${chainid}/swap?inTokenAddress=${tokenInAddress}` +
      `&outTokenAddress=${tokenOutAddress}&amount=${tokenInAmount}` +
      `&gasPrice=${gasPrice}&account=0x0000000000000000000000000000000000000000&disabledDexIds=26`;

    const swapResponse = await axios.get(callUrl);
    return {
      amountOut: swapResponse.data.outAmount.toString(),
      aggregator: 'openocean'
    };
  }
}
