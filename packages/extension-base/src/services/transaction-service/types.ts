// Copyright 2019-2022 @subwallet/extension-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { AmountData, ChainType, ExtrinsicStatus, ExtrinsicType, ValidateTransactionResponse } from '@subwallet/extension-base/background/KoniTypes';
import EventEmitter from 'eventemitter3';
import { TransactionConfig } from 'web3-core';

import { SubmittableExtrinsic } from '@polkadot/api/promise/types';

export interface SWTransaction extends ValidateTransactionResponse {
  id: string;
  url?: string;
  isInternal: boolean,
  chain: string;
  chainType: ChainType;
  address: string;
  data: any;
  status: ExtrinsicStatus;
  extrinsicHash: string;
  extrinsicType: ExtrinsicType;
  createdAt: Date;
  updatedAt: Date;
  ignoreWarnings?: boolean;
  estimateFee?: AmountData,
  transaction: SubmittableExtrinsic | TransactionConfig;
  validateMethod?: (inputTransaction: SWTransactionInput) => Promise<void>;
}

export type SWTransactionResult = Omit<SWTransaction, 'transaction'>

type SwInputBase = Pick<SWTransaction, 'address' | 'url' | 'data' | 'extrinsicType' | 'chain' | 'chainType' | 'validateMethod' | 'ignoreWarnings' | 'transferNativeAmount'>;
export interface SWTransactionInput extends SwInputBase {
  transaction?: SWTransaction['transaction'] | null;
  warnings?: SWTransaction['warnings'];
  errors?: SWTransaction['errors'];
}

export type SWTransactionResponse = SwInputBase & Pick<SWTransaction, 'warnings' | 'errors'> & Partial<Pick<SWTransaction, 'id' | 'extrinsicHash' | 'status'>>;

export type ValidateTransactionResponseInput = SWTransactionInput;

export type TransactionEmitter = EventEmitter<TransactionEventMap>;

export interface TransactionEventResponse extends ValidateTransactionResponse {
  id: string,
  extrinsicHash?: string
}
export interface TransactionEventMap {
  extrinsicHash: (response: TransactionEventResponse) => void;
  error: (response: TransactionEventResponse) => void;
  success: (response: TransactionEventResponse) => void;
}
