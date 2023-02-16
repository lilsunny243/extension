// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SettingItemSelection } from '@subwallet/extension-koni-ui/components/Setting/SettingItemSelection';
import { IMPORT_ACCOUNT_MODAL } from '@subwallet/extension-koni-ui/constants/modal';
import useTranslation from '@subwallet/extension-koni-ui/hooks/useTranslation';
import { GlobalToken, Theme } from '@subwallet/extension-koni-ui/themes';
import { PhosphorIcon, ThemeProps } from '@subwallet/extension-koni-ui/types';
import { BackgroundIcon, ModalContext, SwModal } from '@subwallet/react-ui';
import CN from 'classnames';
import { FileJs, Leaf, QrCode, Wallet } from 'phosphor-react';
import React, { useCallback, useContext, useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

type Props = ThemeProps;

interface ImportAccountItem {
  label: string;
  modalId: string;
  icon: PhosphorIcon;
  backgroundColor: string;
}

const renderItems = (token: GlobalToken): ImportAccountItem[] => {
  return [
    {
      backgroundColor: token['green-7'],
      icon: Leaf,
      modalId: '1',
      label: 'Import from Seed Phrase'
    },
    {
      backgroundColor: token['orange-7'],
      icon: FileJs,
      modalId: '2',
      label: 'Restore from Polkadot {js}'
    },
    {
      backgroundColor: token['gray-3'],
      icon: Wallet,
      modalId: '3',
      label: 'Import from MetaMask'
    },
    {
      backgroundColor: token['blue-7'],
      icon: QrCode,
      modalId: '3',
      label: 'Import by QR Code'
    }
  ];
};

const modalId = IMPORT_ACCOUNT_MODAL;

const Component: React.FC<Props> = ({ className }: Props) => {
  const { t } = useTranslation();
  const { activeModal, inactiveModal } = useContext(ModalContext);
  const { token } = useTheme() as Theme;

  const onCancel = useCallback(() => {
    inactiveModal(modalId);
  }, [inactiveModal]);

  const items = useMemo((): ImportAccountItem[] => renderItems(token), [token]);
  const renderIcon = useCallback((item: ImportAccountItem) => {
    return (
      <BackgroundIcon
        backgroundColor={item.backgroundColor}
        iconColor={token.colorText}
        phosphorIcon={item.icon}
        size='sm'
        weight='fill'
      />
    );
  }, [token.colorText]);

  const onClickItem = useCallback((item: ImportAccountItem): (() => void) => {
    return () => {
      inactiveModal(modalId);
      activeModal(item.modalId);
    };
  }, [activeModal, inactiveModal]);

  return (
    <SwModal
      className={CN(className)}
      id={modalId}
      onCancel={onCancel}
      title={t<string>('Import account')}
    >
      <div className='items-container'>
        {items.map((item) => {
          return (
            <div
              key={item.modalId}
              onClick={onClickItem(item)}
            >
              <SettingItemSelection
                className={'add-account-item-wrapper'}
                label={t<string>(item.label)}
                leftItemIcon={renderIcon(item)}
              />
            </div>
          );
        })}
      </div>
    </SwModal>
  );
};

const ImportAccountModal = styled(Component)<Props>(({ theme: { token } }: Props) => {
  return {
    '.items-container': {
      display: 'flex',
      flexDirection: 'column',
      gap: token.sizeXS
    }
  };
});

export default ImportAccountModal;