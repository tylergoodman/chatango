var Set = (function () {
    function Set(initial) {
        this._elements = [];
        if (initial !== void 0) {
            for (var i = 0, len = initial.length; i < len; i++) {
                this.add(initial[i]);
            }
        }
    }
    Object.defineProperty(Set.prototype, "length", {
        get: function () {
            return this._elements.length;
        },
        enumerable: true,
        configurable: true
    });
    Set.prototype.add = function (element) {
        if (!element) {
            return this;
        }
        if (!this.has(element)) {
            this._elements.push(element);
        }
        return this;
    };
    Set.prototype.clear = function () {
        this._elements.length = 0;
    };
    Set.prototype.delete = function (element) {
        var index = this._elements.indexOf(element);
        if (index === -1) {
            return false;
        }
        this._elements.splice(index, 1);
        return true;
    };
    Set.prototype.has = function (element) {
        return this._elements.indexOf(element) !== -1;
    };
    Set.prototype.toString = function () {
        return this._elements.toString();
    };
    return Set;
})();
exports.Set = Set;
