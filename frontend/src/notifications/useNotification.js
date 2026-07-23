import { useContext } from 'react';
import { NotificationContext } from './NotificationContext.jsx';
export default function useNotification() {
  return useContext(NotificationContext);
}
