import axios from 'axios';
import { AggregatorInterface, GetAmountOutResponse } from './AggregatorInterface';

export class OpenOceanAggregator extends AggregatorInterface {
  baseUri: string;
  gasPrice: number | undefined;
  lastCallGasPrice: number;
  constructor() {
    super();
    this.baseUri = 'https://ethapi.openocean.finance/v2';
    this.lastCallGasPrice = 0;
  }

  async GetAmountOut(
    network: string,
    tokenInAddress: string,
    tokenOutAddress: string,
    tokenInAmount: string
  ): Promise<GetAmountOutResponse> {
    // get gas price if needed
    if (!this.gasPrice || this.lastCallGasPrice < Date.now() - 120 * 1000) {
      this.gasPrice = await this.GetGasPrice(network);
      this.lastCallGasPrice = Date.now();
      console.log(`Updated gas price to ${this.gasPrice} for network ${network}`);
    }

    const chainid = this.GetChainIdFromNetwork(network);

    // get amount out from openocean
    const callUrl =
      `${this.baseUri}/${chainid}/swap?inTokenAddress=${tokenInAddress}` +
      `&outTokenAddress=${tokenOutAddress}&amount=${tokenInAmount}` +
      `&gasPrice=${this.gasPrice}&account=0x0000000000000000000000000000000000000000`;

    const swapResponse = await axios.get(callUrl);
    return {
      amountOut: swapResponse.data.outAmount.toString()
    };
  }

  /*Url: https://open-api.openocean.finance/v1/:chainId/getGasPrice*/
  async GetGasPrice(network: string): Promise<number> {
    console.log(`GetGasPrice: getting gas price for network ${network}`);
    const chainId = this.GetChainIdFromNetwork(network);
    const url = `https://open-api.openocean.finance/v1/${chainId}/getGasPrice`;
    const getGasPriceResponse = await axios.get(url);
    console.log(getGasPriceResponse);

    return getGasPriceResponse.data.data.gasPrice;
  }

  GetChainIdFromNetwork(network: string): number {
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
}
