var UserType;
(function (UserType) {
    UserType[UserType["Anonymous"] = 0] = "Anonymous";
    UserType[UserType["Temporary"] = 1] = "Temporary";
    UserType[UserType["Registered"] = 2] = "Registered";
})(UserType || (UserType = {}));
var User = (function () {
    function User(username, password) {
        this.username = '';
        this.password = '';
        if (!username && !password) {
            this.type = UserType.Anonymous;
        }
        else if (!password) {
            this.type = UserType.Temporary;
        }
        else {
            this.type = UserType.Registered;
        }
    }
    Object.defineProperty(User.prototype, "info", {
        get: function () {
            return this.password;
        },
        enumerable: true,
        configurable: true
    });
    User.Types = UserType;
    return User;
})();
module.exports = User;
