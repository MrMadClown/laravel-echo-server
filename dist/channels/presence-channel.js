"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var database_1 = require("./../database");
var log_1 = require("./../log");
var redis_publisher_1 = require("../publishers/redis-publisher");
var _ = require("lodash");
var PresenceChannel = (function () {
    function PresenceChannel(io, options) {
        this.io = io;
        this.options = options;
        this.db = new database_1.Database(options);
        this._redis = new redis_publisher_1.RedisPublisher(options);
    }
    PresenceChannel.prototype.getMembers = function (channel) {
        return this.db.get(channel + ":members");
    };
    PresenceChannel.prototype.isMember = function (channel, member) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.getMembers(channel).then(function (members) {
                _this.removeInactive(channel, members, member).then(function (members) {
                    var search = members.filter(function (m) { return m.user_id == member.user_id; });
                    if (search && search.length) {
                        resolve(true);
                    }
                    resolve(false);
                });
            }, function (error) { return log_1.Log.error(error); });
        });
    };
    PresenceChannel.prototype.removeInactive = function (channel, members, member) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.io
                .of("/")
                .in(channel)
                .clients(function (error, clients) {
                members = members || [];
                members = members.filter(function (member) {
                    return clients.indexOf(member.socketId) >= 0;
                });
                _this.db.set(channel + ":members", members);
                resolve(members);
            });
        });
    };
    PresenceChannel.prototype.join = function (socket, channel, member) {
        var _this = this;
        if (!member) {
            if (this.options.devMode) {
                log_1.Log.error("Unable to join channel. Member data for presence channel missing");
            }
            return;
        }
        this.isMember(channel, member).then(function (is_member) {
            _this.getMembers(channel).then(function (members) {
                members = members || [];
                member.socketId = socket.id;
                members.push(member);
                _this.db.set(channel + ":members", members);
                members = _.uniqBy(members.reverse(), "user_id");
                _this.onSubscribed(socket, channel, members);
                if (!is_member) {
                    _this.onJoin(socket, channel, member);
                }
            }, function (error) { return log_1.Log.error(error); });
        }, function () {
            log_1.Log.error("Error retrieving pressence channel members.");
        });
    };
    PresenceChannel.prototype.leave = function (socket, channel) {
        var _this = this;
        this.getMembers(channel).then(function (members) {
            members = members || [];
            var member = members.find(function (member) { return member.socketId == socket.id; });
            members = members.filter(function (m) { return m.socketId != member.socketId; });
            _this.db.set(channel + ":members", members);
            _this.isMember(channel, member).then(function (is_member) {
                if (!is_member) {
                    delete member.socketId;
                    _this.onLeave(channel, member);
                }
            });
        }, function (error) { return log_1.Log.error(error); });
    };
    PresenceChannel.prototype.onJoin = function (socket, channel, member) {
        this._redis.publish(channel, {
            event: "presence:joining",
            data: { member: member }
        });
    };
    PresenceChannel.prototype.onLeave = function (channel, member) {
        this._redis.publish(channel, {
            event: "presence:leaving",
            data: { member: member }
        });
    };
    PresenceChannel.prototype.onSubscribed = function (socket, channel, members) {
        this._redis.publish(channel, {
            event: "presence:subscribed",
            data: { members: members }
        });
    };
    PresenceChannel.prototype.clientEvent = function (data) {
        log_1.Log.info("FICK DIFHCk");
        this._redis.publish(data.channel, data);
    };
    return PresenceChannel;
}());
exports.PresenceChannel = PresenceChannel;
