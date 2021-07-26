"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Redis = require('ioredis');
var RedisPublisher = (function () {
    function RedisPublisher(options) {
        this.options = options;
        this._keyPrefix = options.databaseConfig.redis.keyPrefix || '';
        this._redis = new Redis(options.databaseConfig.redis);
    }
    RedisPublisher.prototype.publish = function (channel, data) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                _this._redis.publish(channel, data);
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });
    };
    return RedisPublisher;
}());
exports.RedisPublisher = RedisPublisher;
