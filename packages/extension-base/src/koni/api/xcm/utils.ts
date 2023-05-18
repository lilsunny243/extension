// Copyright 2019-2022 @subwallet/extension-base
// SPDX-License-Identifier: Apache-2.0

import { COMMON_CHAIN_SLUGS } from '@subwallet/chain-list';
import { _ChainInfo } from '@subwallet/chain-list/types';
import { _isChainEvmCompatible } from '@subwallet/extension-base/services/chain-service/utils';

import { decodeAddress, evmToAddress } from '@polkadot/util-crypto';

export const FOUR_INSTRUCTIONS_WEIGHT = 5000000000;
export const FOUR_INSTRUCTIONS_LIMITED_WEIGHT = { Limited: 5000000000 };

// get multilocation for destination chain from a parachain

export function getReceiverLocation (originChainInfo: _ChainInfo, destinationChainInfo: _ChainInfo, toAddress: string): Record<string, any> {
  if (destinationChainInfo.slug === COMMON_CHAIN_SLUGS.ASTAR_EVM) {
    const ss58Address = evmToAddress(toAddress, 2006); // TODO: shouldn't pass addressPrefix directly

    return { AccountId32: { network: 'Any', id: decodeAddress(ss58Address) } };
  }

  if (_isChainEvmCompatible(destinationChainInfo)) {
    return { AccountKey20: { network: 'Any', key: toAddress } };
  }

  return { AccountId32: { network: 'Any', id: decodeAddress(toAddress) } };
}

export function getBeneficiary (originChainInfo: _ChainInfo, destinationChainInfo: _ChainInfo, recipientAddress: string, version = 'V1') {
  const receiverLocation: Record<string, any> = getReceiverLocation(originChainInfo, destinationChainInfo, recipientAddress);

  return {
    [version]: {
      parents: 0,
      interior: {
        X1: receiverLocation
      }
    }
  };
}

export function getDestWeight () {
  return 'Unlimited';
  // return api.tx.xTokens.transfer.meta.args[3].type.toString() ===
  // 'XcmV2WeightLimit'
  //   ? 'Unlimited'
  //   : FOUR_INSTRUCTIONS_WEIGHT;
}