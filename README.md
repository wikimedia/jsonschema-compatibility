# jsonschema-compatibility [![npm version](https://badge.fury.io/js/jsonschema-compatibility.svg)](https://badge.fury.io/js/jsonschema-compatibility) [![Build Status](https://travis-ci.org/wikimedia/jsonschema-compatibility.svg?branch=master)](https://travis-ci.org/wikimedia/jsonschema-compatibility) [![Coverage Status](https://coveralls.io/repos/github/wikimedia/jsonschema-compatibility/badge.svg?branch=master)](https://coveralls.io/github/wikimedia/jsonschema-compatibility?branch=master) [![Dependencies](https://david-dm.org/wikimedia/jsonschema-compatibility.svg?branch=master)](https://david-dm.org/wikimedia/jsonschema-compatibility?branch=master)
Backwards compatibility checker for JSONSchema

Library checks two JSON schemas for compatibility. Library supports `BACKWARD`, `FORWARD` and `FULL` compatibility types.

- `BACKWARD` compatibility means that consumers using the new schema can read data produced with the last schema.
- `FORWARD` compatibility means that data produced with a new schema can be read by consumers using the last schema, even though they may not be able to use the full capabilities of the new schema.
- `FULL` compatibility means schemas are both `BACKWARD` and `FORWARD` compatible.

 
## API

TODO: describe once we stabilize API and options

## Compatibility rules

This section describes in details which changes in a schema are allowed and disallowed for each of compatibility types.

### Common rules

- ALLOWED to change descriptive options not related to validation, like `description` or `$comment`
- DISALLOWED to change the specified type of the property TODO - think about integer vs number and null

 
### BACKWARD Compatibility

 - DISALLOWED to add `properties` specification for an `object`, ALLOWED to remove specification
 - DISALLOWED to make a property required. ALLOWED to make a required property optional
 - ALLOWED to delete both required and optional properties
 - ALLOWED to add optional properties, DISALLOWED to add required properties 
  
### FORWARD Compatibility

 - DISALLOWED to remove `properties` specification for an `object`, ALLOWED to add specification
 - DISALLOWED to make a required property optional. ALLOWED to make an optional property required
 - ALLOWED to add both required and optional properties
 - ALLOWED to remove optional properties, DISALLOWED to remove required properties
 
