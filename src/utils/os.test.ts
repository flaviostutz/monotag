import { execCmd } from './os';

describe('when executing cmd', () => {
  it('should run multiple lines', () => {
    const out = execCmd(
      '.',
      `
        // test
        ls -al
        
        ls -al
      `,
    );
    expect(out.includes('src')).toBeTruthy();
  });
});
