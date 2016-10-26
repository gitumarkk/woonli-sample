// Meteor
import { Meteor } from 'meteor/meteor';

// App
import { AsanaData } from './collections.js';

Meteor.publish("asana:details", function() {
    // Need to return when a user is a team member in an organization
    if (this.userId) {
        const user = Meteor.users.findOne({
            _id: this.userId
        });

        if (user) {
            return AsanaData.find({
                organizationId: user.profile.current_organization,
                projectId: user.profile.current_project
            });
        }
    }
});
