var User = (function () {
    function User(username, password) {
        if (username === void 0) { username = ''; }
        if (password === void 0) { password = ''; }
        this.username = username;
        this.password = password;
        if (!username && !password) {
            this.type = User.types.Anonymous;
        }
        else if (!password) {
            this.type = User.types.Temporary;
        }
        else {
            this.type = User.types.Registered;
        }
    }
    Object.defineProperty(User.prototype, "info", {
        get: function () {
            return this.password;
        },
        enumerable: true,
        configurable: true
    });
    return User;
})();
var User;
(function (User) {
    (function (types) {
        types[types["Anonymous"] = 0] = "Anonymous";
        types[types["Temporary"] = 1] = "Temporary";
        types[types["Registered"] = 2] = "Registered";
    })(User.types || (User.types = {}));
    var types = User.types;
})(User || (User = {}));
module.exports = User;
