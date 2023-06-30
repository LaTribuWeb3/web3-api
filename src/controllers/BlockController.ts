import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { retry } from '../utils/Utils';
import dotenv from 'dotenv';
dotenv.config();

export const blockController = express.Router();

const RPC_URL = process.env.RPC_URL;

if (!RPC_URL) {
  throw new Error('Cannot find "RPC_URL" env variable');
}

const web3Provider = new ethers.JsonRpcProvider(RPC_URL, 1);

const dataDir = path.join(process.cwd(), 'data');
const blockCacheFilename = path.join(dataDir, 'blockcache.json');
let newData = false;
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let blockCache: { [blockNumber: number]: number } = {};
if (fs.existsSync(blockCacheFilename)) {
  console.log('Loading block cache from disk');
  blockCache = JSON.parse(fs.readFileSync(blockCacheFilename, 'utf-8'));
  console.log(`Block cache contains ${Object.keys(blockCache).length} blocks`);
}

function writeToDisk() {
  if (newData) {
    newData = false;
    console.log(`writeToDisk: saving ${Object.keys(blockCache).length} blocks to disk`);
    fs.writeFileSync(blockCacheFilename, JSON.stringify(blockCache));
  } else {
    console.log('writeToDisk: no new data, not saving data to disk');
  }
}

setInterval(writeToDisk, 60 * 1000);

blockController.get('/getblocktimestamp', async (req: Request, res: Response) => {
  const blocknumber = Number(req.query.blocknumber);
  if (!blocknumber) {
    res.status(400).json({ error: 'blocknumber query param mandatory' });
    return;
  }

  let timestamp = blockCache[Number(blocknumber)];
  if (!timestamp) {
    let block: ethers.Block | null = null;
    // eslint-disable-next-line no-constant-condition
    try {
      block = await retry(() => web3Provider.getBlock(blocknumber), [], 10);
      if (!block) {
        res.status(400).json({ error: `Could not find data for block ${blocknumber}` });
        return;
      }

      timestamp = block.timestamp;
      blockCache[Number(blocknumber)] = timestamp;
      console.log(`Fetched new block ${blocknumber} and added in cache with timestamp: ${timestamp}`);
      newData = true;
    } catch (err) {
      res.status(500).json({ error: `Could not find data for block ${blocknumber}` });
      return;
    }
  } else {
    console.log(`Serving block ${blocknumber} from cache with timestamp: ${timestamp}`);
  }

  res.json({ timestamp });
  return;
});
