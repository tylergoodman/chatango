require('dotenv').config();
// import debug from './helpers/debug';
import expectStyle from './helpers/expectStyle';
import expectBackground from './helpers/expectBackground';

import User from '../User';


const { TEST_USERNAME, TEST_PASSWORD } = process.env;

describe('User', () => {

  it('getStyle', async () => {
    const user = new User(TEST_USERNAME);
    const style = await user.getStyle();
    expectStyle(style);
  });

  it('static getStyle', async () => {
    const style = await User.getStyle(TEST_USERNAME);
    expectStyle(style);
  });

  it('getBackground', async () => {
    const user = new User(TEST_USERNAME);
    const background = await user.getBackground();
    expectBackground(background);
  });

  it('static getBackground', async () => {
    const background = await User.getBackground(TEST_USERNAME);
    expectBackground(background);
  });

  it.only('getToken', async () => {
    const token = await User.getToken(TEST_USERNAME, TEST_PASSWORD);
    console.log(token);
  });
});
