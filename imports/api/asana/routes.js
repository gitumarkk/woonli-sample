// Meteor
import { Meteor } from 'meteor/meteor';

// App
import { Organization } from '../organization/collections.js';

// Atmosphere
import { Router } from 'meteor/iron:router';

Router.map(function() {
    this.route('connectAsana', {
        path: '/api-connect/asana/',
        where: 'server',
        action() {
            let org;

            if (this.request.query.code && this.request.query.state) {
                const user = Meteor.users.findOne({
                    _id: this.request.query.state
                });

                if (user && user.profile.current_organization) {
                    org = Organization.findOne(user.profile.current_organization);

                    if (org) {
                        Organization.update(org._id, {
                            $set: {
                                "integrations.asana.token": this.request.query.code
                            }
                        });
                    }

                    Meteor.call("asana:get:credentials", user._id);
                }
            } else {
                // Should throw new error here
            }

            if (org) {
                this.response.writeHead(302, {
                    Location: Router.path('integrations')
                });
            } else {
                this.response.writeHead(302, {
                    Location: "/"
                });
            }

            this.response.end();
        }
    });
});
