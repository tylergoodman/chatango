var _ = require('lodash');
var Connection = require('./Connection');
var Room = (function () {
    function Room(name, user) {
        this.name = name;
        this.user = user;
        this.connection = new Connection(this.getServer(this.name));
    }
    Room.prototype.getServer = function (room_name) {
        var tsweights = [
            ['5', 75],
            ['6', 75],
            ['7', 75],
            ['8', 75],
            ['16', 75],
            ['17', 75],
            ['18', 75],
            ['9', 95],
            ['11', 95],
            ['12', 95],
            ['13', 95],
            ['14', 95],
            ['15', 95],
            ['19', 110],
            ['23', 110],
            ['24', 110],
            ['25', 110],
            ['26', 110],
            ['28', 104],
            ['29', 104],
            ['30', 104],
            ['31', 104],
            ['32', 104],
            ['33', 104],
            ['35', 101],
            ['36', 101],
            ['37', 101],
            ['38', 101],
            ['39', 101],
            ['40', 101],
            ['41', 101],
            ['42', 101],
            ['43', 101],
            ['44', 101],
            ['45', 101],
            ['46', 101],
            ['47', 101],
            ['48', 101],
            ['49', 101],
            ['50', 101],
            ['52', 110],
            ['53', 110],
            ['55', 110],
            ['57', 110],
            ['58', 110],
            ['59', 110],
            ['60', 110],
            ['61', 110],
            ['62', 110],
            ['63', 110],
            ['64', 110],
            ['65', 110],
            ['66', 110],
            ['68', 95],
            ['71', 116],
            ['72', 116],
            ['73', 116],
            ['74', 116],
            ['75', 116],
            ['76', 116],
            ['77', 116],
            ['78', 116],
            ['79', 116],
            ['80', 116],
            ['81', 116],
            ['82', 116],
            ['83', 116],
            ['84', 116]
        ];
        room_name = room_name.replace('_', 'q').replace('-', 'q');
        var fnv = parseInt(room_name.slice(0, _.min([room_name.length, 5])), 36);
        var lnv = room_name.slice(6, 6 + _.min([room_name.length - 5, 3]));
        if (lnv) {
            lnv = parseInt(lnv, 36);
            if (lnv < 1000)
                lnv = 1000;
        }
        else
            lnv = 1000;
        var num = (fnv % lnv) / lnv;
        var maxnum = _.sum(tsweights.map(function (n) {
            return n[1];
        }));
        var cumfreq = 0;
        var sn = 0;
        for (var weight in tsweights) {
            cumfreq += weight[1] / maxnum;
            if (num <= cumfreq) {
                return "s" + weight[0] + ".chatango.com";
            }
        }
        throw new Error("Couldn't find host server for room name: " + room_name);
    };
    return Room;
})();
module.exports = Room;
