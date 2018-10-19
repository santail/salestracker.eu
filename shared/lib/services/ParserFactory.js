
function ParserFactory() {
    this.parsers = {};
}

ParserFactory.prototype.getParser = function (site) {
    if (!this.parsers[site]) {
        var Parser = require('./../parsers/' + site + ".parser"),
            parser = new Parser();

        this.parsers[site] = parser;
    }

    return this.parsers[site];
};

module.exports = new ParserFactory();