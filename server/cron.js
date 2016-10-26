// Meteor
import { Meteor } from 'meteor/meteor';

// App
import { Organization } from "../imports/api/organization/collections.js";

// NPM
import lodash from 'lodash';

const _integrationsList = ["asana", "bitbucket", "trello", "slack"];

SyncedCron.add({
    name: 'Fetch organization data for the day from the server.',
    schedule(parser) {
        // var everyDay = parser.text('at 12:00 am');
        return parser.text('every 8 hours');
        // return parser.text('every 5 min');
    },

    // For all the organizations, update the organization data to the latest version
    job() {
        const organizations = Organization.find({}).fetch();
        let timeoutIndex = 1;

        lodash.each(organizations, (org) => {
            console.log(org._id);
            const user = Meteor.users.findOne({
                _id: org.createdBy
            });

            if (user && org.integrations) {
                lodash.each(org.integrations, (integration, key) => {
                    if (_integrationsList.indexOf(key) !== -1) {
                        let _timeout;
                        // As asana has strict rate limits so stagger the sync for 5 minutes apart.
                        if (key === "asana") {
                            _timeout = 1000 * timeoutIndex;
                            timeoutIndex = timeoutIndex + 5;
                        } else {
                            _timeout = 100;
                        }

                        if (integration.credentials || integration.token) {
                            Meteor.setTimeout(() => {
                                var call_argument = key + ":sync:initial";
                                Meteor.call(call_argument, user._id);
                            }, _timeout);
                        }
                    }
                });
            }
        });
    }
});
