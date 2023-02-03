// Copyright 2019-2022 @subwallet/extension-koni-base authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BasicTxErrorCode, BasicTxResponse, ExternalRequestPromise, HandleBasicTx, PrepareExternalRequest } from '@subwallet/extension-base/background/KoniTypes';
import { _SubstrateApi } from '@subwallet/extension-base/services/chain-service/types';
import { SignerExternal, SignerType } from '@subwallet/extension-base/signers/types';
import { sendExtrinsic } from '@subwallet/extension-koni-base/api/dotsama/shared/sendExtrinsic';
import { signExtrinsic } from '@subwallet/extension-koni-base/api/dotsama/shared/signExtrinsic';

import { SubmittableExtrinsic } from '@polkadot/api/types';
import { EventRecord } from '@polkadot/types/interfaces';

interface AbstractSignAndSendExtrinsicProps extends Partial<PrepareExternalRequest>{
  extrinsic: SubmittableExtrinsic<'promise'> | null;
  callback: HandleBasicTx;
  txState: BasicTxResponse;
  address: string;
  type: SignerType;
  errorMessage: string;
  substrateApi: _SubstrateApi;
  updateResponseTxResult?: (response: BasicTxResponse, records: EventRecord[]) => void;
}

interface PasswordSignAndSendExtrinsicProps extends AbstractSignAndSendExtrinsicProps {
  type: SignerType.PASSWORD;
}

interface ExternalSignAndSendExtrinsicProps extends AbstractSignAndSendExtrinsicProps {
  id: string;
  setState: (promise: ExternalRequestPromise) => void;
  updateState: (promise: Partial<ExternalRequestPromise>) => void;
  type: SignerExternal;
}

type SignAndSendExtrinsicProps = ExternalSignAndSendExtrinsicProps | PasswordSignAndSendExtrinsicProps;

export const signAndSendExtrinsic = async ({ address,
  callback,
  errorMessage,
  extrinsic,
  id,
  setState,
  substrateApi,
  txState,
  type,
  updateResponseTxResult,
  updateState }: SignAndSendExtrinsicProps) => {
  if (extrinsic !== null) {
    try {
      const passwordError = await signExtrinsic(type === SignerType.PASSWORD
        ? {
          address: address,
          substrateApi: substrateApi,
          callback: callback,
          extrinsic: extrinsic,
          type: type
        }
        : {
          address: address,
          substrateApi: substrateApi,
          callback: callback,
          extrinsic: extrinsic,
          id: id,
          setState: setState,
          type: type
        });

      if (passwordError) {
        txState.passwordError = passwordError;
        callback(txState);

        return;
      }
    } catch (e) {
      if (e) {
        console.error(errorMessage, e);
        txState.errors = [{ code: BasicTxErrorCode.KEYRING_ERROR, message: (e as Error).message }];
        txState.txError = true;
        txState.status = false;
        callback(txState);
      }

      return;
    }

    try {
      await sendExtrinsic({
        substrateApi: substrateApi,
        callback: callback,
        extrinsic: extrinsic,
        txState: txState,
        updateResponseTxResult: updateResponseTxResult,
        updateState: updateState
      });
    } catch (e) {
      console.error(errorMessage, e);

      // @ts-ignore
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
      if ((e as Error).message.includes('Invalid Transaction: Inability to pay some fees , e.g. account balance too low')) {
        txState.errors = [{ code: BasicTxErrorCode.BALANCE_TO_LOW, message: (e as Error).message }];
      } else {
        txState.errors = [{ code: BasicTxErrorCode.INVALID_PARAM, message: (e as Error).message }];
      }

      txState.txError = true;
      txState.status = false;
      callback(txState);
    }
  } else {
    txState.txError = true;
    txState.status = false;
    callback(txState);
  }
};