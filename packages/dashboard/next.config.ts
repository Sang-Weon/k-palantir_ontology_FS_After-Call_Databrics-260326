import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@k-palantir/ontology', '@k-palantir/agent-framework', '@k-palantir/mcp-server'],
};

export default nextConfig;
