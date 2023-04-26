import axios from 'axios';
import { AggregatorInterface, GetAmountOutResponse } from './AggregatorInterface';

export class KyberAggregator extends AggregatorInterface {
  GetKyberChainName(network: string) {
    switch (network.toLowerCase()) {
      case 'eth':
        return 'ethereum';
      case 'arbitrum':
        return 'arbitrum';
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
    const callUrl =
      `https://meta-aggregator-api.kyberswap.com/${this.GetKyberChainName(network)}/api/v1/routes?` +
      `tokenIn=${tokenInAddress}&tokenOut=${tokenOutAddress}&amountIn=${tokenInAmount}&saveGas=false&gasInclude=true`;

    const routeResponse = await axios.get(callUrl);
    return {
      amountOut: routeResponse.data.data.routeSummary.amountOut.toString()
    };
  }
}
