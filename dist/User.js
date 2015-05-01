var User = (function () {
    function User() {
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
module.exports = User;
