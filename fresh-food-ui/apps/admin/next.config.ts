import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@fresh-food/ui', '@fresh-food/design-tokens', 'react-native-web'],
  turbopack: {
    resolveAlias: {
      'react-native': 'react-native-web',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'react-native$': 'react-native-web',
    };
    config.resolve.extensions = [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      ...config.resolve.extensions,
    ];
    return config;
  },
};
export default nextConfig;
