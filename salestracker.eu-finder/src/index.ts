var SessionFactory = require("../lib/services/SessionFactory");

var start = Date.now();
var dbConnection = SessionFactory.getDbConnection();

setInterval(function () {
    var now = Date.now();

    dbConnection.wishes.findAndModify({
        query: { 
            last_time_checked: { $lt: now } 
        },
        update: { 
            $set: { last_time_checked: now } 
        },
        new: true
    }, function (err: any, doc: any) {
        if (err) {
            console.error(err);
        }

        console.log(doc)
    });

}, 2000);