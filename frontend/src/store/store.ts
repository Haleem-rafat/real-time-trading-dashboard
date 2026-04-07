import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import selectedTickerReducer from './slices/selectedTickerSlice';
import livePricesReducer from './slices/livePricesSlice';
import triggeredAlertsReducer from './slices/triggeredAlertsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    selectedTicker: selectedTickerReducer,
    livePrices: livePricesReducer,
    triggeredAlerts: triggeredAlertsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
