const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-maps não tem versão web: no navegador usa um stub, para o
// Expo Web abrir (útil para ver telas e protótipos no navegador).
const mapsStub = path.resolve(__dirname, 'src/stubs/react-native-maps.web.tsx');
const defaultResolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'sourceFile', filePath: mapsStub };
  }
  return (defaultResolve ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
