import { AggregatorInterface, GetAmountOutResponse } from './AggregatorInterface';
import { OpenOceanAggregator } from './OpenOceanAggregator';

export class AggregatorProxy extends AggregatorInterface {
  selectedAggregator: AggregatorInterface = new OpenOceanAggregator();

  async GetAmountOut(
    network: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInAmount: string
  ): Promise<GetAmountOutResponse> {
    return await this.selectedAggregator.GetAmountOut(network, tokenInAddress, tokenOutAddress, tokenInAmount);
  }
}
