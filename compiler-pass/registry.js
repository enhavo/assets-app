const Argument = require("@enhavo/dependency-injection/container/Argument");
const Call = require("@enhavo/dependency-injection/container/Call");

/**
 * @param {ContainerBuilder} builder
 * @param {object} options
 */
module.exports = function(builder, options) {
    let registry = builder.getDefinition(options.service);
    let definitions = builder.getDefinitionsByTagName(options.tag);
    for (let definition of definitions) {
        registry.addCall(new Call('register', [
            new Argument(definition.getName())
        ]));
    }
};
