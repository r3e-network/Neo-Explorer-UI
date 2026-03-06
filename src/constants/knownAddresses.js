import { addressToScriptHash, scriptHashToAddress } from "@/utils/neoHelpers";

export const KNOWN_ADDRESSES = {
  // Treasury: Neo Foundation (Da Hongfei)
  "NgebdUkFxSbzLMruXopuBw4aKsXX8sTyxw": "Neo Foundation (Da Hongfei)",
  "NZjXReMViE1yV5UxYD9idxcCt7QTNztNCT": "Neo Foundation (Da Hongfei)",
  "NaGHNnUiCg9KwmMiuSgtL15DP23LC2q9zT": "Neo Foundation (Da Hongfei)",
  "NPBQEx4pa8Sbsb7omTHEwU7exidEXzcSbr": "Neo Foundation (Da Hongfei)",
  "NitWQHuf92YvmwYBM7uorLv1rL3Ui7oS9m": "Neo Foundation (Da Hongfei)",
  "NhogFdE68Ekm5vBbS1YKagwYJGTgwVKNat": "Neo Foundation (Da Hongfei)",
  "NcHGkZWZLBTHMW2goppyDqBhar11wniBS5": "Neo Foundation (Da Hongfei)",
  "NZ9bdW1iRysQ54NhnEmRwXua8DhNqVkC8U": "Neo Foundation (Da Hongfei)",
  "NUB9WBKZm7fNe91qKxvxPSQoFpxPR9kna2": "Neo Foundation (Da Hongfei)",
  "NV35AyvJvj8T2SoD1D79oWcUwwiZDWfMim": "Neo Foundation (Da Hongfei)",
  "NdcBU7pkQZhLafCyhkQQy1nDA3prR4bHRH": "Neo Foundation (Da Hongfei)",
  "NNYYEXtivso9vxEuQJsqFAKiLEq1Q7qGu7": "Neo Foundation (Da Hongfei)",
  "NeozoqRLowoPG5edg7WbSYb1H1BU61YHkp": "Neo Foundation (Da Hongfei)",
  "Nds6RtduGsYk2hh2HTVwvprT6H2MATVo96": "Neo Foundation (Da Hongfei)",
  "NSKuKfAutVz2gRM1cKMCZGE4VZjZunKFKr": "Neo Foundation (Da Hongfei)",
  "NfecRDDivLYfSswT45QvYREb58PzUZeBTv": "Neo Foundation (Da Hongfei)",
  "Nb6V2ZmygXqTobbcJUJFKfNK8U6YqjEJcL": "Neo Foundation (Da Hongfei)",
  "NYv2guLgzKBkVtVyi6tmz3UfCYruSWJCwg": "Neo Foundation (Da Hongfei)",
  "Ne8SNZbt9LeMfZwkZ26rxvxPxnQj9U9vT4": "Neo Foundation (Da Hongfei)",
  "NZbiECdfVkwhbnD5Dpxofj9GWyiwHTW4N1": "Neo Foundation (Da Hongfei)",
  "NTAxtsVrqkTTk3nY5zQEK7puBDaWhfw12Y": "Neo Foundation (Da Hongfei)",
  "NcHXn5ygdY3AbvBuhtPy3qzEAsCukdx5qR": "Neo Foundation (Da Hongfei)",

  // Treasury: Neo Foundation (Erik Zhang)
  "NZeAarn3UMCqNsTymTMF2Pn6X7Yw3GhqDv": "NF1 (Erik Zhang)",
  "NXBhD662PnMFHZ1jJnreVTx71tdmqtrjL9": "NF2 (Erik Zhang)",
  "Nhvpo1kz1iv8KuBB1KGAbUxHet4V1Gzz4u": "NF3 (Erik Zhang)",
  "NYz4EgdsM1ATNedAbxFJw499kDBWhc8uut": "NF4 (Erik Zhang)",
  "NXsJYaejf5EFrFgSuPp4XUXajQ8BXUVoN8": "NF5 (Erik Zhang)",
  "NV17k94y5JS4mBjETmeKyHs3y3kxEfiRsM": "NF6 (Erik Zhang)",
  "NTE8wUDSXVk7oqbG1kZKTxSPX5Xj2nsLjd": "NF7 (Erik Zhang)",
  "Ncuf6FUDjJP2iAR7aA1tahv75A3eEMf6Nw": "Neo Foundation (Erik Zhang)",
  "NaQ2TU4SvUpHg5XHRXVxoCzCSsrQFURY19": "Neo Foundation (Erik Zhang)",
  "Nf1H8BirpajkjsnS4MEe8N7BEpBYWzKSfU": "Neo Foundation (Erik Zhang)",
  "NbkpbWnAJ6YzXZp1t6pa8fZ91mKx5PXBX7": "Neo Foundation (Erik Zhang)",
  "NMihXf3sXP69pUdBog3f5fQAymNDsxuA2z": "Neo Foundation (Erik Zhang)",
  "NiR15z3ieXTZpWozXDaqD5rNMskaRSFnop": "Neo Foundation (Erik Zhang)",
  "Ndqa8Zn1N9tJv9Z6gbMYtSAtG8kzyE4veT": "Neo Foundation (Erik Zhang)",
  "NVgBBNH9MTeppYMjttdtTkJKkhgpgNYzJJ": "Neo Foundation (Erik Zhang)",
  "NWcHZ95TNzfVCfvK2AvY5xyEw6ur3oD3wL": "Neo Foundation (Erik Zhang)",
  "NfeTbHCGhdmTsQppX2U7bUGTwav4jtQC4e": "Neo Foundation (Erik Zhang)",
  "NgRc6K5LWGfsY7aQchiwfM5Fw5Ue2vifTT": "Neo Foundation (Erik Zhang)",
  "NRRSagrw8cz2ZsRnumPLNniF3onU5FUGJx": "Neo Foundation (Erik Zhang)",
  "NPgnVsXPa22drSqSUy1o3eAfqs6Eb4rK1f": "Neo Foundation (Erik Zhang)",
  "Nb7UjsXESNNt4BYE3FjfuGnkQ5GPvzqfrP": "Neo Foundation (Erik Zhang)",
  "NVg7LjGcUSrgxgjX3zEgqaksfMaiS8Z6e1": "Neo Foundation (Erik Zhang)",

  // Other Known Addresses
  "NfM3NJFuDtBwZchLh6DYpk1yPigRNmjcTQ": "Neo Bond",
  "Nfps2rFwD9VZ8kd6GRkgWix8LH8A5Y4S4a": "Migration Address",
  "NUBPtrsEzdoUYQ1kp8AWny6aUQXcK4jTuH": "NF Binance Deposit",

  // Consensus Candidates & Specific Labels
  "Nj39M97Rk2e23JiULBBMQmvpcnKaRHqxFf": "The Neo Order",
  "NSPCCpw8YmgNDYWiBfXJHRfz38NDjv6WW3": "NeoSPCC",
  "NZWWneZw9ucujrXUQvV6fLtENmn8xvKZ3u": "Red4Sec",
  "NZ6bKQGT6mWqbXRNjX9ohAr5fVZwifWtGW": "AxLabs (neow3j)",
  "NXMSUhKfia45bxbiRGbzBgcbRmAvSGL96s": "NGD4",
  "NSkSDp2FjS4G3ngP5Rryi77qa6yWFuR8LK": "NGD8",
  "NdtjAqrUnk1fcnfGLfsi3TNdz5ejAJJ6QQ": "NGD6",
  "NhMvRrhBnZyAwZnw8y9mHoCzwSEDmZJo2n": "lazynode",
  "NiYfNbJXhHs9WvuP2PWR5RFR9VCjdGn69w": "COZ",
  "NiymdbpxariiQ5kW16TnAkPdPwd9KNJUBT": "InfStones",
  "NbobgCMmKhHFfdfAfL7579W4bHrsh66wPt": "NEXT (NeoLine)",
  "NSZunX9DXXvdMrjQqQWqGAMvgNTPsbhQ2L": "Switcheo Labs",
  "NSTSntFPK36QXsjEK6oAhnPzSyfgfVA2GQ": "Neo News Today",
  "NhUHywGfUYevMjtbpRDDgGBgkwzYiGD9W9": "Flamingo",
  "NaxjMApXDkYQc3paoyAErLsm6XWo1FUw4X": "HashKey Cloud",
  "NcScdqRaoE6DVzvGDBAnias9GTivdWfrDf": "BinanceStaking1",
  "NUqLhf1p1vQyP2KJjMcEwmdEBPnbCGouVp": "Binance",
  "NRpsHvG4WY6WcAZpSb58d547cSQFiBxrUS": "MakeNeoGreatAgain",
  "NaqNz8kAYezSMUnK6CZxduc7oFxDaYZeCb": "bNEO representative",
  "NZ9rkPKcDQqH6bffyYqU6yd5A2cUvuDLUw": "Everstake",
  "NhkVeDbeZc6So1LbzhAt9KNH8A9yuPEhDS": "Nash.io",
  "NhRDsXGjsdbzXNTpA4tRfHPRgCE3GRk6Cg": "chainnode",
  "Nc8EimiHubCEX329XAnVFsS15yzwdnRYj1": "GhostMarket",
  "NfiCaZsXmDZHy4LHoZXGdLdz9yeUhTFGw9": "NGD3",
  "NSLuC9wGAkTaHYC87mXR4xynLcitGBwRbN": "NGD2",
  "NYKMfwzN1PdFK4i172zUWPXjWDBzCg1YrV": "NGD1",
  "NPquVHzfCCQS8mXSovmJ39SofzUsBYZpsN": "NGD5",
  "NSDJEoSr7ugVhJmo6vVAVcTEHahCVYHzve": "Linkd Academy",
  "NZGbJEdb2hXvX8RJXQq7saVj7qvHmWYKmi": "BinanceStaking",
  "NTp4QmyuAqasqoeDCjAZAbMun5kjHyWvXx": "NeoResearch",
  "NLehVzi8ZXVVyJh9wtUqxRqWfXSdFQEXMF": "Unknown Candidate",
  "NNTw7SisSeQrTizGD74HUfwm5JSWKsr3po": "NGD7",
};

const normalizeKey = (value) => String(value || "").trim().toLowerCase();

const KNOWN_ADDRESS_INDEX = (() => {
  const index = {};
  const add = (key, name) => {
    const normalized = normalizeKey(key);
    if (normalized) {
      index[normalized] = name;
    }
  };

  Object.entries(KNOWN_ADDRESSES).forEach(([address, name]) => {
    add(address, name);

    const scriptHash = addressToScriptHash(address);
    if (scriptHash) {
      add(scriptHash, name);
      add(scriptHash.replace(/^0x/i, ""), name);
    }
  });

  return index;
})();

export function getKnownAddressName(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const directMatch = KNOWN_ADDRESS_INDEX[normalizeKey(raw)];
  if (directMatch) return directMatch;

  const asAddress = scriptHashToAddress(raw);
  if (asAddress) {
    return KNOWN_ADDRESS_INDEX[normalizeKey(asAddress)] || null;
  }

  return null;
}
