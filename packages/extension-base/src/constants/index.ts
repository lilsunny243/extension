// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

export const CRON_REFRESH_PRICE_INTERVAL = 30000;
export const DOTSAMA_API_TIMEOUT = 30000;
export const DOTSAMA_AUTO_CONNECT_MS = 3000;
export const DOTSAMA_MAX_CONTINUE_RETRY = 2;
export const CRON_AUTO_RECOVER_DOTSAMA_INTERVAL = 60000;
export const CRON_AUTO_RECOVER_WEB3_INTERVAL = 90000;
export const ACALA_REFRESH_CROWDLOAN_INTERVAL = 300000;
export const ACALA_REFRESH_BALANCE_INTERVAL = 30000;
export const ASTAR_REFRESH_BALANCE_INTERVAL = 30000;
export const SUB_TOKEN_REFRESH_BALANCE_INTERVAL = 30000;
export const SUBSCRIBE_BALANCE_FAST_INTERVAL = 9000;
export const CRON_REFRESH_NFT_INTERVAL = 900000;
export const CRON_REFRESH_STAKING_REWARD_INTERVAL = 900000;
export const CRON_REFRESH_STAKING_REWARD_FAST_INTERVAL = 10000;
export const CRON_REFRESH_HISTORY_INTERVAL = 90000;
export const CRON_GET_API_MAP_STATUS = 5000;
export const CRON_REFRESH_STAKING_DATA = 30000;
export const CRON_REFRESH_CHAIN_STAKING_METADATA = 900000;
export const CRON_REFRESH_CHAIN_NOMINATOR_METADATA = 900000;

export const ALL_ACCOUNT_KEY = 'ALL';
export const ALL_NETWORK_KEY = 'all';
export const ALL_GENESIS_HASH = null;
export const IGNORE_GET_SUBSTRATE_FEATURES_LIST: string[] = ['astarEvm', 'ethereum', 'ethereum_goerli', 'binance', 'binance_test', 'boba_rinkeby', 'boba', 'bobabase', 'bobabeam'];
export const IGNORE_QR_SIGNER: string[] = [];

export const DEFAULT_TIME_AUTO_LOCK = 15 * 60 * 1000;

export * from './staking';
