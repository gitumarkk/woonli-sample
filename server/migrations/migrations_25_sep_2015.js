import { Meteor } from 'meteor/meteor';
import { Organization } from '../../imports/api/organization/collections.js';
import { Memberships } from '../../imports/api/membership/collections.js';

// Setting admin current_organization to what they created
Migrations.add({
    version: 1,
    up() {
        const organizations = Organization.find();
        organizations.forEach((org) => {
            const user = Meteor.users.findOne({
                _id: org.createdBy
            });

            if (user) {
                // Setting default user group if they created the organization
                Meteor.users.update(user._id, {
                    $set: {
                        "profile.current_organization": org._id
                    }
                });

                if (user.profile && user.profile.asana) {
                    Meteor.users.update(user._id, {
                        $set: {
                            "services.asana": user.profile.asana
                        }
                    });

                    // Setting default asana intergration
                    Organization.update(org._id, {
                        $set: {
                            "integrations.asana": user.profile.asana
                        }
                    });
                }
            }
        });
    },
    down() {}
});

// Setting all invited users to the organization they were invited to
Migrations.add({
    version: 2,
    up() {
        const members = Memberships.find();

        members.forEach((member) => {
            const user = Meteor.users.findOne({
                _id: member.userId
            });

            if (user) {
                // Setting default user group if they created the organization
                Meteor.users.update(user._id, {
                    $set: {
                        "profile.current_organization": member.organizationId
                    }
                }, {
                    validate: false
                });
            }
        });
    },
    down() {}

});
