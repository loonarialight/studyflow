import { configureStore } from '@reduxjs/toolkit';
import groupReducer from './groupSlice';

export const store = configureStore({
  reducer: {
    groups: groupReducer,
    // ... твои существующие редьюсеры
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;