import { NETWORK } from "@utils/endpoints";
import type { NextApiRequest, NextApiResponse } from "next";

import { fetcher } from "@utils/use-data-fetch";
import { TokenData } from "@utils/tokenUtils";

export type NftResponse = { nfts: Array<TokenData> };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Array<TokenData>>
) {
  const { address } = req.query;

  if (address && address.length > 0) {
    const items = await fetcher<NftResponse>(
      `https://api.helius.xyz/v0/addresses/${address}/tokens?api-key=${process.env.HELIUS_API_KEY}&page-number=0`
    );

    res.status(200).json(items.nfts);
  }

  res.status(400);
}
