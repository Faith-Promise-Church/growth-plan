import { liveHandlers } from '../../server/live.js';

export function POST(request) {
  return liveHandlers().adminTest(request);
}
