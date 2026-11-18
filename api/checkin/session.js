import { liveHandlers } from '../../server/live.js';

export function GET(request) {
  return liveHandlers().checkinSession(request);
}
