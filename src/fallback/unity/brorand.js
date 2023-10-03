var r;

module.exports = function rand(len) {
    if (!r)
        r = new Rand(null);

    return r.generate(len);
};

function Rand(rand) {
    this.rand = rand;
}
module.exports.Rand = Rand;

Rand.prototype.generate = function generate(len) {
    return this._rand(len);
};

// Emulate crypto API using randy
Rand.prototype._rand = function _rand(n) {
    var res = new Uint8Array(n);
    for (var i = 0; i < res.length; i++)
        res[i] = (Math.random() * 256) & 0xff;
    return res;
};
