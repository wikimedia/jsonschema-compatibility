'use strict';

const utils = require('./utils');

/**
 * TODO: describe the backwards compatibility
 * @type {string}
 */
const BACKWARD = 'BACKWARD';

/**
 * TODO: describe the forward compatibility
 * @type {string}
 */
const FORWARD = 'FORWARD';

/**
 * TODO: describe full compatibility
 * @type {string}
 */
const FULL = 'FULL';

/**
 * The list of schema property names to ignore
 * @type {string[]}
 */
const IGNORED_PROPERTIES = [ 'description', '$comment' ];

/**
 * A collection of checkers for each of the types supported by JSON schema.
 * @type {{string: typeCheckers.string, object: typeCheckers.object}}
 */

const typeCheckers = {
    array: (oldSubSchema, newSubSchema, context) => {
        utils.verifySchemasType('array', oldSubSchema, newSubSchema);
        return [];
    },
    boolean: (oldSubSchema, newSubSchema, context) => {
        utils.verifySchemasType('boolean', oldSubSchema, newSubSchema);
        return [];
    },
    integer: (oldSubSchema, newSubSchema, context) => {
        utils.verifySchemasType('integer', oldSubSchema, newSubSchema);
        return [];
    },
    null: (oldSubSchema, newSubSchema, context) => {
        utils.verifySchemasType('object', oldSubSchema, newSubSchema);
        return [];
    },
    number: (oldSubSchema, newSubSchema, context) => {
        utils.verifySchemasType('object', oldSubSchema, newSubSchema);
        return [];
    },
    object: (oldSubSchema, newSubSchema, context) => {
        utils.verifySchemasType('object', oldSubSchema, newSubSchema);
        const error = utils.createErrorFactory(context);

        if (context.compType === FORWARD &&
                // DISALLOWED to remove `properties` specification for an `object`
                utils.keyRemoved(oldSubSchema, newSubSchema, 'properties')) {
            return [ error('Properties specification removed') ];
        }

        if (context.compType === BACKWARD &&
                // DISALLOWED to add `properties` specification for an `object`
                utils.keyAdded(oldSubSchema, newSubSchema, 'properties')) {
            return [ error('Properties specification added') ];
        }

        // TODO: verify all the rest possible Object properties
        if (!oldSubSchema.properties || !newSubSchema.properties) {
            return [];
        }

        const allParams = Object.keys(oldSubSchema.properties)
        .concat(Object.keys(newSubSchema.properties))
        .filter((value, index, self) => self.indexOf(value) === index);

        // TODO: Maybe actually concat all the errors?
        // TODO: Not really wanna return
        return allParams.map((paramName) => {
            const newContext = {
                compType: context.compType,
                path: `${context.path}.${paramName}`
            };
            const error = utils.createErrorFactory(newContext);
            const oldRequired = oldSubSchema.required && oldSubSchema.required.includes(paramName);
            const newRequired = newSubSchema.required && newSubSchema.required.includes(paramName);
            const keyAdded = utils.keyAdded(
                oldSubSchema.properties,
                newSubSchema.properties,
                paramName
            );
            const keyRemoved = utils.keyRemoved(
                oldSubSchema.properties,
                newSubSchema.properties,
                paramName
            );

            switch (context.compType) {
                case FORWARD:
                    // DISALLOWED to make a required property optional.
                    if (!newRequired && oldRequired) {
                        return [ error('Not required anymore') ];
                    }

                    if (keyAdded) {
                        // ALLOWED to add both required and optional properties
                        return [];
                    } else if (keyRemoved) {
                        if (oldRequired) {
                            // DISALLOWED to remove required properties
                            return [ error('Required field removed') ];
                        }
                        // ALLOWED to remove optional properties
                        return [];
                    }
                    break;
                case BACKWARD:
                    // DISALLOWED to make an property required
                    if (newRequired && !oldRequired) {
                        return [ error('Required now') ];
                    }

                    if (keyRemoved) {
                        // ALLOWED to delete both required and optional properties
                        return [];
                    } else if (keyAdded) {
                        // DISALLOWED to add required properties
                        if (newRequired) {
                            return [ error('Required field added') ];
                        }
                        // ALLOWED to add optional properties
                        return [];
                    }
                    break;
            }

            return applyChecks(
                oldSubSchema.properties[paramName],
                newSubSchema.properties[paramName],
                newContext
            );
        }).reduce((arr1, arr2) => arr1.concat(arr2));
    },
    string: (oldSubSchema, newSubSchema, context) => {
        utils.verifySchemasType('string', oldSubSchema, newSubSchema);
        // TODO: figure out string-related forward/backward compat rules.
        return [];
    }
};

/**
 * TODO
 * @param oldSubSchema
 * @param newSubSchema
 * @param context
 */
const applyChecks = (oldSubSchema, newSubSchema, context) => {
    const path = context.path;
    if (!oldSubSchema.type && !newSubSchema.type) {
        return [];
    }

    // TODO: this is not entirely correct, integer could become number for example.
    // TODO: think about removing/adding type declarations
    // TODO: Think about arrays of types and adding/removing possible types
    if (oldSubSchema.type !== newSubSchema.type) {
        return [ {
            message: `Type at ${path} changed from ${oldSubSchema.type} to ${newSubSchema.type}`,
            compType: context.compType,
            path
        } ];
    }

    if (!typeCheckers[oldSubSchema.type]) {
        throw new TypeError(`Unknown type ${oldSubSchema.type}`);
    }

    if (utils.equals(oldSubSchema, newSubSchema)) {
        return [];
    }

    return typeCheckers[oldSubSchema.type](oldSubSchema, newSubSchema, context);
};

/**
 * TODO
 * @param oldSchema
 * @param newSchema
 * @param compType
 */
const validateParams = (oldSchema, newSchema, compType) => {
    const checkParam = (value, paramName) => {
        if (!value || value.constructor !== Object) {
            throw new TypeError(`Invalid parameter ${paramName}, must be an object`);
        }
    };
    checkParam(oldSchema, 'oldSchema');
    checkParam(newSchema, 'newSchema');
    if (compType !== BACKWARD &&
            compType !== FORWARD &&
            compType !== FULL) {
        throw new TypeError('Invalid compType, must be one of COMPATIBILITY_TYPES');
    }
};

/**
 * Checks whether a new JSON schema is compatible with the old schema
 * according to the provided compatibility type.
 * @param {Object} oldSchema the old JSON schema
 * @param {Object} newSchema th new JSON schema
 * @param {number} [compType] compatibility type. Default: FORWARD
 * @return {boolean}
 */
const check = (oldSchema, newSchema, compType = FORWARD) => {
    validateParams(oldSchema, newSchema, compType);
    if (compType === FULL) {
        return check(oldSchema, newSchema, BACKWARD) && check(oldSchema, newSchema, FORWARD);
    }
    utils.removeProperties(IGNORED_PROPERTIES, oldSchema, newSchema);
    return applyChecks(oldSchema, newSchema, {
        compType,
        path: '$'
    });
};

module.exports = {
    COMPATIBILITY_TYPES: { BACKWARD, FORWARD, FULL },
    check
};
