// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { NetworkJson } from '@subwallet/extension-base/background/KoniTypes';

export const getNetworkJsonByGenesisHash = (networkMap: Record<string, NetworkJson>, hash?: string | null): NetworkJson | null => {
  if (!hash) {
    return null;
  }

  for (const n in networkMap) {
    if (!Object.prototype.hasOwnProperty.call(networkMap, n)) {
      continue;
    }

    const networkInfo = networkMap[n];

    if (networkInfo.genesisHash === hash) {
      return networkInfo;
    }
  }

  return null;
};

export const getNetworkKeyByGenesisHash = (networkMap: Record<string, NetworkJson>, hash?: string | null): string | null => {
  if (!hash) {
    return null;
  }

  for (const n in networkMap) {
    if (!Object.prototype.hasOwnProperty.call(networkMap, n)) {
      continue;
    }

    const networkInfo = networkMap[n];

    if (networkInfo.genesisHash === hash) {
      return n;
    }
  }

  return null;
};

export const getNetworkJsonByInfo = (networkMap: Record<string, NetworkJson>, isEthereumAddress: boolean, isEthereumNetwork: boolean, info?: string | null | number): NetworkJson | null => {
  if (!info) {
    if (isEthereumNetwork) {
      for (const n in networkMap) {
        if (!Object.prototype.hasOwnProperty.call(networkMap, n)) {
          continue;
        }

        const networkInfo = networkMap[n];

        if (networkInfo.isEthereum) {
          return networkInfo;
        }
      }
    }

    return null;
  }

  for (const n in networkMap) {
    if (!Object.prototype.hasOwnProperty.call(networkMap, n)) {
      continue;
    }

    const networkInfo = networkMap[n];

    if (isEthereumNetwork) {
      if (networkInfo.evmChainId === info) {
        return networkInfo;
      }
    } else {
      if (networkInfo.genesisHash.includes(info as string) && !!networkInfo.isEthereum === isEthereumAddress) {
        return networkInfo;
      }
    }
  }

  return null;
};