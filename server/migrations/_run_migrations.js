import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
    // https://github.com/percolatestudio/meteor-migrations
    Migrations.migrateTo(5);
});
