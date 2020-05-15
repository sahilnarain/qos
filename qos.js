#!/Users/sahil/.nvm/versions/node/v12.16.1/bin/node

const puppeteer = require('puppeteer');
const yargs = require('yargs').argv._;

if (!yargs[0]) {
  console.log('    Usage: qos [STATE] [BANDWIDTH] [MODE]');
  process.exit();
}

if (yargs[0] === 'enable') {
  if (!yargs[1]) {
    yargs[1] = 1;
    console.log('WARN: No default bandwidth specified, using 1 Mbps.')
  }

  if (!yargs[2]) {
    yargs[2] = 'restricted';
    console.log('WARN: No default mode specified, using RESTRICTED.')
  }
};

const config = {
  LOGIN: {
    URL: 'http://192.168.0.1/login.htm',
    SELECTORS: {
      USER: '#div_main > tbody > tr > td > div > table:nth-child(2) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > input',
      PASS: '#userpass',
      SUBMIT: '#div_main > tbody > tr > td > div > table:nth-child(2) > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(2) > td > input'
    },
    CREDENTIALS: {
      USER: '<Your username>',
      PASS: '<Your password>'
    },
  },
  QOS: {
    URL: 'http://192.168.0.1/ip6_qos.htm',
    SELECTORS: {
      STATE: '#enabled_val',
      BANDWIDTH_UP: 'body > div.div_padding > form > table:nth-child(7) > tbody > tr:nth-child(2) > td:nth-child(2) > input[type=text]',
      BANDWIDTH_DOWN: 'body > div.div_padding > form > table:nth-child(7) > tbody > tr:nth-child(4) > td:nth-child(2) > input[type=text]',
      QOS_MODE: 'body > div.div_padding > form > table:nth-child(11) > tbody > tr:nth-child(6) > td:nth-child(2) > select',
      APPLY: 'body > div.div_padding > form > table:nth-child(13) > tbody > tr > td > input.submit_btn',
      DELETE_ALL: 'body > div.div_padding > form > form > input:nth-child(6)'
    }
  }
};

const enable = async (params, page) => {
  console.debug('[Enable] State');
  await page.select(config.QOS.SELECTORS.STATE, '1'); //Enabled

  console.debug('[Enable] Bandwidth (up)');
  await page.click(config.QOS.SELECTORS.BANDWIDTH_UP, {
    clickCount: 3
  });

  console.debug('[Enable] Bandwidth (down)');
  await page.type(config.QOS.SELECTORS.BANDWIDTH_UP, (params.bandwidth * 1024).toString());
  await page.click(config.QOS.SELECTORS.BANDWIDTH_DOWN, {
    clickCount: 3
  });
  await page.type(config.QOS.SELECTORS.BANDWIDTH_DOWN, (params.bandwidth * 1024).toString());

  console.debug('[Enable] Mode');
  if (params.mode === 'guaranteed') {
    await page.select(config.QOS.SELECTORS.QOS_MODE, '1'); //Guaranteed minimum bandwidth
  } else if (params.mode === 'restricted') {
    await page.select(config.QOS.SELECTORS.QOS_MODE, '2'); //Restricted maximum bandwidth
  }

  console.debug('[Enable] Apply');
  await page.click(config.QOS.SELECTORS.APPLY);
};

const disable = async (params, page) => {
  console.debug('[Disable] State');
  await page.select(config.QOS.SELECTORS.STATE, '0'); //Disabled

  console.debug('[Disable] Apply');
  await page.click(config.QOS.SELECTORS.APPLY);
};

const qos = async (params) => {
  console.log('Applying ', params);
  console.debug('Login');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(config.LOGIN.URL);

  console.debug('Username & Password');
  await page.type(config.LOGIN.SELECTORS.USER, config.LOGIN.CREDENTIALS.USER);
  await page.type(config.LOGIN.SELECTORS.PASS, config.LOGIN.CREDENTIALS.PASS);
  await page.click(config.LOGIN.SELECTORS.SUBMIT);

  console.debug('QoS');
  await page.goto(config.QOS.URL);

  try {
    await page.waitForSelector(config.QOS.SELECTORS.DELETE_ALL, {
      timeout: 3000
    });

    page.on('dialog', async dialog => {
      await dialog.accept();
    });

    console.debug('Clearing rules')
    await page.click(config.QOS.SELECTORS.DELETE_ALL);
    await page.goto(config.QOS.URL);

  } catch (e) {
    console.log('Clear rules skipped')
  }

  const currentState = await page.$eval(config.QOS.SELECTORS.STATE, selector => selector.value);

  if (params.state === 'enable' && currentState === '1') {
    console.debug('Disabling current');
    await disable(params, page);
    await page.goto(config.QOS.URL);
  }

  if (params.state === 'enable') {
    await enable(params, page);
  } else if (params.state === 'disable') {
    await disable(params, page);
  }

  // await page.screenshot({
  //   path: `/Users/sahil/Desktop/${Date.now()}-POST.png`,
  //   fullPage: true
  // });

  console.log('Done');
  await browser.close();
};


const main = () => {
  let options = {};
  options.state = yargs[0];
  yargs[1] ? options.bandwidth = yargs[1] : null;
  yargs[2] ? options.mode = yargs[2] : null;

  qos(options);
};

main();