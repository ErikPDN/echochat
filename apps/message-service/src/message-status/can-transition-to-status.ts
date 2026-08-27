import { MessageStatus } from '@app/contracts';

const STATUS_ORDER: Record<MessageStatus, number> = {
  [MessageStatus.PENDING]: 0,
  [MessageStatus.SENT]: 1,
  [MessageStatus.DELIVERED]: 2,
  [MessageStatus.READ]: 3,
  [MessageStatus.FAILED]: -1,
};

export const canTransitionToStatus = (
  currentStatus: MessageStatus,
  newStatus: MessageStatus,
): boolean => {
  if (currentStatus === MessageStatus.READ) {
    return false;
  }

  if (newStatus === MessageStatus.FAILED) {
    return true;
  }

  if (currentStatus === MessageStatus.FAILED) {
    return false;
  }

  return STATUS_ORDER[newStatus] > STATUS_ORDER[currentStatus];
};
