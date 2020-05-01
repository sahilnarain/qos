#!/usr/local/bin/node

const puppeteer = require('puppeteer');
const yargs = require('yargs').argv._;

if (!yargs[0]) {
  console.log('    Usage: ./qos.js [STATE] [BANDWIDTH] [MODE]');
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
    CREDENTIALS: {
      USER: '<Your username>',
      PASS: '<Your password>'
    },
    SELECTORS: {
      USER: '#div_main > tbody > tr > td > div > table:nth-child(2) > tbody > tr > td > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > input',
      PASS: '#userpass',
      SUBMIT: '#div_main > tbody > tr > td > div > table:nth-child(2) > tbody > tr > td > table:nth-child(2) > tbody > tr:nth-child(2) > td > input'
    }
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

let qos = async (params) => {
  console.log('Applying ', params);
  // console.debug('Login');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(config.LOGIN.URL);

  // console.debug('Username & Password');
  await page.type(config.LOGIN.SELECTORS.USER, config.LOGIN.CREDENTIALS.USER);
  await page.type(config.LOGIN.SELECTORS.PASS, config.LOGIN.CREDENTIALS.PASS);
  await page.click(config.LOGIN.SELECTORS.SUBMIT);

  // console.debug('QoS');
  await page.goto(config.QOS.URL);

  // console.debug('Clear rules');
  page.on('dialog', async dialog => {
    await dialog.accept();
  });
  await page.click(config.QOS.SELECTORS.DELETE_ALL);

  await page.screenshot({
    path: `./${Date.now()}.png`,
    fullPage: true
  });

  // console.debug('State');
  if (params.state === 'enable') {
    await page.select(config.QOS.SELECTORS.STATE, '1'); //Enabled

    // console.debug('Bandwidth (up)');
    await page.click(config.QOS.SELECTORS.BANDWIDTH_UP, {
      clickCount: 3
    });

    // console.debug('Bandwidth (down)');
    await page.type(config.QOS.SELECTORS.BANDWIDTH_UP, (params.bandwidth * 1024).toString());
    await page.click(config.QOS.SELECTORS.BANDWIDTH_DOWN, {
      clickCount: 3
    });
    await page.type(config.QOS.SELECTORS.BANDWIDTH_DOWN, (params.bandwidth * 1024).toString());

    // console.debug('Mode');
    if (params.mode === 'guaranteed') {
      await page.select(config.QOS.SELECTORS.QOS_MODE, '1'); //Guaranteed minimum bandwidth
    } else if (params.mode === 'restricted') {
      await page.select(config.QOS.SELECTORS.QOS_MODE, '2'); //Restricted maximum bandwidth
    }

    // console.debug('Apply');
    await page.click(config.QOS.SELECTORS.APPLY);
  } else {
    // console.debug('State');
    await page.select(config.QOS.SELECTORS.STATE, '0'); //Disabled

    // console.debug('Apply');
    await page.click(config.QOS.SELECTORS.APPLY);
  }

  await page.screenshot({
    path: `./${Date.now()}.png`,
    fullPage: true
  });

  console.log('Done');
  await browser.close();
};

let options = {};
options.state = yargs[0];
yargs[1] ? options.bandwidth = yargs[1] : null;
yargs[2] ? options.mode = yargs[2] : null;

qos(options);