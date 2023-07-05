import { decodeBytes32String, ethers, isError } from 'ethers';
import express, { Request, Response } from 'express';

import fs from 'fs';
import path from 'path';
import { ERC20__factory } from '../contracts/types';

export const tokenController = express.Router();
const web3ProviderMapping = {
  eth: new ethers.JsonRpcProvider(process.env.RPC_URL_ETH),
  avax: new ethers.JsonRpcProvider(process.env.RPC_URL_AVAX),
  cro: new ethers.JsonRpcProvider(process.env.RPC_URL_CRONOS),
  bsc: new ethers.JsonRpcProvider(process.env.RPC_URL_BSC),
  matic: new ethers.JsonRpcProvider(process.env.RPC_URL_MATIC),
  gnosis: new ethers.JsonRpcProvider(process.env.RPC_URL_GNOSIS)
};

interface NetworkInfoCache {
  [network: string]: TokenInfoCache;
}
interface TokenInfoCache {
  [tokenAddress: string]: TokenInfos;
}

interface TokenInfos {
  address: string;
  symbol: string;
  decimals: number;
  name: string;
}

let tokenInfosCache: NetworkInfoCache = {};

const dataDir = path.join(process.cwd(), 'data');
const tokenInfosCacheFilename = path.join(dataDir, 'tokencache.json');
let newData = false;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

if (fs.existsSync(tokenInfosCacheFilename)) {
  console.log('Loading token cache from disk');
  tokenInfosCache = JSON.parse(fs.readFileSync(tokenInfosCacheFilename, 'utf-8'));
  console.log(`token cache contains infos from ${Object.keys(tokenInfosCache).length} networks`);
}

function writeToDisk() {
  if (newData) {
    newData = false;
    console.log('writeToDisk: saving token cache to disk');
    fs.writeFileSync(tokenInfosCacheFilename, JSON.stringify(tokenInfosCache));
  } else {
    console.log('writeToDisk: no new data, not saving data to disk');
  }
}

setInterval(writeToDisk, 60 * 1000);

tokenController.get('/infos', async (req: Request, res: Response) => {
  try {
    const network = req.query.network;

    if (!network) {
      res.status(400).json({ error: 'network query param mandatory' });
      return;
    }

    const networkKey = network.toString().toLowerCase();

    const tokenAddress = req.query.tokenAddress;
    if (!tokenAddress) {
      res.status(400).json({ error: 'tokenAddress query param mandatory' });
      return;
    }

    const tokenAddressKey = tokenAddress.toString().toLowerCase();

    const web3Provider = web3ProviderMapping[networkKey as keyof typeof web3ProviderMapping];
    if (!web3Provider) {
      res.status(400).json({ error: `${network} is not known` });
      return;
    }

    if (!tokenInfosCache[networkKey] || !tokenInfosCache[networkKey][tokenAddressKey]) {
      // save in cache
      const erc20Contract = ERC20__factory.connect(tokenAddressKey, web3Provider);
      if (!tokenInfosCache[networkKey]) {
        tokenInfosCache[networkKey] = {};
      }

      const abiCoder = new ethers.AbiCoder();
      const decimals = Number(await erc20Contract.decimals());
      let symbol = '';
      try {
        symbol = await erc20Contract.symbol();
      } catch (e) {
        if (isError(e, 'BAD_DATA')) {
          symbol = decodeBytes32String(abiCoder.decode(['bytes32'], e.value)[0]);
        } else {
          throw e;
        }
      }

      let name = '';
      try {
        name = await erc20Contract.name();
      } catch (e) {
        if (isError(e, 'BAD_DATA')) {
          name = decodeBytes32String(abiCoder.decode(['bytes32'], e.value)[0]);
        } else {
          throw e;
        }
      }

      tokenInfosCache[networkKey][tokenAddressKey] = {
        address: tokenAddressKey,
        decimals: decimals,
        name: name,
        symbol: symbol
      };
      newData = true;
    }

    res.json(tokenInfosCache[networkKey][tokenAddressKey]);
  } catch (e) {
    console.error(e);
    res.status(503).json({ msg: `Something went wrong when querying for ${Object.entries(req.query)}` });
  }
});
