/* mock substituído em runtime pelo test-sheets-build.ts */
module.exports = { google: { auth: { GoogleAuth: class { constructor() {} } }, sheets: () => ({}) } };
