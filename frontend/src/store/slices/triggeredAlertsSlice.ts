import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { IAlertTriggeredEvent } from '../../app/api/types/alert.types';

/**
 * Holds the most recent `alert:triggered` events streamed from the
 * backend during the current session. The bell badge in the header reads
 * `unreadCount` for the small red dot, and the dropdown reads `items` to
 * render the list. The list is capped so a long session doesn't grow
 * unbounded — and `markAllRead` is called when the dropdown opens.
 */

const MAX_ITEMS = 30;

interface TriggeredAlertsState {
  items: IAlertTriggeredEvent[];
  unreadCount: number;
}

const initialState: TriggeredAlertsState = {
  items: [],
  unreadCount: 0,
};

const triggeredAlertsSlice = createSlice({
  name: 'triggeredAlerts',
  initialState,
  reducers: {
    pushTriggered(state, action: PayloadAction<IAlertTriggeredEvent>) {
      // Newest first; cap at MAX_ITEMS so the array stays small.
      state.items.unshift(action.payload);
      if (state.items.length > MAX_ITEMS) {
        state.items.length = MAX_ITEMS;
      }
      state.unreadCount += 1;
    },
    markAllRead(state) {
      state.unreadCount = 0;
    },
    clearTriggered(state) {
      state.items = [];
      state.unreadCount = 0;
    },
  },
});

export const { pushTriggered, markAllRead, clearTriggered } =
  triggeredAlertsSlice.actions;
export default triggeredAlertsSlice.reducer;
