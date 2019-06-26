'use strict';

const assert = require('assert');
const checker = require('../lib/index');

describe('Compatibility checks', () => {
    it('Should validate input', () => {
        assert.throws(
            checker.check.bind(undefined),
            TypeError,
            'oldSchema param not checked'
        );
        assert.throws(
            checker.check.bind(undefined, {}),
            TypeError,
            'newSchema param not checked'
        );
        assert.throws(
            checker.check.bind(undefined, {}, {}, 4),
            TypeError,
            'compatibilityType param not checked'
        );
    });
});
