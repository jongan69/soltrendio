#!/bin/bash
git clone https://github.com/node-webrtc/node-webrtc.git
cd node-webrtc
npm run build
cp build-linux-x64/Release/wrtc.node ../node_modules/ 