import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { Park } from '../../../shared/parks';
import { initialState, reducer } from './reducer';
import { selectedPark, visibleParks } from './selectors';
import type { Action, AppState } from './types';

const StateContext = createContext<AppState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);

function desktopWidth(): boolean {
  return window.matchMedia('(min-width: 768px)').matches;
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => initialState(desktopWidth()));
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): AppState {
  const state = useContext(StateContext);
  if (!state) throw new Error('useAppState must be used inside StateProvider');
  return state;
}

export function useDispatch(): Dispatch<Action> {
  const dispatch = useContext(DispatchContext);
  if (!dispatch) throw new Error('useDispatch must be used inside StateProvider');
  return dispatch;
}

export function useVisibleParks(parks: Park[]): Park[] {
  const state = useAppState();
  return useMemo(() => visibleParks(parks, state), [parks, state]);
}

export function useSelectedPark(parks: Park[]): Park | undefined {
  const state = useAppState();
  return selectedPark(parks, state);
}
