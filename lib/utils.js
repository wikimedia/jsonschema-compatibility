'use strict';

const stringify = require('fast-json-stable-stringify');

module.exports = {
    /**
     * Checks whether two schemas are identical.
     * @param {Object} schema1 first schema
     * @param {Object} schema2 second schema
     * @return {boolean}
     */
    equals: (schema1, schema2) => stringify(schema1) === stringify(schema2),
    /**
     * Recursively removes all properties named as one of the ignoredProperties
     * from the schemas
     * @param {Array} ignoredProperties list of property names to ignore
     * @param {...Object} schemas schemas to work on
     */
    removeProperties: (ignoredProperties, ...schemas) => {
        const removeProps = (schema) => {
            Object.keys(schema).forEach((key) => {
                if (ignoredProperties.includes(key)) {
                    delete schema[key];
                } else if (typeof schema[key] === 'object') {
                    removeProps(schema[key]);
                }
            });
        };
        schemas.forEach((schema) => removeProps(schema));
    },
    /**
     * Verifies that all the schemas have appropriate type.
     * @param {string} type the expected schema type
     * @param {...Object} schemas the list of schemas to check
     */
    verifySchemasType: (type, ...schemas) => {
        schemas.forEach((schema) => {
            if (schema.type !== type) {
                throw new TypeError(`${type} type checker used for ${schema.type} type`);
            }
        });
    },
    createErrorFactory: (context) => (reason) => ({
        message: `Not ${context.compType} compatible, ${context.path} ${reason}`,
        compatibilityType: context.compType,
        path: context.path
    }),
    keyAdded: (oldObject, newObject, keyName) => !oldObject[keyName] && newObject[keyName],
    keyRemoved: (oldObject, newObject, keyName) => oldObject[keyName] && !newObject[keyName]
};
