// Meteor imports
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';

// Atmosphere imports
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import 'meteor/dburles:collection-helpers';

// NPM imports
import moment from 'moment';
import lodash from 'lodash';

// App
import { DataProcessHelper as DPH } from '../../helpers/dataprocessV2.js';

export const AsanaData = new Mongo.Collection('asanadata');

// How do you integrate user data, into the boards.
/*
    // Struct 1
    {
        meta: {
            name: RemoTeam,
            oldestItem: {name: name, age: age},
            newestItem: {name: name, age: age}
        }
        data : [
            {list: name,
            listId: "",
            items: [{
                    count: 1,
                    data: 01-01-9999
                }
            ]}
        ]
    }

    Struct 2 - set the main key to the data, each date represents a snap shot of the board,
    when you move to a separate day, clone the previous date's data and modify it based on the current
    days events until you get to the final state of the list and then do a check by performing another api
    call.

    {
        meta: {
            name: name
        },
        data: {
            date_1: [
                {
                    listId: {
                        name: "",
                        cards: [a, b, x],
                        count: #,
                        members: [],
                        closed: []
                    },

                    listId2: {
                        name: "",
                        cards: [a, b, c]
                        count: #,
                        closed: []
                    }
                }
            ],

            date_2: [
                {
                    id: "1",
                    name: "n1",
                    cards: [a, b, c],
                    count: #,
                    closed: [],
                    members: []
                },

                {
                    id: "2",
                    name: "n2",
                    cards: [ad e, fc],
                    count: #,
                    closed: [],
                    members: []
                }
            ]
        }
    }
*/
const AsanaDataSchema = new SimpleSchema({
    organizationId: {
        type: String
    },

    projectId: {
        type: String
    },

    data: {
        type: Object,
        blackbox: true
    },

    members: {
        type: [Object],
        blackbox: true,
        optional: true
    },

    lastSyncDate: {
        type: Date,
        optional: true,
    },

    createdBy: {
        type: String
    },

    createdAt: {
        type: Date,
        denyUpdate: true,
        defaultValue: moment().toDate()
    }
});

AsanaData.attachSchema(AsanaDataSchema);

if (Meteor.isServer) {
    AsanaData.helpers({
        memberSummary() {
            if (this.members) {
                // Group the data by the members to be able to run merge and unmerge functions easily
                const groupedMembers = lodash.chain(this.data)
                    .map((v, k) => {
                        // Adding the date to the members data to allow for data comparison
                        lodash.each(v, (x, i) => {
                            lodash.each(x.members, (x2, i2) => {
                                v[i].members[i2].date = k
                            });
                        });
                        return v;
                    }) // An array of array of sprints
                    .flatten()
                    .map((x) => x.members)
                    .flatten() // convert to single aray
                    .filter(Boolean)
                    .groupBy("memberId") // Group by the users email address
                    .value();

                return lodash.map((groupedMembers), (v, k) => {
                    const member = lodash.find(this.members, x => String(x.id) === String(k));
                    return {
                        email: member && member.email ? member.email : `Anonymous - ${k}`,
                        assignedSummary: {
                            month: DPH.getDataComparison(v, "month", "date", "assigned"),
                            week: DPH.getDataComparison(v, "week", "date", "assigned"),
                            day: DPH.getDataComparison(v, "day", "date", "assigned"),
                        },
                        completedSummary: {
                            month: DPH.getDataComparison(v, "month", "date", "completedTotal"),
                            week: DPH.getDataComparison(v, "week", "date", "completedTotal"),
                            day: DPH.getDataComparison(v, "day", "date", "completedTotal"),
                        },
                        pendingSummary: {
                            month: DPH.getDataComparison(v, "month", "date", "tasksPendingTotal"),
                            week: DPH.getDataComparison(v, "week", "date", "tasksPendingTotal"),
                            day: DPH.getDataComparison(v, "day", "date", "tasksPendingTotal"),
                        },
                        totalEvents: member ? member.total : 0
                    }
                });
            }
        },

        /**
        * @summary - This is the details for all the members i.e. email and integratio
        *
        */
        memberContactDetails() {
            return lodash.chain(this.members)
                .map(x => {
                    if (x.email) {
                        return {
                            email: x.email,
                            integration: "asana"
                        };
                    }
                })
                .filter(Boolean)
                .value();
        }
    })
};
