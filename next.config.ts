// /** @type {import('next').NextConfig} */

import type { NextConfig } from "next";

// const isMobile = process.env.NEXT_PUBLIC_IS_MOBILE === 'true';
import * as glob from "glob";

const nextConfig: NextConfig = {
  /*
...(isMobile ? {output: 'export'} : {}),
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  */
  transpilePackages: [
    "@adobe/react-spectrum",
    "@react-spectrum/*",
    "@spectrum-icons/*",
  ].flatMap((spec) => glob.sync(`${spec}`, { cwd: "node_modules/" })),
};

export default nextConfig;
