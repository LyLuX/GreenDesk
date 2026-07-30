import packageMetadata from '../../package.json';

/** Public application metadata shared by global interface elements. */
const appMetadata = Object.freeze({
  name: 'GreenDesk',
  owner: 'EI BOURNAZEL Paul',
  version: packageMetadata.version,
});

export default appMetadata;
