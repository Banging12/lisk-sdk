/*
 * Copyright © 2021 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

export const MODULE_ID_DPOS = 13; // TBD

export const STORE_PREFIX_VOTER = 0x0000;
export const STORE_PREFIX_DELEGATE = 0x4000;
export const STORE_PREFIX_NAME = 0x8000;
export const STORE_PREFIX_SNAPSHOT = 0xd000;
export const STORE_PREFIX_GENESIS_DATA = 0xc000;
export const STORE_PREFIX_PREVIOUS_TIMESTAMP = 0xe000;

export const COMMAND_ID_DELEGATE_REGISTRATION = 0;
export const COMMAND_ID_VOTE = 1;
export const COMMAND_ID_UNLOCK = 2;
export const COMMAND_ID_POM = 3;
export const COMMAND_ID_UPDATE_GENERATOR_KEY = 4;

export const WAIT_TIME_VOTE = 2000;
export const WAIT_TIME_SELF_VOTE = 260000;
export const VOTER_PUNISH_TIME = 260000;
export const SELF_VOTE_PUNISH_TIME = 780000;
// Punishment period is 780k block height by default
export const PUNISHMENT_PERIOD = 780000;
export const MAX_LENGTH_NAME = 20;
export const TEN_UNIT = BigInt(10) * BigInt(10) ** BigInt(8);
export const MAX_VOTE = 10;
export const MAX_UNLOCKING = 20;
export const DELEGATE_REGISTRATION_FEE = BigInt(10) * BigInt(10) ** BigInt(8);
export const EMPTY_KEY = Buffer.alloc(0);
export const FAIL_SAFE_MISSED_BLOCKS = 50;
export const FAIL_SAFE_INACTIVE_WINDOW = 260000;
export const ROUND_LENGTH = 103;
export const FACTOR_SELF_VOTES = 10;
export const MIN_WEIGHT_STANDBY = BigInt(1000) * BigInt(1e8);
export const BFT_THRESHOLD = 68;
export const NUMBER_STANDBY_DELEGATES = 2;
export const NUMBER_ACTIVE_DELEGATES = 101;
export const EMPTY_BUFFER = Buffer.alloc(0);
