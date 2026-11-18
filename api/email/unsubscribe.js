import { liveHandlers } from '../../server/live.js';

export function GET(request) {
  return liveHandlers().unsubscribe(request);
}

export function POST(request) {
  return liveHandlers().unsubscribe(request);
}
