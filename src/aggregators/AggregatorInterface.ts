export abstract class AggregatorInterface {
  abstract GetAmountOut(
    network: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInAmount: string
  ): Promise<GetAmountOutResponse>;
}

export interface GetAmountOutResponse {
  amountOut: string;
  aggregator: string;
}
