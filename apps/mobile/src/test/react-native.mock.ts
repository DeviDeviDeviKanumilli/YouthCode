export const Platform = {
  OS: 'ios',
  select<T>(specifics: { ios?: T; android?: T; default?: T }): T | undefined {
    return specifics.ios ?? specifics.default;
  },
};
