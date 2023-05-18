// Copyright 2019-2022 @subwallet/extension-koni authors & contributors
// SPDX-License-Identifier: Apache-2.0

import State from '@subwallet/extension-base/koni/background/handlers/State';

import { logger as createLogger } from '@polkadot/util';
import { Logger } from '@polkadot/util/types';

import MigrationScripts, { EVERYTIME } from './scripts';

export default class MigrationService {
  readonly state: State;
  private logger: Logger;

  constructor (state: State) {
    this.state = state;
    this.logger = createLogger('Migration');
  }

  public async run (): Promise<void> {
    const keys = Object.keys(MigrationScripts).sort((a, b) => a.localeCompare(b));

    // Await timeout 2s
    await new Promise((resolve) => setTimeout(resolve, 2000));

    for (let i = 0; i < keys.length; i++) {
      try {
        const JobClass = MigrationScripts[keys[i]];
        const key = keys[i];
        const name = JobClass.name;

        const check = await this.state.dbService.stores.migration.table.where({
          name,
          key
        }).first();

        if (!check || key.startsWith(EVERYTIME)) {
          const job = new JobClass(this.state);

          await job.run();
          await this.state.dbService.stores.migration.table.put({
            key,
            name,
            timestamp: new Date().getTime()
          });
        }
      } catch (error) {
        this.logger.error('Migration error: ', MigrationScripts[keys[i]].name, error);
      }
    }
  }
}