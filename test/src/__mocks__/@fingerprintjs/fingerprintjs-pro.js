'use strict';

const fp = jest.createMockFromModule('@fingerprintjs/fingerprintjs-pro');

fp.load = async (options) => {
    return {
        get: async () => { return { visitorId: 'test-visitor-id' } }
    };
};

module.exports = fp;