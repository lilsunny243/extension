// Copyright 2019-2022 @polkadot/extension-koni-ui authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useCallback, useState } from 'react';
import styled from 'styled-components';

import { NftItem as _NftItem } from '@polkadot/extension-base/background/KoniTypes';
import Spinner from '@polkadot/extension-koni-ui/components/Spinner';
import { ThemeProps } from '@polkadot/extension-koni-ui/types';

import logo from '../../../assets/sub-wallet-logo.svg';

interface Props {
  className?: string;
  data: _NftItem;
  onClickBack: () => void;
  collectionImage?: string;
}

function NftItem ({ className, collectionImage, data, onClickBack }: Props): React.ReactElement<Props> {
  const [loading, setLoading] = useState(true);
  const [showImage, setShowImage] = useState(true);
  const [imageError, setImageError] = useState(false);

  const propDetail = (title: string, value: string, key: number) => {
    return (
      <div
        className={'prop-detail'}
        key={key}
      >
        <div className={'prop-title'}>{title}</div>
        <div className={'prop-value'}>{value}</div>
      </div>
    );
  };

  const handleClickBack = useCallback(() => {
    onClickBack();
  }, [onClickBack]);

  const handleOnLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setLoading(false);
    setShowImage(false);
  }, []);

  const handleVideoError = useCallback(() => {
    setImageError(true);
    setShowImage(true);
  }, []);

  const handleOnClick = useCallback(() => {
    if (data.external_url) {
      // eslint-disable-next-line no-void
      void chrome.tabs.create({ url: data?.external_url, active: true }).then(() => console.log('redirecting'));
    }
  }, [data]);

  const getItemImage = useCallback(() => {
    if (data.image && !imageError) return data.image;
    else if (collectionImage) return collectionImage;

    return logo;
  }, [collectionImage, data.image, imageError]);

  return (
    <div className={className}>
      <div className={'header'}>
        <div
          className={'back-icon'}
          onClick={handleClickBack}
        >
          <FontAwesomeIcon
            className='arrowLeftIcon'
            // @ts-ignore
            icon={faArrowLeft}
          />
        </div>
        <div
          className={'header-title'}
          title={data.name ? data.name : '#' + data.id}
        >
          <div className={'collection-name'}>
            {data.name ? data.name : '#' + data.id}
          </div>
        </div>
        <div></div>
      </div>

      <div className={'detail-container'}>
        {
          loading &&
          <Spinner className={'img-spinner'} />
        }
        {
          showImage
            ? <img
              alt={'item-img'}
              className={'item-img'}
              onClick={handleOnClick}
              onError={handleImageError}
              onLoad={handleOnLoad}
              src={getItemImage()}
              style={{ borderRadius: '5px' }}
            />
            : <video
              autoPlay
              className={'item-img'}
              height='416'
              loop={true}
              muted
              onClick={handleOnClick}
              onError={handleVideoError}
              width='100%'
            >
              <source
                src={getItemImage()}
                type='video/mp4'
              />
            </video>
        }
        <div className={'send-button'}>Send</div>
        {
          data.description &&
            <div>
              <div className={'att-title'}>Description</div>
              <div className={'att-value'}><pre>{data?.description}</pre></div>
            </div>
        }
        {
          data.rarity &&
          <div>
            <div className={'att-title'}>Rarity</div>
            <div className={'att-value'}>{data?.rarity}</div>
          </div>
        }
        {
          data.properties &&
            <div>
              <div className={'att-title'}>Properties</div>
              <div className={'prop-container'}>
                {
                  Object.keys(data?.properties).map((key, index) => {
                    // eslint-disable @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                    // @ts-ignore
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                    return propDetail(key, data?.properties[key]?.value, index);
                    // eslint-enable @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
                  })
                }

                {/* {data?.properties.map((item: any) => { */}
                {/*  return propDetail(item) */}
                {/* })} */}
              </div>
            </div>
        }
      </div>
    </div>
  );
}

export default React.memo(styled(NftItem)(({ theme }: ThemeProps) => `
  padding-bottom: 20px;

  pre {
    white-space: pre-wrap;
    word-break: keep-all;
  }

  .img-container {
    position: relative;
    height: 124px;
    width: 124px;
  }

  .back-icon:hover {
    cursor: pointer;
  }

  .header {
    width: 100%;
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .header-title {
    width: 50%;
    display: flex;
    justify-content: center;
    margin-bottom: 12px;
  }

  .collection-name {
    font-size: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .send-button {
    margin-top: 20px;
    background: #004BFF;
    border-radius: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
    color: #FFFFFF;
  }

  .send-button:hover {
    cursor: pointer;
  }

  .item-img {
    display: block;
    height: 402px;
    width: 100%;
    border-radius: 5px;
    cursor: pointer;
  }

  .att-title {
    font-size: 16px;
    font-weight: 500;
    margin-top: 20px;
  }

  .att-value {
    font-size: 15px;
    color: #7B8098;
    word-break: break-all;
  }

  .prop-container {
    margin-top: 5px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .prop-detail {
    padding: 5px 10px;
    background: ${theme.popupBackground};
    box-shadow: 0px 0px 3px rgba(0, 0, 0, 0.15);
    border-radius: 5px;
  }

  .prop-title {
    text-transform: uppercase;
    color: ${theme.iconNeutralColor};
    font-size: 13px;
  }

  .prop-value {
    font-size: 14px;
  }
`));