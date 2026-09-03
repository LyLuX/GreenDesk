import { useContext } from 'react';
import { RuntimeConfigContext } from './RuntimeConfigContext.jsx';

export default function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}
