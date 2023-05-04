/**
 * Retries a function n number of times before giving up
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function retry<T extends (...arg0: any[]) => any>(
  fn: T,
  args: Parameters<T>,
  maxTry: number,
  retryCount = 1
): Promise<Awaited<ReturnType<T>>> {
  const currRetry = typeof retryCount === 'number' ? retryCount : 1;
  try {
    const result = await fn(...args);
    return result;
  } catch (e) {
    if (currRetry >= maxTry) {
      console.log(`Retry ${currRetry} failed. All ${maxTry} retry attempts exhausted`);
      throw e;
    }
    console.log(`Retry ${currRetry} failed.`);
    console.log(e);
    console.log(`Waiting ${retryCount} second(s)`);
    await sleep(1000 * retryCount);
    return retry(fn, args, maxTry, currRetry + 1);
  }
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
