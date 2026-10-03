import { createTheme, PRIMARY } from './theme';

describe('createTheme', () => {
  it('uses the park green and keeps motion on by default', () => {
    const theme = createTheme(false);
    expect(theme.token?.colorPrimary).toBe(PRIMARY);
    expect(theme.token?.motion).toBe(true);
  });

  it('turns motion off for reduced-motion users', () => {
    expect(createTheme(true).token?.motion).toBe(false);
  });

  it('keeps controls at 44px', () => {
    expect(createTheme(false).token?.controlHeight).toBe(44);
  });
});
