import axios from 'axios';
import { AggregatorInterface, GetAmountOutResponse } from './AggregatorInterface';

export class ZeroXAggregator extends AggregatorInterface {
  GetBaseUri(network: string) {
    switch (network.toLowerCase()) {
      case 'eth':
        return 'https://api.0x.org';
      case 'arbitrum':
        return 'https://arbitrum.api.0x.org';
      default:
        throw new Error(`Could not find chain name for ${network}`);
    }
  }

  async GetAmountOut(
    network: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInAmount: string
  ): Promise<GetAmountOutResponse> {
    const callUrl = `${this.GetBaseUri(
      network
    )}/swap/v1/price?buyToken=${tokenOutAddress}&sellToken=${tokenInAddress}&sellAmount=${tokenInAmount}&slippagePercentage=1`;

    const priceResponse = await axios.get(callUrl);
    return {
      amountOut: priceResponse.data.buyAmount.toString(),
      aggregator: '0x'
    };
  }
}
