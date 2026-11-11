import { createContext, useContext } from 'react';

export const AppVisibleContext = createContext(false);

export function useAppVisible() {
  return useContext(AppVisibleContext);
}
