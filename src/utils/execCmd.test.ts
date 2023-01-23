import { execCmd } from './execCmd';

describe('when executing cmd', () => {
  it('should run multiple lines', async () => {
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
