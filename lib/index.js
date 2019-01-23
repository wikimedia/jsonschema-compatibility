'use strict';

const stringify = require('fast-json-stable-stringify');

/**
 * TODO: describe the backwards compatibility
 * @type {number}
 */
const BACKWARD = 1;

/**
 * TODO: describe the forward compatibility
 * @type {number}
 */
const FORWARD = 2;

/**
 * TODO: describe full compatibility
 * @type {number}
 */
const FULL = BACKWARD | FORWARD; // eslint-disable-line no-bitwise

/**
 * TODO
 * @param schemas
 */
const cleanUpSchemas = (...schemas) => {
    const IGNORED_PROPERTIES = [ 'description', '$comment' ];
    const removeProps = (schema) => {
        Object.keys(schema).forEach((key) => {
            if (IGNORED_PROPERTIES.includes(key)) {
                delete schema[key];
            } else if (typeof schema[key] === 'object') {
                removeProps(schema[key]);
            }
        });
    };
    schemas.forEach((schema) => removeProps(schema));
};

/**
 * A collection of checkers for each of the types supported by JSON schema.
 * @type {{string: typeCheckers.string, object: typeCheckers.object}}
 */

const typeCheckers = {
    string: (oldSubSchema, newSubSchema, context) => {
        if (oldSubSchema.type !== 'string' || newSubSchema.type !== 'string') {
            throw new TypeError('Internal error. String type checker used for non-string type');
        }
        // TODO: figure out string-related forward/backward compat rules.
        return [];
    },
    object: (oldSubSchema, newSubSchema, context) => {
        if (oldSubSchema.type !== 'object' || newSubSchema.type !== 'object') {
            throw new TypeError('Internal error. Object type checker used for non-object type');
        }

        const path = context.path;
        switch (context.compatibilityType) {
            case FORWARD:
                if (oldSubSchema.properties && !newSubSchema.properties) {
                    return [ {
                        message: `Not FORWARD compatible, ${path}.properties not specified`,
                        compatibilityType: context.compatibilityType,
                        path
                    } ];
                }
                break;
            case BACKWARD:
                if (!oldSubSchema.properties && newSubSchema.properties) {
                    return [ {
                        message: `Not BACKWARD compatible, ${path}.properties now specified`,
                        compatibilityType: context.compatibilityType,
                        path
                    } ];
                }
                break;
        }

        // TODO: verify all the rest possible Object properties
        if (!oldSubSchema.properties && !newSubSchema.properties) {
            return [];
        }

        const allParams = Object.keys(oldSubSchema.properties)
        .concat(Object.keys(newSubSchema.properties))
        .filter((value, index, self) => self.indexOf(value) === index);

        // TODO: Maybe actually concat all the errors?
        for (const paramName of allParams) {
            const newPath = `${path}.${paramName}`;
            const oldRequired = oldSubSchema.required && oldSubSchema.required.includes(paramName);
            const newRequired = newSubSchema.required && newSubSchema.required.includes(paramName);
            const oldProperty = oldSubSchema.properties[paramName];
            const newProperty = newSubSchema.properties[paramName];
            switch (context.compatibilityType) {
                case FORWARD:
                    if (!newRequired && oldRequired) {
                        return [ {
                            message: `Not FORWARD compatible, ${newPath} is not required anymore`,
                            compatibilityType: context.compatibilityType,
                            newPath
                        } ];
                    }

                    if (!oldProperty && newProperty) {
                        // Added a field, allowed regardless
                        return [];
                    } else if (oldProperty && !newProperty) {
                        // Removed a field. Only allowed for optional fields
                        if (oldRequired) {
                            return [ {
                                message: `Not FORWARD compatible, ${newPath} required field removed`,
                                compatibilityType: context.compatibilityType,
                                newPath
                            } ];
                        }
                        // Nothing else to check, the field was optional
                        return [];
                    }

                    break;
                case BACKWARD:
                    if (newRequired && !oldRequired) {
                        return [ {
                            message: `Not BACKWARD compatible, ${newPath} is now required`,
                            compatibilityType: context.compatibilityType,
                            newPath
                        } ];
                    }

                    if (oldProperty && !newProperty) {
                        // Deleted a field, allowed regardless
                        return [];
                    } else if (!oldProperty && newProperty) {
                        // Added a field. Only allowed for optional fields
                        if (newRequired) {
                            return [ {
                                message: `Not BACKWARD compatible, ${newPath} required field added`,
                                compatibilityType: context.compatibilityType,
                                newPath
                            } ];
                        }
                        // Nothing else to check, the field was optional
                        return [];
                    }
                    break;
            }

            const errors = applyChecks(oldProperty, newProperty, {
                compatibilityType: context.compatibilityType,
                path: newPath
            });
            if (errors.length) {
                return errors;
            }
        }
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
            compatibilityType: context.compatibilityType,
            path
        } ];
    }

    if (!typeCheckers[oldSubSchema.type]) {
        throw new TypeError(`Unknown type ${oldSubSchema.type}`);
    }

    if (stringify(oldSubSchema) === stringify(newSubSchema)) {
        return [];
    }

    return typeCheckers[oldSubSchema.type](oldSubSchema, newSubSchema, context);
};

/**
 * TODO
 * @param oldSchema
 * @param newSchema
 * @param compatibilityType
 */
const validateParams = (oldSchema, newSchema, compatibilityType) => {
    const checkParam = (value, paramName) => {
        if (!value || value.constructor !== Object) {
            throw new TypeError(`Invalid parameter ${paramName}, must be an object`);
        }
    };
    checkParam(oldSchema, 'oldSchema');
    checkParam(newSchema, 'newSchema');
    if (compatibilityType !== BACKWARD &&
            compatibilityType !== FORWARD &&
            compatibilityType !== FULL) {
        throw new TypeError('Invalid compatibilityType, must be one of COMPATIBILITY_TYPES');
    }
};

/**
 * Checks whether a new JSON schema is compatible with the old schema
 * according to the provided compatibility type.
 * @param {Object} oldSchema the old JSON schema
 * @param {Object} newSchema th new JSON schema
 * @param {number} [compatibilityType] compatibility type. Default: FORWARD
 * @return {boolean}
 */
const check = (oldSchema, newSchema, compatibilityType = FORWARD) => {
    validateParams(oldSchema, newSchema, compatibilityType);
    if (compatibilityType === FULL) {
        return check(oldSchema, newSchema, BACKWARD) && check(oldSchema, newSchema, FORWARD);
    }
    cleanUpSchemas(oldSchema, newSchema);
    return applyChecks(oldSchema, newSchema, {
        compatibilityType,
        path: '$'
    });
};

module.exports = {
    COMPATIBILITY_TYPES: { BACKWARD, FORWARD, FULL },
    check
};
