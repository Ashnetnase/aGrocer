const nzdFormatter = new Intl.NumberFormat('en-NZ', { style: 'currency', currency: 'NZD' });

export const nzd = (value: number): string => nzdFormatter.format(value);

export const pluralise = (count: number, singular: string, plural?: string): string =>
  `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
