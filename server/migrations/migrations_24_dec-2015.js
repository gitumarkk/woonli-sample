import { Meteor } from 'meteor/meteor';
import { Organization } from '../../imports/api/organization/collections.js';
import lodash from "lodash";

Migrations.add({
    version: 3,
    up() {
        const organizations = Organization.find();
        const _integrationsList = ["asana", "bitbucket", "trello", "slack"];

        organizations.forEach((org) => {
            const user = Meteor.users.findOne({
                _id: org.createdBy
            });

            if (user && org.integrations) {
                lodash.each(org.integrations, (integration, key) => {
                    if (_integrationsList.indexOf(key) !== -1) {
                        // As asana has strict rate limits so stagger the sync for 5 minutes apart.
                        if (key === "asana" && !org.integrations.asana.defaultWorkspace) {
                            Meteor.call("asana:get:workspace", user._id, (error, response) => {
                                if (response.length !== 0) {
                                    Meteor.call("asana:set:workspace", response[0].id, user._id);
                                }
                            });
                        }
                    }
                });
            }
        });
    },
    down() {}
});
