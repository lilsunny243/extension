// Copyright 2019-2022 @subwallet/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { BasicInputWrapper } from '@subwallet/extension-koni-ui/components/Field/Base';
import { useForwardInputRef } from '@subwallet/extension-koni-ui/hooks/form/useForwardInputRef';
import { ThemeProps } from '@subwallet/extension-koni-ui/types';
import { Button, Input, InputRef } from '@subwallet/react-ui';
import BigN from 'bignumber.js';
import React, { ChangeEventHandler, ClipboardEventHandler, ForwardedRef, forwardRef, SyntheticEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

interface Props extends ThemeProps, BasicInputWrapper {
  decimals: number;
  maxValue: string;
}

const isValidInput = (input: string) => {
  return !(isNaN(parseFloat(input)) || !input.match(/^-?\d*(\.\d+)?$/));
};

export const getInputValuesFromString: (input: string, power: number) => string = (input: string, power: number) => {
  const intValue = input.split('.')[0];
  let valueBigN = new BigN(isValidInput(intValue) ? intValue : '0');

  valueBigN = valueBigN.div(new BigN(10).pow(power));

  return valueBigN.toFixed();
};

export const getOutputValuesFromString: (input: string, power: number) => string = (input: string, power: number) => {
  if (!isValidInput(input)) {
    return '';
  }

  let valueBigN = new BigN(input);

  valueBigN = valueBigN.times(new BigN(10).pow(power));

  return valueBigN.toFixed().split('.')[0];
};

const Component = (props: Props, ref: ForwardedRef<InputRef>) => {
  const { className, decimals, disabled, maxValue, onChange, value } = props;
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useForwardInputRef(ref);

  const { t } = useTranslation();

  const _onClickMaxBtn = useCallback((e: SyntheticEvent) => {
    e.stopPropagation();
    const transformVal = getInputValuesFromString(maxValue, decimals);

    setInputValue(transformVal);
    onChange && onChange({ target: { value: maxValue } });
  }, [decimals, maxValue, onChange]);

  const getMaxLengthText = useCallback((value: string) => {
    return value.includes('.') ? decimals + 1 + value.split('.')[0].length : 10;
  }, [decimals]);

  const suffix = () => {
    return (
      <Button
        // eslint-disable-next-line react/jsx-no-bind
        onClick={_onClickMaxBtn}
        size='xs'
        type='ghost'
      >
        <span className='max-btn-text'>{t('Max')}</span>
      </Button>
    );
  };

  const onChangeInput: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    let value = event.target.value;
    const maxLength = getMaxLengthText(value);

    if (value.length > maxLength) {
      value = value.slice(0, maxLength);
    }

    setInputValue(value);

    const transformVal = getOutputValuesFromString(value, decimals);

    onChange && onChange({ target: { value: transformVal } });
  }, [decimals, getMaxLengthText, onChange]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<Element>): void => {
      if (event.key.length === 1) {
        const { selectionEnd: j, selectionStart: i, value } = event.target as HTMLInputElement;
        const newValue = `${value.substring(0, i || 0)}${event.key}${value.substring(j || 0)}`;

        if (!(/^(0|[1-9]\d*)(\.\d*)?$/).test(newValue)) {
          event.preventDefault();
        }
      }
    },
    []
  );

  const onPaste = useCallback<ClipboardEventHandler<HTMLInputElement>>((event) => {
    event.preventDefault();
  }, []);

  return (
    <Input
      className={className}
      disabled={disabled}
      id={props.id}
      label={props.label}
      onBlur={props.onBlur}
      onChange={onChangeInput}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      placeholder={props.placeholder || t('Amount')}
      readOnly={props.readOnly}
      ref={inputRef}
      suffix={suffix()}
      value={inputValue}
    />
  );
};

const AmountInput = styled(forwardRef(Component))<Props>(({ theme: { token } }: Props) => {
  return {
    '.ant-input-affix-wrapper, input': {
      overflow: 'hidden'
    },

    '.max-btn-text': {
      color: token.colorSuccess
    }
  };
});

export default AmountInput;