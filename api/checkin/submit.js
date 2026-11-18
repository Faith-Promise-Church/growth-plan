import { liveHandlers } from '../../server/live.js';

export function POST(request) {
  return liveHandlers().checkinSubmit(request);
}
