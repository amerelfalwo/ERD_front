import { notifications } from '@mantine/notifications';

/**
 * Show a success notification (green).
 * @param {string} message — The message to display.
 */
export function notifySuccess(message) {
  notifications.show({
    title: '✓',
    message,
    color: 'green',
    position: 'top-right',
    autoClose: 3000,
  });
}

/**
 * Show an error notification (red).
 * Automatically extracts `error.response.data.detail` if passed an Error/response.
 * @param {string|Error|object} errorOrMessage — A plain string, an Error object, or an Axios-style error.
 */
export function notifyError(errorOrMessage) {
  let message = 'An unexpected error occurred';

  if (typeof errorOrMessage === 'string') {
    message = errorOrMessage;
  } else if (errorOrMessage instanceof Error) {
    message = errorOrMessage.message || message;
  } else if (errorOrMessage?.response?.data?.detail) {
    message = errorOrMessage.response.data.detail;
  } else if (errorOrMessage?.message) {
    message = errorOrMessage.message;
  }

  notifications.show({
    title: '✕',
    message,
    color: 'red',
    position: 'top-right',
    autoClose: 5000,
  });
}
