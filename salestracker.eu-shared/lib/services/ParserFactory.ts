

class ParserFactory {
    private _parsers = {};

    getParser(site) {
        if (!this._parsers[site]) {
            const Parser = require('./../parsers/' + site + ".parser");

            this._parsers[site] = new Parser();
        }

        return this._parsers[site];
    }
}

export default new ParserFactory();
