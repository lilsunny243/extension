// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { DeriveAccountInfo } from '@polkadot/api-derive/types';

import { ApiPromise } from '@polkadot/api';
import { BackgroundWindow } from '@polkadot/extension-base/background/KoniTypes';
// import { keyring } from '@polkadot/ui-keyring';
import { isFunction } from '@polkadot/util';

const bWindow = chrome.extension.getBackgroundPage() as BackgroundWindow;
const { keyring } = bWindow.pdotApi;

export function checkVisibility (api: ApiPromise, address: string, accountInfo: DeriveAccountInfo, filterName = '', onlyNamed = false): boolean {
  let isVisible = false;
  const filterLower = filterName.toLowerCase();

  if (filterLower || onlyNamed) {
    if (accountInfo) {
      const { accountId, accountIndex, identity, nickname } = accountInfo;
      const hasAddressMatch = (!!accountId && accountId.toString().includes(filterName)) || (!!accountIndex && accountIndex.toString().includes(filterName));

      if (!onlyNamed && hasAddressMatch) {
        isVisible = true;
      } else if (isFunction(api.query.identity?.identityOf)) {
        isVisible = !!identity && (!!identity.display || !!identity.displayParent) && (
          hasAddressMatch ||
          (!!identity.display && identity.display.toLowerCase().includes(filterLower)) ||
          (!!identity.displayParent && identity.displayParent.toLowerCase().includes(filterLower))
        );
      } else if (nickname) {
        isVisible = nickname.toLowerCase().includes(filterLower);
      }
    }

    if (!isVisible) {
      const account = keyring.getAddress(address);

      isVisible = account?.meta?.name
        ? account.meta.name.toLowerCase().includes(filterLower)
        : false;
    }
  } else {
    isVisible = true;
  }

  return isVisible;
}