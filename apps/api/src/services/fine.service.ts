export const calculateFine = (
  dueDate: Date,
  returnedAt: Date,
  finePerDay = 5,
  gracePeriodDays = 1,
) => {
  const diffMs = returnedAt.getTime() - dueDate.getTime();
  const overdueDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (overdueDays <= gracePeriodDays) {
    return 0;
  }

  return Math.max(0, (overdueDays - gracePeriodDays) * finePerDay);
};
