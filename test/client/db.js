(function () {
/**
 * augur.js unit tests
 * @author Jack Peterson (jack@tinybike.net)
 */

"use strict";

var assert = require("chai").assert;
var abi = require("augur-abi");
var constants = require("../../src/constants");
var utils = require("../../src/utilities");
var errors = require("../../src/errors");
var augurpath = "../../src/index";
var augur = utils.setup(utils.reset(augurpath), process.argv.slice(2));

describe("Database", function () {

    var handle = new Date().toString();
    var account = {
        handle: abi.prefix_hex(utils.sha256(handle)),
        privateKey: "0xa24ee972cb18558423456ff2bc609baab0dd5a0a4f0c566efeb9bf2429251976",
        iv: "0x262ce8235b1a4155d87c9bb99d680ad3",
        salt: "0xb3bd4935d13290fa7674ff8e757e5c3d76bc5cc6a118b7ef34cb93df50471125",
        mac: "0xfa9c2a61b7b2ffcb6d29de02051916b04d2a76222b954dea960cde20c54c99be",
        id: "0x060f5d691b1245c2a8a582db1e7c5213"
    };

    beforeEach(function () {
        augur = utils.setup(utils.reset(augurpath), process.argv.slice(2));
    });

    it("save account", function (done) {
        this.timeout(augur.constants.TIMEOUT);
        augur.db.put(handle, account, function (res) {
            if (res && res.error) return done(res);
            assert.isTrue(res);
            done();
        });
    });

    it("retrieve account", function (done) {

        // should return DB_READ_FAILED error
        var badhandle = new Date().toString();
        var response = augur.db.get(badhandle);
        if (!response.error) return done(response);
        assert.deepEqual(response, errors.DB_READ_FAILED);
        augur.db.get(badhandle, function (response) {
            if (!response.error) return done(response);
            assert.deepEqual(response, errors.DB_READ_FAILED);

            // synchronous
            var stored = augur.db.get(handle);
            if (stored && stored.error) return done(stored);
            assert.strictEqual(handle, stored.handle);
            assert.strictEqual(account.privateKey, abi.hex(stored.privateKey, true));
            assert.strictEqual(account.iv, abi.hex(stored.iv, true));
            assert.strictEqual(account.salt, abi.hex(stored.salt, true));
            assert.strictEqual(account.mac, abi.hex(stored.mac, true));
            assert.strictEqual(account.id, abi.hex(stored.id, true));

            // asynchronous
            augur.db.get(handle, function (storedAccount) {
                if (storedAccount && storedAccount.error) return done(storedAccount);
                assert.strictEqual(handle, storedAccount.handle);
                assert.strictEqual(account.privateKey, abi.hex(storedAccount.privateKey, true));
                assert.strictEqual(account.iv, abi.hex(storedAccount.iv, true));
                assert.strictEqual(account.salt, abi.hex(storedAccount.salt, true));
                assert.strictEqual(account.mac, abi.hex(storedAccount.mac, true));
                assert.strictEqual(account.id, abi.hex(storedAccount.id, true));
                done();
            });

        });
    });
});

})();
