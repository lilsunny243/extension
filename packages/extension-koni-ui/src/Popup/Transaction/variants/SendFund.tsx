// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { _AssetRef, _AssetType, _ChainAsset, _ChainInfo, _MultiChainAsset } from '@subwallet/chain-list/types';
import { AssetSetting } from '@subwallet/extension-base/background/KoniTypes';
import { AccountJson } from '@subwallet/extension-base/background/types';
import { _ChainState } from '@subwallet/extension-base/services/chain-service/types';
import { _getAssetDecimals, _getOriginChainOfAsset, _isAssetFungibleToken, _isChainEvmCompatible } from '@subwallet/extension-base/services/chain-service/utils';
import { SWTransactionResponse } from '@subwallet/extension-base/services/transaction-service/types';
import { isSameAddress } from '@subwallet/extension-base/utils';
import { AccountSelector } from '@subwallet/extension-koni-ui/components/Field/AccountSelector';
import { AddressInput } from '@subwallet/extension-koni-ui/components/Field/AddressInput';
import AmountInput from '@subwallet/extension-koni-ui/components/Field/AmountInput';
import { ChainSelector } from '@subwallet/extension-koni-ui/components/Field/ChainSelector';
import { TokenItemType, TokenSelector } from '@subwallet/extension-koni-ui/components/Field/TokenSelector';
import { useGetChainPrefixBySlug, useHandleSubmitTransaction, useNotification, usePreCheckReadOnly, useSelector } from '@subwallet/extension-koni-ui/hooks';
import { getMaxTransfer, makeCrossChainTransfer, makeTransfer } from '@subwallet/extension-koni-ui/messaging';
import { RootState } from '@subwallet/extension-koni-ui/stores';
import { ChainItemType, FormCallbacks, SendFundParam, Theme, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { findAccountByAddress, formatBalance, isAccountAll, noop } from '@subwallet/extension-koni-ui/utils';
import { findNetworkJsonByGenesisHash } from '@subwallet/extension-koni-ui/utils/chain/getNetworkJsonByGenesisHash';
import { Button, Form, Icon, Input } from '@subwallet/react-ui';
import { Rule } from '@subwallet/react-ui/es/form';
import BigN from 'bignumber.js';
import CN from 'classnames';
import { PaperPlaneTilt } from 'phosphor-react';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';

import { BN, BN_ZERO } from '@polkadot/util';
import { isAddress, isEthereumAddress } from '@polkadot/util-crypto';

import { FreeBalance, TransactionContent, TransactionFooter } from '../parts';
import { TransactionContext, TransactionFormBaseProps } from '../Transaction';

interface TransferFormProps extends TransactionFormBaseProps {
  to: string;
  destChain: string;
  value: string;
}

type Props = ThemeProps;

function isAssetTypeValid (
  chainAsset: _ChainAsset,
  chainInfoMap: Record<string, _ChainInfo>,
  isAccountEthereum: boolean
) {
  return _isChainEvmCompatible(chainInfoMap[chainAsset.originChain]) === isAccountEthereum;
}

function getTokenItems (
  address: string,
  accounts: AccountJson[],
  chainInfoMap: Record<string, _ChainInfo>,
  chainStateMap: Record<string, _ChainState>,
  assetRegistry: Record<string, _ChainAsset>,
  assetSettingMap: Record<string, AssetSetting>,
  multiChainAssetMap: Record<string, _MultiChainAsset>,
  tokenGroupSlug?: string // is ether a token slug or a multiChainAsset slug
): TokenItemType[] {
  const account = findAccountByAddress(accounts, address);

  if (!account) {
    return [];
  }

  const ledgerNetwork = findNetworkJsonByGenesisHash(chainInfoMap, account.originGenesisHash)?.slug;
  const isAccountEthereum = isEthereumAddress(address);
  const isSetTokenSlug = !!tokenGroupSlug && !!assetRegistry[tokenGroupSlug];
  const isSetMultiChainAssetSlug = !!tokenGroupSlug && !!multiChainAssetMap[tokenGroupSlug];

  if (tokenGroupSlug) {
    if (!(isSetTokenSlug || isSetMultiChainAssetSlug)) {
      return [];
    }

    const chainAsset = assetRegistry[tokenGroupSlug];
    const isValidLedger = ledgerNetwork ? ledgerNetwork === chainAsset?.originChain : true;

    if (isSetTokenSlug) {
      if (isAssetTypeValid(chainAsset, chainInfoMap, isAccountEthereum) && isValidLedger) {
        const { name, originChain, slug, symbol } = assetRegistry[tokenGroupSlug];

        return [
          {
            name,
            slug,
            symbol,
            originChain
          }
        ];
      } else {
        return [];
      }
    }
  }

  const items: TokenItemType[] = [];

  Object.values(assetRegistry).forEach((chainAsset) => {
    const isValidLedger = ledgerNetwork ? ledgerNetwork === chainAsset.originChain : true;
    const isTokenFungible = _isAssetFungibleToken(chainAsset);

    if (!(isTokenFungible && isAssetTypeValid(chainAsset, chainInfoMap, isAccountEthereum) && isValidLedger)) {
      return;
    }

    if (isSetMultiChainAssetSlug) {
      if (chainAsset.multiChainAsset === tokenGroupSlug) {
        items.push({
          name: chainAsset.name,
          slug: chainAsset.slug,
          symbol: chainAsset.symbol,
          originChain: chainAsset.originChain
        });
      }
    } else {
      items.push({
        name: chainAsset.name,
        slug: chainAsset.slug,
        symbol: chainAsset.symbol,
        originChain: chainAsset.originChain
      });
    }
  });

  return items;
}

function getTokenAvailableDestinations (tokenSlug: string, xcmRefMap: Record<string, _AssetRef>, chainInfoMap: Record<string, _ChainInfo>): ChainItemType[] {
  if (!tokenSlug) {
    return [];
  }

  const result: ChainItemType[] = [];
  const originChain = chainInfoMap[_getOriginChainOfAsset(tokenSlug)];

  // Firstly, push the originChain of token
  result.push({
    name: originChain.name,
    slug: originChain.slug
  });

  Object.values(xcmRefMap).forEach((xcmRef) => {
    if (xcmRef.srcAsset === tokenSlug) {
      const destinationChain = chainInfoMap[xcmRef.destChain];

      result.push({
        name: destinationChain.name,
        slug: destinationChain.slug
      });
    }
  });

  return result;
}

const defaultFilterAccount = (account: AccountJson): boolean => !(isAccountAll(account.address) || account.isReadOnly);

const filterAccountFunc = (
  chainInfoMap: Record<string, _ChainInfo>,
  assetRegistry: Record<string, _ChainAsset>,
  multiChainAssetMap: Record<string, _MultiChainAsset>,
  tokenGroupSlug?: string // is ether a token slug or a multiChainAsset slug
): (account: AccountJson) => boolean => {
  const isSetTokenSlug = !!tokenGroupSlug && !!assetRegistry[tokenGroupSlug];
  const isSetMultiChainAssetSlug = !!tokenGroupSlug && !!multiChainAssetMap[tokenGroupSlug];

  if (!tokenGroupSlug) {
    return defaultFilterAccount;
  }

  const chainAssets = Object.values(assetRegistry).filter((chainAsset) => {
    const isTokenFungible = _isAssetFungibleToken(chainAsset);

    if (isTokenFungible) {
      if (isSetTokenSlug) {
        return chainAsset.slug === tokenGroupSlug;
      }

      if (isSetMultiChainAssetSlug) {
        return chainAsset.multiChainAsset === tokenGroupSlug;
      }
    } else {
      return false;
    }

    return false;
  });

  return (account: AccountJson): boolean => {
    const ledgerNetwork = findNetworkJsonByGenesisHash(chainInfoMap, account.originGenesisHash)?.slug;
    const isAccountEthereum = isEthereumAddress(account.address);

    if (!defaultFilterAccount(account)) {
      return false;
    }

    return chainAssets.some((chainAsset) => {
      const isValidLedger = ledgerNetwork ? ledgerNetwork === chainAsset?.originChain : true;

      return isAssetTypeValid(chainAsset, chainInfoMap, isAccountEthereum) && isValidLedger;
    });
  };
};

const _SendFund = ({ className = '' }: Props): React.ReactElement<Props> => {
  const { t } = useTranslation();
  const notification = useNotification();

  const locationState = useLocation().state as SendFundParam;
  const [sendFundSlug] = useState<string | undefined>(locationState?.slug);

  const { asset, chain, from, onDone, setAsset, setChain, setFrom } = useContext(TransactionContext);

  const { chainInfoMap, chainStateMap } = useSelector((root) => root.chainStore);
  const { assetRegistry, assetSettingMap, multiChainAssetMap, xcmRefMap } = useSelector((root) => root.assetRegistry);
  const { accounts, isAllAccount } = useSelector((state: RootState) => state.accountState);
  const [maxTransfer, setMaxTransfer] = useState<string>('0');
  const preCheckReadOnly = usePreCheckReadOnly(from, 'The account you are using is read-only, you cannot send assets with it');

  const [loading, setLoading] = useState(false);
  const [isTransferAll, setIsTransferAll] = useState(false);
  const [, update] = useState({});
  const [isBalanceReady, setIsBalanceReady] = useState(true);
  const [forceUpdateMaxValue, setForceUpdateMaxValue] = useState<object|undefined>(undefined);

  const handleTransferAll = useCallback((value: boolean) => {
    setForceUpdateMaxValue({});
    setIsTransferAll(value);
  }, []);

  const { onError, onSuccess } = useHandleSubmitTransaction(onDone, handleTransferAll);

  const [form] = Form.useForm<TransferFormProps>();
  const formDefault = useMemo((): TransferFormProps => {
    return {
      from: from,
      chain: chain,
      destChain: '',
      asset: '',
      to: '',
      value: ''
    };
  }, [chain, from]);

  const destChain = Form.useWatch('destChain', form);
  const transferAmount = Form.useWatch('value', form);

  const destChainItems = useMemo<ChainItemType[]>(() => {
    return getTokenAvailableDestinations(asset, xcmRefMap, chainInfoMap);
  }, [chainInfoMap, asset, xcmRefMap]);

  const currentChainAsset = useMemo(() => {
    return asset ? assetRegistry[asset] : undefined;
  }, [assetRegistry, asset]);

  const decimals = useMemo(() => {
    return currentChainAsset ? _getAssetDecimals(currentChainAsset) : 0;
  }, [currentChainAsset]);

  const fromChainNetworkPrefix = useGetChainPrefixBySlug(chain);
  const destChainNetworkPrefix = useGetChainPrefixBySlug(destChain);

  const tokenItems = useMemo<TokenItemType[]>(() => {
    return getTokenItems(
      from,
      accounts,
      chainInfoMap,
      chainStateMap,
      assetRegistry,
      assetSettingMap,
      multiChainAssetMap,
      sendFundSlug
    );
  }, [accounts, assetRegistry, assetSettingMap, chainInfoMap, chainStateMap, from, multiChainAssetMap, sendFundSlug]);

  const validateRecipientAddress = useCallback((rule: Rule, _recipientAddress: string): Promise<void> => {
    if (!_recipientAddress) {
      return Promise.reject(t('Recipient address is required'));
    }

    if (!isAddress(_recipientAddress)) {
      return Promise.reject(t('Invalid Recipient address'));
    }

    const { chain, destChain, from, to } = form.getFieldsValue();

    if (!from || !chain || !destChain) {
      return Promise.resolve();
    }

    const isOnChain = chain === destChain;

    if (isOnChain) {
      if (isSameAddress(from, _recipientAddress)) {
        // todo: change message later
        return Promise.reject(t('The recipient address can not be the same as the sender address'));
      }

      const isNotSameAddressType = (isEthereumAddress(from) && !!_recipientAddress && !isEthereumAddress(_recipientAddress)) ||
        (!isEthereumAddress(from) && !!_recipientAddress && isEthereumAddress(_recipientAddress));

      if (isNotSameAddressType) {
        // todo: change message later
        return Promise.reject(t('The recipient address must be same type as the current account address.'));
      }
    } else {
      const isDestChainEvmCompatible = _isChainEvmCompatible(chainInfoMap[destChain]);

      if (isDestChainEvmCompatible !== isEthereumAddress(to)) {
        // todo: change message later
        return Promise.reject(t(`The recipient address must be ${isDestChainEvmCompatible ? 'EVM' : 'substrate'} type`));
      }
    }

    return Promise.resolve();
  }, [chainInfoMap, form, t]);

  const validateAmount = useCallback((rule: Rule, amount: string): Promise<void> => {
    if (!amount) {
      return Promise.reject(t('Amount is required'));
    }

    // TODO: enable this when release
    if ((new BigN(amount)).eq(new BigN(0))) {
      return Promise.reject(t('Amount must be greater than 0'));
    }

    if ((new BigN(amount)).gt(new BigN(maxTransfer))) {
      const maxString = formatBalance(maxTransfer, decimals);

      return Promise.reject(t('Amount must be equal or less than {{number}}', { replace: { number: maxString } }));
    }

    return Promise.resolve();
  }, [decimals, maxTransfer, t]);

  const onValuesChange: FormCallbacks<TransferFormProps>['onValuesChange'] = useCallback(
    (part: Partial<TransferFormProps>, values: TransferFormProps) => {
      const validateField: string[] = [];

      if (part.from) {
        setFrom(part.from);
        setForceUpdateMaxValue(undefined);
        form.resetFields(['asset']);
      }

      if (part.asset) {
        const chain = assetRegistry[part.asset].originChain;

        if (values.value) {
          validateField.push('value');
        }

        form.setFieldsValue({
          chain: chain,
          destChain: chain
        });

        if (values.to) {
          validateField.push('to');
        }

        setChain(chain);
        setAsset(part.asset);
        setIsTransferAll(false);
        setForceUpdateMaxValue(undefined);
      }

      if (part.destChain) {
        if (part.destChain !== values.chain && assetRegistry[values.asset]?.assetType === _AssetType.NATIVE) {
          setIsTransferAll(false);
        }

        if (values.to) {
          validateField.push('to');
        }
      }

      if (validateField.length) {
        form.validateFields(validateField).catch(noop);
      }
    },
    [form, setFrom, assetRegistry, setChain, setAsset]
  );

  // Submit transaction
  const onSubmit: FormCallbacks<TransferFormProps>['onFinish'] = useCallback((values: TransferFormProps) => {
    setLoading(true);
    const { destChain, to, value } = values;

    let sendPromise: Promise<SWTransactionResponse>;

    if (chain === destChain) {
      // Transfer token or send fund
      sendPromise = makeTransfer({
        from,
        networkKey: chain,
        to: to,
        tokenSlug: asset,
        value: value,
        transferAll: isTransferAll
      });
    } else {
      const acc = findAccountByAddress(accounts, from);

      if (acc?.isHardware) {
        setLoading(false);
        notification({
          message: t('This feature is not available for Ledger account'),
          type: 'warning'
        });

        return;
      }

      // Make cross chain transfer
      sendPromise = makeCrossChainTransfer({
        destinationNetworkKey: destChain,
        from,
        originNetworkKey: chain,
        tokenSlug: asset,
        to,
        value,
        transferAll: isTransferAll
      });
    }

    setTimeout(() => {
      // Handle transfer action
      sendPromise
        .then(onSuccess)
        .catch(onError)
        .finally(() => {
          setLoading(false);
        })
      ;
    }, 300);
  }, [chain, from, asset, isTransferAll, accounts, notification, t, onSuccess, onError]);

  const onFilterAccountFunc = useMemo(() => filterAccountFunc(chainInfoMap, assetRegistry, multiChainAssetMap, sendFundSlug), [assetRegistry, chainInfoMap, multiChainAssetMap, sendFundSlug]);

  const onSetMaxTransferable = useCallback((value: boolean) => {
    const bnMaxTransfer = new BN(maxTransfer);

    if (!bnMaxTransfer.isZero()) {
      setIsTransferAll(value);
    }
  }, [maxTransfer]);

  // TODO: Need to review
  useEffect(() => {
    const { asset, from } = form.getFieldsValue();

    if (tokenItems.length) {
      if (!asset) {
        const account = findAccountByAddress(accounts, from);

        let pass = false;

        if (account?.originGenesisHash) {
          const network = findNetworkJsonByGenesisHash(chainInfoMap, account.originGenesisHash);

          if (network) {
            const token = tokenItems.find((item) => item.originChain === network.slug);

            if (token) {
              form.setFieldsValue({
                asset: token.slug,
                chain: assetRegistry[token.slug].originChain,
                destChain: assetRegistry[token.slug].originChain
              });
              setChain(assetRegistry[token.slug].originChain);
              pass = true;
            }
          }
        }

        if (!pass) {
          form.setFieldsValue({
            asset: tokenItems[0].slug,
            chain: assetRegistry[tokenItems[0].slug].originChain,
            destChain: assetRegistry[tokenItems[0].slug].originChain
          });
          setChain(assetRegistry[tokenItems[0].slug].originChain);
        }
      } else {
        const isSelectedTokenInList = tokenItems.some((i) => i.slug === asset);

        if (!isSelectedTokenInList) {
          form.setFieldsValue({
            asset: tokenItems[0].slug,
            chain: assetRegistry[tokenItems[0].slug].originChain,
            destChain: assetRegistry[tokenItems[0].slug].originChain
          });
          setChain(assetRegistry[tokenItems[0].slug].originChain);
        }
      }
    }
  }, [accounts, tokenItems, assetRegistry, form, setChain, chainInfoMap]);

  // Get max transfer value
  useEffect(() => {
    let cancel = false;

    if (from && asset) {
      getMaxTransfer({
        address: from,
        networkKey: assetRegistry[asset].originChain,
        token: asset,
        isXcmTransfer: chain !== destChain,
        destChain
      })
        .then((balance) => {
          !cancel && setMaxTransfer(balance.value);
        })
        .catch(() => {
          !cancel && setMaxTransfer('0');
        })
        .finally(() => {
          if (!cancel) {
            const value = form.getFieldValue('value') as string;

            if (value) {
              setTimeout(() => {
                form.validateFields(['value']).finally(() => update({}));
              }, 100);
            }
          }
        });
    }

    return () => {
      cancel = true;
    };
  }, [asset, assetRegistry, assetSettingMap, chain, destChain, form, from]);

  useEffect(() => {
    const bnTransferAmount = new BN(transferAmount || '0');
    const bnMaxTransfer = new BN(maxTransfer || '0');

    if (bnTransferAmount.gt(BN_ZERO) && bnTransferAmount.eq(bnMaxTransfer)) {
      setIsTransferAll(true);
    }
  }, [maxTransfer, transferAmount]);

  return (
    <>
      <TransactionContent className={CN(`${className} -transaction-content`)}>
        <div className={'__brief common-text text-light-4 text-center'}>
          {t('You are doing a token transfer with the following information')}
        </div>

        <Form
          className={'form-container form-space-sm'}
          form={form}
          initialValues={formDefault}
          onFinish={onSubmit}
          onValuesChange={onValuesChange}
        >
          <Form.Item
            className={CN({ hidden: !isAllAccount })}
            name={'from'}
          >
            <AccountSelector
              addressPrefix={fromChainNetworkPrefix}
              disabled={!isAllAccount}
              filter={onFilterAccountFunc}
              label={t('Send from account')}
            />
          </Form.Item>

          <div className={'form-row'}>
            <Form.Item name={'asset'}>
              <TokenSelector
                disabled={!tokenItems.length}
                items={tokenItems}
                placeholder={t('Select token')}
                showChainInSelected
                tooltip={t('Token')}
              />
            </Form.Item>

            <Form.Item
              name={'value'}
              rules={[
                {
                  validator: validateAmount
                }
              ]}
              statusHelpAsTooltip={true}
              validateTrigger='onBlur'
            >
              <AmountInput
                decimals={decimals}
                forceUpdateMaxValue={forceUpdateMaxValue}
                maxValue={maxTransfer}
                onSetMax={onSetMaxTransferable}
                showMaxButton={true}
                tooltip={t('Amount')}
              />
            </Form.Item>
          </div>

          <Form.Item
            className={'hidden'}
            name={'chain'}
          >
            <Input
              placeholder={t('value')}
            />
          </Form.Item>

          <Form.Item
            name={'to'}
            rules={[
              {
                validator: validateRecipientAddress
              }
            ]}
            statusHelpAsTooltip={true}
            validateTrigger='onBlur'
          >
            <AddressInput
              addressPrefix={destChainNetworkPrefix}
              label={t('Send to account')}
              saveAddress={true}
              showAddressBook={true}
              showScanner={true}
            />
          </Form.Item>

          <Form.Item name={'destChain'}>
            <ChainSelector
              disabled={!destChainItems.length}
              items={destChainItems}
              title={t('Select destination chain')}
              tooltip={t('Destination chain')}
            />
          </Form.Item>
        </Form>

        <FreeBalance
          address={from}
          chain={chain}
          onBalanceReady={setIsBalanceReady}
          tokenSlug={asset}
        />
      </TransactionContent>
      <TransactionFooter
        className={`${className} -transaction-footer`}
        errors={[]}
        warnings={[]}
      >
        <Button
          disabled={!isBalanceReady}
          icon={(
            <Icon
              phosphorIcon={PaperPlaneTilt}
              weight={'fill'}
            />
          )}
          loading={loading}
          onClick={preCheckReadOnly(form.submit)}
          schema={isTransferAll ? 'warning' : undefined}
        >
          {isTransferAll ? t('Transfer the full account balance') : t('Transfer')}
        </Button>
      </TransactionFooter>
    </>
  );
};

const SendFund = styled(_SendFund)(({ theme }) => {
  const token = (theme as Theme).token;

  return ({
    '.__brief': {
      paddingLeft: token.padding,
      paddingRight: token.padding,
      marginBottom: token.marginMD
    },

    '&.-transaction-content.-is-zero-balance': {
      '.free-balance .ant-number': {
        '.ant-number-integer, .ant-number-decimal': {
          color: `${token.colorError} !important`
        }
      }
    }
  });
});

export default SendFund;