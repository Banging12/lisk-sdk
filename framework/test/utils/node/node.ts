/*
 * Copyright © 2018 Lisk Foundation
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
 *
 */

import { createLogger } from '../../../src/logger';

export const fakeLogger = createLogger({
	fileLogLevel: 'none',
	consoleLogLevel: 'none',
	logFilePath: 'test.log',
	module: 'test',
});
