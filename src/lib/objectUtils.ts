const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const removeUndefinedFields = <T extends Record<string, unknown>>(obj: T): T => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T;
};

export const removeUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map(item => removeUndefinedDeep(item))
      .filter(item => item !== undefined) as unknown as T;
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entryValue]) => [key, removeUndefinedDeep(entryValue)])
        .filter(([, entryValue]) => entryValue !== undefined),
    ) as T;
  }

  return value;
};
