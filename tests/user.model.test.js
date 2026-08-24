import User from '../src/modules/users/model/user.model.js';

describe('User model', () => {
  it.each([
    ['dupont', 'DUPONT'],
    ['  de la Fontaine  ', 'DE LA FONTAINE'],
    ['Lévêque-Martin', 'LÉVÊQUE-MARTIN'],
    ["d'Estaing", "D'ESTAING"],
  ])('stores the last name %s as %s', (input, expected) => {
    const user = User.build({
      firstName: 'Camille',
      lastName: input,
      email: 'camille@example.test',
      passwordHash: 'hash',
    });

    expect(user.lastName).toBe(expected);
  });

  it('normalizes the last name when an existing model is updated', () => {
    const user = User.build({
      firstName: 'Camille',
      lastName: 'DUPONT',
      email: 'camille@example.test',
      passwordHash: 'hash',
    });

    user.lastName = 'petit';

    expect(user.lastName).toBe('PETIT');
  });
});
